# How to Restart Next.js Dev Server

## Quick Steps

1. **Find the terminal** where `npm run dev` is running
2. **Press `Ctrl+C`** to stop the server
3. **Run again**:
   ```bash
   npm run dev
   ```

## Alternative: Kill Process and Restart

If you can't find the terminal:

### Windows PowerShell:
```powershell
# Find Node processes
Get-Process node -ErrorAction SilentlyContinue

# Kill all Node processes (be careful - this kills ALL Node processes)
Stop-Process -Name node -Force

# Then restart
npm run dev
```

### Or kill specific port:
```powershell
# Find what's using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with the number from above)
taskkill /PID <PID_NUMBER> /F

# Then restart
npm run dev
```

## Why Restart?

Environment variables (like `ENTITLEMENTS_API_GATEWAY_URL`) are loaded when the server starts. After adding new variables to `.env.local`, you must restart for them to take effect.

---

**After restarting, test**: `http://localhost:3000/api/entitlements` 🚀

