#!/bin/bash
# Build Lambda package using Docker (Linux-compatible)

set -e

echo "Building Lambda package using Docker..."

# Use public.ecr.aws/lambda/python:3.11 as base
docker run --rm -v "$(pwd):/var/task" public.ecr.aws/lambda/python:3.11 \
    /bin/bash -c "
        pip install -r requirements.txt -t package/ --quiet
        cp handler.py package/
        cd package
        zip -r ../package-linux.zip . -q
    "

echo "✅ Linux-compatible package created: package-linux.zip"

