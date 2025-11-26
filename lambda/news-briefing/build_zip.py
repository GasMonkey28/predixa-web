#!/usr/bin/env python3
import zipfile
import os

def create_zip():
    zip_path = 'package-linux.zip'
    source_dir = 'package'
    
    if not os.path.exists(source_dir):
        print(f"Error: {source_dir} directory not found")
        return
    
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(source_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, source_dir)
                zipf.write(file_path, arcname)
    
    size = os.path.getsize(zip_path) / (1024 * 1024)
    print(f"Created {zip_path} ({size:.2f} MB)")

if __name__ == '__main__':
    create_zip()

