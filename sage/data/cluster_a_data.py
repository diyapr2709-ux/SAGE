def get_cluster_a_employees() -> list[dict]:
    return [
        {
            "name": "Aarav Patel",
            "employee_type": "part_time",
            "employee_role": "cashier",
            "preferred_days": ["Friday", "Saturday", "Sunday"],
            "preferred_start": "16:00",
            "preferred_end": "22:00",
            "max_hours_per_week": 20,
            "current_hours_assigned": 14,
        },
        {
            "name": "Emily Chen",
            "employee_type": "student_worker",
            "employee_role": "front_desk",
            "preferred_days": ["Monday", "Wednesday", "Friday"],
            "preferred_start": "10:00",
            "preferred_end": "16:00",
            "max_hours_per_week": 15,
            "current_hours_assigned": 15,
        },
        {
            "name": "Daniel Brooks",
            "employee_type": "part_time",
            "employee_role": "cashier",
            "preferred_days": ["Monday", "Tuesday", "Thursday"],
            "preferred_start": "08:00",
            "preferred_end": "14:00",
            "max_hours_per_week": 25,
            "current_hours_assigned": 22,
        },
    ]


def get_cluster_a_weekly_shifts() -> list[dict]:
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