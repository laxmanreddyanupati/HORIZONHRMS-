from pydantic import BaseModel, EmailStr
from datetime import date, datetime
from typing import Optional


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    access_token_expires_at: datetime
    user: "SystemUser"


class SystemUser(BaseModel):
    id: str
    employee_id: Optional[str] = None
    name: str
    email: str
    role: str
    status: str
    last_active: str = "-"
    mfa_enabled: bool = False

    class Config:
        from_attributes = True


TokenResponse.model_rebuild()


class EmployeeOut(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: str
    department_id: str
    designation_id: str
    branch_id: str
    status: str

    class Config:
        from_attributes = True


class DepartmentOut(BaseModel):
    id: str
    name: str
    code: str
    description: str = ""
    location: str = ""
    email: str = ""
    head_id: Optional[str] = None
    parent_id: Optional[str] = None

    class Config:
        from_attributes = True