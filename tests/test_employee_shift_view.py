from sage.tools.employee_shift_view import build_employee_shift_view, get_sample_employees

from sage.tools.employee_shift_view import build_employee_shift_view, get_sample_employees


def test_cluster_b_shift_view():
    employees = get_sample_employees("B")

    priya = next(e for e in employees if e["name"] == "Priya Nair")
    result = build_employee_shift_view(priya, "B")

    assert result[0]["shift_id"] == "mon_support_block_01"
    assert result[0]["role_match"] is False

    assert result[1]["shift_id"] == "wed_review_block_01"
    assert result[1]["role_match"] is False

    assert result[2]["shift_id"] == "fri_dev_block_01"
    assert result[2]["role_match"] is True
    assert result[2]["preference_match"] is True
    assert result[2]["within_hour_cap"] is True
    assert result[2]["can_select_shift"] is True


def test_employee_shift_view_structure():
    employee = get_sample_employees()[0]
    result = build_employee_shift_view(employee)

    assert isinstance(result, list)
    assert len(result) > 0

    first_shift = result[0]
    assert "shift_id" in first_shift
    assert "shift_date" in first_shift
    assert "shift_start" in first_shift
    assert "shift_end" in first_shift
    assert "required_role" in first_shift
    assert "role_match" in first_shift
    assert "preference_match" in first_shift
    assert "shift_hours" in first_shift
    assert "projected_hours" in first_shift
    assert "within_hour_cap" in first_shift
    assert "can_select_shift" in first_shift
    assert "selection_note" in first_shift


def test_aarav_shift_view():
    aarav = get_sample_employees()[0]
    result = build_employee_shift_view(aarav)

    assert result[0]["shift_id"] == "mon_morning_01"
    assert result[0]["role_match"] is True
    assert result[0]["can_select_shift"] is False

    assert result[1]["shift_id"] == "wed_afternoon_01"
    assert result[1]["role_match"] is False
    assert result[1]["selection_note"] == "This shift requires front_desk, but your role is cashier."

    assert result[2]["shift_id"] == "fri_evening_01"
    assert result[2]["role_match"] is True
    assert result[2]["preference_match"] is True
    assert result[2]["within_hour_cap"] is True
    assert result[2]["can_select_shift"] is True


def test_emily_shift_view():
    emily = get_sample_employees()[1]
    result = build_employee_shift_view(emily)

    assert result[0]["role_match"] is False
    assert result[1]["role_match"] is True
    assert result[1]["preference_match"] is True
    assert result[1]["within_hour_cap"] is False
    assert result[1]["can_select_shift"] is False
    assert result[1]["selection_note"] == "Choosing this shift would exceed your allowed weekly hours."


def test_daniel_shift_view():
    daniel = get_sample_employees()[2]
    result = build_employee_shift_view(daniel)

    assert result[0]["role_match"] is True
    assert result[0]["preference_match"] is True
    assert result[0]["within_hour_cap"] is True
    assert result[0]["can_select_shift"] is True

    assert result[1]["role_match"] is False
    assert result[1]["can_select_shift"] is False
    assert result[1]["selection_note"] == "This shift requires front_desk, but your role is cashier."