def get_cluster_b_employees() -> list[dict]:
    return [
        {
            "name": "Priya Nair",
            "employee_type": "full_time",
            "employee_role": "software_engineer",
            "preferred_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            "preferred_start": "10:00",
            "preferred_end": "18:00",
            "max_hours_per_week": 40,
            "current_hours_assigned": 34,
        },
        {
            "name": "Jason Miller",
            "employee_type": "full_time",
            "employee_role": "support_analyst",
            "preferred_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            "preferred_start": "08:00",
            "preferred_end": "17:00",
            "max_hours_per_week": 40,
            "current_hours_assigned": 37,
        },
        {
            "name": "Neha Sharma",
            "employee_type": "part_time",
            "employee_role": "legal_associate",
            "preferred_days": ["Tuesday", "Wednesday", "Thursday"],
            "preferred_start": "11:00",
            "preferred_end": "17:00",
            "max_hours_per_week": 24,
            "current_hours_assigned": 18,
        },
    ]


def get_cluster_b_weekly_shifts() -> list[dict]:
    return [
        {
            "shift_id": "mon_support_block_01",
            "shift_date": "2026-04-20",
            "shift_start": "09:00",
            "shift_end": "12:00",
            "required_role": "support_analyst",
        },
        {
            "shift_id": "wed_review_block_01",
            "shift_date": "2026-04-22",
            "shift_start": "13:00",
            "shift_end": "16:00",
            "required_role": "legal_associate",
        },
        {
            "shift_id": "fri_dev_block_01",
            "shift_date": "2026-04-24",
            "shift_start": "15:00",
            "shift_end": "18:00",
            "required_role": "software_engineer",
        },
    ]