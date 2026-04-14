from sage.agents.crew_stub import run_crew_stub
from sage.agents.shelf_stub import run_shelf_stub


def build_demo_payload(mode: str = "alert_mode") -> dict:
    scenarios = {
        "alert_mode": {
            "crew": run_crew_stub("understaffed_evening"),
            "shelf": run_shelf_stub("price_increase_flag"),
        },
        "calm_mode": {
            "crew": run_crew_stub("balanced_afternoon"),
            "shelf": run_shelf_stub("healthy_margin"),
        },
        "critical_mode": {
            "crew": run_crew_stub("overstaffed_morning"),
            "shelf": run_shelf_stub("critical_margin_drop"),
        },
    }

    if mode not in scenarios:
        raise ValueError(
            f"Unknown mode '{mode}'. Valid modes are: {list(scenarios.keys())}"
        )

    return scenarios[mode]


def build_frank_inputs(mode: str = "alert_mode") -> list[dict]:
    payload = build_demo_payload(mode)
    return [
        {
            "agent": "CREW",
            "data": payload["crew"],
        },
        {
            "agent": "SHELF",
            "data": payload["shelf"],
        },
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(build_demo_payload("alert_mode"), indent=4))