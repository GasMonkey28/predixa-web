"""
Utility functions for auth and billing operations.
"""
import json
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from config import TRIAL_DAYS


def map_stripe_status(stripe_status: str) -> str:
    """
    Map Stripe subscription status to internal status.
    
    Stripe statuses: active, trialing, past_due, canceled, unpaid, incomplete, incomplete_expired
    Internal statuses: active, trialing, past_due, canceled, none
    
    Args:
        stripe_status: Stripe subscription status string
    
    Returns:
        Internal status string
    """
    status_map = {
        "active": "active",
        "trialing": "trialing",
        "past_due": "past_due",
        "canceled": "canceled",
        "unpaid": "past_due",  # Treat unpaid as past_due
        "incomplete": "none",  # Incomplete subscriptions not yet active
        "incomplete_expired": "canceled",
    }
    
    return status_map.get(stripe_status.lower(), "none")


def iso_now() -> str:
    """Get current timestamp in ISO 8601 format."""
    return datetime.utcnow().isoformat() + "Z"


def calculate_trial_end(days: Optional[int] = None) -> int:
    """
    Calculate Unix timestamp for trial end date.
    
    Args:
        days: Number of days for trial (defaults to TRIAL_DAYS from config)
    
    Returns:
        Unix timestamp (seconds since epoch)
    """
    if days is None:
        days = TRIAL_DAYS
    
    trial_end = datetime.utcnow() + timedelta(days=days)
    return int(trial_end.timestamp())


def verify_cognito_jwt(token: str) -> Optional[Dict[str, Any]]:
    """
    Verify Cognito JWT token.
    
    NOTE: If using API Gateway with Cognito Authorizer, this function
    is not needed - API Gateway validates the JWT automatically.
    
    For Lambda-only scenarios, you would use jose or PyJWT with JWKS.
    This is a placeholder that returns None (indicating validation
    should be done by API Gateway).
    
    Args:
        token: JWT token string
    
    Returns:
        Decoded token payload or None if invalid
    """
    # In production with API Gateway Cognito Authorizer, this is handled automatically
    # For Lambda-only scenarios, implement JWKS verification here
    # Example using PyJWT:
    #   import jwt
    #   import requests
    #   jwks_url = f"https://cognito-idp.{region}.amazonaws.com/{user_pool_id}/.well-known/jwks.json"
    #   # Fetch JWKS and verify token...
    
    print("⚠️ JWT verification should be handled by API Gateway Cognito Authorizer")
    return None


def extract_cognito_sub_from_event(event: Dict[str, Any]) -> Optional[str]:
    """
    Extract Cognito user ID from API Gateway event (when using Cognito Authorizer).
    
    Args:
        event: API Gateway event dict
    
    Returns:
        Cognito user ID (sub) or None if not found
    """
    # When using Cognito Authorizer, the user info is in requestContext
    try:
        # API Gateway with Cognito Authorizer puts claims in requestContext.authorizer.claims
        claims = event.get("requestContext", {}).get("authorizer", {}).get("claims", {})
        return claims.get("sub") or claims.get("cognito:username")
    except (KeyError, AttributeError):
        pass
    
    # Fallback: check headers (some setups put it in Authorization header)
    try:
        auth_header = event.get("headers", {}).get("Authorization", "")
        if auth_header.startswith("Bearer "):
            # Token is in header, but we'd need to decode it
            # For now, rely on API Gateway to extract it
            pass
    except (KeyError, AttributeError):
        pass
    
    return None


def create_response(
    status_code: int,
    body: Dict[str, Any],
    headers: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """
    Create standardized API Gateway response.
    
    Args:
        status_code: HTTP status code
        body: Response body dict
        headers: Optional custom headers
    
    Returns:
        API Gateway response dict
    """
    default_headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",  # Adjust for production
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    }
    
    if headers:
        default_headers.update(headers)
    
    return {
        "statusCode": status_code,
        "headers": default_headers,
        "body": json.dumps(body, default=str)
    }

