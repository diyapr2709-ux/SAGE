from sqlalchemy import Column, Integer, String, Enum, ForeignKey, Text
from app.database import Base
import enum

class RoleEnum(str, enum.Enum):
    ADMIN = "admin"
    CEO = "ceo"
    MANAGER = "manager"   # kept for backward compat with existing DB rows
    EMPLOYEE = "employee"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    full_name = Column(String)
    hashed_password = Column(String)
    role = Column(Enum(RoleEnum), default=RoleEnum.EMPLOYEE)

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"))
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # None = broadcast
    subject = Column(String, default="")
    body = Column(Text)
    created_at = Column(String)
    read_by = Column(Text, default="[]")  # JSON list of user IDs

class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    assigned_to_email = Column(String, nullable=True)
    title = Column(String)
    notes = Column(Text, default="")
    status = Column(String, default="pending")  # pending | in_progress | done
    priority = Column(String, default="medium")  # low | medium | high
    due_date = Column(String, nullable=True)
    created_at = Column(String)
    updated_at = Column(String)