"""
DynamoDB helpers for user and entitlement management.

Handles:
- UserProfiles table (extended with stripe_customer_id)
- predixa_entitlements table (subscription status)
"""
import os
import boto3
from typing import Optional, Dict, Any, List
from datetime import datetime
import math
from botocore.exceptions import ClientError
from config import USERS_TABLE, ENTITLEMENTS_TABLE, AWS_REGION, TRIAL_DAYS
from utils import calculate_trial_end

# Initialize DynamoDB resource
dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
USERS_TABLE_OBJ = dynamodb.Table(USERS_TABLE)
ENT_TABLE_OBJ = dynamodb.Table(ENTITLEMENTS_TABLE)


def iso_now() -> str:
    """Get current timestamp in ISO 8601 format."""
    return datetime.utcnow().isoformat() + "Z"


def put_user(
    cognito_sub: str,
    email: str,
    stripe_customer_id: Optional[str] = None,
    **extra_fields
) -> bool:
    """
    Create or update user in UserProfiles table.
    
    Args:
        cognito_sub: Cognito user ID (used as userId partition key)
        email: User email address
        stripe_customer_id: Stripe customer ID (optional, can be added later)
        **extra_fields: Additional fields to store (givenName, familyName, etc.)
    
    Returns:
        True if successful, False otherwise
    """
    try:
        now = iso_now()
        
        # Check if user exists
        try:
            existing = USERS_TABLE_OBJ.get_item(Key={"userId": cognito_sub})
            item_exists = "Item" in existing
        except ClientError:
            item_exists = False
        
        if item_exists:
            # Update existing user
            update_expr = "SET email = :email, updatedAt = :ua"
            expr_attrs = {
                ":email": email,
                ":ua": now
            }
            
            if stripe_customer_id:
                update_expr += ", stripeCustomerId = :stripe_id"
                expr_attrs[":stripe_id"] = stripe_customer_id
            
            # Add any extra fields
            for key, value in extra_fields.items():
                # Convert camelCase to camelCase (keep as-is for DynamoDB)
                attr_name = f":{key.lower()}"
                update_expr += f", {key} = {attr_name}"
                expr_attrs[attr_name] = value
            
            USERS_TABLE_OBJ.update_item(
                Key={"userId": cognito_sub},
                UpdateExpression=update_expr,
                ExpressionAttributeValues=expr_attrs
            )
        else:
            # Create new user
            item = {
                "userId": cognito_sub,
                "email": email,
                "createdAt": now,
                "updatedAt": now,
            }
            
            if stripe_customer_id:
                item["stripeCustomerId"] = stripe_customer_id
            
            # Add extra fields
            item.update(extra_fields)
            
            USERS_TABLE_OBJ.put_item(Item=item)
        
        return True
    except ClientError as e:
        print(f"❌ Error writing user to DynamoDB: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error in put_user: {e}")
        return False


def get_user(cognito_sub: str) -> Optional[Dict[str, Any]]:
    """
    Get user from UserProfiles table.
    
    Args:
        cognito_sub: Cognito user ID
    
    Returns:
        User item dict or None if not found
    """
    try:
        response = USERS_TABLE_OBJ.get_item(Key={"userId": cognito_sub})
        return response.get("Item")
    except ClientError as e:
        print(f"❌ Error reading user from DynamoDB: {e}")
        return None


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
        
        # Check if record exists
        try:
            existing = ENT_TABLE_OBJ.get_item(Key={"cognito_sub": cognito_sub})
            item_exists = "Item" in existing
        except ClientError:
            item_exists = False
        
        if item_exists:
            # Update existing record
            ENT_TABLE_OBJ.update_item(
                Key={"cognito_sub": cognito_sub},
                UpdateExpression=update_expr,
                ExpressionAttributeNames=expr_names,
                ExpressionAttributeValues=expr_attrs
            )
        else:
            # Create new record (use PutItem for initial creation)
            item = {
                "cognito_sub": cognito_sub,
                "status": status,
                "updatedAt": now,
            }
            
            if plan is not None:
                item["plan"] = plan
            if current_period_end is not None:
                item["current_period_end"] = current_period_end
            if trial_expires_at is not None:
                item["trial_expires_at"] = trial_expires_at
            if trial_started_at is not None:
                item["trial_started_at"] = trial_started_at
            if email is not None:
                item["email"] = email
            if trial_days_remaining is not None:
                item["trial_days_remaining"] = trial_days_remaining
            
            ENT_TABLE_OBJ.put_item(Item=item)
        
        return True
    except ClientError as e:
        print(f"❌ Error updating entitlement in DynamoDB: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error in update_entitlement: {e}")
        return False


def get_entitlement(cognito_sub: str) -> Optional[Dict[str, Any]]:
    """
    Get entitlement record from predixa_entitlements table.
    
    Args:
        cognito_sub: Cognito user ID
    
    Returns:
        Entitlement item dict or None if not found
    """
    try:
        response = ENT_TABLE_OBJ.get_item(Key={"cognito_sub": cognito_sub})
        return response.get("Item")
    except ClientError as e:
        print(f"❌ Error reading entitlement from DynamoDB: {e}")
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


def init_entitlement(
    cognito_sub: str,
    email: Optional[str] = None,
    trial_started_at: Optional[str] = None,
    trial_expires_at: Optional[int] = None
) -> bool:
    """
    Initialize entitlement record with status="none".
    Called during user registration before any subscription exists.
    
    Args:
        cognito_sub: Cognito user ID
    
    Returns:
        True if successful, False otherwise
    """
    try:
        existing = get_entitlement(cognito_sub)
        if existing:
            return True
        
        now_iso = trial_started_at or iso_now()
        trial_end_ts = trial_expires_at if trial_expires_at is not None else calculate_trial_end()

        current_ts = int(datetime.utcnow().timestamp())
        seconds_remaining = max(0, trial_end_ts - current_ts)
        remaining_days = (
            max(1, math.ceil(seconds_remaining / 86400))
            if seconds_remaining > 0
            else 0
        )
        print(
            f"🆕 init_entitlement: cognito_sub={cognito_sub}, "
            f"trial_end_ts={trial_end_ts}, current_ts={current_ts}, "
            f"seconds_remaining={seconds_remaining}, remaining_days={remaining_days}"
        )
        
        item = {
            "cognito_sub": cognito_sub,
            "status": "trialing",
            "plan": None,
            "current_period_end": None,
            "trial_started_at": now_iso,
            "trial_expires_at": trial_end_ts,
            "trial_days_remaining": remaining_days,
            "updatedAt": now_iso,
        }
        
        if email is not None:
            item["email"] = email
        
        ENT_TABLE_OBJ.put_item(Item=item)
        return True
    except ClientError as e:
        print(f"❌ Error initializing entitlement in DynamoDB: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error in init_entitlement: {e}")
        return False

