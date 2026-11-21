
import { useEffect, useState } from 'react'
import { History, RefreshCw, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { API_BASE_URL, getApplications } from './api'
import type { Application } from './api'

type AuditRecord = {
  actor_name: string
  actor_role: string
  action: string
  previous_status: string | null
  new_status: string | null
  remarks: string | null
  details: Record<string, unknown> | null
  created_at: string
}

export default function AuditHistory() {
  const [applications, setApplications] = useState<Application[]>([])
  const [selected, setSelected] = useState('')
  const [records, setRecords] = useState<AuditRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function loadApplications() {
    try {
      const data = await getApplications()
      setApplications(data)
      if (data.length > 0 && !selected) {
        setSelected(data[0].application_number)
      }
    } catch {
      setError('Unable to load applications.')
    }
  }

  async function loadHistory(applicationNumber: string) {
    if (!applicationNumber) return

    try {
      setLoading(true)
      setError('')

      const response = await fetch(
        `${API_BASE_URL}/applications/${applicationNumber}/history`
      )

      if (!response.ok) {
        throw new Error('Unable to load audit history.')
      }

      const data = await response.json()
      setRecords(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load history.')
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadApplications()
  }, [])

  useEffect(() => {
    if (selected) loadHistory(selected)
  }, [selected])

  function formatDate(value: string) {
    return new Date(value).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-50 p-3">
            <History className="text-emerald-700" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Audit History</h1>
            <p className="mt-1 text-sm text-slate-500">
              Chronological record of application activities and officer actions.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-md">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Select Application
            </label>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-emerald-600"
            >
              <option value="">Choose application</option>
              {applications.map((app) => (
                <option key={app.application_number} value={app.application_number}>
                  {app.application_number} — {app.applicant_name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => loadHistory(selected)}
            disabled={!selected || loading}
            className="flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Refresh History
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Loading audit records...
        </div>
      ) : selected ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900">{selected}</h2>
              <p className="mt-1 text-xs text-slate-500">
                {records.length} recorded activities
              </p>
            </div>
            <History className="text-emerald-700" size={22} />
          </div>

          {records.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No audit records found for this application.
            </p>
          ) : (
            <div className="space-y-5">
              {records.map((record, index) => (
                <div key={`${record.created_at}-${index}`} className="relative flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="rounded-full bg-emerald-50 p-2">
                      {record.action.includes('RETURN') ||
                      record.action.includes('REJECT') ? (
                        <AlertCircle size={18} className="text-amber-700" />
                      ) : (
                        <CheckCircle2 size={18} className="text-emerald-700" />
                      )}
                    </div>
                    {index !== records.length - 1 && (
                      <div className="mt-2 min-h-8 w-px flex-1 bg-slate-200" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 rounded-xl border border-slate-100 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-900">
                        {record.action.replaceAll('_', ' ')}
                      </h3>
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock size={13} />
                        {formatDate(record.created_at)}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                      {record.actor_name} · {record.actor_role.replaceAll('_', ' ')}
                    </p>

                    {(record.previous_status || record.new_status) && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        {record.previous_status && (
                          <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">
                            {record.previous_status}
                          </span>
                        )}
                        <span className="text-slate-400">→</span>
                        {record.new_status && (
                          <span className="rounded-md bg-emerald-50 px-2 py-1 font-semibold text-emerald-800">
                            {record.new_status}
                          </span>
                        )}
                      </div>
                    )}

                    {record.remarks && (
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {record.remarks}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <p className="text-xs text-slate-400">
        Audit entries are retrieved from the backend. Historical records are displayed
        without modification.
      </p>
    </div>
  )
}
