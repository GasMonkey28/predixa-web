"""
Entitlements API Lambda Handler

Returns subscription status for the authenticated user.

API Gateway setup:
- GET /me/entitlements
- Cognito Authorizer (validates JWT automatically)
- User info available in event.requestContext.authorizer.claims
"""
import json
from typing import Dict, Any, Optional
from config import validate_config
from ddb import get_entitlement
from utils import extract_cognito_sub_from_event, create_response


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
    config_check = validate_config()
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
        # Missing record is not an error - user just hasn't subscribed yet
        print(f"ℹ️ No entitlement record found for {cognito_sub}, returning default")
        return create_response(
            200,
            {
                "status": "none",
                "plan": None,
                "current_period_end": None,
                "trial_expires_at": None
            }
        )
    
    # Return entitlement data
    response_data = {
        "status": entitlement.get("status", "none"),
        "plan": entitlement.get("plan"),
        "current_period_end": entitlement.get("current_period_end"),
        "trial_expires_at": entitlement.get("trial_expires_at")
    }
    
    print(f"✅ Returning entitlements: status={response_data['status']}")
    
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

