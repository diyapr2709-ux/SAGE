---
name: SAGE Project Overview
description: SAGE project architecture, stack, and key files
type: project
---

SAGE = Small Business Autonomous Growth Engine. Demo business: Marathon Deli, College Park MD.

**Stack:**
- Backend: FastAPI + SQLite (sage.db) + SQLAlchemy — runs from `/backend/`
- Frontend: React + Vite (port 5173) + framer-motion + recharts — runs from `/frontend/`
- AI agents: FRANK (orchestrator), PULSE (revenue), VOICE (reputation), CREW (scheduling), SHELF (cost intel)

**Key backend files:**
- `backend/app/main.py` — FastAPI app, registers all routers
- `backend/app/models.py` — User, Message, Task models
- `backend/app/auth/router.py` — /auth/login, /auth/register, /auth/me
- `backend/app/dashboard/router.py` — shifts, clock-in/out, shift-requests, attendance
- `backend/app/messages/router.py` — messaging (CEO→employees)
- `backend/app/tasks/router.py` — task management

**Key frontend files:**
- `frontend/src/App.jsx` — routes + role-based protection
- `frontend/src/pages/ManagerDashboard.jsx` — manager/CEO view with messaging + tasks
- `frontend/src/pages/EmployeeDashboard.jsx` — employee view with inbox + persistent tasks
- `frontend/src/components/layout/DashboardShell.jsx` — top bar, search, notification bell
- `frontend/src/api/client.js` — all API calls

**Roles:** `ceo` (was manager), `employee`, `admin` (kept for super-admin). All leadership checks use `_LEADERSHIP = {RoleEnum.CEO, RoleEnum.MANAGER, RoleEnum.ADMIN}`. Old DB rows with role='manager' still work. Login page shows "CEO" / "Employee" only.

**Clock In/Out:** CREW agent generates 7 shifts for current Mon-Sun week. Employees see today's + future shifts (not past). Clock button visible for any non-completed shift (`!s.clOut`). Attendance stored in `sage/data/shifts/attendance.json`.

**Why:** University of Maryland research project.

**How to apply:** When making changes, check both backend models and router AND frontend api/client.js to keep them in sync.
