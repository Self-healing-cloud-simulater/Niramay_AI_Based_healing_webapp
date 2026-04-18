import asyncio
import os
import json
from datetime import datetime, timedelta, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Mocking parts of the app for verification
os.environ["DATABASE_URL"] = "sqlite:///./test_niramay.db"

from app.db.models import Base, AuditLog, AnomalyRecord, HealingActionRecord
from app.detection.engine import detection_engine
from app.healing.index import healing_service
from app.healing.verification_worker import verify_healing_action

# Setup clean test DB
engine = create_engine("sqlite:///./test_niramay.db")
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

async def test_full_pipeline():
    print("\n🚀 Starting Niramay Pipeline Verification...")
    db = TestingSessionLocal()
    
    try:
        # 1. Simulate an observation log (Anomaly: High Latency)
        print("Step 1: Ingesting anomalous log...")
        log_data = {
            "service": "checkout-service",
            "endpoint": "/pay",
            "method": "POST",
            "status_code": 500, # Added server error
            "response_time": 1200.5, # > 300ms threshold
            "request_id": "test-req-001",
            "metadata_json": {}
        }
        
        db_log = AuditLog(**log_data)
        db.add(db_log)
        db.commit()
        db.refresh(db_log)
        
        # 2. Run Detection
        print("Step 2: Running detection engine...")
        detection_result = detection_engine.analyze_log(log_data)
        assert detection_result["is_anomaly"] == True
        assert "high_latency" in detection_result["anomaly_reasons"]
        assert "server_error" in detection_result["anomaly_reasons"]
        
        db_anomaly = AnomalyRecord(
            log_id=db_log.id,
            is_anomaly=True,
            anomaly_score=detection_result["anomaly_score"],
            reasons=detection_result["anomaly_reasons"]
        )
        db.add(db_anomaly)
        db.commit()
        db.refresh(db_anomaly)
        
        # 3. Run Healing
        print("Step 3: Triggering healing engine...")
        # CRITICAL: Enrich the log with detection results first
        log_data.update(detection_result)
        
        action_key = healing_service.decide_healing_action(log_data)
        assert action_key != "none"
        
        healing_result = await healing_service.execute_healing(action_key, log_data)
        assert healing_result["status"] == "success"
        assert healing_result["verification_status"] == "PENDING"
        
        db_healing = HealingActionRecord(
            anomaly_id=db_anomaly.id,
            action=action_key,
            status=healing_result["status"],
            message=healing_result["message"],
            verification_status="PENDING"
        )
        db.add(db_healing)
        db.commit()
        db.refresh(db_healing)
        
        # 4. Simulate Healthy Subsequent Traffic
        print("Step 4: Simulating 5 healthy logs for verification...")
        for i in range(5):
            h_log = AuditLog(
                service="checkout-service",
                endpoint="/pay",
                method="POST",
                status_code=200,
                response_time=50.0,
                request_id=f"health-req-{i}",
                timestamp=datetime.now() + timedelta(seconds=1 + i)
            )
            db.add(h_log)
            # Add healthy anomaly records for them
            db.commit()
            db.refresh(h_log)
            h_anomaly = AnomalyRecord(log_id=h_log.id, is_anomaly=False, anomaly_score=0.1)
            db.add(h_anomaly)
            db.commit()
        
        # 5. Run Verification Worker logic
        print("Step 5: Verifying healing success...")
        # Manually backdate the action timestamp slightly so it passes the cutoff
        db_healing.timestamp = datetime.now() - timedelta(seconds=60)
        await verify_healing_action(db_healing, db)
        
        assert db_healing.verification_status == "SUCCESS"
        print("✅ SUCCESS: Healing action verified via subsequent traffic.")

    except Exception as e:
        print(f"❌ FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()
        if os.path.exists("./test_niramay.db"):
            os.remove("./test_niramay.db")

if __name__ == "__main__":
    asyncio.run(test_full_pipeline())
