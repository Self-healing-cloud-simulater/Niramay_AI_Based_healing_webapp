import requests
import time
import sys

BASE_URL = "http://localhost:8000/api/v1"

# -----------------------------
# Utility: Retry Wrapper
# -----------------------------
def retry_request(url, method="GET", retries=5, delay=5):
    for attempt in range(retries):
        try:
            if method == "GET":
                res = requests.get(url)
            else:
                res = requests.post(url)

            if res.status_code == 200:
                return res.json()

        except Exception as e:
            print(f"⚠️ Retry {attempt+1}/{retries} failed: {e}")

        time.sleep(delay)

    print(f"❌ Failed to fetch from {url} after {retries} attempts")
    sys.exit(1)


# -----------------------------
# System Wait
# -----------------------------
def wait_for_system(seconds=20):
    print(f"⏳ Waiting {seconds}s for system to stabilize...")
    time.sleep(seconds)


# -----------------------------
# Enable Failure Scenario
# -----------------------------
def enable_failure():
    print("⚠️ Enabling database_error scenario...")
    url = f"{BASE_URL}/failure-simulator/scenarios/database_error/enable"

    res = requests.post(url)

    if res.status_code != 200:
        print("❌ Failed to enable failure scenario")
        sys.exit(1)

    print("✅ Failure scenario enabled")


# -----------------------------
# Fetch Data
# -----------------------------
def get_logs():
    return retry_request(f"{BASE_URL}/observation/logs")


def get_anomalies():
    return retry_request(f"{BASE_URL}/detection/anomalies")


def get_reports():
    return retry_request(f"{BASE_URL}/incident/reports")


# -----------------------------
# Test: Logs
# -----------------------------
def test_logs():
    logs = get_logs()

    assert isinstance(logs, list), "❌ Logs response is not a list"
    assert len(logs) > 0, "❌ No logs generated"

    print(f"✅ Logs generated: {len(logs)}")


# -----------------------------
# Test: Detection
# -----------------------------
def test_detection():
    anomalies = get_anomalies()

    assert isinstance(anomalies, list), "❌ Anomalies response is not a list"
    assert len(anomalies) > 0, "❌ No anomalies detected"

    required_fields = ["anomaly_score", "severity", "anomaly_reasons"]

    for a in anomalies:
        for field in required_fields:
            assert field in a, f"❌ Missing field in anomaly: {field}"

    print("✅ Detection structure valid")

    # Check anomaly score range
    valid_score = all(0.0 <= a.get("anomaly_score", -1) <= 1.0 for a in anomalies)
    assert valid_score, "❌ Invalid anomaly score range"

    print("✅ Anomaly scoring valid")

    # Check severity levels
    valid_severity = all(a.get("severity") in ["low", "medium", "high", "critical"] for a in anomalies)
    assert valid_severity, "❌ Invalid severity levels"

    print("✅ Severity classification valid")

    # Ensure at least one meaningful anomaly
    meaningful = any(len(a.get("anomaly_reasons", [])) > 0 for a in anomalies)
    assert meaningful, "❌ No anomaly reasoning found"

    print("✅ Anomaly reasoning working")


# -----------------------------
# Test: Analysis
# -----------------------------
def test_analysis():
    reports = get_reports()

    assert isinstance(reports, list), "❌ Reports response is not a list"
    assert len(reports) > 0, "❌ No incident reports generated"

    for r in reports:
        alert = r.get("machine_alert", {})

        assert isinstance(alert, dict), "❌ machine_alert is not a dict"
        assert "severity" in alert, "❌ Missing severity in analysis"
        assert "healing_action" in alert, "❌ Missing healing action"

    print("✅ Analysis structure valid")


# -----------------------------
# MAIN FLOW
# -----------------------------
def main():
    print("\n🚀 Starting Nirame Pipeline Test...\n")

    wait_for_system()

    enable_failure()

    print("⏳ Waiting for pipeline processing...")
    time.sleep(30)

    test_logs()
    test_detection()
    test_analysis()

    print("\n🎉 ALL TESTS PASSED — Nirame pipeline is working correctly\n")


# -----------------------------
# ENTRY POINT
# -----------------------------
if __name__ == "__main__":
    main()