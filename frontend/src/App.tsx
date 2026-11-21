import FieldVerification from './FieldVerification'
import DocumentScrutiny from './documentscrutiny'
import { useEffect, useState } from 'react'
import AuditHistory from './AuditHistory'
import {
  LayoutDashboard,
  FileText,
  ClipboardCheck,
  MapPin,
  History,
  Search,
  Bell,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Languages,
  Menu,
  RefreshCw,
  ArrowLeft,
  Eye,
  
} from 'lucide-react'

import {
  getApplications,
  getDashboardStats,
} from './api'

import type {
  Application,
  DashboardStats,
} from './api'


const navItems = [
  { label: 'Dashboard', kn: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', icon: LayoutDashboard },
  { label: 'Applications', kn: 'ಅರ್ಜಿಗಳು', icon: FileText },
  { label: 'Document Scrutiny', kn: 'ದಾಖಲೆ ಪರಿಶೀಲನೆ', icon: ClipboardCheck },
  { label: 'Field Verification', kn: 'ಕ್ಷೇತ್ರ ಪರಿಶೀಲನೆ', icon: MapPin },
  { label: 'Audit History', kn: 'ಪರಿಶೀಲನಾ ಇತಿಹಾಸ', icon: History },
]

function App() {
  const [applications, setApplications] = useState<Application[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)

  const [kannada, setKannada] = useState(false)
  const [activeNav, setActiveNav] = useState('Dashboard')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedApplication, setSelectedApplication] =
    useState<Application | null>(null)

  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const t = (english: string, kannadaText: string) =>
    kannada ? kannadaText : english

  async function loadDashboard() {
    try {
      setLoading(true)
      setError('')

      const [applicationData, statsData] = await Promise.all([
        getApplications(),
        getDashboardStats(),
      ])

      setApplications(applicationData)
      setStats(statsData)
    } catch (err) {
      console.error('Dashboard loading error:', err)
      setError(
        'Unable to load data. Please check whether the backend is running.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const filteredApplications = applications.filter((app) =>
    `${app.application_number} ${app.applicant_name} ${app.district}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  const applicationList = filteredApplications.filter((app) => {
    if (statusFilter === 'ALL') return true

    if (statusFilter === 'PENDING') {
      return ['SUBMITTED', 'PENDING'].includes(app.status)
    }

    if (statusFilter === 'IN_PROGRESS') {
      return app.status === 'IN_PROGRESS'
    }

    return app.status === statusFilter
  })

  const dashboardCards = [
    {
      label: 'Total Applications',
      kn: 'ಒಟ್ಟು ಅರ್ಜಿಗಳು',
      value: stats?.total_applications ?? 0,
      note: 'All submitted applications',
      icon: FileText,
      color: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Pending Review',
      kn: 'ಬಾಕಿ ಪರಿಶೀಲನೆ',
      value: stats?.pending_applications ?? 0,
      note: 'Awaiting officer action',
      icon: Clock,
      color: 'bg-amber-50 text-amber-700',
    },
    {
      label: 'In Progress',
      kn: 'ಪ್ರಗತಿಯಲ್ಲಿದೆ',
      value:
        (stats?.document_scrutiny ?? 0) +
        (stats?.field_verification ?? 0) +
        (stats?.awaiting_final_decision ?? 0),
      note: 'Across workflow stages',
      icon: Users,
      color: 'bg-violet-50 text-violet-700',
    },
    {
      label: 'Approved',
      kn: 'ಅನುಮೋದಿಸಲಾಗಿದೆ',
      value: stats?.approved ?? 0,
      note: 'Human-approved applications',
      icon: CheckCircle2,
      color: 'bg-emerald-50 text-emerald-700',
    },
  
    {
      label: 'Returned',
      kn: 'ಹಿಂತಿರುಗಿಸಲಾಗಿದೆ',
      value: stats?.returned ?? 0,
      note: 'Awaiting applicant corrections',
      icon: AlertCircle,
      color: 'bg-orange-50 text-orange-700',
    },
  ]
  const getStatusStyle = (status: string) => {
    switch (status.toUpperCase()) {
      case 'APPROVED':
        return 'bg-emerald-50 text-emerald-700'
      case 'REJECTED':
        return 'bg-red-50 text-red-700'
      case 'RETURNED':
        return 'bg-orange-50 text-orange-700'
      case 'IN_PROGRESS':
        return 'bg-blue-50 text-blue-700'
      default:
        return 'bg-amber-50 text-amber-700'
    }
  }

  const formatStage = (stage: string) => {
    const stages: Record<string, string> = {
      DOCUMENT_SCRUTINY: 'Document Scrutiny',
      FIELD_VERIFICATION: 'Field Verification',
      FINAL_DECISION: 'Final Decision',
    }

    return stages[stage] || stage.replaceAll('_', ' ')
  }

  const formatDate = (date: string) => {
    if (!date) return '—'

    const parsedDate = new Date(date)

    if (Number.isNaN(parsedDate.getTime())) return '—'

    return parsedDate.toLocaleDateString(
      kannada ? 'kn-IN' : 'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }
    )
  }

  const handleNavigation = (label: string) => {
    setActiveNav(label)
    setSelectedApplication(null)
    setSearch('')
    setStatusFilter('ALL')
    setMenuOpen(false)
  }

  const renderApplicationTable = (showPurpose = false) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-5 py-4 font-semibold">Application ID</th>
            <th className="px-5 py-4 font-semibold">Applicant</th>
            <th className="px-5 py-4 font-semibold">District</th>
            {showPurpose && (
              <th className="px-5 py-4 font-semibold">Purpose</th>
            )}
            <th className="px-5 py-4 font-semibold">Current Stage</th>
            <th className="px-5 py-4 font-semibold">Status</th>
            <th className="px-5 py-4 font-semibold">Date</th>
            <th className="px-5 py-4 font-semibold">Action</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {applicationList.map((app) => (
            <tr
              key={app.application_number}
              className="transition hover:bg-slate-50"
            >
              <td className="px-5 py-4 font-semibold text-emerald-800">
                {app.application_number}
              </td>

              <td className="px-5 py-4 font-medium text-slate-800">
                {app.applicant_name}
              </td>

              <td className="px-5 py-4 text-slate-600">
                {app.district}
              </td>

              {showPurpose && (
                <td className="px-5 py-4 text-slate-600">
                  {app.purpose}
                </td>
              )}

              <td className="px-5 py-4 text-slate-600">
                {formatStage(app.current_stage)}
              </td>

              <td className="px-5 py-4">
                <span
                  className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusStyle(app.status)}`}
                >
                  {app.status.replaceAll('_', ' ')}
                </span>
              </td>

              <td className="px-5 py-4 text-slate-500">
                {formatDate(app.submitted_at)}
              </td>

              <td className="px-5 py-4">
                <button
                  onClick={() => setSelectedApplication(app)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                >
                  <Eye size={15} />
                  View
                </button>
              </td>
            </tr>
          ))}

          {applicationList.length === 0 && (
            <tr>
              <td
                colSpan={showPurpose ? 8 : 7}
                className="px-5 py-12 text-center text-slate-500"
              >
                No matching applications found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="flex min-h-screen">

        {/* Sidebar */}
        <aside
          className={`${
            menuOpen ? 'block' : 'hidden'
          } fixed inset-y-0 left-0 z-30 w-64 bg-[#123c32] text-white md:relative md:block`}
        >
          <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400 text-xl font-bold text-[#123c32]">
              S
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-wide">
                SevaSathi
              </h1>
              <p className="text-xs text-emerald-200">
                ಸೇವಾಸಾಥಿ · Karnataka
              </p>
            </div>
          </div>

          <div className="px-4 py-6">
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-emerald-200/60">
              {t('WORKSPACE', 'ಕಾರ್ಯಸ್ಥಳ')}
            </p>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = activeNav === item.label

                return (
                  <button
                    key={item.label}
                    onClick={() => handleNavigation(item.label)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                      active
                        ? 'bg-emerald-400 font-semibold text-[#123c32]'
                        : 'text-emerald-50/80 hover:bg-white/10'
                    }`}
                  >
                    <Icon size={19} />
                    <span>{t(item.label, item.kn)}</span>

                    {active && (
                      <ChevronRight className="ml-auto" size={16} />
                    )}
                  </button>
                )
              })}
            </nav>
          </div>

          <div className="absolute bottom-5 left-4 right-4 rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-emerald-200">
              DEMO ENVIRONMENT
            </p>
            <p className="mt-1 text-sm font-medium">
              Karnataka Revenue Services
            </p>
            <p className="mt-2 text-xs text-emerald-100/60">
              Prototype · Not an official government portal
            </p>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1">

          {/* Header */}
          <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="rounded-lg p-2 hover:bg-slate-100 md:hidden"
                aria-label="Toggle menu"
              >
                <Menu size={21} />
              </button>

              <div>
                <p className="text-xs text-slate-500">
                  Karnataka / Revenue Department
                </p>

                <h2 className="text-lg font-bold text-slate-900">
                  {t(
                    activeNav,
                    navItems.find((n) => n.label === activeNav)?.kn ??
                      activeNav
                  )}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <button
                onClick={() => setKannada(!kannada)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50"
              >
                <Languages size={17} />
                <span>{kannada ? 'English' : 'ಕನ್ನಡ'}</span>
              </button>

              <button
                className="relative rounded-lg p-2 hover:bg-slate-100"
                aria-label="Notifications"
              >
                <Bell size={20} />
              </button>

              <div className="hidden h-9 w-9 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-800 sm:flex">
                DO
              </div>

              <div className="hidden sm:block">
                <p className="text-sm font-semibold">Demo Officer</p>
                <p className="text-xs text-slate-500">
                  Revenue Department
                </p>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-7xl space-y-7 p-4 md:p-8">

            {/* Loading */}
            {loading && (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                Loading application data...
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <AlertCircle size={20} />
                {error}
                <button
                  onClick={loadDashboard}
                  className="ml-auto font-semibold underline"
                >
                  Retry
                </button>
              </div>
            )}

            {!loading && !error && (
              <>

                {/* DASHBOARD */}
                {activeNav === 'Dashboard' && (
                  <>
                    <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                      <div>
                        <p className="text-sm font-medium text-emerald-700">
                          20 November 2026
                        </p>

                        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                          {t('Good morning, Officer', 'ಶುಭೋದಯ, ಅಧಿಕಾರಿಗಳೇ')} 👋
                        </h1>

                        <p className="mt-2 text-sm text-slate-500">
                          {t(
                            'Here is your certificate application workflow overview.',
                            'ನಿಮ್ಮ ಪ್ರಮಾಣಪತ್ರ ಅರ್ಜಿಗಳ ಕಾರ್ಯಪ್ರವಾಹದ ವಿವರ ಇಲ್ಲಿದೆ.'
                          )}
                        </p>
                      </div>

                      <button
                        onClick={loadDashboard}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 rounded-xl bg-[#17634e] px-5 py-3 text-sm font-semibold text-white hover:bg-[#124c3c]"
                      >
                        <RefreshCw size={17} />
                        Refresh Data
                      </button>
                    </section>

                    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      {dashboardCards.map((stat) => {
                        const Icon = stat.icon

                        return (
                          <div
                            key={stat.label}
                            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-slate-500">
                                {t(stat.label, stat.kn)}
                              </p>

                              <div className={`rounded-xl p-2.5 ${stat.color}`}>
                                <Icon size={20} />
                              </div>
                            </div>

                            <p className="mt-4 text-3xl font-bold text-slate-900">
                              {stat.value}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {stat.note}
                            </p>
                          </div>
                        )
                      })}
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                      <h3 className="font-bold text-slate-900">
                        Application Workflow
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Three stages with AI-assisted officer review
                      </p>

                      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                        {[
                          {
                            number: '01',
                            title: 'Document Scrutiny',
                            detail: 'AI-assisted document extraction and completeness checks',
                            count: stats?.document_scrutiny ?? 0,
                            icon: ClipboardCheck,
                          },
                          {
                            number: '02',
                            title: 'Field Verification',
                            detail: 'Officer observations and AI-assisted evidence comparison',
                            count: stats?.field_verification ?? 0,
                            icon: MapPin,
                          },
                          {
                            number: '03',
                            title: 'Final Decision',
                            detail: 'Evidence summary for human approval, rejection or return',
                            count: stats?.awaiting_final_decision ?? 0,
                            icon: CheckCircle2,
                          },
                        ].map((stage) => {
                          const Icon = stage.icon

                          return (
                            <div
                              key={stage.number}
                              className="rounded-xl border border-slate-200 p-4"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold tracking-widest text-emerald-700">
                                  {stage.number} / 03
                                </span>
                                <Icon size={20} className="text-emerald-700" />
                              </div>

                              <h4 className="mt-4 font-semibold text-slate-900">
                                {stage.title}
                              </h4>

                              <p className="mt-2 min-h-10 text-xs leading-5 text-slate-500">
                                {stage.detail}
                              </p>

                              <p className="mt-4 text-xs font-semibold text-amber-700">
                                {stage.count} applications
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    </section>

                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="flex items-center justify-between border-b border-slate-100 p-5">
                        <div>
                          <h3 className="font-bold text-slate-900">
                            Recent Applications
                          </h3>
                          <p className="mt-1 text-xs text-slate-500">
                            Live records from PostgreSQL
                          </p>
                        </div>

                        <button
                          onClick={() => handleNavigation('Applications')}
                          className="flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-900"
                        >
                          View all <ChevronRight size={16} />
                        </button>
                      </div>

                      {renderApplicationTable()}
                    </section>
                  </>
                )}

                {/* APPLICATIONS PAGE */}
                {activeNav === 'Applications' && (
                  <>
                    {!selectedApplication ? (
                      <>
                        <section>
                          <h1 className="text-2xl font-bold text-slate-900">
                            {t('Applications', 'ಅರ್ಜಿಗಳು')}
                          </h1>

                          <p className="mt-2 text-sm text-slate-500">
                            Review and track income certificate applications.
                          </p>
                        </section>

                        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                          {[
                            { label: 'All Applications', value: applications.length },
                            {
                              label: 'Pending',
                              value: applications.filter((a) =>
                                ['SUBMITTED', 'PENDING'].includes(a.status)
                              ).length,
                            },
                            {
                              label: 'In Progress',
                              value: applications.filter((a) =>
                                a.status === 'IN_PROGRESS'
                              ).length,
                            },
                            {
                              label: 'Approved',
                              value: applications.filter((a) =>
                                a.status === 'APPROVED'
                              ).length,
                            },
                          ].map((item) => (
                            <div
                              key={item.label}
                              className="rounded-xl border border-slate-200 bg-white p-4"
                            >
                              <p className="text-xs text-slate-500">
                                {item.label}
                              </p>
                              <p className="mt-2 text-2xl font-bold text-slate-900">
                                {item.value}
                              </p>
                            </div>
                          ))}
                        </section>

                        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                          <div className="flex flex-col gap-4 border-b border-slate-100 p-5">
                            <div>
                              <h3 className="font-bold text-slate-900">
                                All Applications
                              </h3>
                              <p className="mt-1 text-xs text-slate-500">
                                Search, filter and review submitted applications.
                              </p>
                            </div>

                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                              <div className="relative w-full lg:max-w-sm">
                                <Search
                                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                  size={17}
                                />
                                <input
                                  value={search}
                                  onChange={(e) => setSearch(e.target.value)}
                                  placeholder="Search by ID, applicant or district..."
                                  className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                                />
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {[
                                  { label: 'All', value: 'ALL' },
                                  { label: 'Pending', value: 'PENDING' },
                                  { label: 'In Progress', value: 'IN_PROGRESS' },
                                  { label: 'Approved', value: 'APPROVED' },
                                  { label: 'Rejected', value: 'REJECTED' },
                                  { label: 'Returned', value: 'RETURNED' },
                                ].map((filter) => (
                                  <button
                                    key={filter.value}
                                    onClick={() => setStatusFilter(filter.value)}
                                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                                      statusFilter === filter.value
                                        ? 'bg-[#17634e] text-white'
                                        : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                  >
                                    {filter.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {renderApplicationTable(true)}

                          <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
                            Showing {applicationList.length} of {applications.length} applications
                          </div>
                        </section>
                      </>
                    ) : (
                      /* APPLICATION DETAILS */
                      <section className="space-y-5">
                        <button
                          onClick={() => setSelectedApplication(null)}
                          className="flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-900"
                        >
                          <ArrowLeft size={17} />
                          Back to applications
                        </button>

                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
                          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                Application details
                              </p>

                              <h1 className="mt-2 text-2xl font-bold text-slate-900">
                                {selectedApplication.application_number}
                              </h1>

                              <p className="mt-1 text-sm text-slate-500">
                                Income Certificate Application
                              </p>
                            </div>

                            <span
                              className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusStyle(selectedApplication.status)}`}
                            >
                              {selectedApplication.status.replaceAll('_', ' ')}
                            </span>
                          </div>

                          <div className="my-6 border-t border-slate-100" />

                          <h3 className="font-semibold text-slate-900">
                            Applicant Information
                          </h3>

                          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {[
                              {
                                label: 'Applicant Name',
                                value: selectedApplication.applicant_name,
                              },
                              {
                                label: 'District',
                                value: selectedApplication.district,
                              },
                              {
                                label: 'Application Purpose',
                                value: selectedApplication.purpose,
                              },
                              {
                                label: 'Annual Income',
                                value: `₹${Number(selectedApplication.annual_income).toLocaleString('en-IN')}`,
                              },
                              {
                                label: 'Current Stage',
                                value: formatStage(selectedApplication.current_stage),
                              },
                              {
                                label: 'Submitted Date',
                                value: formatDate(selectedApplication.submitted_at),
                              },
                            ].map((item) => (
                              <div key={item.label}>
                                <p className="text-xs text-slate-400">
                                  {item.label}
                                </p>
                                <p className="mt-1 font-medium text-slate-800">
                                  {item.value || '—'}
                                </p>
                              </div>
                            ))}
                          </div>

                          <div className="my-6 border-t border-slate-100" />

                          <h3 className="font-semibold text-slate-900">
                            Workflow Status
                          </h3>

                          <div className="mt-4 rounded-xl bg-slate-50 p-4">
                            <p className="text-sm text-slate-500">
                              Current stage
                            </p>
                            <p className="mt-1 font-semibold text-emerald-800">
                              {formatStage(selectedApplication.current_stage)}
                            </p>
                            <p className="mt-3 text-xs leading-5 text-slate-500">
                              AI-generated information is advisory. The authorized officer remains responsible for the final decision.
                            </p>
                          </div>
                        </div>
                      </section>
                    )}
                  </>
                )}

                {/* WORKFLOW PAGES */}

                {activeNav === 'Document Scrutiny' && <DocumentScrutiny />}

                {activeNav === 'Field Verification' && <FieldVerification />}

                {activeNav === 'Audit History' && <AuditHistory />}
            {/* Prototype notice */}
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <AlertCircle className="mt-0.5 shrink-0" size={18} />

              <p className="text-xs leading-5">
                <strong>Prototype notice: </strong>
                This is a demonstration workflow. AI provides decision support only. Authorized officers retain responsibility for every official decision. This is not an official Karnataka Government service.
              </p>
            </div>

            <footer className="pb-3 text-center text-xs text-slate-400">
              SevaSathi · AI-assisted Certificate Workflow Prototype · 2026
            </footer>
            </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
