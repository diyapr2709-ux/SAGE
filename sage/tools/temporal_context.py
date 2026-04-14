from datetime import datetime

def get_temporal_context(local_events=None):
    now = datetime.now()
    return {
        "current_date": now.strftime("%Y-%m-%d"),
        "day_of_week": now.strftime("%A"),
        "current_time": now.strftime("%H:%M:%S"),
        "local_events": local_events or []
    }
