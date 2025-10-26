# PowerShell script to fix Cognito app client permissions
# Run this with: .\fix-cognito-permissions.ps1

Write-Host "Getting current app client configuration..."

# Get current configuration
$json = aws cognito-idp describe-user-pool-client `
    --user-pool-id us-east-1_iYC6qs6H2 `
    --client-id 3vf9s73uqkuv7i838beshgaama `
    --output json

$config = $json | ConvertFrom-Json
$client = $config.UserPoolClient

Write-Host "Current app client: $($client.ClientName)"
Write-Host "Adding write permissions for given_name and family_name..."

# Update the client with write attributes
aws cognito-idp update-user-pool-client `
    --user-pool-id us-east-1_iYC6qs6H2 `
    --client-id 3vf9s73uqkuv7i838beshgaama `
    --client-name $client.ClientName `
    --generate-secret $false `
    --refresh-token-validity $client.RefreshTokenValidity `
    --access-token-validity $client.AccessTokenValidity `
    --id-token-validity $client.IdTokenValidity `
    --explicit-auth-flows ALLOW_REFRESH_TOKEN_AUTH ALLOW_USER_AUTH ALLOW_USER_PASSWORD_AUTH ALLOW_USER_SRP_AUTH `
    --supported-identity-providers $client.SupportedIdentityProviders `
    --callback-urls $client.CallbackURLs `
    --logout-urls $client.LogoutURLs `
    --allowed-o-auth-flows code implicit `
    --allowed-o-auth-scopes email phone profile openid aws.cognito.signin.user.admin `
    --allowed-o-auth-flows-user-pool-client `
    --prevent-user-existence-errors $client.PreventUserExistenceErrors `
    --enable-token-revocation `
    --auth-session-validity $client.AuthSessionValidity `
    --write-attributes email given_name family_name

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Write permissions added successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "1. Sign out of your app"
    Write-Host "2. Sign back in (this refreshes your token)"
    Write-Host "3. Go to Account page and try editing your name"
    Write-Host "4. It should work now! ✨"
} else {
    Write-Host "❌ Failed to update. Try using the AWS Console instead." -ForegroundColor Red
}



