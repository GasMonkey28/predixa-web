"""
Scheduled Lambda function to update trial_days_remaining for all users.
Self-contained version - paste this directly into Lambda console.

This Lambda runs daily via EventBridge to ensure trial_days_remaining
is kept up-to-date even when users don't check their entitlements.

Schedule: cron(0 2 * * ? *) - Runs daily at 2 AM UTC
"""
import json
import math
import os
import boto3
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Union, List
from decimal import Decimal
from botocore.exceptions import ClientError

# Configuration from environment variables
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
ENTITLEMENTS_TABLE = os.getenv("ENTITLEMENTS_TABLE", "predixa_entitlements")

# Initialize DynamoDB resource
dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
ENT_TABLE_OBJ = dynamodb.Table(ENTITLEMENTS_TABLE)


def iso_now() -> str:
    """Get current timestamp in ISO 8601 format."""
    return datetime.utcnow().isoformat() + "Z"


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


def scan_all_entitlements() -> List[Dict[str, Any]]:
    """
    Scan all entitlement records from predixa_entitlements table.
    Handles pagination automatically.
    
    Returns:
        List of all entitlement items
    """
    entitlements = []
    
    try:
        response = ENT_TABLE_OBJ.scan()
        entitlements.extend(response.get('Items', []))
        
        # Handle pagination
        while 'LastEvaluatedKey' in response:
            response = ENT_TABLE_OBJ.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            entitlements.extend(response.get('Items', []))
        
        return entitlements
    except ClientError as e:
        print(f"❌ Error scanning entitlements from DynamoDB: {e}")
        return []
    except Exception as e:
        print(f"❌ Unexpected error in scan_all_entitlements: {e}")
        return []


def update_entitlement(
    cognito_sub: str,
    status: str,
    plan: Optional[str] = None,
    current_period_end: Optional[int] = None,
    trial_expires_at: Optional[int] = None,
    trial_started_at: Optional[str] = None,
    email: Optional[str] = None,
    trial_days_remaining: Optional[int] = None,
    additional_attributes: Optional[Dict[str, Any]] = None
) -> bool:
    """
    Update or create entitlement record in predixa_entitlements table.
    
    Args:
        cognito_sub: Cognito user ID (partition key)
        status: Subscription status (active, trialing, past_due, canceled, none)
        plan: Plan identifier (optional)
        current_period_end: Unix timestamp of current period end (optional)
        trial_expires_at: Unix timestamp of trial expiration (optional)
        trial_started_at: ISO timestamp string (optional)
        email: User email (optional)
        trial_days_remaining: Days remaining in trial (optional)
        additional_attributes: Additional fields to update (optional)
    
    Returns:
        True if successful, False otherwise
    """
    try:
        now = iso_now()
        
        # Build update expression
        update_expr = "SET #status = :status, updatedAt = :ua"
        expr_names = {"#status": "status"}
        expr_attrs = {
            ":status": status,
            ":ua": now
        }
        
        if plan is not None:
            update_expr += ", #plan = :plan"
            expr_names["#plan"] = "plan"
            expr_attrs[":plan"] = plan
        
        if current_period_end is not None:
            update_expr += ", current_period_end = :cpe"
            expr_attrs[":cpe"] = current_period_end
        
        if trial_expires_at is not None:
            update_expr += ", trial_expires_at = :tea"
            expr_attrs[":tea"] = trial_expires_at
        
        if trial_started_at is not None:
            update_expr += ", trial_started_at = :tsa"
            expr_attrs[":tsa"] = trial_started_at
        
        if email is not None:
            update_expr += ", email = :email_attr"
            expr_attrs[":email_attr"] = email
        
        if trial_days_remaining is not None:
            update_expr += ", trial_days_remaining = :tdr"
            expr_attrs[":tdr"] = trial_days_remaining
        
        if additional_attributes:
            for key, value in additional_attributes.items():
                placeholder = f"#{key}"
                value_placeholder = f":{key}"
                expr_names[placeholder] = key
                update_expr += f", {placeholder} = {value_placeholder}"
                expr_attrs[value_placeholder] = value
        
        # Since we're processing records from a scan, they should all exist
        # Always use UpdateItem (not PutItem) for scanned records
        ENT_TABLE_OBJ.update_item(
            Key={"cognito_sub": cognito_sub},
            UpdateExpression=update_expr,
            ExpressionAttributeNames=expr_names,
            ExpressionAttributeValues=expr_attrs
        )
        
        return True
    except ClientError as e:
        print(f"❌ Error updating entitlement in DynamoDB: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error in update_entitlement: {e}")
        return False


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
    
    # Validate required environment variables
    if not ENTITLEMENTS_TABLE:
        error_msg = "Configuration error: missing ENTITLEMENTS_TABLE environment variable"
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
        
        # Process trialing users with trial_expires_at
        # Also process expired trials that are still marked as "trialing" (need to update status)
        if trial_expires_at is None:
            skipped_count += 1
            continue
        
        # Skip if status is not trialing (unless we need to check for expired)
        if status != "trialing":
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

