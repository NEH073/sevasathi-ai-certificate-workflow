
import os
from pypdf import PdfReader


def extract_document_text(file_path: str):
    """
    Extract text from an uploaded PDF.
    """

    if not os.path.exists(file_path):
        return {
            "success": False,
            "error": "Document file not found"
        }

    extension = os.path.splitext(file_path)[1].lower()

    if extension != ".pdf":
        return {
            "success": False,
            "error": "Currently only PDF text extraction is supported"
        }

    try:
        reader = PdfReader(file_path)

        extracted_text = ""

        for page in reader.pages:
            page_text = page.extract_text() or ""
            extracted_text += page_text + "\n"

        if not extracted_text.strip():
            return {
                "success": False,
                "error": "No readable text found. This may be a scanned PDF."
            }

        return {
            "success": True,
            "text": extracted_text.strip()
        }

    except Exception as error:
        return {
            "success": False,
            "error": str(error)
        }
