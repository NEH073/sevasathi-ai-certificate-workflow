
import { useEffect, useState } from 'react'
import {
  FileText,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Clock,
  Eye,
  XCircle,
  RotateCcw,
} from 'lucide-react'

import { getApplications } from './api'
import type { Application } from './api'

const API_BASE_URL = 'http://127.0.0.1:8000'

type Decision =
  | 'VERIFIED'
  | 'DISCREPANT'
  | 'CORRECTION_REQUIRED'

type DocumentRecord = {
  document_id: number
  file_name: string
  document_type: string
  is_verified: boolean
  ai_review: unknown
  verification_remarks?: string | null
  uploaded_at?: string
}

async function handleResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      body?.detail || body?.message || 'Request failed'
    )
  }

  return body as T
}

async function getDocuments(
  applicationNumber: string
): Promise<DocumentRecord[]> {
  const response = await fetch(
    `${API_BASE_URL}/applications/${encodeURIComponent(applicationNumber)}/documents`
  )

  const body = await handleResponse<unknown>(response)

  if (Array.isArray(body)) return body as DocumentRecord[]

  if (
    body &&
    typeof body === 'object' &&
    'documents' in body &&
    Array.isArray((body as { documents: unknown }).documents)
  ) {
    return (body as { documents: DocumentRecord[] }).documents
  }

  if (
    body &&
    typeof body === 'object' &&
    'results' in body &&
    Array.isArray((body as { results: unknown }).results)
  ) {
    return (body as { results: DocumentRecord[] }).results
  }

  return []
}

async function uploadDocument(
  applicationNumber: string,
  documentType: string,
  file: File
): Promise<void> {
  const formData = new FormData()
  formData.append('file', file)

  const url = new URL(
    `${API_BASE_URL}/applications/${encodeURIComponent(applicationNumber)}/documents`
  )

  url.searchParams.set('document_type', documentType)

  const response = await fetch(url.toString(), {
    method: 'POST',
    body: formData,
  })

  await handleResponse(response)
}

async function analyzeDocument(
  applicationNumber: string,
  documentId: number
): Promise<{ message: string }> {
  const response = await fetch(
    `${API_BASE_URL}/applications/${encodeURIComponent(applicationNumber)}/documents/${documentId}/analyze`,
    { method: 'POST' }
  )

  const body = await handleResponse<{ message?: string }>(response)

  return {
    message: body?.message || 'Document analysis completed.',
  }
}

async function verifyDocument(
  applicationNumber: string,
  documentId: number,
  decision: Decision,
  remarks: string
): Promise<void> {
  const url = new URL(
    `${API_BASE_URL}/applications/${encodeURIComponent(applicationNumber)}/documents/${documentId}/verify`
  )

  url.searchParams.set('decision', decision)
  url.searchParams.set('remarks', remarks)

  const response = await fetch(url.toString(), {
    method: 'POST',
  })

  await handleResponse(response)
}

function getDecisionFromRemarks(
  verificationRemarks?: string | null
): Decision | null {
  if (!verificationRemarks) return null

  const match = verificationRemarks.match(
    /^\[(VERIFIED|DISCREPANT|CORRECTION_REQUIRED)\]/
  )

  return match ? (match[1] as Decision) : null
}

export default function DocumentScrutiny() {
  const [applications, setApplications] = useState<Application[]>([])
  const [selectedApplication, setSelectedApplication] = useState('')
  const [documents, setDocuments] = useState<DocumentRecord[]>([])

  const [documentType, setDocumentType] = useState('INCOME_CERTIFICATE')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [remarks, setRemarks] = useState('')
  const [decision, setDecision] = useState<Decision>('VERIFIED')

  const [loading, setLoading] = useState(true)
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [analyzingId, setAnalyzingId] = useState<number | null>(null)
  const [verifyingId, setVerifyingId] = useState<number | null>(null)

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [selectedDocument, setSelectedDocument] =
    useState<DocumentRecord | null>(null)

  async function loadApplications() {
    try {
      setLoading(true)
      setError('')

      const data = await getApplications()

      const scrutinyApplications = data.filter(
        (app) =>
          app.current_stage === 'DOCUMENT_SCRUTINY' &&
          app.status !== 'APPROVED' &&
          app.status !== 'REJECTED'
      )

      setApplications(scrutinyApplications)

      setSelectedApplication((current) => {
        if (
          current &&
          scrutinyApplications.some(
            (app) => app.application_number === current
          )
        ) {
          return current
        }

        return scrutinyApplications[0]?.application_number || ''
      })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load applications'
      )
    } finally {
      setLoading(false)
    }
  }

  async function loadDocuments(applicationNumber: string) {
    try {
      setDocumentsLoading(true)
      setError('')

      const data = await getDocuments(applicationNumber)
      setDocuments(data)

      setSelectedDocument((current) => {
        if (!current) return null

        return (
          data.find(
            (doc) => doc.document_id === current.document_id
          ) || null
        )
      })
    } catch (err) {
      setDocuments([])
      setSelectedDocument(null)

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load documents'
      )
    } finally {
      setDocumentsLoading(false)
    }
  }

  useEffect(() => {
    loadApplications()
  }, [])

  useEffect(() => {
    if (selectedApplication) {
      setDocuments([])
      setSelectedDocument(null)
      setRemarks('')
      loadDocuments(selectedApplication)
    } else {
      setDocuments([])
      setSelectedDocument(null)
    }
  }, [selectedApplication])

  async function handleUpload() {
    if (!selectedApplication) {
      setError('Please select an application first.')
      return
    }

    if (!selectedFile) {
      setError('Please choose a PDF document.')
      return
    }

    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF documents are supported.')
      return
    }

    try {
      setUploading(true)
      setError('')
      setMessage('')

      await uploadDocument(
        selectedApplication,
        documentType,
        selectedFile
      )

      const updatedDocuments = await getDocuments(selectedApplication)

      setDocuments(updatedDocuments)
      setSelectedDocument(null)
      setSelectedFile(null)

      setMessage(
        `Document uploaded successfully. ${updatedDocuments.length} document(s) loaded.`
      )
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Upload failed'
      )
    } finally {
      setUploading(false)
    }
  }

  async function handleAnalyze(documentId: number) {
    if (!selectedApplication) return

    try {
      setAnalyzingId(documentId)
      setError('')
      setMessage('')

      const result = await analyzeDocument(
        selectedApplication,
        documentId
      )

      const updatedDocuments = await getDocuments(selectedApplication)
      setDocuments(updatedDocuments)

      const updatedDocument = updatedDocuments.find(
        (doc) => doc.document_id === documentId
      )

      if (updatedDocument) {
        setSelectedDocument(updatedDocument)
      }

      setMessage(result.message)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Document analysis failed'
      )
    } finally {
      setAnalyzingId(null)
    }
  }

  async function handleVerify(documentId: number) {
    if (!selectedApplication) return

    if (remarks.trim().length < 5) {
      setError('Please enter officer remarks (at least 5 characters).')
      return
    }

    try {
      setVerifyingId(documentId)
      setError('')
      setMessage('')

      await verifyDocument(
        selectedApplication,
        documentId,
        decision,
        remarks.trim()
      )

      const updatedDocuments = await getDocuments(selectedApplication)
      setDocuments(updatedDocuments)

      const updatedDocument = updatedDocuments.find(
        (doc) => doc.document_id === documentId
      )

      if (updatedDocument) {
        setSelectedDocument(updatedDocument)
      }

      const messages: Record<Decision, string> = {
        VERIFIED: 'Document accepted and verified by the officer.',
        DISCREPANT: 'Document discrepancy recorded successfully.',
        CORRECTION_REQUIRED: 'Correction request recorded successfully.',
      }

      setRemarks('')
      setMessage(messages[decision])
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to record officer decision'
      )
    } finally {
      setVerifyingId(null)
    }
  }

  const selectedApplicationData = applications.find(
    (app) => app.application_number === selectedApplication
  )

  const verifiedCount = documents.filter(
    (doc) => doc.is_verified
  ).length

  const getAIReview = (doc: DocumentRecord) => doc.ai_review || null

  function renderDecisionStatus(doc: DocumentRecord) {
    const recordedDecision = getDecisionFromRemarks(
      doc.verification_remarks
    )

    if (doc.is_verified) {
      return (
        <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          <CheckCircle2 size={13} />
          Officer Verified
        </span>
      )
    }

    if (recordedDecision === 'DISCREPANT') {
      return (
        <span className="flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
          <XCircle size={13} />
          Discrepant
        </span>
      )
    }

    if (recordedDecision === 'CORRECTION_REQUIRED') {
      return (
        <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
          <RotateCcw size={13} />
          Correction Required
        </span>
      )
    }

    return (
      <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
        <Clock size={13} />
        Pending Review
      </span>
    )
  }

  const decisionLabels: Record<Decision, string> = {
    VERIFIED: 'Accept and Verify',
    DISCREPANT: 'Mark as Discrepant',
    CORRECTION_REQUIRED: 'Request Correction',
  }

  return (
    <div className="space-y-6">

      <section>
        <p className="text-sm font-medium text-emerald-700">
          SevaSathi / Workflow
        </p>

        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          Document Scrutiny
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Upload supporting documents, review AI findings and record
          the officer's verification outcome.
        </p>
      </section>

      {message && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 size={19} />
          {message}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={19} />
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-slate-900">
              Select Application
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Applications currently in document scrutiny
            </p>
          </div>

          <button
            onClick={loadApplications}
            disabled={loading}
            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            title="Refresh applications"
          >
            <RefreshCw size={17} />
          </button>
        </div>

        {loading ? (
          <p className="mt-5 text-sm text-slate-500">
            Loading applications...
          </p>
        ) : applications.length === 0 ? (
          <div className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
            No applications are currently in document scrutiny.
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-600">
                Application
              </label>

              <select
                value={selectedApplication}
                onChange={(e) => setSelectedApplication(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-emerald-600"
              >
                {applications.map((app) => (
                  <option
                    key={app.application_number}
                    value={app.application_number}
                  >
                    {app.application_number} — {app.applicant_name}
                  </option>
                ))}
              </select>
            </div>

            {selectedApplicationData && (
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Applicant</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {selectedApplicationData.applicant_name}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedApplicationData.district} · Declared annual income:
                  {' '}₹{Number(
                    selectedApplicationData.annual_income
                  ).toLocaleString('en-IN')}
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {selectedApplication && (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-slate-500">
                <FileText size={18} />
                <span className="text-xs">Uploaded Documents</span>
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-900">
                {documents.length}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-emerald-700">
                <ShieldCheck size={18} />
                <span className="text-xs">Officer Verified</span>
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-900">
                {verifiedCount}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-amber-700">
                <Clock size={18} />
                <span className="text-xs">Not Verified</span>
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-900">
                {documents.length - verifiedCount}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
                <Upload size={21} />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">
                  Upload Supporting Document
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Upload a PDF for text extraction and AI analysis.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-600">
                  Document Type
                </label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-emerald-600"
                >
                  <option value="INCOME_CERTIFICATE">Income Certificate</option>
                  <option value="RATION_CARD">Ration Card</option>
                  <option value="AADHAAR">Aadhaar Document</option>
                  <option value="ADDRESS_PROOF">Address Proof</option>
                  <option value="OTHER">Other Supporting Document</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-600">
                  Choose PDF
                </label>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) =>
                    setSelectedFile(e.target.files?.[0] || null)
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-emerald-800"
                />
              </div>
            </div>

            {selectedFile && (
              <p className="mt-3 text-xs text-slate-500">
                Selected: {selectedFile.name}
              </p>
            )}

            <div className="mt-5 flex justify-end">
              <button
                onClick={handleUpload}
                disabled={uploading || !selectedFile}
                className="flex items-center gap-2 rounded-xl bg-[#17634e] px-5 py-3 text-sm font-semibold text-white hover:bg-[#124c3c] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Upload size={17} />
                {uploading ? 'Uploading...' : 'Upload Document'}
              </button>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="font-bold text-slate-900">
                  Uploaded Documents
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Review documents and run AI-assisted scrutiny.
                </p>
              </div>

              <button
                onClick={() => loadDocuments(selectedApplication)}
                disabled={documentsLoading}
                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                title="Refresh documents"
              >
                <RefreshCw size={17} />
              </button>
            </div>

            {documentsLoading && documents.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">
                Loading uploaded documents...
              </div>
            ) : documents.length === 0 ? (
              <div className="p-10 text-center">
                <FileText size={30} className="mx-auto text-slate-300" />
                <p className="mt-3 font-medium text-slate-700">
                  No documents uploaded yet
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Upload a supporting PDF to begin document scrutiny.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {documents.map((doc) => (
                  <div
                    key={doc.document_id}
                    className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                        <FileText size={21} />
                      </div>

                      <div className="min-w-0">
                        <p className="break-all font-semibold text-slate-900">
                          {doc.file_name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {doc.document_type.replaceAll('_', ' ')}
                          {' · '}Document #{doc.document_id}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {renderDecisionStatus(doc)}

                          {Boolean(doc.ai_review) && (
                            <span className="flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                              <Sparkles size={13} />
                              AI Reviewed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setSelectedDocument(doc)
                          setDecision(
                            getDecisionFromRemarks(doc.verification_remarks) ||
                            'VERIFIED'
                          )
                          setRemarks('')
                        }}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Eye size={15} />
                        View
                      </button>

                      <button
                        onClick={() => handleAnalyze(doc.document_id)}
                        disabled={analyzingId === doc.document_id}
                        className="flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                      >
                        <Sparkles size={15} />
                        {analyzingId === doc.document_id
                          ? 'Analyzing...'
                          : 'AI Analyze'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {selectedDocument && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-slate-900">
                    Document Review
                  </h2>
                  <p className="mt-1 break-all text-xs text-slate-500">
                    {selectedDocument.file_name}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedDocument(null)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                  aria-label="Close document review"
                >
                  ✕
                </button>
              </div>

              <div className="my-5 border-t border-slate-100" />

              {getAIReview(selectedDocument) ? (
                <div>
                  <div className="flex items-center gap-2 text-violet-700">
                    <Sparkles size={19} />
                    <h3 className="font-semibold">
                      Gemini AI Analysis
                    </h3>
                  </div>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    AI findings are advisory and must be reviewed by the
                    authorized officer.
                  </p>

                  <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-xs leading-6 text-slate-700">
                    {typeof getAIReview(selectedDocument) === 'string'
                      ? getAIReview(selectedDocument) as string
                      : JSON.stringify(
                          getAIReview(selectedDocument),
                          null,
                          2
                        )}
                  </pre>
                </div>
              ) : (
                <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                  AI analysis has not been run for this document yet.
                  Select AI Analyze above to start.
                </div>
              )}

              {selectedDocument.verification_remarks && (
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-700">
                    Previous officer remarks
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    {selectedDocument.verification_remarks}
                  </p>
                </div>
              )}

              <div className="mt-6 border-t border-slate-100 pt-5">
                <h3 className="font-semibold text-slate-900">
                  Officer Decision
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Review the document and record your own decision.
                  AI does not make this decision.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setDecision('VERIFIED')}
                    className={`rounded-xl border p-3 text-left text-sm font-semibold ${
                      decision === 'VERIFIED'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 size={18} className="mb-2" />
                    Accept and Verify
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecision('DISCREPANT')}
                    className={`rounded-xl border p-3 text-left text-sm font-semibold ${
                      decision === 'DISCREPANT'
                        ? 'border-red-600 bg-red-50 text-red-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <XCircle size={18} className="mb-2" />
                    Mark as Discrepant
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecision('CORRECTION_REQUIRED')}
                    className={`rounded-xl border p-3 text-left text-sm font-semibold ${
                      decision === 'CORRECTION_REQUIRED'
                        ? 'border-amber-600 bg-amber-50 text-amber-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <RotateCcw size={18} className="mb-2" />
                    Request Correction
                  </button>
                </div>

                <div className="mt-4">
                  <label className="mb-2 block text-xs font-semibold text-slate-600">
                    Officer Remarks
                  </label>

                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={4}
                    placeholder="Explain the reason for your selected decision..."
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() =>
                      handleVerify(selectedDocument.document_id)
                    }
                    disabled={
                      verifyingId === selectedDocument.document_id
                    }
                    className="flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    <ShieldCheck size={17} />
                    {verifyingId === selectedDocument.document_id
                      ? 'Saving...'
                      : `Record: ${decisionLabels[decision]}`}
                  </button>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
        <AlertCircle size={18} className="mt-0.5 shrink-0" />
        <p>
          AI analysis is decision support only. It does not establish the
          authenticity of a document or automatically approve or reject an
          application. Final verification remains with the authorized officer.
        </p>
      </div>
    </div>
  )
}
