\# SevaSathi – AI-Powered Government Certificate Workflow



A Kannada-first prototype demonstrating an AI-assisted income certificate application workflow with human oversight.



> \*\*Disclaimer:\*\* This is a fictional demonstration project, not an official Karnataka Government service. It has no live Nadakacheri or government integration.



\## Features

\- Application registration and tracking

\- Document upload and preliminary scrutiny

\- AI-assisted document analysis with local rule-based fallback

\- Field verification reporting

\- Income consistency checks

\- Workflow progression and application status tracking

\- Human-controlled approve, reject, and return decisions

\- Audit history and dashboard statistics

\- Kannada and English report support



\## Technology Stack

\- Frontend: React, TypeScript, Vite, Tailwind CSS

\- Backend: Python, FastAPI, Pydantic, SQLAlchemy

\- Database: PostgreSQL

\- AI integration: Google Gemini API with local rule-based fallback



\## Workflow

Application Registration → Document Scrutiny → Field Verification → Final Decision



The system assists reviewers by organizing information and highlighting potential issues. Final decisions remain with authorized human officers.



\## Local Setup



\### Prerequisites

\- Python 3.11+

\- Node.js and npm

\- PostgreSQL



\### Backend

Install dependencies from `backend/requirements.txt`, configure the local PostgreSQL `DATABASE\_URL` in `backend/.env`, then run:



```powershell

python init\_db.py

python -m uvicorn main:app --reload

```



API documentation: http://127.0.0.1:8000/docs



\### Frontend

From the `frontend` directory:



```powershell

npm install

npm run dev

```



Open the Vite URL, normally http://localhost:5173.



\## Important Notes

\- Demo records are fictional.

\- AI availability depends on API configuration and service availability.

\- When Gemini is unavailable, the application can use local rule-based analysis. Results are identified as `LOCAL\_RULE\_BASED`.

\- The prototype does not perform actual physical verification or make legally binding decisions.

\- Never commit real applicant data, credentials, `.env` files, virtual environments, or generated uploads.

