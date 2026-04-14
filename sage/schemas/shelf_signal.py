from pydantic import BaseModel

class ShelfSignal(BaseModel):
    item_id: str
    margin_pct: float
    flag: bool
    recommended_action: str
    impact: float
