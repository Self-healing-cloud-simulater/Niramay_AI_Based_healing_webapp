from fastapi import APIRouter, Query
from typing import List, Dict, Any
import json
from app.core.observation_store import observation_store, REDIS_HEALING_KEY

router = APIRouter()

@router.get("/actions", response_model=List[Dict[str, Any]])
async def get_healing_actions(
    limit: int = Query(50, ge=1, le=1000, description="Max number of healing actions to return")
):
    """
    Retrieve the history of simulated healing actions automatically triggered by anomalies.
    """
    r = await observation_store.get_redis()
    if not r:
        return []

    raw_actions = await r.lrange(REDIS_HEALING_KEY, 0, limit - 1)
    actions = [json.loads(action) for action in raw_actions]
    
    return actions
