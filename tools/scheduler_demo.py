import json
import time
from apscheduler.schedulers.background import BackgroundScheduler
from sage.tools.demo_payload import build_demo_payload


def scheduled_job():
    payload = build_demo_payload("alert_mode")
    print("Scheduled payload generated:")
    print(json.dumps(payload, indent=4))


def main():
    scheduler = BackgroundScheduler()
    scheduler.add_job(scheduled_job, "interval", seconds=5)
    scheduler.start()

    print("Scheduler started. Waiting 12 seconds...")

    try:
        time.sleep(12)
    finally:
        scheduler.shutdown()
        print("Scheduler stopped.")


if __name__ == "__main__":
    main()