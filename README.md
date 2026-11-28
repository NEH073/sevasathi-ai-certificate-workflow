# SevaSathi – Certificate Workflow Prototype

A Kannada-first full-stack prototype for organizing an income-certificate application workflow. It demonstrates application tracking, document scrutiny, field-verification reporting, and human-reviewed decisions.

> **Disclaimer:** This is a fictional demonstration project, not an official Karnataka Government service. It has no live Nadakacheri or government-system integration. All demonstration records should be fictional.

## Features

- Register and track certificate applications.
- Upload supporting documents and extract text from readable PDFs.
- Perform preliminary, rule-based checks on applicant name and declared income.
- Record field-verification observations and reported income.
- Track workflow stages and application status.
- Maintain an audit history of workflow actions.
- Support English and Kannada report content.
- Keep final approve, reject, or return decisions under human control.

## Technology stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Python, FastAPI, Pydantic |
| Database | PostgreSQL, SQLAlchemy |
| Document processing | pypdf |
| Local development | Uvicorn, npm |

## Workflow

```mermaid
flowchart TD
    A[Application Registration] --> B[Document Scrutiny]
    B --> C[PDF Text Extraction]
    C --> D[Preliminary Rule-Based Checks]
    D --> E[Field Verification]
    E --> F[Final Human Review]
    F --> G{Officer Decision}
    G -->|Approve| H[Approved]
    G -->|Reject| I[Rejected]
    G -->|Return| J[Returned for Updates]
```

The application organizes information and highlights possible missing details or inconsistencies. Its automated checks are preliminary assistance only; they do not verify document authenticity, perform physical verification, or make legally binding decisions.

## Repository structure

```text
backend/
  app/
    models/
    routes/
    schemas/
    services/
  init_db.py
  main.py
  requirements.txt

frontend/
  src/
  package.json
```

## Run locally

### Prerequisites

- Python 3.11+
- Node.js and npm
- PostgreSQL

### 1. Start the backend

Open a terminal in the repository root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Create a `.env` file inside `backend/` with a PostgreSQL connection string:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/sevasathi
```

Initialize the database and start the API:

```powershell
python init_db.py
python -m uvicorn main:app --reload
```

The API runs at `http://127.0.0.1:8000`. Interactive API documentation is available at `http://127.0.0.1:8000/docs`.

### 2. Start the frontend

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the local Vite URL printed in the terminal (normally `http://localhost:5173`).

## Current limitations

- PDF text extraction is supported; scanned PDFs without an OCR text layer are not automatically interpreted.
- Document checks are rule-based preliminary comparisons, not proof of authenticity.
- Field-verification information is entered by a user; the application does not independently verify a location or income.
- The prototype is not connected to government identity, certificate, or case-management systems.
- Production use would require authentication, authorization, secure file storage, privacy controls, audit hardening, and operational monitoring.

## Safety and data handling

- Use fictional records when demonstrating the project.
- Do not upload real applicant identity documents or personal information to a public demo.
- Keep local `.env` files, credentials, and uploaded documents out of version control.
