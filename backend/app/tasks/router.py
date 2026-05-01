from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models import User, Task, RoleEnum

_LEADERSHIP = {RoleEnum.CEO, RoleEnum.MANAGER, RoleEnum.ADMIN}

router = APIRouter(prefix="/tasks", tags=["tasks"])


class TaskCreate(BaseModel):
    title: str
    notes: str = ""
    priority: str = "medium"
    due_date: Optional[str] = None
    assigned_to_email: Optional[str] = None


class TaskUpdate(BaseModel):
    status: Optional[str] = None
    title: Optional[str] = None
    notes: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None


@router.get("")
def get_tasks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role in _LEADERSHIP:
        tasks = db.query(Task).all()
    else:
        tasks = db.query(Task).filter(
            (Task.assigned_to_email == current_user.email) |
            (Task.created_by == current_user.id)
        ).all()

    result = []
    for t in tasks:
        creator = db.query(User).filter(User.id == t.created_by).first()
        result.append({
            "id": t.id,
            "title": t.title,
            "notes": t.notes or "",
            "status": t.status,
            "priority": t.priority,
            "due_date": t.due_date,
            "assigned_to_email": t.assigned_to_email,
            "created_by": creator.full_name if creator else "Unknown",
            "created_by_email": creator.email if creator else "",
            "created_at": t.created_at,
            "updated_at": t.updated_at,
        })
    return {"tasks": sorted(result, key=lambda x: x.get("created_at") or "", reverse=True)}


@router.post("")
def create_task(body: TaskCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not body.title.strip():
        raise HTTPException(400, "Task title cannot be empty")
    # Only managers can assign tasks to others
    assigned = body.assigned_to_email
    if assigned and current_user.role not in _LEADERSHIP:
        assigned = current_user.email  # employees can only self-assign
    now = datetime.utcnow().isoformat()
    task = Task(
        created_by=current_user.id,
        assigned_to_email=assigned or current_user.email,
        title=body.title.strip(),
        notes=body.notes or "",
        priority=body.priority,
        due_date=body.due_date,
        status="pending",
        created_at=now,
        updated_at=now,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return {"ok": True, "id": task.id}


@router.put("/{task_id}")
def update_task(task_id: int, body: TaskUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    is_creator = task.created_by == current_user.id
    is_assignee = task.assigned_to_email == current_user.email
    is_manager = current_user.role in _LEADERSHIP
    if not (is_creator or is_assignee or is_manager):
        raise HTTPException(403, "Not authorized")

    if body.status is not None:
        task.status = body.status
    if body.title is not None:
        task.title = body.title
    if body.notes is not None:
        task.notes = body.notes
    if body.priority is not None:
        task.priority = body.priority
    if body.due_date is not None:
        task.due_date = body.due_date
    task.updated_at = datetime.utcnow().isoformat()
    db.commit()
    return {"ok": True}


@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    if task.created_by != current_user.id and current_user.role not in _LEADERSHIP:
        raise HTTPException(403, "Not authorized")
    db.delete(task)
    db.commit()
    return {"ok": True}
