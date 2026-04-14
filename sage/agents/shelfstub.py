from sage.schemas.shelf_signal import ShelfSignal

def run_shelf_stub():
    signal = ShelfSignal(
        item_id="coffee_beans_01",
        margin_pct=19.2,
        flag=True,
        recommended_action="Review supplier pricing this week",
        impact=95.0
    )
    return signal.model_dump()
