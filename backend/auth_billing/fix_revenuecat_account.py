"""
Script to fix a RevenueCat account that has active subscription but shows as trialing.

Usage:
    python fix_revenuecat_account.py <cognito_sub>
    
Example:
    python fix_revenuecat_account.py b43824d8-50e1-70da-739e-c2fd81f0dd82
"""
import sys
import os
from ddb import get_entitlement, update_entitlement
from utils import iso_now

def fix_revenuecat_account(cognito_sub: str):
    """Fix a RevenueCat account by updating status to active."""
    print(f"🔍 Checking entitlement for: {cognito_sub}")
    
    entitlement = get_entitlement(cognito_sub)
    if not entitlement:
        print(f"⚠️ No entitlement found for {cognito_sub}")
        print(f"📝 Creating new entitlement record with active status...")
        
        # Create new record with active status for RevenueCat subscription
        success = update_entitlement(
            cognito_sub=cognito_sub,
            status="active",
            plan=None,  # Will be updated when RevenueCat webhook fires
            current_period_end=None,  # Will be updated when RevenueCat webhook fires
            trial_expires_at=None,
            trial_started_at=None,
            email=None,  # Can be added later
            trial_days_remaining=0,
            additional_attributes={
                "platform": "revenuecat",
                "createdAt": iso_now(),
                "updatedAt": iso_now()
            }
        )
        
        if success:
            print(f"✅ Created new entitlement record with active status")
            print(f"⚠️ Note: You may need to trigger a RevenueCat webhook to populate plan and current_period_end")
            return True
        else:
            print(f"❌ Failed to create entitlement record")
            return False
    
    current_status = entitlement.get("status", "none")
    platform = entitlement.get("platform", "unknown")
    current_period_end = entitlement.get("current_period_end")
    
    print(f"📊 Current status: {current_status}")
    print(f"📊 Platform: {platform}")
    print(f"📊 Current period end: {current_period_end}")
    
    # Check if this looks like a RevenueCat subscription
    if platform == "revenuecat" or entitlement.get("revenuecat_product_id"):
        print(f"✅ Detected RevenueCat subscription")
        
        # If status is not active, update it
        if current_status != "active":
            print(f"🔄 Updating status from '{current_status}' to 'active'")
            
            success = update_entitlement(
                cognito_sub=cognito_sub,
                status="active",
                plan=entitlement.get("plan"),
                current_period_end=current_period_end,
                trial_expires_at=None,  # Clear trial fields
                trial_started_at=entitlement.get("trial_started_at"),  # Keep for history
                email=entitlement.get("email"),
                trial_days_remaining=0,  # Clear trial days
                additional_attributes={
                    "platform": "revenuecat",
                    "updatedAt": iso_now()
                }
            )
            
            if success:
                print(f"✅ Successfully updated account to active status")
                return True
            else:
                print(f"❌ Failed to update account")
                return False
        else:
            print(f"ℹ️ Account already has active status")
            return True
    else:
        print(f"⚠️ This doesn't appear to be a RevenueCat subscription")
        print(f"   Platform: {platform}")
        print(f"   RevenueCat product ID: {entitlement.get('revenuecat_product_id', 'None')}")
        
        # Ask for confirmation if we should still update
        response = input("Do you want to update it anyway? (yes/no): ")
        if response.lower() == "yes":
            print(f"🔄 Updating status to 'active'")
            success = update_entitlement(
                cognito_sub=cognito_sub,
                status="active",
                plan=entitlement.get("plan"),
                current_period_end=current_period_end,
                trial_expires_at=None,
                trial_started_at=entitlement.get("trial_started_at"),
                email=entitlement.get("email"),
                trial_days_remaining=0,
                additional_attributes={
                    "platform": "revenuecat",
                    "updatedAt": iso_now()
                }
            )
            return success
        else:
            print(f"❌ Update cancelled")
            return False


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python fix_revenuecat_account.py <cognito_sub>")
        print("\nExample:")
        print("  python fix_revenuecat_account.py b43824d8-50e1-70da-739e-c2fd81f0dd82")
        sys.exit(1)
    
    cognito_sub = sys.argv[1]
    success = fix_revenuecat_account(cognito_sub)
    sys.exit(0 if success else 1)

