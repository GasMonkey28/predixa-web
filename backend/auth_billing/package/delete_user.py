"""
Utility to delete a user across all systems (Cognito, DynamoDB, Stripe).

This provides a centralized way to delete a user from all three systems.
Note: This is a HARD DELETE - use with caution!

Usage:
    python delete_user.py <cognito_sub_or_email> [--confirm]
    
Example:
    python delete_user.py user@example.com --confirm
    python delete_user.py a1b2c3d4-e5f6-7890-abcd-ef1234567890 --confirm
"""
import boto3
import stripe
import sys
from typing import Optional, Dict, Any
from config import USERS_TABLE, ENTITLEMENTS_TABLE, AWS_REGION, STRIPE_API_KEY, COGNITO_USER_POOL_ID

# Initialize clients
cognito = boto3.client('cognito-idp', region_name=AWS_REGION)
dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
users_table = dynamodb.Table(USERS_TABLE)
entitlements_table = dynamodb.Table(ENTITLEMENTS_TABLE)

if STRIPE_API_KEY:
    stripe.api_key = STRIPE_API_KEY


def find_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Find user by email in DynamoDB."""
    try:
        response = users_table.query(
            IndexName="EmailIndex",
            KeyConditionExpression="email = :email",
            ExpressionAttributeValues={":email": email.lower()},
            Limit=1
        )
        
        if response.get("Items"):
            return response["Items"][0]
    except Exception as e:
        print(f"⚠️ Error finding user by email: {e}")
    
    return None


def get_user_info(identifier: str) -> Optional[Dict[str, Any]]:
    """Get user info by cognito_sub or email."""
    # Try as cognito_sub first
    user = users_table.get_item(Key={"userId": identifier})
    if "Item" in user:
        return user["Item"]
    
    # Try as email
    user = find_user_by_email(identifier)
    if user:
        return user
    
    return None


def delete_from_cognito(cognito_sub: str) -> bool:
    """Delete user from Cognito."""
    try:
        cognito.admin_delete_user(
            UserPoolId=COGNITO_USER_POOL_ID,
            Username=cognito_sub
        )
        print(f"✅ Deleted from Cognito: {cognito_sub}")
        return True
    except cognito.exceptions.UserNotFoundException:
        print(f"ℹ️ User not found in Cognito: {cognito_sub}")
        return True  # Already deleted
    except Exception as e:
        print(f"❌ Error deleting from Cognito: {e}")
        return False


def delete_from_dynamodb(cognito_sub: str) -> bool:
    """Delete user from DynamoDB (UserProfiles and Entitlements)."""
    success = True
    
    # Delete from UserProfiles
    try:
        users_table.delete_item(Key={"userId": cognito_sub})
        print(f"✅ Deleted from DynamoDB UserProfiles: {cognito_sub}")
    except Exception as e:
        print(f"⚠️ Error deleting from UserProfiles: {e}")
        success = False
    
    # Delete from Entitlements
    try:
        entitlements_table.delete_item(Key={"cognito_sub": cognito_sub})
        print(f"✅ Deleted from DynamoDB Entitlements: {cognito_sub}")
    except Exception as e:
        print(f"⚠️ Error deleting from Entitlements: {e}")
        # Not critical if entitlements don't exist
    
    return success


def delete_from_stripe(stripe_customer_id: str) -> bool:
    """Delete customer from Stripe."""
    if not STRIPE_API_KEY:
        print("⚠️ STRIPE_API_KEY not set, skipping Stripe deletion")
        return True
    
    try:
        stripe.Customer.delete(stripe_customer_id)
        print(f"✅ Deleted from Stripe: {stripe_customer_id}")
        return True
    except stripe.error.InvalidRequestError as e:
        if "No such customer" in str(e):
            print(f"ℹ️ Customer not found in Stripe: {stripe_customer_id}")
            return True  # Already deleted
        print(f"❌ Error deleting from Stripe: {e}")
        return False
    except Exception as e:
        print(f"❌ Error deleting from Stripe: {e}")
        return False


def delete_user(identifier: str, confirm: bool = False) -> bool:
    """
    Delete user from all systems.
    
    Args:
        identifier: Cognito sub or email address
        confirm: Whether deletion is confirmed
    
    Returns:
        True if successful, False otherwise
    """
    if not confirm:
        print("⚠️ Deletion not confirmed. Use --confirm flag to proceed.")
        return False
    
    # Get user info
    user = get_user_info(identifier)
    if not user:
        print(f"❌ User not found: {identifier}")
        return False
    
    cognito_sub = user.get("userId")
    stripe_customer_id = user.get("stripeCustomerId")
    email = user.get("email", "unknown")
    
    print(f"🗑️ Deleting user: {email} ({cognito_sub})")
    print("-" * 60)
    
    # Delete from all systems
    results = {
        "cognito": delete_from_cognito(cognito_sub),
        "dynamodb": delete_from_dynamodb(cognito_sub),
        "stripe": delete_from_stripe(stripe_customer_id) if stripe_customer_id else True
    }
    
    # Summary
    print("-" * 60)
    if all(results.values()):
        print(f"✅ Successfully deleted user from all systems")
        return True
    else:
        print(f"⚠️ Deletion completed with some errors. Check above for details.")
        return False


def main():
    """Main function."""
    if len(sys.argv) < 2:
        print("Usage: python delete_user.py <cognito_sub_or_email> [--confirm]")
        print("\nExample:")
        print("  python delete_user.py user@example.com --confirm")
        print("  python delete_user.py a1b2c3d4-e5f6-7890-abcd-ef1234567890 --confirm")
        return
    
    identifier = sys.argv[1]
    confirm = '--confirm' in sys.argv
    
    if not COGNITO_USER_POOL_ID:
        print("❌ COGNITO_USER_POOL_ID not set in config")
        return
    
    delete_user(identifier, confirm=confirm)


if __name__ == "__main__":
    main()

