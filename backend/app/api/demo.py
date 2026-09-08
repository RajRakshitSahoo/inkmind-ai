from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token, hash_password
from app.models.models import User, UserRole
from app.schemas.schemas import TokenResponse, UserOut

router = APIRouter(prefix="/api/demo", tags=["demo"])

DEMO_EMAIL = "demo@inkmind.ai"


@router.post("/login", response_model=TokenResponse)
def demo_login(db: Session = Depends(get_db)):
    """
    One-click 'Try Demo' entry point (spec section 42) — no signup
    required. Creates the shared demo account on first use.
    """
    user = db.query(User).filter(User.email == DEMO_EMAIL).first()
    if not user:
        user = User(
            name="Demo Student",
            email=DEMO_EMAIL,
            hashed_password=hash_password("demo-not-a-real-password"),
            role=UserRole.student,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))
