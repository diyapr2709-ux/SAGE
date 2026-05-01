"""
Run once to create demo employee + manager accounts in the SAGE database.

Usage (from project root):
    python seed_employees.py

Credentials printed after running.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from passlib.context import CryptContext
from app.database import SessionLocal, engine, Base
from app import models

Base.metadata.create_all(bind=engine)

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

ACCOUNTS = [
    # (full_name, email, password, role)
    ("Aarav Patel",    "aarav@marathondeli.com",    "Aarav@2025",    "employee"),
    ("Michael Rivera", "michael@marathondeli.com",  "Michael@2025",  "employee"),
    ("Sophia Kim",     "sophia@marathondeli.com",   "Sophia@2025",   "employee"),
    ("Daniel Brooks",  "daniel@marathondeli.com",   "Daniel@2025",   "employee"),
    ("Emily Chen",     "emily@marathondeli.com",    "Emily@2025",    "employee"),
    ("CEO",            "ceo@marathondeli.com",       "Ceo@2025",      "ceo"),
]

db = SessionLocal()
created, skipped = [], []
for full_name, email, password, role in ACCOUNTS:
    if db.query(models.User).filter(models.User.email == email).first():
        skipped.append(email)
        continue
    role_enum = models.RoleEnum(role)
    user = models.User(
        email=email,
        full_name=full_name,
        hashed_password=pwd.hash(password),
        role=role_enum,
    )
    db.add(user)
    created.append((email, password, role))

db.commit()
db.close()

print("\n=== SAGE Employee Accounts ===")
if created:
    print(f"\nCreated {len(created)} accounts:")
    for email, password, role in created:
        print(f"  [{role:8}]  {email}  /  {password}")
if skipped:
    print(f"\nSkipped (already exist): {', '.join(skipped)}")
print()
