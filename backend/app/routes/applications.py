
import os
import uuid
import json

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.applicant import Applicant
from app.models.application import Application
from app.models.document import Document
from app.models.audit_log import AuditLog

from app.schemas.application import (
    ApplicationCreate,
    FieldVerificationRequest,
    FinalDecisionRequest
)

from app.services.document_service import extract_document_text
from app.services.ai_service import (
    analyze_income_document,
    analyze_field_verification
)

router = APIRouter(
    prefix="/applications",
    tags=["Applications"]
)


# --------------------------------------------------
# 1. CREATE APPLICATION
# --------------------------------------------------

@router.post("/")
def create_application(
    data: ApplicationCreate,
    db: Session = Depends(get_db)
):
    applicant = Applicant(
        full_name=data.full_name,
        mobile_number=data.mobile_number,
        email=data.email,
        address=data.address,
        district=data.district
    )

    db.add(applicant)
    db.flush()

    application = Application(
        application_number=f"SEVA-{applicant.id:05d}",
        applicant_id=applicant.id,
        purpose=data.purpose,
        annual_income=data.annual_income,
        status="SUBMITTED",
        current_stage="DOCUMENT_SCRUTINY"
    )

    db.add(application)

    # Generate the application ID before creating its audit log
    db.flush()

    db.add(AuditLog(
        application_id=application.id,
        actor_name="System",
        actor_role="SYSTEM",
        action="APPLICATION_SUBMITTED",
        previous_status="NEW",
        new_status="SUBMITTED",
        remarks="Application submitted successfully"
    ))

    db.commit()
    db.refresh(application)

    return {
        "message": "Application submitted successfully",
        "application_number": application.application_number,
        "status": application.status,
        "current_stage": application.current_stage
    }


# --------------------------------------------------
# 2. LIST ALL APPLICATIONS
# --------------------------------------------------

@router.get("/")
def list_applications(
    db: Session = Depends(get_db)
):
    applications = db.query(Application).all()

    results = []

    for application in applications:
        applicant = db.query(Applicant).filter(
            Applicant.id == application.applicant_id
        ).first()

        results.append({
            "application_number": application.application_number,
            "applicant_name": applicant.full_name if applicant else None,
            "district": applicant.district if applicant else None,
            "purpose": application.purpose,
            "annual_income": application.annual_income,
            "status": application.status,
            "current_stage": application.current_stage,
            "submitted_at": application.submitted_at
        })

    return results


# --------------------------------------------------
# 3. DASHBOARD STATISTICS
# --------------------------------------------------


@router.get("/dashboard/stats")
def dashboard_stats(
    db: Session = Depends(get_db)
):
    total = db.query(Application).count()

    pending = db.query(Application).filter(
        Application.status.in_([
            "SUBMITTED",
            "IN_PROGRESS",
            "RETURNED"
        ])
    ).count()

    scrutiny = db.query(Application).filter(
        Application.current_stage == "DOCUMENT_SCRUTINY",
        Application.status.in_(["SUBMITTED", "IN_PROGRESS"])
    ).count()

    verification = db.query(Application).filter(
        Application.current_stage == "FIELD_VERIFICATION",
        Application.status == "IN_PROGRESS"
    ).count()

    final_decision = db.query(Application).filter(
        Application.current_stage == "FINAL_DECISION",
        Application.status == "IN_PROGRESS"
    ).count()

    approved = db.query(Application).filter(
        Application.status == "APPROVED"
    ).count()

    rejected = db.query(Application).filter(
        Application.status == "REJECTED"
    ).count()

    returned = db.query(Application).filter(
        Application.status == "RETURNED"
    ).count()

    return {
        "total_applications": total,
        "pending_applications": pending,
        "document_scrutiny": scrutiny,
        "field_verification": verification,
        "awaiting_final_decision": final_decision,
        "approved": approved,
        "rejected": rejected,
        "returned": returned
    }



# --------------------------------------------------
# 4. GET APPLICATION DETAILS
# --------------------------------------------------

@router.get("/{application_number}")
def get_application_details(
    application_number: str,
    db: Session = Depends(get_db)
):
    application = db.query(Application).filter(
        Application.application_number == application_number
    ).first()

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application not found"
        )

    applicant = db.query(Applicant).filter(
        Applicant.id == application.applicant_id
    ).first()

    return {
        "application_number": application.application_number,
        "applicant_name": applicant.full_name if applicant else None,
        "mobile_number": applicant.mobile_number if applicant else None,
        "email": applicant.email if applicant else None,
        "address": applicant.address if applicant else None,
        "district": applicant.district if applicant else None,
        "purpose": application.purpose,
        "annual_income": application.annual_income,
        "status": application.status,
        "current_stage": application.current_stage,
        "remarks": application.remarks,
        "submitted_at": application.submitted_at
    }


# --------------------------------------------------
# 5. UPLOAD DOCUMENT
# --------------------------------------------------

@router.post("/{application_number}/documents")
def upload_document(
    application_number: str,
    document_type: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    application = db.query(Application).filter(
        Application.application_number == application_number
    ).first()

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application not found"
        )

    if application.current_stage != "DOCUMENT_SCRUTINY":
        raise HTTPException(
            status_code=400,
            detail="Documents can only be uploaded during document scrutiny"
        )

    allowed_types = [
        "application/pdf",
        "image/jpeg",
        "image/png"
    ]

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Only PDF, JPG and PNG files are allowed"
        )

    original_filename = file.filename or "document"
    extension = os.path.splitext(original_filename)[1].lower()

    if extension not in [".pdf", ".jpg", ".jpeg", ".png"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid file extension"
        )

    os.makedirs("uploads", exist_ok=True)

    unique_filename = f"{uuid.uuid4()}{extension}"
    file_path = os.path.join("uploads", unique_filename)

    try:
        with open(file_path, "wb") as buffer:
            buffer.write(file.file.read())
    except OSError:
        raise HTTPException(
            status_code=500,
            detail="Could not save uploaded document"
        )

    document = Document(
        application_id=application.id,
        document_type=document_type,
        file_name=original_filename,
        file_path=file_path
    )

    db.add(document)

    db.add(AuditLog(
        application_id=application.id,
        actor_name="Demo Officer",
        actor_role="DOCUMENT_SCRUTINY_OFFICER",
        action="DOCUMENT_UPLOADED",
        previous_status="NOT_UPLOADED",
        new_status="UPLOADED",
        remarks=f"Uploaded {document_type}: {original_filename}"
    ))

    db.commit()
    db.refresh(document)

    return {
        "message": "Document uploaded successfully",
        "document_id": document.id,
        "file_name": document.file_name,
        "document_type": document.document_type
    }


# --------------------------------------------------
# 6. AI DOCUMENT ANALYSIS
# --------------------------------------------------

@router.post("/{application_number}/documents/{document_id}/analyze")
def analyze_document(
    application_number: str,
    document_id: int,
    db: Session = Depends(get_db)
):
    application = db.query(Application).filter(
        Application.application_number == application_number
    ).first()

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application not found"
        )

    document = db.query(Document).filter(
        Document.id == document_id,
        Document.application_id == application.id
    ).first()

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )

    extraction = extract_document_text(document.file_path)

    if not extraction["success"]:
        raise HTTPException(
            status_code=400,
            detail=extraction["error"]
        )

    applicant = db.query(Applicant).filter(
        Applicant.id == application.applicant_id
    ).first()

    application_data = {
        "applicant_name": applicant.full_name if applicant else None,
        "district": applicant.district if applicant else None,
        "purpose": application.purpose,
        "declared_annual_income": application.annual_income
    }

    extracted_text = extraction["text"]

    ai_result = analyze_income_document(
        extracted_text,
        application_data
    )

    document.extracted_text = extracted_text
    document.ai_review = json.dumps(
        ai_result,
        ensure_ascii=False
    )

    db.add(AuditLog(
        application_id=application.id,
        actor_name="SevaSathi AI",
        actor_role="AI_ASSISTANT",
        action="DOCUMENT_AI_ANALYSIS_COMPLETED",
        previous_status="UPLOADED",
        new_status="ANALYZED",
        remarks="AI document analysis completed"
    ))

    db.commit()

    return {
        "message": (
            "Document analysis completed"
            if ai_result.get("success")
            else "Text extraction completed; AI analysis requires review"
        ),
        "document_id": document.id,
        "extraction": extracted_text,
        "ai_review": ai_result
    }


# --------------------------------------------------
# 7. LIST APPLICATION DOCUMENTS
# --------------------------------------------------

@router.get("/{application_number}/documents")
def list_application_documents(
    application_number: str,
    db: Session = Depends(get_db)
):
    application = db.query(Application).filter(
        Application.application_number == application_number
    ).first()

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application not found"
        )

    documents = db.query(Document).filter(
        Document.application_id == application.id
    ).all()

    results = []

    for document in documents:
        try:
            ai_review = (
                json.loads(document.ai_review)
                if document.ai_review
                else None
            )
        except (json.JSONDecodeError, TypeError):
            ai_review = None

        results.append({
            "document_id": document.id,
            "document_type": document.document_type,
            "file_name": document.file_name,
            "is_verified": document.is_verified,
            "verification_remarks": document.verification_remarks,
            "ai_review": ai_review,
            "uploaded_at": document.uploaded_at
        })

    return results


# --------------------------------------------------
# 8. OFFICER DOCUMENT SCRUTINY DECISION
# --------------------------------------------------

@router.post("/{application_number}/documents/{document_id}/verify")
def verify_document(
    application_number: str,
    document_id: int,
    decision: str,
    remarks: str,
    db: Session = Depends(get_db)
):
    allowed_decisions = [
        "VERIFIED",
        "DISCREPANT",
        "CORRECTION_REQUIRED"
    ]

    decision = decision.strip().upper()
    remarks = remarks.strip()

    if decision not in allowed_decisions:
        raise HTTPException(
            status_code=400,
            detail="Invalid decision. Choose VERIFIED, DISCREPANT or CORRECTION_REQUIRED."
        )

    if len(remarks) < 5:
        raise HTTPException(
            status_code=400,
            detail="Please provide meaningful officer remarks."
        )

    application = db.query(Application).filter(
        Application.application_number == application_number
    ).first()

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application not found"
        )

    document = db.query(Document).filter(
        Document.id == document_id,
        Document.application_id == application.id
    ).first()

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )

    previous_status = (
        "VERIFIED" if document.is_verified else "PENDING_VERIFICATION"
    )

    document.is_verified = decision == "VERIFIED"
    document.verification_remarks = f"[{decision}] {remarks}"

    action_map = {
        "VERIFIED": "DOCUMENT_VERIFIED",
        "DISCREPANT": "DOCUMENT_DISCREPANT",
        "CORRECTION_REQUIRED": "DOCUMENT_CORRECTION_REQUIRED"
    }

    db.add(AuditLog(
        application_id=application.id,
        actor_name="Demo Officer",
        actor_role="DOCUMENT_SCRUTINY_OFFICER",
        action=action_map[decision],
        previous_status=previous_status,
        new_status=decision,
        remarks=remarks
    ))

    db.commit()
    db.refresh(document)

    return {
        "message": "Document scrutiny outcome recorded successfully",
        "document_id": document.id,
        "decision": decision,
        "is_verified": document.is_verified,
        "verification_remarks": document.verification_remarks
    }


# --------------------------------------------------
# 9. APPLICATION AUDIT HISTORY
# --------------------------------------------------

@router.get("/{application_number}/history")
def get_application_history(
    application_number: str,
    db: Session = Depends(get_db)
):
    application = db.query(Application).filter(
        Application.application_number == application_number
    ).first()

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application not found"
        )

    logs = db.query(AuditLog).filter(
        AuditLog.application_id == application.id
    ).order_by(AuditLog.created_at.desc()).all()

    results = []

    for log in logs:
        remarks = log.remarks
        details = None

        if log.action == "FIELD_VERIFICATION_SUBMITTED" and remarks:
            try:
                details = json.loads(remarks)
                remarks = details.get("observations", remarks)
            except (json.JSONDecodeError, TypeError):
                pass

        results.append({
            "actor_name": log.actor_name,
            "actor_role": log.actor_role,
            "action": log.action,
            "previous_status": log.previous_status,
            "new_status": log.new_status,
            "remarks": remarks,
            "details": details,
            "created_at": log.created_at
        })

    return results


# --------------------------------------------------
# 10. ADVANCE APPLICATION WORKFLOW
# --------------------------------------------------

@router.post("/{application_number}/advance")
def advance_application(
    application_number: str,
    officer_name: str,
    remarks: str,
    db: Session = Depends(get_db)
):
    application = db.query(Application).filter(
        Application.application_number == application_number
    ).first()

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application not found"
        )

    if application.current_stage == "DOCUMENT_SCRUTINY":

        documents = db.query(Document).filter(
            Document.application_id == application.id
        ).all()

        if not documents or not all(
            document.is_verified for document in documents
        ):
            raise HTTPException(
                status_code=400,
                detail="All uploaded documents must be verified first"
            )

        next_stage = "FIELD_VERIFICATION"

    elif application.current_stage == "FIELD_VERIFICATION":

        verification = db.query(AuditLog).filter(
            AuditLog.application_id == application.id,
            AuditLog.action == "FIELD_VERIFICATION_SUBMITTED"
        ).first()

        if not verification:
            raise HTTPException(
                status_code=400,
                detail="Field verification must be submitted before final decision"
            )

        next_stage = "FINAL_DECISION"

    else:
        raise HTTPException(
            status_code=400,
            detail="Application cannot be advanced from its current stage"
        )

    previous_stage = application.current_stage

    application.current_stage = next_stage
    application.status = "IN_PROGRESS"

    db.add(AuditLog(
        application_id=application.id,
        actor_name=officer_name,
        actor_role=previous_stage,
        action="WORKFLOW_STAGE_ADVANCED",
        previous_status=previous_stage,
        new_status=next_stage,
        remarks=remarks
    ))

    db.commit()

    return {
        "message": "Application advanced successfully",
        "application_number": application.application_number,
        "previous_stage": previous_stage,
        "current_stage": next_stage,
        "status": application.status
    }


# --------------------------------------------------
# 11. FIELD VERIFICATION WITH AI ASSISTANCE
# --------------------------------------------------

@router.post("/{application_number}/field-verification")
def submit_field_verification(
    application_number: str,
    data: FieldVerificationRequest,
    db: Session = Depends(get_db)
):
    application = db.query(Application).filter(
        Application.application_number == application_number
    ).first()

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application not found"
        )

    if application.current_stage != "FIELD_VERIFICATION":
        raise HTTPException(
            status_code=400,
            detail="Application is not in field verification stage"
        )

    applicant = db.query(Applicant).filter(
        Applicant.id == application.applicant_id
    ).first()

    if not applicant:
        raise HTTPException(
            status_code=404,
            detail="Applicant not found"
        )

    application_data = {
        "applicant_name": applicant.full_name,
        "district": applicant.district,
        "declared_annual_income": application.annual_income,
        "purpose": application.purpose
    }

    ai_result = analyze_field_verification(
        application_data,
        data.observations,
        data.verified_annual_income,
        data.location_verified
    )

    verification_record = {
        "record_type": "FIELD_VERIFICATION",
        "observations": data.observations,
        "declared_annual_income": application.annual_income,
        "verified_annual_income": data.verified_annual_income,
        "location_verified": data.location_verified,
        "ai_review": ai_result
    }

    db.add(AuditLog(
        application_id=application.id,
        actor_name=data.officer_name,
        actor_role="FIELD_VERIFICATION_OFFICER",
        action="FIELD_VERIFICATION_SUBMITTED",
        previous_status="FIELD_VERIFICATION",
        new_status="FIELD_VERIFICATION_REVIEWED",
        remarks=json.dumps(
            verification_record,
            ensure_ascii=False,
            default=str
        )
    ))

    db.commit()

    return {
        "message": "Field verification submitted successfully",
        "application_number": application.application_number,
        "officer_name": data.officer_name,
        "officer_observations": data.observations,
        "declared_annual_income": application.annual_income,
        "verified_annual_income": data.verified_annual_income,
        "location_verified": data.location_verified,
        "ai_review": ai_result,
        "human_decision_required": True
    }


# --------------------------------------------------
# 12. DEPUTY TAHSILDAR FINAL DECISION
# --------------------------------------------------

@router.post("/{application_number}/final-decision")
def submit_final_decision(
    application_number: str,
    data: FinalDecisionRequest,
    db: Session = Depends(get_db)
):
    application = db.query(Application).filter(
        Application.application_number == application_number
    ).first()

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application not found"
        )

    if application.current_stage != "FINAL_DECISION":
        raise HTTPException(
            status_code=400,
            detail="Application is not awaiting final decision"
        )

    decision = data.decision.strip().upper()
    remarks = data.remarks.strip()

    if decision not in ["APPROVE", "REJECT", "RETURN"]:
        raise HTTPException(
            status_code=400,
            detail="Decision must be APPROVE, REJECT or RETURN"
        )

    if len(remarks) < 5:
        raise HTTPException(
            status_code=400,
            detail="Please provide meaningful decision remarks"
        )

    previous_status = application.status
    previous_stage = application.current_stage

    if decision == "APPROVE":
        application.status = "APPROVED"
        action = "APPLICATION_APPROVED"

    elif decision == "REJECT":
        application.status = "REJECTED"
        action = "APPLICATION_REJECTED"

    else:
        application.status = "RETURNED"
        application.current_stage = "DOCUMENT_SCRUTINY"
        action = "APPLICATION_RETURNED"

    application.remarks = remarks

    db.add(AuditLog(
        application_id=application.id,
        actor_name=data.officer_name,
        actor_role="DEPUTY_TAHSILDAR",
        action=action,
        previous_status=previous_status,
        new_status=application.status,
        remarks=remarks
    ))

    db.commit()
    db.refresh(application)

    return {
        "message": "Final decision recorded successfully",
        "application_number": application.application_number,
        "decision": decision,
        "status": application.status,
        "current_stage": application.current_stage,
        "decided_by": data.officer_name,
        "human_decision": True
    }
