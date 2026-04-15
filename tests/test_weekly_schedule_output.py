from sage.tools.weekly_schedule_output import build_weekly_schedule_output


def test_weekly_schedule_output_structure():
    result = build_weekly_schedule_output()

    assert "week_start" in result
    assert "open_shifts" in result
    assert "employee_views" in result
    assert "shift_eligibility_summary" in result
    assert "summary" in result


def test_weekly_schedule_summary_counts():
    result = build_weekly_schedule_output()

    assert result["summary"]["total_open_shifts"] == 3
    assert result["summary"]["total_employees"] == 3
    assert result["summary"]["selectable_shift_count"] == 2
    assert result["summary"]["blocked_shift_count"] == 7


def test_shift_eligibility_summary():
    result = build_weekly_schedule_output()
    shifts = result["shift_eligibility_summary"]

    mon_shift = next(s for s in shifts if s["shift_id"] == "mon_morning_01")
    wed_shift = next(s for s in shifts if s["shift_id"] == "wed_afternoon_01")
    fri_shift = next(s for s in shifts if s["shift_id"] == "fri_evening_01")

    assert mon_shift["has_eligible_employee"] is True
    assert wed_shift["has_eligible_employee"] is False
    assert fri_shift["has_eligible_employee"] is True


def test_specific_eligible_employees():
    result = build_weekly_schedule_output()
    shifts = result["shift_eligibility_summary"]

    mon_shift = next(s for s in shifts if s["shift_id"] == "mon_morning_01")
    fri_shift = next(s for s in shifts if s["shift_id"] == "fri_evening_01")

    assert mon_shift["eligible_employees"][0]["employee_name"] == "Daniel Brooks"
    assert fri_shift["eligible_employees"][0]["employee_name"] == "Aarav Patel"