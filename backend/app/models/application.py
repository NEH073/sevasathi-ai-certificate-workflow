
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func

from app.database import Base


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    application_number = Column(String(30), unique=True, nullable=False, index=True)

    applicant_id = Column(Integer, ForeignKey("applicants.id"), nullable=False)

    certificate_type = Column(String(100), default="Income Certificate")
    purpose = Column(String(200), nullable=False)
    annual_income = Column(Integer, nullable=False)

    status = Column(
        String(30),
        nullable=False,
        default="SUBMITTED"
    )

    current_stage = Column(
        String(50),
        nullable=False,
        default="DOCUMENT_SCRUTINY"
    )

    remarks = Column(Text, nullable=True)

    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )
