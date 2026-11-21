
import re


def analyze_income_document(extracted_text: str, application_data: dict):
    text = extracted_text or ""

    expected_name = str(application_data.get("applicant_name") or "").strip()
    expected_income = application_data.get("declared_annual_income")

    # Extract an income amount from common certificate formats.
    income_match = re.search(
        r"(?:annual\s+income|yearly\s+income|income)[^\d]{0,40}(?:rs\.?|inr|₹)?\s*([\d,]+)",
        text,
        re.IGNORECASE
    )

    extracted_income = None
    if income_match:
        try:
            extracted_income = int(income_match.group(1).replace(",", ""))
        except ValueError:
            pass

    # Compare applicant name without case sensitivity.
    name_match = bool(
        expected_name and expected_name.casefold() in text.casefold()
    )

    income_matches = (
        extracted_income == int(expected_income)
        if extracted_income is not None and expected_income is not None
        else None
    )

    missing = []
    inconsistencies = []

    if not expected_name:
        missing.append("Applicant name is unavailable in application data")
    elif not name_match:
        inconsistencies.append("Applicant name was not found as an exact text match")

    if extracted_income is None:
        missing.append("Annual income could not be extracted")
    elif income_matches is False:
        inconsistencies.append(
            f"Income mismatch: application={expected_income}, document={extracted_income}"
        )

    if not text.strip():
        missing.append("No readable document text was extracted")

    return {
        "success": True,
        "analysis": {
            "document_type": "Income certificate (suggested classification)",
            "extracted_name": expected_name if name_match else None,
            "extracted_income": extracted_income,
            "name_match": name_match,
            "income_match": income_matches,
            "missing_information": missing,
            "potential_inconsistencies": inconsistencies,
            "summary": (
                "Text-based preliminary comparison completed. "
                "Manual officer review is required."
            ),
            "suggested_action": "REVIEW_REQUIRED",
            "analysis_method": "LOCAL_RULE_BASED",
            "human_review_required": True
        }
    }


def analyze_field_verification(
    application_data: dict,
    observations: str,
    verified_annual_income: int | None,
    location_verified: bool
):
    declared_income = application_data.get("declared_annual_income")

    discrepancies = []

    if verified_annual_income is not None and declared_income is not None:
        if int(verified_annual_income) != int(declared_income):
            discrepancies.append("Verified income differs from declared income")

    if not observations.strip():
        return {
            "success": False,
            "error": "Officer observations are required"
        }

    return {
        "success": True,
        "analysis": {
            "income_consistency": (
                "MATCH" if verified_annual_income == declared_income
                else "REVIEW_REQUIRED"
            ),
            "location_verification": (
                "REPORTED_VERIFIED" if location_verified
                else "NOT_REPORTED_VERIFIED"
            ),
            "potential_discrepancies": discrepancies,
            "missing_information": [],
            "field_report_english": observations,
            "field_report_kannada": (
                "ಅಧಿಕಾರಿಯ ಸ್ಥಳ ಪರಿಶೀಲನಾ ವರದಿಯನ್ನು "
                "ಹಸ್ತಚಾಲಿತವಾಗಿ ಪರಿಶೀಲಿಸಬೇಕು."
            ),
            "suggested_action": "REVIEW_REQUIRED",
            "analysis_method": "LOCAL_RULE_BASED",
            "human_review_required": True
        }
    }
