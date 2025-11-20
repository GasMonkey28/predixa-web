"""
Scheduled Lambda function to update trial_days_remaining for all users.

This Lambda runs daily via EventBridge to ensure trial_days_remaining
is kept up-to-date even when users don't check their entitlements.

Schedule: cron(0 2 * * ? *) - Runs daily at 2 AM UTC
"""
import json
import math
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Union
from decimal import Decimal
from config import validate_config
from ddb import scan_all_entitlements, update_entitlement
from utils import iso_now


def _to_int(value: Optional[Union[int, float, Decimal, str]]) -> Optional[int]:
    """Convert various numeric types to int."""
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


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for scheduled trial days update.
    
    Scans all entitlements and updates trial_days_remaining for users in trialing status.
    Also handles expired trials by updating status to "trial_expired".
    
    Args:
        event: EventBridge scheduled event
        context: Lambda context
    
    Returns:
        Summary of updates performed
    """
    print("🔄 Starting scheduled trial_days_remaining update...")
    
    # Validate config
    config_check = validate_config(require_stripe=False, require_webhook=False)
    if not config_check["valid"]:
        missing = ", ".join(config_check["missing"])
        error_msg = f"Configuration error: missing {missing}"
        print(f"❌ {error_msg}")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": error_msg})
        }
    
    # Scan all entitlements
    print("📊 Scanning all entitlements...")
    entitlements = scan_all_entitlements()
    total_count = len(entitlements)
    print(f"📋 Found {total_count} entitlement records")
    
    now_ts = int(datetime.now(timezone.utc).timestamp())
    updated_count = 0
    expired_count = 0
    skipped_count = 0
    error_count = 0
    
    # Process each entitlement
    for entitlement in entitlements:
        cognito_sub = entitlement.get("cognito_sub")
        if not cognito_sub:
            print(f"⚠️ Skipping entitlement without cognito_sub: {entitlement}")
            skipped_count += 1
            continue
        
        status = entitlement.get("status", "none")
        trial_expires_at = _to_int(entitlement.get("trial_expires_at"))
        
        # Only process trialing users with trial_expires_at
        if status != "trialing" or trial_expires_at is None:
            skipped_count += 1
            continue
        
        try:
            # Calculate current trial days remaining
            seconds_remaining = trial_expires_at - now_ts
            
            if seconds_remaining > 0:
                # Trial still active - calculate days remaining
                trial_days_remaining = max(1, math.ceil(seconds_remaining / 86400))
                existing_trial_days = _to_int(entitlement.get("trial_days_remaining"))
                
                # Only update if value has changed
                if existing_trial_days != trial_days_remaining:
                    print(
                        f"🔄 Updating {cognito_sub}: "
                        f"{existing_trial_days} → {trial_days_remaining} days"
                    )
                    update_success = update_entitlement(
                        cognito_sub=cognito_sub,
                        status=status,
                        plan=entitlement.get("plan"),
                        current_period_end=_to_int(entitlement.get("current_period_end")),
                        trial_expires_at=trial_expires_at,
                        trial_started_at=entitlement.get("trial_started_at"),
                        email=entitlement.get("email"),
                        trial_days_remaining=trial_days_remaining
                    )
                    if update_success:
                        updated_count += 1
                    else:
                        print(f"⚠️ Failed to update {cognito_sub}")
                        error_count += 1
                else:
                    skipped_count += 1
            else:
                # Trial expired - update status to trial_expired
                print(f"⌛ Trial expired for {cognito_sub}, updating status")
                update_success = update_entitlement(
                    cognito_sub=cognito_sub,
                    status="trial_expired",
                    plan=entitlement.get("plan"),
                    current_period_end=_to_int(entitlement.get("current_period_end")),
                    trial_expires_at=trial_expires_at,
                    trial_started_at=entitlement.get("trial_started_at"),
                    email=entitlement.get("email"),
                    trial_days_remaining=0,
                    additional_attributes={
                        "trial_expired_at": iso_now()
                    }
                )
                if update_success:
                    expired_count += 1
                else:
                    print(f"⚠️ Failed to update expired trial for {cognito_sub}")
                    error_count += 1
        except Exception as e:
            print(f"❌ Error processing {cognito_sub}: {e}")
            error_count += 1
    
    # Summary
    summary = {
        "total_entitlements": total_count,
        "updated": updated_count,
        "expired": expired_count,
        "skipped": skipped_count,
        "errors": error_count,
        "timestamp": iso_now()
    }
    
    print(f"✅ Update complete: {json.dumps(summary, indent=2)}")
    
    return {
        "statusCode": 200,
        "body": json.dumps(summary, default=str)
    }


# Local testing
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        # Simulate EventBridge scheduled event
        test_event = {
            "version": "0",
            "id": "test-event-id",
            "detail-type": "Scheduled Event",
            "source": "aws.events",
            "account": "123456789012",
            "time": datetime.now(timezone.utc).isoformat(),
            "region": "us-east-1",
            "resources": ["arn:aws:events:us-east-1:123456789012:rule/test-rule"],
            "detail": {}
        }
        
        print("🧪 Testing Update Trial Days Lambda...")
        print(f"Event: {json.dumps(test_event, indent=2, default=str)}")
        print("\n" + "="*50)
        
        result = lambda_handler(test_event, None)
        
        print("\n" + "="*50)
        print("✅ Test completed")
        print(f"Result: {json.dumps(result, indent=2, default=str)}")
    else:
        print("Usage: python update_trial_days_lambda.py test")

