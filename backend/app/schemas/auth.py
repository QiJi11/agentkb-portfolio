from typing import Literal

from pydantic import BaseModel


class InterviewerLoginRequest(BaseModel):
    code: str


class InterviewerLoginResponse(BaseModel):
    role: Literal["interviewer"]
    is_priority: bool
