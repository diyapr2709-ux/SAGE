import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models import User, Message, RoleEnum

_LEADERSHIP = {RoleEnum.CEO, RoleEnum.MANAGER, RoleEnum.ADMIN}

router = APIRouter(prefix="/messages", tags=["messages"])


class MessageCreate(BaseModel):
    recipient_email: Optional[str] = None  # None = broadcast to all employees
    subject: str = ""
    body: str


@router.post("")
def send_message(body: MessageCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in _LEADERSHIP:
        raise HTTPException(403, "Only CEO/admins can send messages")
    if not body.body.strip():
        raise HTTPException(400, "Message body cannot be empty")

    recipient_id = None
    if body.recipient_email:
        recipient = db.query(User).filter(User.email == body.recipient_email).first()
        if not recipient:
            raise HTTPException(404, "Recipient not found")
        recipient_id = recipient.id

    msg = Message(
        sender_id=current_user.id,
        recipient_id=recipient_id,
        subject=body.subject or "(No subject)",
        body=body.body,
        created_at=datetime.utcnow().isoformat(),
        read_by="[]",
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return {"ok": True, "id": msg.id}


@router.get("")
def get_messages(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role in _LEADERSHIP:
        msgs = db.query(Message).all()
    else:
        msgs = db.query(Message).filter(
            (Message.recipient_id == current_user.id) | (Message.recipient_id == None)
        ).all()

    result = []
    for m in msgs:
        sender = db.query(User).filter(User.id == m.sender_id).first()
        recipient = db.query(User).filter(User.id == m.recipient_id).first() if m.recipient_id else None
        read_by = json.loads(m.read_by or "[]")
        result.append({
            "id": m.id,
            "sender": sender.full_name if sender else "Unknown",
            "sender_email": sender.email if sender else "",
            "recipient": recipient.full_name if recipient else "All Employees",
            "recipient_email": recipient.email if recipient else None,
            "subject": m.subject,
            "body": m.body,
            "created_at": m.created_at,
            "is_read": current_user.id in read_by,
            "read_count": len(read_by),
            "is_broadcast": m.recipient_id is None,
        })
    return {"messages": sorted(result, key=lambda x: x["created_at"] or "", reverse=True)}


@router.put("/{message_id}/read")
def mark_read(message_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(404, "Message not found")
    read_by = json.loads(msg.read_by or "[]")
    if current_user.id not in read_by:
        read_by.append(current_user.id)
        msg.read_by = json.dumps(read_by)
        db.commit()
    return {"ok": True}


@router.delete("/{message_id}")
def delete_message(message_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(404, "Message not found")
    if msg.sender_id != current_user.id and current_user.role not in _LEADERSHIP:
        raise HTTPException(403, "Not authorized")
    db.delete(msg)
    db.commit()
    return {"ok": True}


@router.get("/users")
def get_all_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Return all users for recipient picker (manager only)."""
    if current_user.role not in _LEADERSHIP:
        raise HTTPException(403, "Not authorized")
    users = db.query(User).filter(User.id != current_user.id).order_by(User.full_name).all()
    return {"users": [{"id": u.id, "email": u.email, "full_name": u.full_name, "role": u.role.value} for u in users]}
