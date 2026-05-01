"""
dataset_pipe.py — dedicated dataset intake for SAGE agents.

pass_input_dataset(dataset)  — register a plain business dataset
pass_llm_dataset(dataset)    — register a dataset with pre-computed LLM outputs
                               (VOICE reviews, SHELF intelligence) — no live API calls needed

Both datasets are persisted to disk so they survive backend restarts.
"""

import json
from pathlib import Path
from typing import Optional

_ROOT           = Path(__file__).resolve().parent.parent.parent.parent
_STORE_PATH     = _ROOT / "sage/data/active_dataset.json"
_LLM_STORE_PATH = _ROOT / "sage/data/active_llm_dataset.json"

_dataset_store:     Optional[dict] = None
_llm_dataset_store: Optional[dict] = None


def _write(path: Path, data: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2))


def _read(path: Path) -> Optional[dict]:
    try:
        if path.exists():
            return json.loads(path.read_text())
    except Exception:
        pass
    return None


# ── Auto-load persisted datasets on import ────────────────────────────────────
_dataset_store     = _read(_STORE_PATH)
_llm_dataset_store = _read(_LLM_STORE_PATH)


# ── Plain dataset intake ──────────────────────────────────────────────────────

def pass_input_dataset(dataset: dict) -> dict:
    """
    Receive a business dataset and make it available to all agents.
    Persisted to disk — survives backend restarts.
    """
    global _dataset_store

    required = {"business_id", "business_type", "location", "employees"}
    missing = required - dataset.keys()
    if missing:
        raise ValueError(f"Dataset missing required fields: {missing}")
    if not dataset["employees"]:
        raise ValueError("employees list must not be empty")

    _dataset_store = dataset
    _write(_STORE_PATH, dataset)
    return {
        "status":         "ready",
        "business_id":    dataset["business_id"],
        "employee_count": len(dataset["employees"]),
        "cluster":        dataset.get("cluster", "A"),
    }


def get_input_dataset() -> dict:
    if _dataset_store is None:
        raise RuntimeError("No dataset loaded. Call pass_input_dataset() first.")
    return _dataset_store


def dataset_is_loaded() -> bool:
    return _dataset_store is not None


# ── LLM dataset intake ────────────────────────────────────────────────────────

def pass_llm_dataset(dataset: dict) -> dict:
    """
    Receive a dataset with pre-computed LLM outputs (VOICE + SHELF).
    All four agents run seamlessly — PULSE and CREW live, VOICE and SHELF
    from baked-in llm_outputs. Persisted to disk — survives backend restarts.
    """
    global _llm_dataset_store

    required = {"business_id", "business_type", "location", "employees", "llm_outputs"}
    missing = required - dataset.keys()
    if missing:
        raise ValueError(f"LLM dataset missing required fields: {missing}")

    llm = dataset["llm_outputs"]
    if "voice" not in llm or "shelf" not in llm:
        raise ValueError("llm_outputs must contain both 'voice' and 'shelf' keys")
    if not dataset.get("employees"):
        raise ValueError("employees list must not be empty")

    _llm_dataset_store = dataset
    _write(_LLM_STORE_PATH, dataset)
    return {
        "status":         "ready",
        "mode":           "llm_dataset",
        "business_id":    dataset["business_id"],
        "employee_count": len(dataset["employees"]),
        "cluster":        dataset.get("cluster", "A"),
        "voice_reviews":  len(llm["voice"].get("replies", [])),
        "shelf_flags":    len(llm["shelf"].get("cost_intelligence", {}).get("flagged_items", [])),
    }


def get_llm_dataset() -> dict:
    if _llm_dataset_store is None:
        raise RuntimeError("No LLM dataset loaded. Call pass_llm_dataset() first.")
    return _llm_dataset_store


def llm_dataset_is_loaded() -> bool:
    return _llm_dataset_store is not None
