from sage.tools.weekly_schedule_output import build_weekly_schedule_output

from sage.tools.weekly_schedule_output import build_weekly_schedule_output


def test_cluster_b_weekly_schedule_output():
    result = build_weekly_schedule_output("B")

    assert result["cluster"] == "B"
    assert result["summary"]["total_open_shifts"] == 3
    assert result["summary"]["total_employees"] == 3
    assert result["summary"]["selectable_shift_count"] == 3
    assert result["summary"]["blocked_shift_count"] == 6


def test_cluster_b_shift_eligibility_summary():
    result = build_weekly_schedule_output("B")
    shifts = result["shift_eligibility_summary"]

    support_shift = next(s for s in shifts if s["shift_id"] == "mon_support_block_01")
    review_shift = next(s for s in shifts if s["shift_id"] == "wed_review_block_01")
    dev_shift = next(s for s in shifts if s["shift_id"] == "fri_dev_block_01")

    assert support_shift["has_eligible_employee"] is True
    assert review_shift["has_eligible_employee"] is True
    assert dev_shift["has_eligible_employee"] is True

    assert support_shift["eligible_employees"][0]["employee_name"] == "Jason Miller"
    assert review_shift["eligible_employees"][0]["employee_name"] == "Neha Sharma"
    assert dev_shift["eligible_employees"][0]["employee_name"] == "Priya Nair"


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

def test_recommended_employee_names_cluster_a():
    result = build_weekly_schedule_output("A")
    shifts = result["shift_eligibility_summary"]

    mon_shift = next(s for s in shifts if s["shift_id"] == "mon_morning_01")
    wed_shift = next(s for s in shifts if s["shift_id"] == "wed_afternoon_01")
    fri_shift = next(s for s in shifts if s["shift_id"] == "fri_evening_01")

    assert mon_shift["recommended_employee_name"] == "Daniel Brooks"
    assert wed_shift["recommended_employee_name"] is None
    assert fri_shift["recommended_employee_name"] == "Aarav Patel"


def test_recommended_employee_names_cluster_b():
    result = build_weekly_schedule_output("B")
    shifts = result["shift_eligibility_summary"]

    support_shift = next(s for s in shifts if s["shift_id"] == "mon_support_block_01")
    review_shift = next(s for s in shifts if s["shift_id"] == "wed_review_block_01")
    dev_shift = next(s for s in shifts if s["shift_id"] == "fri_dev_block_01")

    assert support_shift["recommended_employee_name"] == "Jason Miller"
    assert review_shift["recommended_employee_name"] == "Neha Sharma"
    assert dev_shift["recommended_employee_name"] == "Priya Nair"