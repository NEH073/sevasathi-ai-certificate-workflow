
import { useEffect, useState } from 'react'
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Clock,
  Search,
} from 'lucide-react'

import { getApplications } from './api'
import type { Application } from './api'

type AIReview = {
  income_consistency?: string
  location_verification?: string
  potential_discrepancies?: string[]
  missing_information?: string[]
  field_report_english?: string
  field_report_kannada?: string
  suggested_action?: string
  analysis_method?: string
  human_review_required?: boolean
}

type VerificationResult = {
  message: string
  application_number: string
  officer_name: string
  officer_observations: string
  declared_annual_income: number
  verified_annual_income: number | null
  location_verified: boolean
  ai_review: {
    success: boolean
    analysis: AIReview
  }
  human_decision_required: boolean
}

function FieldVerification() {
  const [applications, setApplications] = useState<Application[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [officerName, setOfficerName] = useState('Demo Revenue Inspector')
  const [observations, setObservations] = useState('')
  const [verifiedIncome, setVerifiedIncome] = useState('')
  const [locationVerified, setLocationVerified] = useState(false)

  const [result, setResult] = useState<VerificationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const eligibleApplications = applications.filter(
    (app) => app.current_stage === 'FIELD_VERIFICATION'
  )

  const selectedApplication =
    eligibleApplications.find(
      (app) => app.application_number === selectedId
    ) ?? null

  async function loadApplications() {
    try {
      setLoading(true)
      setError('')

      const data = await getApplications()
      setApplications(data)

      const eligible = data.filter(
        (app) => app.current_stage === 'FIELD_VERIFICATION'
      )

      if (
        !selectedId ||
        !eligible.some((app) => app.application_number === selectedId)
      ) {
        setSelectedId(eligible[0]?.application_number ?? '')
      }
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

  useEffect(() => {
    loadApplications()
  }, [])

  function formatCurrency(value: number | null | undefined) {
    if (value == null) return 'Not recorded'
    return `₹${value.toLocaleString('en-IN')}`
  }

  async function submitVerification() {
    if (!selectedApplication) {
      setError('Please select an eligible application.')
      return
    }

    if (officerName.trim().length < 2) {
      setError('Please enter a valid officer name.')
      return
    }

    if (observations.trim().length < 10) {
      setError('Please enter at least 10 characters of field observations.')
      return
    }

    if (
      verifiedIncome.trim() &&
      (!Number.isInteger(Number(verifiedIncome)) ||
        Number(verifiedIncome) <= 0)
    ) {
      setError('Enter a valid positive annual income.')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      setSuccess('')
      setResult(null)

      const payload = {
        officer_name: officerName.trim(),
        observations: observations.trim(),
        verified_annual_income: verifiedIncome.trim()
          ? Number(verifiedIncome)
          : null,
        location_verified: locationVerified,
      }

      console.log('FIELD VERIFICATION PAYLOAD:', payload)

     const response = await fetch(
  `http://127.0.0.1:8000/applications/${selectedApplication.application_number}/field-verification`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }
)

      const body = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          body?.detail || 'Field verification submission failed.'
        )
      }

      setResult(body)
      setSuccess('Field verification submitted successfully.')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  function renderAIReview(review: AIReview) {
    if (!review) return null

    return (
      <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950 p-4 text-xs leading-6 text-emerald-100">
        {JSON.stringify(review, null, 2)}
      </pre>
    )
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-emerald-700">
            Workflow Stage 02 / 03
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">
            Field Verification
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Record field observations and review AI-assisted evidence.
          </p>
        </div>

        <button
          onClick={loadApplications}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={17} />
          Refresh Applications
        </button>
      </section>

      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-900">
        <ShieldCheck className="mt-0.5 shrink-0" size={20} />
        <p className="text-xs leading-5">
          <strong>Officer responsibility:</strong> Record actual field findings
          based on the verification conducted. AI-generated analysis is
          advisory and does not independently establish income or location.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading eligible applications...
        </div>
      ) : eligibleApplications.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <Clock size={26} className="mx-auto text-amber-700" />
          <h2 className="mt-4 font-bold text-slate-900">
            No applications awaiting field verification
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Applications will appear here after document scrutiny is completed.
          </p>
        </div>
      ) : (
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-center gap-2">
            <Search size={19} className="text-emerald-700" />
            <h2 className="font-bold text-slate-900">Select Application</h2>
          </div>

          <select
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value)
              setResult(null)
              setSuccess('')
              setError('')
              setLocationVerified(false)
              setObservations('')
              setVerifiedIncome('')
            }}
            className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm outline-none focus:border-emerald-700"
          >
            {eligibleApplications.map((app) => (
              <option
                key={app.application_number}
                value={app.application_number}
              >
                {app.application_number} — {app.applicant_name} ({app.district})
              </option>
            ))}
          </select>

          {selectedApplication && (
            <div className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-slate-500">Applicant</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {selectedApplication.applicant_name}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Application number</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {selectedApplication.application_number}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">District</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {selectedApplication.district}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Declared annual income</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {formatCurrency(selectedApplication.annual_income)}
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Officer name
              </label>
              <input
                value={officerName}
                onChange={(e) => setOfficerName(e.target.value)}
                disabled={!!result}
                className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Verified annual income (₹)
              </label>
              <input
                type="number"
                min="1"
                value={verifiedIncome}
                onChange={(e) => setVerifiedIncome(e.target.value)}
                disabled={!!result}
                placeholder="Enter verified income"
                className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-emerald-700"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Field observations
            </label>
            <textarea
              rows={5}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              disabled={!!result}
              placeholder="Record the actual findings from the field verification..."
              className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-emerald-700 disabled:bg-slate-50"
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4">
            <input
              type="checkbox"
              checked={locationVerified}
              onChange={(e) => setLocationVerified(e.target.checked)}
              disabled={!!result}
              className="mt-1 h-4 w-4 accent-emerald-700"
            />
            <span>
              <span className="block text-sm font-semibold text-slate-800">
                Applicant location verified
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                Select only if the officer actually verified the applicant's
                residence during a field visit.
              </span>
              <span className={`mt-2 block text-xs font-semibold ${
                locationVerified ? 'text-amber-700' : 'text-emerald-700'
              }`}>
                Status: {locationVerified ? 'Marked as verified' : 'Not verified'}
              </span>
            </span>
          </label>

          <button
            onClick={submitVerification}
            disabled={submitting || !!result || !selectedApplication}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#17634e] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#124c3c] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {submitting ? (
              <>
                <RefreshCw size={17} className="animate-spin" />
                Analyzing and submitting...
              </>
            ) : (
              <>
                <Sparkles size={17} />
                Submit Field Verification
              </>
            )}
          </button>
        </section>
      )}

      {result && (
        <section className="space-y-5 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Sparkles size={22} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">
                Field Verification Submitted
              </h2>
              <p className="text-xs text-slate-500">
                {result.application_number}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Verified annual income</p>
              <p className="mt-1 font-bold text-slate-900">
                {formatCurrency(result.verified_annual_income)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Location verification</p>
              <p className="mt-1 font-bold text-slate-900">
                {result.location_verified ? 'Reported verified' : 'Not verified'}
              </p>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-bold text-slate-800">
              AI-assisted review
            </h3>
            {result.ai_review?.analysis
              ? renderAIReview(result.ai_review.analysis)
              : (
                <p className="text-sm text-slate-500">
                  No AI review details returned.
                </p>
              )}
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Human officer review is required. AI analysis does not make the
            final approval or rejection decision.
          </div>
        </section>
      )}
    </div>
  )
}

export default FieldVerification
