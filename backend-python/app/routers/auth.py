from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, create_refresh_token, decode_token
from app.models.entities import User
from app.schemas.dto import LoginRequest, TokenResponse, SystemUser

router = APIRouter(prefix="/api/auth", tags=["auth"])
bearer = HTTPBearer(auto_error=False)


def _to_user_dto(u: User) -> SystemUser:
    return SystemUser(
        id=u.id,
        employee_id=u.employee_id,
        name=u.name,
        email=u.email,
        role=u.role,
        status=u.status,
        last_active=u.last_active.strftime("%Y-%m-%dT%H:%M:%S") if u.last_active else "-",
        mfa_enabled=u.mfa_enabled,
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail={"code": "invalid_credentials", "message": "Invalid email or password."})
    if user.status != "Active":
        raise HTTPException(status_code=403, detail={"code": "account_inactive", "message": "Account not active."})
    user.last_active = datetime.now(timezone.utc)
    db.commit()
    access = create_access_token(user.id, {"email": user.email, "role": user.role, "name": user.name, "employeeId": user.employee_id})
    refresh = create_refresh_token(user.id)
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        access_token_expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
        user=_to_user_dto(user),
    )


@router.get("/me", response_model=SystemUser)
def me(credentials: HTTPAuthorizationCredentials = Depends(bearer), db: Session = Depends(get_db)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Missing token")
    data = decode_token(credentials.credentials)
    if not data or data.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == data["sub"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return _to_user_dto(user)