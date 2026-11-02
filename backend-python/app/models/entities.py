from datetime import datetime, date
from sqlalchemy import String, Integer, Boolean, Date, DateTime, ForeignKey, Text, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Department(Base):
    __tablename__ = "departments"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    code: Mapped[str] = mapped_column(String(24))
    description: Mapped[str] = mapped_column(Text, default="")
    location: Mapped[str] = mapped_column(String(120), default="")
    email: Mapped[str] = mapped_column(String(256), default="")
    head_id: Mapped[str | None] = mapped_column(String(40), nullable=True)
    parent_id: Mapped[str | None] = mapped_column(String(40), nullable=True)
    created_at: Mapped[date] = mapped_column(Date)


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    employee_id: Mapped[str | None] = mapped_column(String(40), nullable=True)
    name: Mapped[str] = mapped_column(String(160))
    email: Mapped[str] = mapped_column(String(256), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(256))
    role: Mapped[str] = mapped_column(String(40))
    status: Mapped[str] = mapped_column(String(20), default="Active")
    last_active: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False)


class Employee(Base):
    __tablename__ = "employees"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    first_name: Mapped[str] = mapped_column(String(80))
    last_name: Mapped[str] = mapped_column(String(80))
    email: Mapped[str] = mapped_column(String(256), index=True)
    personal_email: Mapped[str] = mapped_column(String(256), default="")
    phone: Mapped[str] = mapped_column(String(32), default="")
    gender: Mapped[str] = mapped_column(String(10), default="Other")
    date_of_birth: Mapped[date] = mapped_column(Date)
    marital_status: Mapped[str] = mapped_column(String(20), default="Single")
    blood_group: Mapped[str] = mapped_column(String(8), default="")
    department_id: Mapped[str] = mapped_column(String(40))
    designation_id: Mapped[str] = mapped_column(String(40))
    branch_id: Mapped[str] = mapped_column(String(40))
    manager_id: Mapped[str | None] = mapped_column(String(40), nullable=True)
    employment_type: Mapped[str] = mapped_column(String(40), default="Full-time")
    status: Mapped[str] = mapped_column(String(20), default="Active")
    date_of_joining: Mapped[date] = mapped_column(Date)
    work_location: Mapped[str] = mapped_column(String(120), default="")
    is_detailed: Mapped[bool] = mapped_column(Boolean, default=False)