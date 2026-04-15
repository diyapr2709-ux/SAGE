import json


def get_weekly_open_shifts() -> list[dict]:
    return [
        {
            "shift_id": "mon_morning_01",
            "shift_date": "2026-04-20",
            "shift_start": "09:00",
            "shift_end": "11:00",
            "required_role": "cashier",
        },
        {
            "shift_id": "wed_afternoon_01",
            "shift_date": "2026-04-22",
            "shift_start": "13:00",
            "shift_end": "16:00",
            "required_role": "front_desk",
        },
        {
            "shift_id": "fri_evening_01",
            "shift_date": "2026-04-17",
            "shift_start": "17:00",
            "shift_end": "20:00",
            "required_role": "cashier",
        },
    ]


if __name__ == "__main__":
    print(json.dumps(get_weekly_open_shifts(), indent=4))