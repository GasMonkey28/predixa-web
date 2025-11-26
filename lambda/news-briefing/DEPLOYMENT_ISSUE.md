# Lambda Deployment Issue: pydantic_core Compatibility

## Problem

The Lambda function fails with:
```
Unable to import module 'handler': No module named 'pydantic_core._pydantic_core'
```

This happens because `pydantic_core` is a compiled module with native extensions. Dependencies installed on Windows are not compatible with Lambda's Linux runtime.

## Solutions

### Option 1: Use Docker to Build (Recommended)

1. Install Docker Desktop
2. Run the build script:
```bash
cd lambda/news-briefing
chmod +x build-linux-package.sh
./build-linux-package.sh
```

3. Deploy using the Linux package:
```powershell
aws lambda update-function-code --function-name predixa-news-briefing --zip-file fileb://package-linux.zip --region us-east-1
```

### Option 2: Use AWS SAM or Serverless Framework

These tools automatically handle cross-platform builds.

### Option 3: Use Lambda Layers

Create a Lambda layer with the dependencies, which can be built in a Linux environment.

### Option 4: Simplify Dependencies

Remove pydantic dependency by using a different OpenAI client or older version that doesn't require pydantic.

## Quick Fix: Manual Linux Build

If you have access to a Linux machine or WSL:

```bash
cd lambda/news-briefing
rm -rf package package.zip
mkdir package
pip install -r requirements.txt -t package/
cp handler.py package/
cd package
zip -r ../package-linux.zip .
cd ..
```

Then deploy:
```powershell
aws lambda update-function-code --function-name predixa-news-briefing --zip-file fileb://package-linux.zip --region us-east-1
```

## Current Status

✅ Lambda function created successfully
✅ Environment variables configured
❌ Package needs Linux-compatible dependencies

