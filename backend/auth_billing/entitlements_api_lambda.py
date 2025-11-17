"""
Entitlements API Lambda Handler

Returns subscription status for the authenticated user.

API Gateway setup:
- GET /me/entitlements
- Cognito Authorizer (validates JWT automatically)
- User info available in event.requestContext.authorizer.claims
"""
import json
import math
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Union
from decimal import Decimal
from config import validate_config
from ddb import get_entitlement, update_entitlement
from utils import extract_cognito_sub_from_event, create_response, iso_now


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for entitlements API endpoint.
    
    Flow:
    1. Extract cognito_sub from API Gateway event (Cognito Authorizer)
    2. Get entitlement record from DynamoDB
    3. Return status, plan, current_period_end, trial_expires_at
    4. Handle missing records gracefully (return status="none")
    
    Returns:
        API Gateway response dict
    """
    print(f"📥 Entitlements API request: {json.dumps(event, default=str)[:500]}...")
    
    # Validate config
    config_check = validate_config(require_stripe=False, require_webhook=False)
    if not config_check["valid"]:
        missing = ", ".join(config_check["missing"])
        return create_response(
            500,
            {"error": f"Configuration error: missing {missing}"}
        )
    
    # Extract Cognito user ID from event
    # API Gateway with Cognito Authorizer puts claims in requestContext.authorizer.claims
    cognito_sub = extract_cognito_sub_from_event(event)
    
    if not cognito_sub:
        print("❌ No cognito_sub found in event - user not authenticated")
        return create_response(
            401,
            {"error": "Unauthorized - missing user identity"}
        )
    
    print(f"👤 Fetching entitlements for: {cognito_sub}")
    
    # Get entitlement record from DynamoDB
    entitlement = get_entitlement(cognito_sub)
    
    if not entitlement:
        print(f"ℹ️ No entitlement record found for {cognito_sub}, returning default trial state")
        return create_response(
            200,
            {
                "status": "none",
                "plan": None,
                "current_period_end": None,
                "trial_expires_at": None,
                "trial_started_at": None,
                "trial_days_remaining": 0,
                "trial_active": False,
                "access_granted": False,
                "access_reason": "no_entitlement"
            }
        )
    
    status = entitlement.get("status", "none")
    plan = entitlement.get("plan")

    def _to_int(value: Optional[Union[int, float, Decimal, str]]) -> Optional[int]:
        if isinstance(value, Decimal):
            try:
                return int(value)
            except (ValueError, TypeError):
                return None
        if isinstance(value, (int, float)):
            return int(value)
        if isinstance(value, str):
            try:
                return int(value)
            except ValueError:
                return None
        return None

    current_period_end = _to_int(entitlement.get("current_period_end"))
    trial_expires_at = _to_int(entitlement.get("trial_expires_at"))
    trial_started_at = entitlement.get("trial_started_at")
    
    now_ts = int(datetime.now(timezone.utc).timestamp())
    trial_active = False
    trial_days_remaining = 0
    
    # If user has active subscription, trial is automatically cancelled
    # Don't check trial status if subscription is active
    if status == "active":
        trial_active = False
        trial_days_remaining = 0
        # Ensure trial fields are cleared if they still exist
        if trial_expires_at is not None or entitlement.get("trial_days_remaining", 0) > 0:
            print(f"🔄 User has active subscription but trial fields still exist - clearing them")
            update_entitlement(
                cognito_sub=cognito_sub,
                status=status,
                plan=plan,
                current_period_end=current_period_end,
                trial_expires_at=None,
                trial_days_remaining=0,
                email=entitlement.get("email")
            )
    elif trial_expires_at is not None:
        seconds_remaining = trial_expires_at - now_ts
        if seconds_remaining > 0:
            trial_active = True
            trial_days_remaining = max(1, math.ceil(seconds_remaining / 86400))
        else:
            # Trial expired - flip status if still marked as trialing
            if status == "trialing":
                print(f"⌛ Trial expired for {cognito_sub}, updating entitlement status")
                update_success = update_entitlement(
                    cognito_sub=cognito_sub,
                    status="trial_expired",
                    plan=plan,
                    current_period_end=current_period_end,
                    trial_expires_at=int(trial_expires_at),
                    trial_started_at=trial_started_at,
                    email=entitlement.get("email"),
                    trial_days_remaining=0,
                    additional_attributes={
                        "trial_expired_at": iso_now()
                    }
                )
                if update_success:
                    status = "trial_expired"
                    entitlement["status"] = "trial_expired"
                else:
                    print(f"⚠️ Failed to update entitlement status for {cognito_sub}")
    
    access_granted = False
    access_reason = "none"
    
    if status == "active":
        access_granted = True
        access_reason = "active_subscription"
    elif status == "trialing" and trial_active:
        access_granted = True
        access_reason = "trial"
    elif status in {"past_due"}:
        access_granted = False
        access_reason = "past_due"
    elif status == "trialing" and not trial_active:
        access_granted = False
        access_reason = "trial_expired"
    elif status == "trial_expired":
        access_granted = False
        access_reason = "trial_expired"
    elif status == "canceled":
        access_granted = False
        access_reason = "canceled"
    else:
        access_reason = status or "none"
    
    target_trial_days: Optional[int] = None
    if trial_active:
        target_trial_days = trial_days_remaining
    elif status in {"trialing", "trial_expired"}:
        target_trial_days = 0

    existing_trial_days = _to_int(entitlement.get("trial_days_remaining"))

    if (
        target_trial_days is not None
        and (existing_trial_days is None or existing_trial_days != target_trial_days)
    ):
        update_entitlement(
            cognito_sub=cognito_sub,
            status=status,
            plan=plan,
            current_period_end=current_period_end,
            trial_expires_at=trial_expires_at,
            trial_started_at=trial_started_at,
            email=entitlement.get("email"),
            trial_days_remaining=target_trial_days
        )
    response_data = {
        "status": status,
        "plan": plan,
        "current_period_end": current_period_end,
        "trial_expires_at": trial_expires_at,
        "trial_started_at": trial_started_at,
        "trial_days_remaining": trial_days_remaining,
        "trial_active": trial_active,
        "access_granted": access_granted,
        "access_reason": access_reason
    }
    
    print(
        f"✅ Returning entitlements: status={response_data['status']}, "
        f"trial_active={response_data['trial_active']}, "
        f"access_granted={response_data['access_granted']}"
    )
    
    return create_response(200, response_data)


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
            }
        }
        
        print("🧪 Testing Entitlements API Lambda...")
        print(f"Event: {json.dumps(test_event, indent=2)}")
        print("\n" + "="*50)
        
        result = lambda_handler(test_event, None)
        
        print("\n" + "="*50)
        print("✅ Test completed")
        print(f"Result: {json.dumps(result, indent=2, default=str)}")
    else:
        print("Usage: python entitlements_api_lambda.py test")

