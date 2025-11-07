"""
Stripe Webhook Lambda Handler

Handles Stripe webhook events to update subscription entitlements in DynamoDB.

Events handled:
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_succeeded
- invoice.payment_failed

API Gateway setup:
- POST /stripe/webhook
- No authentication (Stripe signature verification instead)
- Raw request body (not parsed JSON) for signature verification
"""
import json
import os
import stripe
import hmac
import hashlib
from typing import Dict, Any, Optional
from config import STRIPE_API_KEY, STRIPE_WEBHOOK_SECRET, validate_config
from ddb import update_entitlement, get_user
from utils import map_stripe_status, create_response


# Initialize Stripe
if STRIPE_API_KEY:
    stripe.api_key = STRIPE_API_KEY


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for Stripe webhook events.
    
    Flow:
    1. Verify webhook signature
    2. Parse event
    3. Extract cognito_sub from Stripe customer metadata
    4. Update entitlements table based on event type
    
    Returns:
        API Gateway response dict
    """
    print(f"📥 Stripe webhook received: {json.dumps(event, default=str)[:500]}...")
    
    # Validate config
    config_check = validate_config()
    if not config_check["valid"]:
        missing = ", ".join(config_check["missing"])
        return create_response(
            500,
            {"error": f"Configuration error: missing {missing}"}
        )
    
    # Extract raw body for signature verification
    # API Gateway passes body as string when isBase64Encoded is false
    body = event.get("body", "")
    if isinstance(body, dict):
        body = json.dumps(body)
    elif not isinstance(body, str):
        body = str(body)
    
    # Get signature from headers
    headers = event.get("headers", {}) or {}
    # API Gateway lowercases header names
    sig_header = headers.get("stripe-signature") or headers.get("Stripe-Signature", "")
    
    if not sig_header:
        print("❌ No Stripe-Signature header found")
        return create_response(400, {"error": "Missing Stripe-Signature header"})
    
    # Verify webhook signature
    try:
        stripe_event = verify_webhook_signature(body, sig_header)
        if not stripe_event:
            return create_response(401, {"error": "Invalid webhook signature"})
    except Exception as e:
        print(f"❌ Signature verification error: {e}")
        return create_response(401, {"error": f"Signature verification failed: {str(e)}"})
    
    event_type = stripe_event.get("type")
    event_data = stripe_event.get("data", {}).get("object", {})
    
    print(f"📋 Processing Stripe event: {event_type}")
    
    # Handle different event types
    try:
        if event_type == "customer.subscription.created":
            handle_subscription_created(event_data)
        elif event_type == "customer.subscription.updated":
            handle_subscription_updated(event_data)
        elif event_type == "customer.subscription.deleted":
            handle_subscription_deleted(event_data)
        elif event_type == "invoice.payment_succeeded":
            handle_payment_succeeded(event_data)
        elif event_type == "invoice.payment_failed":
            handle_payment_failed(event_data)
        else:
            print(f"ℹ️ Unhandled event type: {event_type}")
            # Return 200 anyway - we don't want Stripe to retry unhandled events
        
        return create_response(200, {"received": True, "event_type": event_type})
    
    except Exception as e:
        print(f"❌ Error processing webhook: {e}")
        import traceback
        traceback.print_exc()
        # Return 500 so Stripe will retry
        return create_response(500, {"error": str(e)})


def verify_webhook_signature(payload: str, sig_header: str) -> Optional[Dict[str, Any]]:
    """
    Verify Stripe webhook signature.
    
    Args:
        payload: Raw request body (string)
        sig_header: Stripe-Signature header value
    
    Returns:
        Parsed event dict if valid, None if invalid
    """
    if not STRIPE_WEBHOOK_SECRET:
        print("⚠️ STRIPE_WEBHOOK_SECRET not set, skipping signature verification")
        # In production, you should always verify signatures
        # For local testing, you can parse the payload directly
        try:
            return json.loads(payload) if isinstance(payload, str) else payload
        except:
            return None
    
    try:
        # Use Stripe's webhook signature verification
        event = stripe.Webhook.construct_event(
            payload.encode('utf-8') if isinstance(payload, str) else payload,
            sig_header,
            STRIPE_WEBHOOK_SECRET
        )
        return event
    except ValueError as e:
        print(f"❌ Invalid payload: {e}")
        return None
    except stripe.error.SignatureVerificationError as e:
        print(f"❌ Invalid signature: {e}")
        return None


def get_cognito_sub_from_stripe_customer(customer_id: str) -> Optional[str]:
    """
    Get Cognito user ID from Stripe customer metadata.
    
    Args:
        customer_id: Stripe customer ID
    
    Returns:
        Cognito user ID (sub) or None if not found
    """
    try:
        customer = stripe.Customer.retrieve(customer_id)
        return customer.metadata.get("cognito_sub")
    except stripe.error.StripeError as e:
        print(f"❌ Error retrieving Stripe customer {customer_id}: {e}")
        return None


def handle_subscription_created(subscription: Dict[str, Any]) -> None:
    """Handle customer.subscription.created event."""
    customer_id = subscription.get("customer")
    if not customer_id:
        print("⚠️ No customer ID in subscription.created event")
        return
    
    cognito_sub = get_cognito_sub_from_stripe_customer(customer_id)
    if not cognito_sub:
        print(f"⚠️ No cognito_sub in Stripe customer {customer_id} metadata")
        return
    
    status = map_stripe_status(subscription.get("status", "none"))
    plan_id = subscription.get("items", {}).get("data", [{}])[0].get("price", {}).get("id", "")
    current_period_end = subscription.get("current_period_end")
    trial_end = subscription.get("trial_end")
    
    print(f"📝 Creating subscription for {cognito_sub}: status={status}, plan={plan_id}")
    
    update_entitlement(
        cognito_sub=cognito_sub,
        status=status,
        plan=plan_id,
        current_period_end=current_period_end,
        trial_expires_at=trial_end
    )


def handle_subscription_updated(subscription: Dict[str, Any]) -> None:
    """Handle customer.subscription.updated event."""
    customer_id = subscription.get("customer")
    if not customer_id:
        print("⚠️ No customer ID in subscription.updated event")
        return
    
    cognito_sub = get_cognito_sub_from_stripe_customer(customer_id)
    if not cognito_sub:
        print(f"⚠️ No cognito_sub in Stripe customer {customer_id} metadata")
        return
    
    status = map_stripe_status(subscription.get("status", "none"))
    plan_id = subscription.get("items", {}).get("data", [{}])[0].get("price", {}).get("id", "")
    current_period_end = subscription.get("current_period_end")
    trial_end = subscription.get("trial_end")
    
    print(f"📝 Updating subscription for {cognito_sub}: status={status}, plan={plan_id}")
    
    update_entitlement(
        cognito_sub=cognito_sub,
        status=status,
        plan=plan_id,
        current_period_end=current_period_end,
        trial_expires_at=trial_end
    )


def handle_subscription_deleted(subscription: Dict[str, Any]) -> None:
    """Handle customer.subscription.deleted event."""
    customer_id = subscription.get("customer")
    if not customer_id:
        print("⚠️ No customer ID in subscription.deleted event")
        return
    
    cognito_sub = get_cognito_sub_from_stripe_customer(customer_id)
    if not cognito_sub:
        print(f"⚠️ No cognito_sub in Stripe customer {customer_id} metadata")
        return
    
    print(f"📝 Deleting subscription for {cognito_sub}")
    
    update_entitlement(
        cognito_sub=cognito_sub,
        status="canceled",
        plan=None,
        current_period_end=None,
        trial_expires_at=None
    )


def handle_payment_succeeded(invoice: Dict[str, Any]) -> None:
    """Handle invoice.payment_succeeded event."""
    subscription_id = invoice.get("subscription")
    if not subscription_id:
        print("ℹ️ invoice.payment_succeeded has no subscription (one-time payment)")
        return
    
    # Retrieve subscription to get customer
    try:
        subscription = stripe.Subscription.retrieve(subscription_id)
        customer_id = subscription.get("customer")
        cognito_sub = get_cognito_sub_from_stripe_customer(customer_id)
        
        if cognito_sub:
            # Update status to active if it was past_due
            status = map_stripe_status(subscription.get("status", "active"))
            plan_id = subscription.get("items", {}).get("data", [{}])[0].get("price", {}).get("id", "")
            current_period_end = subscription.get("current_period_end")
            
            print(f"💰 Payment succeeded for {cognito_sub}, updating to active")
            update_entitlement(
                cognito_sub=cognito_sub,
                status=status,
                plan=plan_id,
                current_period_end=current_period_end
            )
    except stripe.error.StripeError as e:
        print(f"❌ Error retrieving subscription {subscription_id}: {e}")


def handle_payment_failed(invoice: Dict[str, Any]) -> None:
    """Handle invoice.payment_failed event."""
    subscription_id = invoice.get("subscription")
    if not subscription_id:
        print("ℹ️ invoice.payment_failed has no subscription (one-time payment)")
        return
    
    # Retrieve subscription to get customer
    try:
        subscription = stripe.Subscription.retrieve(subscription_id)
        customer_id = subscription.get("customer")
        cognito_sub = get_cognito_sub_from_stripe_customer(customer_id)
        
        if cognito_sub:
            # Update status to past_due
            status = map_stripe_status(subscription.get("status", "past_due"))
            plan_id = subscription.get("items", {}).get("data", [{}])[0].get("price", {}).get("id", "")
            current_period_end = subscription.get("current_period_end")
            
            print(f"💳 Payment failed for {cognito_sub}, updating to past_due")
            update_entitlement(
                cognito_sub=cognito_sub,
                status=status,
                plan=plan_id,
                current_period_end=current_period_end
            )
    except stripe.error.StripeError as e:
        print(f"❌ Error retrieving subscription {subscription_id}: {e}")


# Local testing
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        # Simulate Stripe webhook event
        test_event = {
            "headers": {
                "Stripe-Signature": "test-signature"
            },
            "body": json.dumps({
                "id": "evt_test_123",
                "type": "customer.subscription.created",
                "data": {
                    "object": {
                        "id": "sub_test_123",
                        "customer": "cus_test_123",
                        "status": "trialing",
                        "current_period_end": 1735689600,
                        "trial_end": 1735689600,
                        "items": {
                            "data": [{
                                "price": {
                                    "id": "price_test_123"
                                }
                            }]
                        }
                    }
                }
            })
        }
        
        print("🧪 Testing Stripe Webhook Lambda...")
        print(f"Event: {json.dumps(test_event, indent=2)}")
        print("\n" + "="*50)
        
        result = lambda_handler(test_event, None)
        
        print("\n" + "="*50)
        print("✅ Test completed")
        print(f"Result: {json.dumps(result, indent=2, default=str)}")
    else:
        print("Usage: python stripe_webhook_lambda.py test")

