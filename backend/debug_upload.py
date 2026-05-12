import os
import json

# Force explicit env before importing app to fix parsing
os.environ["ALLOWED_ORIGINS"] = '["http://localhost:3000"]'

import io
import sys
from PIL import Image
from app.config import get_settings
from app.database import get_supabase
from app.storage.supabase_storage import upload_original

def debug():
    try:
        settings = get_settings()
        print(f"SUPABASE_URL: {settings.SUPABASE_URL}")
        print(f"BUCKET ORIGINALS: {settings.SUPABASE_BUCKET_ORIGINALS}")
        print(f"BUCKET THUMBNAILS: {settings.SUPABASE_BUCKET_THUMBNAILS}")
        
        supabase = get_supabase()
        
        # Try to list buckets
        print("\nAttempting to list buckets...")
        try:
            buckets = supabase.storage.list_buckets()
            print(f"Buckets found: {[b.name for b in buckets]}")
        except Exception as e:
            print(f"Failed to list buckets: {e}")
        
        # Try dummy upload
        print("\nAttempting dummy upload to originals...")
        img = Image.new('RGB', (100, 100), color = 'red')
        buf = io.BytesIO()
        img.save(buf, format='JPEG')
        byte_data = buf.getvalue()
        
        url = upload_original(byte_data, "debug.jpg", "debug-page-id")
        print(f"Upload success! URL: {url}")
        
    except Exception as e:
        import traceback
        print("\nERROR ENCOUNTERED:")
        traceback.print_exc()

if __name__ == "__main__":
    debug()
