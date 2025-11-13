# Backup User Data Before Testing Delete Function

## Overview
Before testing the delete user function, backup data from:
1. DynamoDB UserProfiles table
2. DynamoDB predixa_entitlements table
3. Cognito User Pool
4. Stripe Customers

---

## 1. Backup DynamoDB UserProfiles Table

### Option A: AWS Console (Easiest)

1. Go to **DynamoDB Console**: https://console.aws.amazon.com/dynamodb/
2. Click **"Tables"** in left sidebar
3. Click on **`UserProfiles`** table
4. Click **"Explore table items"** tab
5. Click **"Actions"** → **"Export to CSV"** or **"Export to JSON"**
6. Save the file: `UserProfiles_backup_YYYY-MM-DD.json` or `.csv`

### Option B: AWS CLI

```powershell
# Export to JSON
aws dynamodb scan --table-name UserProfiles --region us-east-1 > UserProfiles_backup_$(Get-Date -Format "yyyy-MM-dd").json

# Or export to CSV (requires jq or manual conversion)
aws dynamodb scan --table-name UserProfiles --region us-east-1 | ConvertTo-Json > UserProfiles_backup_$(Get-Date -Format "yyyy-MM-dd").json
```

---

## 2. Backup DynamoDB predixa_entitlements Table

### Option A: AWS Console

1. Go to **DynamoDB Console**
2. Click on **`predixa_entitlements`** table
3. Click **"Explore table items"** tab
4. Click **"Actions"** → **"Export to CSV"** or **"Export to JSON"**
5. Save the file: `predixa_entitlements_backup_YYYY-MM-DD.json`

### Option B: AWS CLI

```powershell
aws dynamodb scan --table-name predixa_entitlements --region us-east-1 > predixa_entitlements_backup_$(Get-Date -Format "yyyy-MM-dd").json
```

---

## 3. Backup Cognito User Pool

### Option A: AWS Console (Manual Export)

1. Go to **Cognito Console**: https://console.aws.amazon.com/cognito/
2. Click **"User pools"**
3. Click on your User Pool
4. Click **"Users"** tab
5. For each user, click on them to view details
6. Manually copy important info (or use CLI below)

### Option B: AWS CLI (Recommended)

```powershell
# List all users and export to JSON
$POOL_ID = "us-east-1_XXXXXXXXX"  # Replace with your User Pool ID
aws cognito-idp list-users --user-pool-id $POOL_ID --region us-east-1 > CognitoUsers_backup_$(Get-Date -Format "yyyy-MM-dd").json

# Get detailed info for each user (optional - more comprehensive)
# This will create a file with all user attributes
aws cognito-idp list-users --user-pool-id $POOL_ID --region us-east-1 | ConvertFrom-Json | ForEach-Object {
    $user = $_
    $username = $user.Username
    aws cognito-idp admin-get-user --user-pool-id $POOL_ID --username $username --region us-east-1
} | ConvertTo-Json > CognitoUsers_detailed_backup_$(Get-Date -Format "yyyy-MM-dd").json
```

---

## 4. Backup Stripe Customers

### Option A: Stripe Dashboard

1. Go to **Stripe Dashboard**: https://dashboard.stripe.com/
2. Click **"Customers"** in left sidebar
3. Click **"..."** (three dots) → **"Export"**
4. Choose format: CSV or JSON
5. Select date range (or all time)
6. Click **"Export"**
7. Download when ready

### Option B: Stripe API (CLI)

```powershell
# Install Stripe CLI if not installed
# Then run:
stripe customers list --limit 100 > StripeCustomers_backup_$(Get-Date -Format "yyyy-MM-dd").json

# Or use curl with your API key:
$STRIPE_KEY = "sk_live_xxx"  # Your Stripe secret key
curl -X GET "https://api.stripe.com/v1/customers?limit=100" -u "$STRIPE_KEY:" > StripeCustomers_backup_$(Get-Date -Format "yyyy-MM-dd").json
```

---

## 5. Quick Backup Script (All at Once)

Create a PowerShell script to backup everything:

```powershell
# backup-all-data.ps1
$DATE = Get-Date -Format "yyyy-MM-dd"
$REGION = "us-east-1"
$POOL_ID = "us-east-1_XXXXXXXXX"  # Replace with your User Pool ID
$STRIPE_KEY = "sk_live_xxx"  # Replace with your Stripe key

Write-Host "Starting backup..." -ForegroundColor Green

# Create backup directory
New-Item -ItemType Directory -Force -Path "backups\$DATE"

# Backup DynamoDB UserProfiles
Write-Host "Backing up UserProfiles..." -ForegroundColor Yellow
aws dynamodb scan --table-name UserProfiles --region $REGION > "backups\$DATE\UserProfiles.json"

# Backup DynamoDB Entitlements
Write-Host "Backing up predixa_entitlements..." -ForegroundColor Yellow
aws dynamodb scan --table-name predixa_entitlements --region $REGION > "backups\$DATE\predixa_entitlements.json"

# Backup Cognito Users
Write-Host "Backing up Cognito users..." -ForegroundColor Yellow
aws cognito-idp list-users --user-pool-id $POOL_ID --region $REGION > "backups\$DATE\CognitoUsers.json"

# Backup Stripe Customers (if you have Stripe CLI)
Write-Host "Backing up Stripe customers..." -ForegroundColor Yellow
# stripe customers list --limit 100 > "backups\$DATE\StripeCustomers.json"
# Or use curl:
# curl -X GET "https://api.stripe.com/v1/customers?limit=100" -u "$STRIPE_KEY:" > "backups\$DATE\StripeCustomers.json"

Write-Host "Backup complete! Files saved in backups\$DATE\" -ForegroundColor Green
```

---

## 6. Verify Backups

After backing up, verify the files:

```powershell
# Check file sizes (should not be 0 bytes)
Get-ChildItem backups\*\*.json | Select-Object Name, Length

# View sample data
Get-Content backups\*\UserProfiles.json | Select-Object -First 50
```

---

## 7. Store Backups Safely

1. **Save locally**: Keep copies on your computer
2. **Cloud backup**: Upload to S3 or another cloud storage
3. **Version control**: Don't commit to git (contains sensitive data)
4. **Encrypt**: If storing sensitive data, consider encryption

### Upload to S3 (Optional)

```powershell
# Create S3 bucket for backups (one-time)
aws s3 mb s3://predixa-backups --region us-east-1

# Upload backups
$DATE = Get-Date -Format "yyyy-MM-dd"
aws s3 cp backups\$DATE\ s3://predixa-backups\$DATE\ --recursive
```

---

## Important Notes

⚠️ **Security:**
- Backup files contain sensitive user data
- Don't share or commit to git
- Store securely
- Delete old backups after confirming everything works

⚠️ **Data Size:**
- If you have many users, backups may be large
- DynamoDB scan operations count against read capacity
- Consider doing backups during low-traffic periods

⚠️ **Stripe:**
- Stripe exports may take time if you have many customers
- Use pagination if you have >100 customers

---

## Quick Checklist

- [ ] Backup DynamoDB UserProfiles
- [ ] Backup DynamoDB predixa_entitlements
- [ ] Backup Cognito User Pool
- [ ] Backup Stripe Customers
- [ ] Verify backup files exist and have data
- [ ] Store backups in safe location
- [ ] Ready to test delete function!

---

## Restore Data (If Needed)

If something goes wrong, you can restore from backups:

1. **DynamoDB**: Use `aws dynamodb put-item` or `batch-write-item` to restore
2. **Cognito**: Use `aws cognito-idp admin-create-user` to recreate users
3. **Stripe**: Customers are usually not deleted immediately (soft delete), check Stripe dashboard

---

**Ready to test after backups are complete!** 🚀

