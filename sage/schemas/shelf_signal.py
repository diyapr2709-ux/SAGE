from pydantic import BaseModel


class ShelfSignal(BaseModel):
    item_id: str
    margin_pct: float
    flag: bool
    recommended_action: str
    impact: float


if __name__ == "__main__":
    sample = ShelfSignal(
        item_id="coffee_beans_01",
        margin_pct=19.2,
        flag=True,
        recommended_action="Review supplier pricing this week",
        impact=95.0,
    )
    print(sample.model_dump())