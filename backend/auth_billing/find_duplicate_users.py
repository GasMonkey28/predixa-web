"""
Script to find duplicate users by email address.

This script scans all users in:
1. Cognito User Pool
2. DynamoDB UserProfiles
3. Stripe Customers

And identifies duplicate emails across these systems.

Usage:
    python find_duplicate_users.py [--delete] [--dry-run]
    
Options:
    --delete: Actually delete duplicate accounts (keeps the oldest one)
    --dry-run: Show what would be deleted without actually deleting
"""
import boto3
import stripe
import sys
from collections import defaultdict
from typing import Dict, List, Any, Optional
from datetime import datetime
from config import USERS_TABLE, AWS_REGION, STRIPE_API_KEY, COGNITO_USER_POOL_ID

# Initialize clients
cognito = boto3.client('cognito-idp', region_name=AWS_REGION)
dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
users_table = dynamodb.Table(USERS_TABLE)

if STRIPE_API_KEY:
    stripe.api_key = STRIPE_API_KEY


def get_all_cognito_users() -> List[Dict[str, Any]]:
    """Get all users from Cognito User Pool."""
    users = []
    paginator = cognito.get_paginator('list_users')
    
    try:
        for page in paginator.paginate(UserPoolId=COGNITO_USER_POOL_ID):
            for user in page['Users']:
                email = None
                for attr in user.get('Attributes', []):
                    if attr['Name'] == 'email':
                        email = attr['Value'].lower()
                        break
                
                if email:
                    users.append({
                        'cognito_sub': user['Username'],
                        'email': email,
                        'created_at': user.get('UserCreateDate'),
                        'status': user.get('UserStatus'),
                        'source': 'cognito'
                    })
    except Exception as e:
        print(f"⚠️ Error fetching Cognito users: {e}")
    
    return users


def get_all_dynamodb_users() -> List[Dict[str, Any]]:
    """Get all users from DynamoDB UserProfiles."""
    users = []
    
    try:
        response = users_table.scan()
        users.extend(response.get('Items', []))
        
        # Handle pagination
        while 'LastEvaluatedKey' in response:
            response = users_table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            users.extend(response.get('Items', []))
        
        # Format for consistency
        formatted = []
        for user in users:
            email = user.get('email', '').lower()
            if email:
                formatted.append({
                    'cognito_sub': user.get('userId'),
                    'email': email,
                    'created_at': user.get('createdAt'),
                    'stripe_customer_id': user.get('stripeCustomerId'),
                    'source': 'dynamodb'
                })
        
        return formatted
    except Exception as e:
        print(f"⚠️ Error fetching DynamoDB users: {e}")
        return []


def get_all_stripe_customers() -> List[Dict[str, Any]]:
    """Get all customers from Stripe."""
    customers = []
    
    if not STRIPE_API_KEY:
        print("⚠️ STRIPE_API_KEY not set, skipping Stripe customers")
        return customers
    
    try:
        # List all customers
        all_customers = stripe.Customer.list(limit=100)
        
        for customer in all_customers.auto_paging_iter():
            email = customer.get('email', '').lower()
            if email:
                customers.append({
                    'stripe_customer_id': customer.id,
                    'email': email,
                    'created_at': datetime.fromtimestamp(customer.created),
                    'cognito_sub': customer.metadata.get('cognito_sub'),
                    'source': 'stripe'
                })
    except Exception as e:
        print(f"⚠️ Error fetching Stripe customers: {e}")
    
    return customers


def find_duplicates() -> Dict[str, List[Dict[str, Any]]]:
    """Find all duplicate emails across all systems."""
    print("🔍 Scanning all systems for duplicate emails...")
    
    # Get all users from each system
    cognito_users = get_all_cognito_users()
    dynamodb_users = get_all_dynamodb_users()
    stripe_customers = get_all_stripe_customers()
    
    print(f"   Found {len(cognito_users)} Cognito users")
    print(f"   Found {len(dynamodb_users)} DynamoDB users")
    print(f"   Found {len(stripe_customers)} Stripe customers")
    
    # Group by email
    email_groups = defaultdict(list)
    
    for user in cognito_users + dynamodb_users + stripe_customers:
        email = user.get('email', '').lower()
        if email:
            email_groups[email].append(user)
    
    # Find duplicates (emails with more than one account)
    duplicates = {}
    for email, users in email_groups.items():
        if len(users) > 1:
            duplicates[email] = users
    
    return duplicates


def print_duplicates(duplicates: Dict[str, List[Dict[str, Any]]]):
    """Print duplicate users in a readable format."""
    if not duplicates:
        print("\n✅ No duplicate emails found!")
        return
    
    print(f"\n⚠️ Found {len(duplicates)} duplicate email(s):\n")
    
    for email, users in duplicates.items():
        print(f"📧 {email} ({len(users)} accounts):")
        for i, user in enumerate(users, 1):
            source = user.get('source', 'unknown')
            cognito_sub = user.get('cognito_sub', 'N/A')
            created = user.get('created_at', 'N/A')
            
            if source == 'stripe':
                stripe_id = user.get('stripe_customer_id', 'N/A')
                print(f"   {i}. Stripe Customer: {stripe_id}")
                print(f"      Cognito Sub: {cognito_sub}")
            else:
                print(f"   {i}. {source.upper()}: {cognito_sub}")
            
            print(f"      Created: {created}")
            print()
        print("-" * 60)


def choose_account_to_keep(users: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Choose which account to keep (oldest one)."""
    # Sort by creation date (oldest first)
    sorted_users = sorted(
        users,
        key=lambda x: x.get('created_at', datetime.min),
        reverse=False
    )
    
    return sorted_users[0]  # Keep the oldest


def delete_duplicate_accounts(duplicates: Dict[str, List[Dict[str, Any]]], dry_run: bool = True):
    """Delete duplicate accounts, keeping the oldest one."""
    if not duplicates:
        print("No duplicates to delete")
        return
    
    print(f"\n{'🔍 DRY RUN: ' if dry_run else '🗑️ DELETING: '}Processing {len(duplicates)} duplicate email(s)...\n")
    
    deleted_count = 0
    
    for email, users in duplicates.items():
        if len(users) <= 1:
            continue
        
        # Choose account to keep (oldest)
        keep_user = choose_account_to_keep(users)
        delete_users = [u for u in users if u != keep_user]
        
        print(f"📧 {email}:")
        print(f"   ✅ Keeping: {keep_user.get('source')} - {keep_user.get('cognito_sub')}")
        
        for user in delete_users:
            source = user.get('source')
            cognito_sub = user.get('cognito_sub')
            
            if dry_run:
                print(f"   🔍 Would delete: {source} - {cognito_sub}")
            else:
                try:
                    if source == 'cognito':
                        cognito.admin_delete_user(
                            UserPoolId=COGNITO_USER_POOL_ID,
                            Username=cognito_sub
                        )
                        print(f"   ✅ Deleted Cognito user: {cognito_sub}")
                    
                    elif source == 'dynamodb':
                        users_table.delete_item(Key={'userId': cognito_sub})
                        print(f"   ✅ Deleted DynamoDB user: {cognito_sub}")
                    
                    elif source == 'stripe':
                        stripe.Customer.delete(user.get('stripe_customer_id'))
                        print(f"   ✅ Deleted Stripe customer: {user.get('stripe_customer_id')}")
                    
                    deleted_count += 1
                except Exception as e:
                    print(f"   ❌ Error deleting {source} - {cognito_sub}: {e}")
        
        print()
    
    if not dry_run:
        print(f"✅ Deleted {deleted_count} duplicate account(s)")
    else:
        print(f"🔍 Would delete {len(duplicates)} duplicate email(s) (dry run)")


def main():
    """Main function."""
    delete_mode = '--delete' in sys.argv
    dry_run = '--dry-run' in sys.argv or not delete_mode
    
    if not COGNITO_USER_POOL_ID:
        print("❌ COGNITO_USER_POOL_ID not set in config")
        return
    
    # Find duplicates
    duplicates = find_duplicates()
    
    # Print duplicates
    print_duplicates(duplicates)
    
    # Delete if requested
    if duplicates and (delete_mode or dry_run):
        if dry_run:
            print("\n💡 This is a DRY RUN. No accounts will be deleted.")
            print("   Run with --delete to actually delete duplicates.")
        else:
            response = input("\n⚠️ Are you sure you want to delete duplicate accounts? (yes/no): ")
            if response.lower() != 'yes':
                print("Cancelled.")
                return
        
        delete_duplicate_accounts(duplicates, dry_run=dry_run)


if __name__ == "__main__":
    main()

