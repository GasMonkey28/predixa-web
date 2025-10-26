#!/bin/bash

# Replace these with your actual values
USER_POOL_ID="YOUR_USER_POOL_ID"
APP_CLIENT_ID="YOUR_APP_CLIENT_ID"

# Get current app client configuration
aws cognito-idp describe-user-pool-client \
  --user-pool-id $USER_POOL_ID \
  --client-id $APP_CLIENT_ID \
  > current-config.json

echo "Current configuration saved to current-config.json"

# Update app client with write permissions
aws cognito-idp update-user-pool-client \
  --user-pool-id $USER_POOL_ID \
  --client-id $APP_CLIENT_ID \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH \
  --read-attributes email,given_name,family_name,name \
  --write-attributes email,given_name,family_name

echo "App client updated with write permissions for given_name and family_name"




