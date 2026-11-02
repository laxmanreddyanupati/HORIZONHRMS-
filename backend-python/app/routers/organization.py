from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import Department
from app.schemas.dto import DepartmentOut

router = APIRouter(prefix="/api/organization", tags=["organization"])


@router.get("/departments")
def list_departments(db: Session = Depends(get_db)):
    rows = db.query(Department).all()
    return [DepartmentOut.model_validate(r) for r in rows]