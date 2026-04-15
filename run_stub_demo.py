import json
import sys
from sage.tools.demo_payload import build_demo_payload


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "alert_mode"
    payload = build_demo_payload(mode)

    print(f"COMBINED DEMO PAYLOAD ({mode}):")
    print(json.dumps(payload, indent=4))


if __name__ == "__main__":
    main()