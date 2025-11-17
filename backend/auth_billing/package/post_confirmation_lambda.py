"""
Cognito Post-Confirmation Lambda Trigger

Triggered when a user confirms their email/signs up.
Creates Stripe customer and initializes DynamoDB records.

Event structure:
{
    "version": "1",
    "region": "us-east-1",
    "userPoolId": "us-east-1_XXXXXXXXX",
    "userName": "cognito-sub-uuid",
    "triggerSource": "PostConfirmation_ConfirmSignUp",
    "request": {
        "userAttributes": {
            "sub": "cognito-sub-uuid",
            "email": "user@example.com",
            "email_verified": "true",
            ...
        }
    },
    "response": {}
}
"""
import json
import os
import stripe
from typing import Dict, Any, Optional
from config import STRIPE_API_KEY, TRIAL_DAYS, validate_config
from ddb import put_user, init_entitlement
from utils import calculate_trial_end, iso_now


# Initialize Stripe
if STRIPE_API_KEY:
    stripe.api_key = STRIPE_API_KEY


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for Cognito Post-Confirmation trigger.
    
    Flow:
    1. Extract user info from event
    2. Create Stripe customer (with retry logic)
    3. Write to UserProfiles table (with stripe_customer_id)
    4. Initialize entitlements record (status="none")
    
    Returns:
        Event dict (must return event for Cognito triggers)
    """
    print(f"📥 Post-Confirmation event received: {json.dumps(event, default=str)}")
    
    # Validate config
    config_check = validate_config()
    if not config_check["valid"]:
        missing = ", ".join(config_check["missing"])
        print(f"⚠️ Missing config: {missing}. Continuing with available config...")
    
    try:
        # Extract user info from Cognito event
        user_attrs = event.get("request", {}).get("userAttributes", {})
        cognito_username = event.get("userName")
        cognito_sub = user_attrs.get("sub") or cognito_username

        if cognito_username and cognito_sub and cognito_username != cognito_sub:
            print(
                "ℹ️ Cognito username differs from sub; "
                f"using sub for persistence. username={cognito_username}, sub={cognito_sub}"
            )
        email = user_attrs.get("email")
        
        if not cognito_sub:
            print("❌ No cognito_sub found in event")
            return event  # Return event anyway to not block user signup
        
        if not email:
            print(f"⚠️ No email found for user {cognito_sub}, using placeholder")
            email = f"user-{cognito_sub}@predixa.com"
        
        print(f"👤 Processing user: {cognito_sub} ({email})")
        
        # Step 1: Determine trial window
        trial_started_at = iso_now()
        trial_expires_at = calculate_trial_end()
        
        # Step 2: Create Stripe customer (with retry)
        stripe_customer_id = None
        if STRIPE_API_KEY:
            stripe_customer_id = create_stripe_customer_with_retry(
                email=email,
                cognito_sub=cognito_sub,
                trial_started_at=trial_started_at,
                trial_expires_at=trial_expires_at,
                max_retries=3
            )
        else:
            print("⚠️ STRIPE_API_KEY not set, skipping Stripe customer creation")
        
        # Step 3: Write to UserProfiles table
        # Extract additional fields if present
        extra_fields = {}
        if user_attrs.get("given_name"):
            extra_fields["givenName"] = user_attrs["given_name"]
        if user_attrs.get("family_name"):
            extra_fields["familyName"] = user_attrs["family_name"]
        if user_attrs.get("name"):
            extra_fields["displayName"] = user_attrs["name"]
        
        user_success = put_user(
            cognito_sub=cognito_sub,
            email=email,
            stripe_customer_id=stripe_customer_id,
            **extra_fields
        )
        
        if not user_success:
            print(f"⚠️ Failed to write user to DynamoDB for {cognito_sub}")
            # Don't fail the trigger - user can be created later
        
        # Step 4: Initialize entitlements record with free trial
        entitle_success = init_entitlement(
            cognito_sub=cognito_sub,
            email=email,
            trial_started_at=trial_started_at,
            trial_expires_at=trial_expires_at
        )
        
        if not entitle_success:
            print(f"⚠️ Failed to initialize entitlements for {cognito_sub}")
            # Don't fail the trigger - can be retried
        
        print(f"✅ Post-Confirmation completed for {cognito_sub}")
        print(f"   - Stripe Customer: {stripe_customer_id or 'Not created'}")
        print(f"   - UserProfiles: {'✅' if user_success else '❌'}")
        print(f"   - Entitlements: {'✅' if entitle_success else '❌'}")
        
    except Exception as e:
        print(f"❌ Error in Post-Confirmation handler: {e}")
        import traceback
        traceback.print_exc()
        # Return event anyway - don't block user signup if our code fails
    
    # Always return event for Cognito triggers
    return event


def create_stripe_customer_with_retry(
    email: str,
    cognito_sub: str,
    trial_started_at: str,
    trial_expires_at: int,
    max_retries: int = 3
) -> Optional[str]:
    """
    Create Stripe customer with retry logic.
    
    Args:
        email: User email
        cognito_sub: Cognito user ID
        max_retries: Maximum number of retry attempts
    
    Returns:
        Stripe customer ID or None if failed
    """
    if not STRIPE_API_KEY:
        return None
    
    for attempt in range(1, max_retries + 1):
        try:
            customer = stripe.Customer.create(
                email=email,
                metadata={
                    "cognito_sub": cognito_sub,
                    "cognito_user_id": cognito_sub,
                    "platform": "web",
                    "created_via": "post_confirmation_trigger",
                    "trial_started_at": trial_started_at,
                    "trial_expires_at": str(trial_expires_at),
                    "trial_days": str(TRIAL_DAYS),
                }
            )
            print(f"✅ Created Stripe customer: {customer.id} (attempt {attempt})")
            return customer.id
        
        except stripe.error.StripeError as e:
            print(f"⚠️ Stripe error (attempt {attempt}/{max_retries}): {e}")
            if attempt == max_retries:
                print(f"❌ Failed to create Stripe customer after {max_retries} attempts")
                return None
            # Wait before retry (exponential backoff)
            import time
            time.sleep(2 ** attempt)
        
        except Exception as e:
            print(f"❌ Unexpected error creating Stripe customer: {e}")
            return None
    
    return None


# Local testing
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        # Simulate Cognito Post-Confirmation event
        test_event = {
            "version": "1",
            "region": "us-east-1",
            "userPoolId": "us-east-1_TEST123",
            "userName": "test-user-123",
            "triggerSource": "PostConfirmation_ConfirmSignUp",
            "request": {
                "userAttributes": {
                    "sub": "test-user-123",
                    "email": "test@example.com",
                    "email_verified": "true",
                    "given_name": "Test",
                    "family_name": "User"
                }
            },
            "response": {}
        }
        
        print("🧪 Testing Post-Confirmation Lambda...")
        print(f"Event: {json.dumps(test_event, indent=2)}")
        print("\n" + "="*50)
        
        result = lambda_handler(test_event, None)
        
        print("\n" + "="*50)
        print("✅ Test completed")
        print(f"Result: {json.dumps(result, indent=2, default=str)}")
    else:
        print("Usage: python post_confirmation_lambda.py test")

