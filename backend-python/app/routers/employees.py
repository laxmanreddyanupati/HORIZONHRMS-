from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import Employee
from app.schemas.dto import EmployeeOut

router = APIRouter(prefix="/api/employees", tags=["employees"])


@router.get("")
def list_employees(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    rows = db.query(Employee).offset(skip).limit(limit).all()
    total = db.query(Employee).count()
    return {"data": [EmployeeOut.model_validate(r) for r in rows], "total": total, "page": 1, "page_size": limit, "total_pages": (total + limit - 1) // limit}


@router.get("/{employee_id}")
def get_employee(employee_id: str, db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return EmployeeOut.model_validate(emp)


@router.get("/counts")
def counts(db: Session = Depends(get_db)):
    total = db.query(Employee).count()
    active = db.query(Employee).filter(Employee.status == "Active").count()
    return {"total": total, "active": active, "probation": 0, "on_leave": 0, "inactive": total - active}