"""
DynamoDB helpers for user and entitlement management.

Handles:
- UserProfiles table (extended with stripe_customer_id)
- predixa_entitlements table (subscription status)
"""
import os
import boto3
from typing import Optional, Dict, Any
from datetime import datetime
from botocore.exceptions import ClientError
from config import USERS_TABLE, ENTITLEMENTS_TABLE, AWS_REGION

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
    trial_expires_at: Optional[int] = None
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


def init_entitlement(cognito_sub: str) -> bool:
    """
    Initialize entitlement record with status="none".
    Called during user registration before any subscription exists.
    
    Args:
        cognito_sub: Cognito user ID
    
    Returns:
        True if successful, False otherwise
    """
    return update_entitlement(
        cognito_sub=cognito_sub,
        status="none",
        plan=None,
        current_period_end=None,
        trial_expires_at=None
    )

