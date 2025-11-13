# Export Stripe Customers

## Method 1: Stripe Dashboard (Easiest - Recommended)

### Steps:

1. **Go to Stripe Dashboard**
   - Visit: https://dashboard.stripe.com/
   - Log in to your account

2. **Navigate to Customers**
   - Click **"Customers"** in the left sidebar

3. **Export Customers**
   - Look for **"..."** (three dots menu) or **"Export"** button at the top right
   - Click **"Export"** or **"Export customers"**
   - Choose format:
     - **CSV** (for Excel/Google Sheets)
     - **JSON** (for programmatic use)
   - Select date range:
     - **"All time"** (recommended for backup)
     - Or specific date range
   - Click **"Export"** or **"Download"**

4. **Wait for Export**
   - Stripe will process the export
   - You'll get a notification when ready
   - Click to download the file

5. **Save the File**
   - Save to: `backend/auth_billing/backups/StripeCustomers_backup.csv` (or `.json`)
   - Or save wherever you prefer

---

## Method 2: Stripe API (Using curl)

If you prefer command line:

```powershell
# Set your Stripe secret key
$STRIPE_KEY = "sk_live_xxx"  # Replace with your actual Stripe secret key

# Export customers (first 100)
curl -X GET "https://api.stripe.com/v1/customers?limit=100" `
  -u "$STRIPE_KEY:" `
  -o backups\StripeCustomers_backup.json

# If you have more than 100 customers, you'll need to paginate
# Use the "starting_after" parameter to get more
```

**Note**: Replace `sk_live_xxx` with your actual Stripe secret key.

---

## Method 3: Stripe CLI (If Installed)

If you have Stripe CLI installed:

```powershell
# List all customers
stripe customers list --limit 100 > backups\StripeCustomers_backup.json

# For more than 100, use pagination
stripe customers list --limit 100 --starting-after <last_customer_id> >> backups\StripeCustomers_backup.json
```

---

## What Gets Exported

The export includes:
- Customer ID
- Email address
- Name
- Created date
- Metadata (including cognito_sub if you stored it)
- Payment methods
- Subscription information
- And more customer details

---

## After Export

1. **Verify the file**
   - Check file size (should not be 0 bytes)
   - Open and verify it contains customer data

2. **Save securely**
   - Contains sensitive customer information
   - Don't commit to git
   - Store securely

3. **Update backup summary**
   - You'll now have all 4 backups:
     - ✅ DynamoDB UserProfiles
     - ✅ DynamoDB predixa_entitlements
     - ✅ Cognito Users
     - ✅ Stripe Customers

---

## Quick Checklist

- [ ] Go to Stripe Dashboard
- [ ] Navigate to Customers
- [ ] Click Export
- [ ] Choose format (CSV or JSON)
- [ ] Select "All time" date range
- [ ] Download the file
- [ ] Save to `backups/StripeCustomers_backup.csv` (or `.json`)
- [ ] Verify file has data

---

## Troubleshooting

**Can't find Export button?**
- Look for "..." menu or "Actions" dropdown
- Some Stripe accounts have it in different locations
- Try the top right corner of the Customers page

**Export taking too long?**
- Large customer lists may take a few minutes
- Check your email for export completion notification

**Need more than 100 customers?**
- Use Stripe API with pagination
- Or export multiple times with different date ranges

---

**Ready to export!** Use the Stripe Dashboard method - it's the easiest. 🚀

