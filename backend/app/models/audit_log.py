
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func

from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)

    application_id = Column(
        Integer,
        ForeignKey("applications.id"),
        nullable=False
    )

    actor_name = Column(String(150), nullable=False)
    actor_role = Column(String(100), nullable=False)

    action = Column(String(100), nullable=False)

    previous_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=True)

    remarks = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )
