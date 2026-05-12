import time
import requests
import sys

BASE_URL = "http://127.0.0.1:8000"

def test_root():
    print("Testing Root...")
    try:
        r = requests.get(BASE_URL)
        print(f"Response [{r.status_code}]: {r.json()}")
        return r.status_code == 200
    except Exception as e:
        print(f"Failed to connect to server: {e}")
        return False

def test_health():
    print("\nTesting /health...")
    try:
        r = requests.get(f"{BASE_URL}/health")
        print(f"Response [{r.status_code}]: {r.json()}")
        return r.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_history():
    print("\nTesting /v1/history...")
    try:
        r = requests.get(f"{BASE_URL}/v1/history")
        data = r.json()
        print(f"Response [{r.status_code}]: Total Items in history: {data.get('total', 0)}")
        # Printing first item ID if exists
        if data.get('items'):
             print(f"Sample Item ID: {data['items'][0]['id']}")
        return r.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def run_all():
    print("--- Starting Backend Smoke Test ---\n")
    
    # Warm up wait - give server extra split second
    time.sleep(2)
    
    success = True
    success &= test_root()
    success &= test_health()
    success &= test_history()
    
    print("\n-----------------------------------")
    if success:
        print("ALL BASIC API ENDPOINTS FUNCTIONAL!")
        sys.exit(0)
    else:
        print("SOME ENDPOINTS FAILED.")
        sys.exit(1)

if __name__ == "__main__":
    run_all()
