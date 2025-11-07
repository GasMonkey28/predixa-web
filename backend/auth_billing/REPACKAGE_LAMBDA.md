# Repackage Lambda Functions After Fixing Imports

## What Was Fixed

I've changed all relative imports (`from .config import ...`) to absolute imports (`from config import ...`) in:
- ✅ `post_confirmation_lambda.py`
- ✅ `stripe_webhook_lambda.py`
- ✅ `entitlements_api_lambda.py`
- ✅ `ddb.py`
- ✅ `utils.py`

## Now Repackage the Lambda Functions

### Step 1: Recreate Zip Files

**Windows PowerShell:**
```powershell
cd backend\auth_billing

# Remove old zip files
Remove-Item *.zip -ErrorAction SilentlyContinue

# Remove old package directory
Remove-Item -Recurse -Force package -ErrorAction SilentlyContinue

# Install dependencies fresh
pip install -r requirements.txt -t package

# Copy Python files (with fixed imports)
Copy-Item *.py package\

# Create new zip files
Compress-Archive -Path package\* -DestinationPath post_confirmation.zip
Compress-Archive -Path package\* -DestinationPath stripe_webhook.zip
Compress-Archive -Path package\* -DestinationPath entitlements_api.zip
```

### Step 2: Re-upload to Lambda

1. **Go to Lambda Console** → `predixa-post-confirmation`
2. **Code** tab → **Upload from** → **.zip file**
3. Select the new `post_confirmation.zip`
4. Click **Save**
5. **Test again** - should work now! ✅

### Step 3: Verify Handler is Still Correct

After uploading, make sure the handler is still:
- `post_confirmation_lambda.lambda_handler`

(It should stay the same, but double-check)

## Why This Fixes the Error

**Before (Relative Imports):**
```python
from .config import STRIPE_API_KEY  # ❌ Tries to find parent package
```

**After (Absolute Imports):**
```python
from config import STRIPE_API_KEY  # ✅ Works when files are at root level
```

When Lambda unpacks your zip, all files are at the root level, so absolute imports work perfectly.

---

**Repackage and re-upload, then test again!** The import error should be fixed now.

