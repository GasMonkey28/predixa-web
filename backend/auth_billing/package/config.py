"""
Configuration for auth and billing services.

Environment variables with sensible defaults for local testing.
"""
import os
from typing import Optional

# AWS Configuration
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")

# DynamoDB Table Names
USERS_TABLE = os.getenv("USERS_TABLE", "UserProfiles")  # Existing table, will extend
ENTITLEMENTS_TABLE = os.getenv("ENTITLEMENTS_TABLE", "predixa_entitlements")
EMAIL_INDEX_NAME = os.getenv("EMAIL_INDEX_NAME", "EmailIndex")

# Stripe Configuration
STRIPE_API_KEY = os.getenv("STRIPE_API_KEY", os.getenv("STRIPE_SECRET_KEY", ""))
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

# Trial Configuration (optional, for reference - actual trials managed by Stripe)
TRIAL_DAYS = int(os.getenv("TRIAL_DAYS", "7"))

# Cognito Configuration (for JWT verification if needed)
COGNITO_USER_POOL_ID = os.getenv("COGNITO_USER_POOL_ID", "")
COGNITO_CLIENT_ID = os.getenv("COGNITO_CLIENT_ID", "")


def validate_config(
    require_stripe: bool = True,
    require_webhook: bool = True
) -> dict:
    """
    Validate required configuration and return any missing keys.
    
    Returns:
        dict with 'valid' (bool) and 'missing' (list of missing keys)
    """
    missing = []
    
    if require_stripe and not STRIPE_API_KEY:
        missing.append("STRIPE_API_KEY or STRIPE_SECRET_KEY")
    
    if require_webhook and not STRIPE_WEBHOOK_SECRET:
        missing.append("STRIPE_WEBHOOK_SECRET (required for webhook handler)")
    
    if not USERS_TABLE:
        missing.append("USERS_TABLE")
    
    if not ENTITLEMENTS_TABLE:
        missing.append("ENTITLEMENTS_TABLE")
    
    return {
        "valid": len(missing) == 0,
        "missing": missing
    }

