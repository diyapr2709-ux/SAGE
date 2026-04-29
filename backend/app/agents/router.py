import sys, os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")))

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, List, Optional

from app.auth.dependencies import get_current_user
from app.agents.frank_client import load_frank_output
from app.agents.dataset_pipe import (
    pass_input_dataset, get_input_dataset, dataset_is_loaded,
    pass_llm_dataset, get_llm_dataset, llm_dataset_is_loaded,
)
from app.agents.frank_client import run_with_dataset, run_with_llm_dataset, get_fallback_briefing
from app.models import User

router = APIRouter(prefix="/run", tags=["run"])


# ── Owner feedback / preference endpoints ─────────────────────────────────────

class FeedbackPayload(BaseModel):
    recommendation_id: str
    category:          str
    agent:             str
    financial_impact:  float
    urgency:           str
    action:            str           # "approved" | "rejected" | "edited"
    edit_note:         Optional[str] = ""


@router.post("/feedback")
async def record_recommendation_feedback(
    payload: FeedbackPayload,
    current_user: User = Depends(get_current_user),
):
    """Record an owner approval / rejection / edit event and update the preference model."""
    try:
        from sage.preferences.owner_model import record_feedback, get_preference_summary
        model = record_feedback(
            recommendation_id=payload.recommendation_id,
            category=payload.category,
            agent=payload.agent,
            financial_impact=payload.financial_impact,
            urgency=payload.urgency,
            action=payload.action,
            edit_note=payload.edit_note or "",
        )
        return {"ok": True, "model": get_preference_summary()}
    except Exception as e:
        raise HTTPException(500, f"Preference update failed: {e}")


@router.get("/preferences")
async def get_owner_preferences(current_user: User = Depends(get_current_user)):
    """Return the current owner preference model and any drift indicator."""
    try:
        from sage.preferences.owner_model import get_preference_summary
        return get_preference_summary()
    except Exception as e:
        raise HTTPException(500, f"Could not load preference model: {e}")


class DatasetPayload(BaseModel):
    business_id: str
    business_type: str
    location: str
    cluster: str = "A"
    employees: List[Dict[str, Any]]
    dataset: Dict[str, Any] = {}


@router.post("/dataset")
async def upload_dataset(
    payload: DatasetPayload,
    current_user: User = Depends(get_current_user),
):
    """Register the business dataset via pass_input_dataset — makes it available to all agents."""
    try:
        result = pass_input_dataset(payload.model_dump())
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/dataset")
async def get_dataset_info(current_user: User = Depends(get_current_user)):
    """Return metadata about the dataset currently loaded via pass_input_dataset."""
    if not dataset_is_loaded():
        raise HTTPException(404, "No dataset loaded. POST to /run/dataset first.")
    dataset = get_input_dataset()
    return {
        "business_id":    dataset.get("business_id"),
        "business_type":  dataset.get("business_type"),
        "location":       dataset.get("location"),
        "cluster":        dataset.get("cluster", "A"),
        "employee_count": len(dataset.get("employees", [])),
    }


@router.post("/llm-dataset")
async def upload_llm_dataset(
    payload: dict,
    current_user: User = Depends(get_current_user),
):
    """
    Register a dataset with pre-computed LLM outputs (VOICE + SHELF).
    All four agents run seamlessly — PULSE and CREW live, VOICE and SHELF
    from the baked-in llm_outputs, no external API calls needed.
    """
    try:
        result = pass_llm_dataset(payload)
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/llm-dataset/run")
async def run_frank_llm(current_user: User = Depends(get_current_user)):
    """Run the full FRANK pipeline using the LLM dataset loaded via pass_llm_dataset."""
    if not llm_dataset_is_loaded():
        raise HTTPException(400, "No LLM dataset loaded. POST to /run/llm-dataset first.")
    dataset = get_llm_dataset()
    return run_with_llm_dataset(dataset)


@router.get("/last-output")
async def get_last_frank_output(current_user: User = Depends(get_current_user)):
    """Return the most recent FRANK output from disk (survives server restarts)."""
    cached = load_frank_output()
    if not cached:
        raise HTTPException(404, "No FRANK output found — run FRANK first.")
    return cached


@router.get("/data-status")
async def get_data_status(current_user: User = Depends(get_current_user)):
    """Return metadata about all files in sage/data/ — useful for the Data Management UI."""
    import json, os
    from pathlib import Path
    from datetime import datetime

    def _file_meta(path: Path) -> dict:
        if not path.exists():
            return {"exists": False}
        stat = path.stat()
        try:
            content = json.loads(path.read_text())
            if isinstance(content, list):
                count = len(content)
            elif isinstance(content, dict):
                count = len(content)
            else:
                count = None
        except Exception:
            count = None
        return {
            "exists": True,
            "size_kb": round(stat.st_size / 1024, 1),
            "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            "count": count,
        }

    base = Path("sage/data")
    from app.agents.dataset_pipe import dataset_is_loaded, get_input_dataset, llm_dataset_is_loaded
    dataset_meta = {}
    if dataset_is_loaded():
        ds = get_input_dataset()
        dataset_meta = {
            "business_id":    ds.get("business_id"),
            "business_type":  ds.get("business_type"),
            "location":       ds.get("location"),
            "employee_count": len(ds.get("employees", [])),
            "source": "llm_dataset" if llm_dataset_is_loaded() else "plain_dataset",
        }

    return {
        "dataset": dataset_meta,
        "files": {
            "active_dataset":    _file_meta(base / "active_dataset.json"),
            "active_llm_dataset": _file_meta(base / "active_llm_dataset.json"),
            "shift_requests":    _file_meta(base / "shifts" / "shift_requests.json"),
            "shift_log":         _file_meta(base / "shifts" / "shift_log.json"),
            "attendance":        _file_meta(base / "shifts" / "attendance.json"),
            "owner_feedback":    _file_meta(base / "owner_feedback.json"),
            "preference_model":  _file_meta(base / "owner_preference_model.json"),
        }
    }


@router.post("")
async def run_frank_endpoint(current_user: User = Depends(get_current_user)):
    """Run the full FRANK pipeline using the dataset loaded via pass_input_dataset."""
    if not dataset_is_loaded():
        raise HTTPException(400, "No dataset loaded. POST to /run/dataset first.")
    dataset = get_input_dataset()
    try:
        return run_with_dataset(dataset)
    except Exception:
        return get_fallback_briefing(dataset)
