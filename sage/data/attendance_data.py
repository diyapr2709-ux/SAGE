def get_sample_attendance_records(cluster: str = "A") -> list[dict]:
    if cluster == "A":
        return [
            {
                "employee_name": "Aarav Patel",
                "shift_id": "fri_evening_01",
                "clock_in": "17:00",
                "clock_out": "20:00",
            },
            {
                "employee_name": "Daniel Brooks",
                "shift_id": "mon_morning_01",
                "clock_in": "09:00",
                "clock_out": "11:00",
            },
            {
                "employee_name": "Emily Chen",
                "shift_id": "wed_afternoon_01",
                "clock_in": "13:00",
                "clock_out": "16:00",
            },
        ]

    if cluster == "B":
        return [
            {
                "employee_name": "Jason Miller",
                "shift_id": "mon_support_block_01",
                "clock_in": "09:00",
                "clock_out": "12:00",
            },
            {
                "employee_name": "Neha Sharma",
                "shift_id": "wed_review_block_01",
                "clock_in": "13:00",
                "clock_out": "16:00",
            },
            {
                "employee_name": "Priya Nair",
                "shift_id": "fri_dev_block_01",
                "clock_in": "15:00",
                "clock_out": "18:00",
            },
        ]

    raise ValueError("cluster must be 'A' or 'B'")