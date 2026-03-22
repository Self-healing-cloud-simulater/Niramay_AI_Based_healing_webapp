from fastapi import APIRouter, Query, Depends
from typing import List, Dict, Any, Optional
import json
from app.core.observation_store import observation_store, REDIS_ANOMALIES_KEY, REDIS_STATS_PREFIX
from app.api.v1.endpoints.auth import get_current_active_user
from app.models.user import User

router = APIRouter()

@router.get("/anomalies", response_model=Dict[str, Any])
async def get_anomalies(
    limit: int = Query(50, ge=1, le=1000),
    min_score: int = Query(0, ge=0),
    type: Optional[str] = Query(None, description="Filter by anomaly reason (e.g. high_latency)"),
    endpoint: Optional[str] = Query(None, description="Filter by endpoint path")
):
    """
    Retrieve anomalous logs with filtering and basic statistics
    """
    r = await observation_store.get_redis()
    if not r:
        return {"total": 0, "filtered": 0, "anomalies": [], "stats": {}}

    # 1. Get raw anomalies from Redis
    raw_anomalies = await r.lrange(REDIS_ANOMALIES_KEY, 0, -1) # Get all for filtering
    anomalies = [json.loads(log) for log in raw_anomalies]

    # 2. Apply Filters
    filtered_anomalies = []
    for log in anomalies:
        # Score filter
        if log.get("anomaly_score", 0) < min_score:
            continue
            
        # Type filter
        if type and type not in log.get("anomaly_reasons", []):
            continue
            
        # Endpoint filter
        if endpoint and endpoint != log.get("endpoint"):
            continue
            
        filtered_anomalies.append(log)

    # 3. Get Stats (Bonus)
    stats_endpoint = await r.hgetall(f"{REDIS_STATS_PREFIX}:endpoint")
    stats_type = await r.hgetall(f"{REDIS_STATS_PREFIX}:type")

    return {
        "total": len(anomalies),
        "filtered": len(filtered_anomalies),
        "anomalies": filtered_anomalies[:limit],
        "stats": {
            "by_endpoint": {k: int(v) for k, v in stats_endpoint.items()},
            "by_type": {k: int(v) for k, v in stats_type.items()}
        }
    }
