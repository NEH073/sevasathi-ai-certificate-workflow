from app.database import Base, engine
from app.models import (
    Applicant,
    Application,
    Document,
    WorkflowStage,
    AuditLog,
)

Base.metadata.create_all(bind=engine)

print("SevaSathi database tables created successfully!")