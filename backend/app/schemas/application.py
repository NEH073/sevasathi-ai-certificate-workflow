
from pydantic import BaseModel, Field


class ApplicationCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    mobile_number: str = Field(min_length=10, max_length=15)
    email: str | None = None
    address: str = Field(min_length=5, max_length=500)
    district: str = Field(min_length=2, max_length=100)
    purpose: str = Field(min_length=3, max_length=200)
    annual_income: int = Field(gt=0)


class FieldVerificationRequest(BaseModel):
    officer_name: str = Field(min_length=2, max_length=150)
    observations: str = Field(min_length=10, max_length=2000)
    verified_annual_income: int | None = Field(default=None, gt=0)
    location_verified: bool = False


class FinalDecisionRequest(BaseModel):
    officer_name: str = Field(min_length=2, max_length=150)
    decision: str
    remarks: str = Field(min_length=5, max_length=2000)
