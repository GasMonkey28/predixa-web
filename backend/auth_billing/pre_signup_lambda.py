"""
Cognito Pre-Signup Lambda Trigger

Prevents duplicate emails by checking if email already exists.
If found, prevents signup and shows error message.

Event structure:
{
    "version": "1",
    "region": "us-east-1",
    "userPoolId": "us-east-1_XXXXXXXXX",
    "userName": "cognito-sub-uuid",
    "triggerSource": "PreSignUp_SignUp" or "PreSignUp_ExternalProvider",
    "request": {
        "userAttributes": {
            "email": "user@example.com",
            ...
        }
    },
    "response": {}
}
"""
import json
import boto3
from typing import Dict, Any
from botocore.exceptions import ClientError
from config import USERS_TABLE, AWS_REGION, EMAIL_INDEX_NAME

# Initialize DynamoDB resource
dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
users_table = dynamodb.Table(USERS_TABLE)


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Pre-signup trigger to prevent duplicate emails.
    
    Flow:
    1. Extract email from event
    2. Check if email exists in DynamoDB (using EmailIndex GSI)
    3. If exists, raise exception to prevent signup
    4. If not exists, allow signup to proceed
    
    Returns:
        Event dict (must return event for Cognito triggers)
    """
    print(f"📥 Pre-Signup event received: {json.dumps(event, default=str)}")
    
    try:
        # Extract user info from Cognito event
        user_attrs = event.get("request", {}).get("userAttributes", {})
        email = user_attrs.get("email", "").strip().lower()
        trigger_source = event.get("triggerSource", "")
        
        if not email:
            print("⚠️ No email found in event, allowing signup")
            return event
        
        print(f"🔍 Pre-Signup: email={email}, source={trigger_source}")
        
        # Check if email exists in DynamoDB using EmailIndex GSI
        try:
            response = users_table.query(
                IndexName=EMAIL_INDEX_NAME,
                KeyConditionExpression="email = :email",
                ExpressionAttributeValues={":email": email},
                Limit=1
            )
            
            if response.get("Items"):
                existing_user = response["Items"][0]
                existing_cognito_sub = existing_user.get("userId", "unknown")
                
                print(f"⚠️ Email {email} already exists for user {existing_cognito_sub}")
                
                # For email/password signup: prevent duplicate
                if trigger_source == "PreSignUp_SignUp":
                    error_msg = (
                        f"An account with email {email} already exists. "
                        "Please sign in instead or use a different email address."
                    )
                    print(f"❌ Blocking duplicate signup: {error_msg}")
                    raise Exception(error_msg)
                
                # For external provider (Google/Apple): 
                # Option 1: Block (current behavior)
                # Option 2: Allow but note that account linking would be needed
                elif trigger_source in ["PreSignUp_ExternalProvider", "PreSignUp_AdminCreateUser"]:
                    # For now, we'll block external provider duplicates too
                    # You can modify this to allow and link accounts later
                    error_msg = (
                        f"An account with email {email} already exists. "
                        "Please sign in with your existing account instead."
                    )
                    print(f"❌ Blocking external provider duplicate: {error_msg}")
                    raise Exception(error_msg)
            
            print(f"✅ Email {email} is unique, allowing signup")
            
        except ClientError as e:
            # If EmailIndex doesn't exist or query fails, log but allow signup
            # This is a "fail open" approach - better to allow signup than block legitimate users
            error_code = e.response.get("Error", {}).get("Code", "")
            if error_code in {"ResourceNotFoundException", "ValidationException"}:
                print(
                    f"⚠️ DynamoDB index '{EMAIL_INDEX_NAME}' not found. "
                    "Please ensure the EmailIndex GSI exists on UserProfiles table."
                )
                print(f"   Allowing signup for now, but duplicates may occur.")
            else:
                print(f"⚠️ Error querying EmailIndex: {e}")
                print(f"   Allowing signup (fail open)")
            # Don't raise - allow signup to proceed
    
    except Exception as e:
        # If it's our intentional error (duplicate email), re-raise it
        if "already exists" in str(e):
            raise e
        # For other errors, log and allow signup (fail open)
        print(f"⚠️ Unexpected error in Pre-Signup handler: {e}")
        import traceback
        traceback.print_exc()
    
    # Always return event if we reach here (signup allowed)
    return event


# Local testing
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        # Test case 1: New email (should allow)
        test_event_new = {
            "version": "1",
            "region": "us-east-1",
            "userPoolId": "us-east-1_TEST123",
            "userName": "test-user-new",
            "triggerSource": "PreSignUp_SignUp",
            "request": {
                "userAttributes": {
                    "email": "newuser@example.com",
                    "email_verified": "false"
                }
            },
            "response": {}
        }
        
        # Test case 2: Duplicate email (should block)
        test_event_duplicate = {
            "version": "1",
            "region": "us-east-1",
            "userPoolId": "us-east-1_TEST123",
            "userName": "test-user-duplicate",
            "triggerSource": "PreSignUp_SignUp",
            "request": {
                "userAttributes": {
                    "email": "existing@example.com",  # Assume this exists
                    "email_verified": "false"
                }
            },
            "response": {}
        }
        
        print("🧪 Testing Pre-Signup Lambda...")
        print("\n" + "="*50)
        print("Test 1: New email (should allow)")
        print("="*50)
        try:
            result = lambda_handler(test_event_new, None)
            print("✅ Test 1 passed: Signup allowed")
        except Exception as e:
            print(f"❌ Test 1 failed: {e}")
        
        print("\n" + "="*50)
        print("Test 2: Duplicate email (should block)")
        print("="*50)
        try:
            result = lambda_handler(test_event_duplicate, None)
            print("⚠️ Test 2: Signup was allowed (email might not exist in DB)")
        except Exception as e:
            if "already exists" in str(e):
                print(f"✅ Test 2 passed: Duplicate blocked - {e}")
            else:
                print(f"❌ Test 2 failed with unexpected error: {e}")
    else:
        print("Usage: python pre_signup_lambda.py test")

