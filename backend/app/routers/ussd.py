from fastapi import APIRouter, Depends, Form, Header, HTTPException, Request
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.deps import db_session, require_planner_key
from app.infrastructure.ingestion.pipeline import verify_ussd_webhook
from app.middleware.privacy import redact_payload
from app.services import ussd

router = APIRouter(prefix="/api/v1", tags=["ussd"])


@router.post("/ussd", response_class=PlainTextResponse)
def africa_talking_callback(
    request: Request,
    db: Session = Depends(db_session),
    sessionId: str = Form(default="dev-session"),
    phoneNumber: str = Form(default=""),
    text: str = Form(default=""),
    x_signature: str | None = Header(default=None, alias="X-Ramani-Signature"),
) -> str:
    raw_body = f"{sessionId}:{phoneNumber}:{text}"
    if not verify_ussd_webhook(raw_body, x_signature):
        raise HTTPException(status_code=401, detail="Invalid USSD webhook signature")
    _ = redact_payload({"phoneNumber": phoneNumber, "text": text})
    return ussd.handle(db, sessionId, phoneNumber, text)
