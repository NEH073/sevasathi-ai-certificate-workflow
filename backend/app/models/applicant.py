
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func

from app.database import Base


class Applicant(Base):
    __tablename__ = "applicants"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(150), nullable=False)
    mobile_number = Column(String(15), nullable=False, index=True)
    email = Column(String(150), nullable=True)
    address = Column(String(500), nullable=False)
    district = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
