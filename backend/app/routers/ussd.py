from fastapi import APIRouter, Form
from fastapi.responses import PlainTextResponse

from app.services import ussd

router = APIRouter(prefix="/api/v1", tags=["ussd"])


@router.post("/ussd", response_class=PlainTextResponse)
def africa_talking_callback(
    sessionId: str = Form(default="dev-session"),
    phoneNumber: str = Form(default=""),
    text: str = Form(default=""),
) -> str:
    """Africa's Talking posts application/x-www-form-urlencoded."""
    return ussd.handle(sessionId, phoneNumber, text)
