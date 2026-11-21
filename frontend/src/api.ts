
export const API_BASE_URL = 'http://127.0.0.1:8000'

export interface Application {
  application_number: string
  applicant_name: string
  district: string
  purpose: string
  annual_income: number
  status: string
  current_stage: string
  submitted_at: string
}

export interface DashboardStats {
  total_applications: number
  pending_applications: number
  document_scrutiny: number
  field_verification: number
  awaiting_final_decision: number
  approved: number
  rejected: number
  returned: number
}

export async function getApplications(): Promise<Application[]> {
  const response = await fetch(`${API_BASE_URL}/applications/`)

  if (!response.ok) {
    throw new Error('Failed to fetch applications')
  }

  return response.json()
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await fetch(
    `${API_BASE_URL}/applications/dashboard/stats`
  )

  if (!response.ok) {
    throw new Error('Failed to fetch dashboard statistics')
  }

  return response.json()
}

export interface DocumentRecord {
  document_id: number
  document_type: string
  file_name: string
  is_verified: boolean
  ai_review: Record<string, unknown> | null
  uploaded_at: string | null
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const data = await response.json()
      message = data.detail || data.message || message
    } catch {}
    throw new Error(message)
  }
  return response.json()
}

export async function getDocuments(
  applicationNumber: string
): Promise<DocumentRecord[]> {
  const response = await fetch(
    `${API_BASE_URL}/applications/${applicationNumber}/documents`
  )
  return handleResponse<DocumentRecord[]>(response)
}

export async function uploadDocument(
  applicationNumber: string,
  documentType: string,
  file: File
) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(
    `${API_BASE_URL}/applications/${applicationNumber}/documents?document_type=${encodeURIComponent(documentType)}`,
    {
      method: 'POST',
      body: formData,
    }
  )

  return handleResponse(response)
}

export async function analyzeDocument(
  applicationNumber: string,
  documentId: number
) {
  const response = await fetch(
    `${API_BASE_URL}/applications/${applicationNumber}/documents/${documentId}/analyze`,
    { method: 'POST' }
  )
  return handleResponse(response)
}

export async function verifyDocument(
  applicationNumber: string,
  documentId: number,
  remarks: string
) {
  const response = await fetch(
    `${API_BASE_URL}/applications/${applicationNumber}/documents/${documentId}/verify?remarks=${encodeURIComponent(remarks)}`,
    { method: 'POST' }
  )
  return handleResponse(response)
}
