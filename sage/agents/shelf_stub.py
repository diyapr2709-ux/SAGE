import json
from sage.schemas.shelf_signal import ShelfSignal


def run_shelf_stub(scenario: str = "price_increase_flag") -> dict:
    scenarios = {
        "price_increase_flag": ShelfSignal(
            item_id="coffee_beans_01",
            margin_pct=19.2,
            flag=True,
            recommended_action="Review supplier pricing this week",
            impact=95.0,
        ),
        "healthy_margin": ShelfSignal(
            item_id="pastry_batch_03",
            margin_pct=32.5,
            flag=False,
            recommended_action="No action needed",
            impact=0.0,
        ),
        "critical_margin_drop": ShelfSignal(
            item_id="milk_supplier_apr",
            margin_pct=11.4,
            flag=True,
            recommended_action="Switch supplier or renegotiate contract immediately",
            impact=180.0,
        ),
    }

    if scenario not in scenarios:
        raise ValueError(
            f"Unknown scenario '{scenario}'. Valid scenarios are: {list(scenarios.keys())}"
        )

    return scenarios[scenario].model_dump()


if __name__ == "__main__":
    print("Default scenario:")
    print(json.dumps(run_shelf_stub(), indent=4))

    print("\nHealthy margin scenario:")
    print(json.dumps(run_shelf_stub("healthy_margin"), indent=4))

    print("\nCritical margin drop scenario:")
    print(json.dumps(run_shelf_stub("critical_margin_drop"), indent=4))