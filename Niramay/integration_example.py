import requests
import time
import random
import uuid

# --- CONFIGURATION ---
NIRAMAY_API_URL = "http://localhost:8000/api/v1/observe"
SERVICE_NAME = "ecommerce-checkout"

def send_observation(endpoint: str, status_code: int, response_time: float, failure_type: str = "none"):
    """
    Simulates sending an observation log to the Niramay Platform.
    This is how you integrate your existing microservices.
    """
    payload = {
        "timestamp": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        "service": SERVICE_NAME,
        "endpoint": endpoint,
        "method": "POST",
        "status_code": status_code,
        "response_time": response_time,
        "failure_type": failure_type,
        "request_id": str(uuid.uuid4()),
        "metadata": {
            "region": "us-east-1",
            "version": "v1.4.2"
        }
    }
    
    try:
        response = requests.post(NIRAMAY_API_URL, json=payload)
        if response.status_code == 200:
            print(f"Observation accepted: {endpoint} -> {status_code} ({response_time}ms)")
        else:
            print(f"Failed to send log: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Error connecting to Niramay: {str(e)}")

if __name__ == "__main__":
    print("Starting Integration Example...")
    print("This script simulates an external service push and triggers the self-healing platform.")
    
    endpoints = ["/orders", "/pay", "/validate"]
    
    # Send some healthy logs
    for _ in range(3):
        send_observation(random.choice(endpoints), 200, random.uniform(50, 150))
        time.sleep(1)
        
    # Simulate an ANOMALY (High latency + Error)
    print("\n--- SIMULATING ANOMALY ---")
    send_observation("/pay", 500, 1200.0, "database_error")
    
    print("\nCheck the Niramay Dashboard to see AI-powered RCA and Autonomous Healing in action!")
