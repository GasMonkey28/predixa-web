"""
Lambda function to backup Cognito users to S3 on schedule.
Run daily via EventBridge to backup all Cognito users.
"""
import json
import boto3
from datetime import datetime
import os

cognito = boto3.client('cognito-idp')
s3 = boto3.client('s3')

COGNITO_USER_POOL_ID = os.getenv('COGNITO_USER_POOL_ID', 'us-east-1_iYC6qs6H2')
S3_BUCKET = os.getenv('S3_BUCKET', 'predixa-backups')
AWS_REGION = os.getenv('AWS_REGION', 'us-east-1')

def lambda_handler(event, context):
    """Backup Cognito users to S3."""
    try:
        print(f"Starting Cognito backup for User Pool: {COGNITO_USER_POOL_ID}")
        
        # Get all users (handles pagination)
        all_users = []
        pagination_token = None
        
        while True:
            if pagination_token:
                response = cognito.list_users(
                    UserPoolId=COGNITO_USER_POOL_ID,
                    PaginationToken=pagination_token
                )
            else:
                response = cognito.list_users(
                    UserPoolId=COGNITO_USER_POOL_ID
                )
            
            users = response.get('Users', [])
            all_users.extend(users)
            
            pagination_token = response.get('PaginationToken')
            if not pagination_token:
                break
        
        # Create backup filename with timestamp
        timestamp = datetime.utcnow().strftime('%Y-%m-%d-%H%M%S')
        filename = f'cognito-backups/{timestamp}-cognito-users.json'
        
        # Upload to S3
        s3.put_object(
            Bucket=S3_BUCKET,
            Key=filename,
            Body=json.dumps(all_users, default=str, indent=2),
            ContentType='application/json'
        )
        
        print(f"✅ Backed up {len(all_users)} Cognito users to s3://{S3_BUCKET}/{filename}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'success': True,
                'users_backed_up': len(all_users),
                's3_key': filename,
                'timestamp': timestamp
            })
        }
        
    except Exception as e:
        print(f"❌ Error backing up Cognito users: {e}")
        import traceback
        traceback.print_exc()
        raise

