import json
from sage.data.cluster_a_data import get_cluster_a_weekly_shifts
from sage.data.cluster_b_data import get_cluster_b_weekly_shifts


def get_weekly_open_shifts(cluster: str = "A") -> list[dict]:
    if cluster == "A":
        return get_cluster_a_weekly_shifts()
    if cluster == "B":
        return get_cluster_b_weekly_shifts()
    raise ValueError("cluster must be 'A' or 'B'")


if __name__ == "__main__":
    print("CLUSTER A SHIFTS:")
    print(json.dumps(get_weekly_open_shifts("A"), indent=4))

    print("\nCLUSTER B SHIFTS:")
    print(json.dumps(get_weekly_open_shifts("B"), indent=4))