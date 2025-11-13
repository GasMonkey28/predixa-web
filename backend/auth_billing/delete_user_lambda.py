"""
Delete User API Lambda Handler

Allows authenticated users to delete their own account across all systems:
- AWS Cognito (user authentication)
- DynamoDB UserProfiles table
- DynamoDB predixa_entitlements table
- Stripe (customer record)

API Gateway setup:
- DELETE /me/account
- Cognito Authorizer (validates JWT automatically)
- User info available in event.requestContext.authorizer.claims

Security:
- User can only delete their own account (cognito_sub extracted from JWT token)
- API Gateway Cognito Authorizer validates JWT before Lambda is invoked
- Additional validation: verifies DynamoDB userId matches JWT cognito_sub
- No user input parameters accepted - all data comes from validated JWT
- All operations are logged to CloudWatch
- Handles partial failures gracefully
"""
import json
import boto3
from typing import Dict, Any, Optional
from botocore.exceptions import ClientError
from config import (
    USERS_TABLE, 
    ENTITLEMENTS_TABLE, 
    AWS_REGION, 
    STRIPE_API_KEY, 
    COGNITO_USER_POOL_ID,
    validate_config
)
from utils import extract_cognito_sub_from_event, create_response
from ddb import get_user

# Initialize clients
cognito = boto3.client('cognito-idp', region_name=AWS_REGION)
dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
users_table = dynamodb.Table(USERS_TABLE)
entitlements_table = dynamodb.Table(ENTITLEMENTS_TABLE)

# Import stripe only if needed (optional dependency)
stripe = None
if STRIPE_API_KEY:
    try:
        import stripe
        stripe.api_key = STRIPE_API_KEY
    except ImportError:
        print("⚠️ Stripe module not available, Stripe deletion will be skipped")
        stripe = None


def delete_from_cognito(cognito_sub: str) -> bool:
    """Delete user from Cognito."""
    if not COGNITO_USER_POOL_ID:
        print("⚠️ COGNITO_USER_POOL_ID not set, skipping Cognito deletion")
        return True
    
    try:
        cognito.admin_delete_user(
            UserPoolId=COGNITO_USER_POOL_ID,
            Username=cognito_sub
        )
        print(f"✅ Deleted from Cognito: {cognito_sub}")
        return True
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', '')
        if error_code == 'UserNotFoundException':
            print(f"ℹ️ User not found in Cognito: {cognito_sub} (may already be deleted)")
            return True  # Already deleted - not an error
        print(f"❌ Error deleting from Cognito: {e}")
        return False
    except Exception as e:
        print(f"❌ Error deleting from Cognito: {e}")
        return False


def delete_from_dynamodb(cognito_sub: str) -> Dict[str, bool]:
    """Delete user from DynamoDB (UserProfiles and Entitlements)."""
    results = {
        "userprofiles": False,
        "entitlements": False
    }
    
    # Delete from UserProfiles
    try:
        users_table.delete_item(Key={"userId": cognito_sub})
        print(f"✅ Deleted from DynamoDB UserProfiles: {cognito_sub}")
        results["userprofiles"] = True
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', '')
        if error_code == 'ResourceNotFoundException':
            print(f"ℹ️ UserProfiles table not found (may not exist)")
            results["userprofiles"] = True  # Not an error if table doesn't exist
        else:
            print(f"⚠️ Error deleting from UserProfiles: {e}")
    except Exception as e:
        print(f"⚠️ Error deleting from UserProfiles: {e}")
    
    # Delete from Entitlements
    try:
        entitlements_table.delete_item(Key={"cognito_sub": cognito_sub})
        print(f"✅ Deleted from DynamoDB Entitlements: {cognito_sub}")
        results["entitlements"] = True
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', '')
        if error_code == 'ResourceNotFoundException':
            print(f"ℹ️ Entitlements table not found (may not exist)")
            results["entitlements"] = True  # Not an error if table doesn't exist
        else:
            print(f"⚠️ Error deleting from Entitlements: {e}")
    except Exception as e:
        print(f"⚠️ Error deleting from Entitlements: {e}")
        # Not critical if entitlements don't exist
    
    return results


def delete_from_stripe(stripe_customer_id: Optional[str]) -> bool:
    """Delete customer from Stripe."""
    if not stripe_customer_id:
        print("ℹ️ No Stripe customer ID found, skipping Stripe deletion")
        return True
    
    if not STRIPE_API_KEY:
        print("⚠️ STRIPE_API_KEY not set, skipping Stripe deletion")
        return True
    
    if stripe is None:
        print("⚠️ Stripe module not available, skipping Stripe deletion")
        return True
    
    try:
        stripe.Customer.delete(stripe_customer_id)
        print(f"✅ Deleted from Stripe: {stripe_customer_id}")
        return True
    except stripe.error.InvalidRequestError as e:
        if "No such customer" in str(e):
            print(f"ℹ️ Customer not found in Stripe: {stripe_customer_id} (may already be deleted)")
            return True  # Already deleted - not an error
        print(f"❌ Error deleting from Stripe: {e}")
        return False
    except Exception as e:
        print(f"❌ Error deleting from Stripe: {e}")
        return False


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for delete user API endpoint.
    
    Flow:
    1. Extract cognito_sub from API Gateway event (Cognito Authorizer)
    2. Get user info from DynamoDB to find Stripe customer ID
    3. Delete from all systems:
       - DynamoDB UserProfiles
       - DynamoDB predixa_entitlements
       - Stripe customer (if exists)
       - Cognito user
    4. Return success/error response
    
    Returns:
        API Gateway response dict
    """
    print(f"📥 Delete user request: {json.dumps(event, default=str)[:500]}...")
    
    # Validate config
    config_check = validate_config(require_stripe=False, require_webhook=False)
    if not config_check["valid"]:
        missing = ", ".join(config_check["missing"])
        print(f"⚠️ Missing config: {missing}. Continuing with available config...")
    
    # Extract Cognito user ID from event
    # API Gateway with Cognito Authorizer puts claims in requestContext.authorizer.claims
    cognito_sub = extract_cognito_sub_from_event(event)
    
    if not cognito_sub:
        print("❌ No cognito_sub found in event - user not authenticated")
        return create_response(
            401,
            {"error": "Unauthorized - missing user identity"}
        )
    
    print(f"🗑️ Deleting user account: {cognito_sub}")
    
    # Get user info to find Stripe customer ID
    # SECURITY: We use cognito_sub from JWT (validated by API Gateway Cognito Authorizer)
    # This ensures users can only delete their own account
    user = get_user(cognito_sub)
    stripe_customer_id = None
    email = "unknown"
    
    if user:
        # Additional security check: verify userId matches cognito_sub from JWT
        user_id = user.get("userId")
        if user_id and user_id != cognito_sub:
            print(f"❌ SECURITY ERROR: User ID mismatch! JWT sub={cognito_sub}, DB userId={user_id}")
            return create_response(
                403,
                {"error": "Forbidden - user ID mismatch"}
            )
        
        stripe_customer_id = user.get("stripeCustomerId")
        email = user.get("email", "unknown")
        print(f"   User email: {email}")
        print(f"   Stripe customer ID: {stripe_customer_id or 'None'}")
    else:
        print(f"ℹ️ User not found in DynamoDB UserProfiles (may have been deleted already)")
    
    # Delete from all systems
    # Order: DynamoDB first (faster), then Stripe, then Cognito (slowest)
    results = {
        "dynamodb": delete_from_dynamodb(cognito_sub),
        "stripe": delete_from_stripe(stripe_customer_id),
        "cognito": delete_from_cognito(cognito_sub)
    }
    
    # Determine overall success
    # Consider it successful if at least Cognito deletion worked
    # (DynamoDB and Stripe are secondary - user is effectively deleted if Cognito is gone)
    dynamodb_success = results["dynamodb"]["userprofiles"] or results["dynamodb"]["entitlements"]
    stripe_success = results["stripe"]
    cognito_success = results["cognito"]
    
    overall_success = cognito_success  # Cognito deletion is the most important
    
    # Log summary
    print("-" * 60)
    print(f"Deletion Summary:")
    print(f"  - DynamoDB UserProfiles: {'✅' if results['dynamodb']['userprofiles'] else '❌'}")
    print(f"  - DynamoDB Entitlements: {'✅' if results['dynamodb']['entitlements'] else '❌'}")
    print(f"  - Stripe: {'✅' if stripe_success else '❌'}")
    print(f"  - Cognito: {'✅' if cognito_success else '❌'}")
    print("-" * 60)
    
    if overall_success:
        print(f"✅ Successfully deleted user account: {cognito_sub}")
        return create_response(
            200,
            {
                "success": True,
                "message": "User account deleted successfully",
                "deleted": {
                    "cognito": cognito_success,
                    "dynamodb_userprofiles": results["dynamodb"]["userprofiles"],
                    "dynamodb_entitlements": results["dynamodb"]["entitlements"],
                    "stripe": stripe_success
                }
            }
        )
    else:
        print(f"❌ Failed to delete user account: {cognito_sub}")
        return create_response(
            500,
            {
                "success": False,
                "error": "Failed to delete user account",
                "details": {
                    "cognito": cognito_success,
                    "dynamodb_userprofiles": results["dynamodb"]["userprofiles"],
                    "dynamodb_entitlements": results["dynamodb"]["entitlements"],
                    "stripe": stripe_success
                }
            }
        )


# Local testing
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        # Simulate API Gateway event with Cognito Authorizer
        test_event = {
            "requestContext": {
                "authorizer": {
                    "claims": {
                        "sub": "test-user-123",
                        "cognito:username": "test-user-123",
                        "email": "test@example.com"
                    }
                }
            },
            "headers": {
                "Authorization": "Bearer test-token"
            },
            "httpMethod": "DELETE",
            "path": "/me/account"
        }
        
        print("🧪 Testing Delete User Lambda...")
        print(f"Event: {json.dumps(test_event, indent=2)}")
        print("\n" + "="*50)
        print("⚠️  WARNING: This will attempt to delete a test user!")
        print("⚠️  Make sure COGNITO_USER_POOL_ID is set correctly")
        print("="*50 + "\n")
        
        result = lambda_handler(test_event, None)
        
        print("\n" + "="*50)
        print("✅ Test completed")
        print(f"Result: {json.dumps(result, indent=2, default=str)}")
    else:
        print("Usage: python delete_user_lambda.py test")
        print("\n⚠️  WARNING: This will delete a user account!")
        print("Make sure you're testing with a test user, not a real one.")

