import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  FileCheck,
  User,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react'
import { api } from '../lib/api.js'

export default function ExceptionsManagement() {
  const [exceptions, setExceptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [newException, setNewException] = useState({
    qid: '',
    title: '',
    hostname: '',
    asset_group: 'AWS',
    reason: '',
    requested_by: 'Alex Morgan (Cloud Sec)',
    approved_by: 'CISO Office',
    status: 'APPROVED',
    expires_in_days: 60,
  })

  async function loadExceptions() {
    setLoading(true)
    try {
      const data = await api.listExceptions({
        search: search || undefined,
        status: filterStatus !== 'ALL' ? filterStatus : undefined,
      })
      if (Array.isArray(data)) {
        setExceptions(data)
      }
    } catch (err) {
      console.error('Error fetching exceptions:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadExceptions()
  }, [search, filterStatus])

  const handleCreateException = async (e) => {
    e.preventDefault()
    if (!newException.title || !newException.qid) return
    setSubmitting(true)
    try {
      await api.createException(newException)
      setIsModalOpen(false)
      setNewException({
        qid: '',
        title: '',
        hostname: '',
        asset_group: 'AWS',
        reason: '',
        requested_by: 'Alex Morgan (Cloud Sec)',
        approved_by: 'CISO Office',
        status: 'APPROVED',
        expires_in_days: 60,
      })
      await loadExceptions()
    } catch (err) {
      alert(`Failed to save exception: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this risk exception?')) return
    try {
      await api.deleteException(id)
      await loadExceptions()
    } catch (err) {
      alert(`Failed to delete exception: ${err.message}`)
    }
  }

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.updateException(id, { status: newStatus })
      await loadExceptions()
    } catch (err) {
      alert(`Failed to update status: ${err.message}`)
    }
  }

  return (
    <div className="px-8 py-8 space-y-8 max-w-[1600px] mx-auto animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
              GOVERNANCE &amp; EXCEPTIONS
            </span>
            <span className="text-xs text-slate-500 font-mono">RISK ACCEPTANCE WORKFLOW</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 font-display tracking-tight">
            Risk Exceptions &amp; False Positive Ledger
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Track business approvals, compensating controls, audit evidence, and false-positive exemptions for Qualys findings.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-qred text-white hover:bg-qred-hover shadow-red-pill transition-all self-start md:self-auto"
        >
          <Plus size={15} />
          <span>Request Risk Exception</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white">
          <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500 font-mono">
            TOTAL EXCEPTIONS
          </div>
          <div className="text-3xl font-extrabold text-slate-900 font-display mt-2">{exceptions.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Active registered waivers</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-green-200 bg-gradient-to-br from-green-50/40 to-white">
          <div className="text-[10px] uppercase font-bold tracking-widest text-green-700 font-mono">
            APPROVED WAIVERS
          </div>
          <div className="text-3xl font-extrabold text-green-800 font-display mt-2">
            {exceptions.filter((e) => e.status === 'APPROVED').length}
          </div>
          <div className="text-[11px] text-green-700 mt-1">Formal compensating controls verified</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/40 to-white">
          <div className="text-[10px] uppercase font-bold tracking-widest text-amber-700 font-mono">
            PENDING APPROVAL
          </div>
          <div className="text-3xl font-extrabold text-amber-800 font-display mt-2">
            {exceptions.filter((e) => e.status === 'PENDING_APPROVAL').length}
          </div>
          <div className="text-[11px] text-amber-700 mt-1">Under review by CISO Office</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/40 to-white">
          <div className="text-[10px] uppercase font-bold tracking-widest text-blue-700 font-mono">
            FALSE POSITIVES
          </div>
          <div className="text-3xl font-extrabold text-blue-800 font-display mt-2">
            {exceptions.filter((e) => e.status === 'FALSE_POSITIVE').length}
          </div>
          <div className="text-[11px] text-blue-600 mt-1">Excluded from SLA breach counters</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 bg-white flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 hover:border-slate-300 px-3.5 py-1.5 rounded-full text-xs w-80">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search QID, CVE, Title, Hostname..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent outline-none text-slate-800 w-full placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          {['ALL', 'APPROVED', 'PENDING_APPROVAL', 'FALSE_POSITIVE'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                filterStatus === st
                  ? 'bg-qred text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 bg-slate-50 font-mono font-bold">
              <th className="py-3.5 px-4">QID &amp; Vulnerability</th>
              <th className="py-3.5 px-4">Target Host Asset</th>
              <th className="py-3.5 px-4">Business Justification &amp; Evidence</th>
              <th className="py-3.5 px-4">Requested / Approved By</th>
              <th className="py-3.5 px-3 text-center">Status</th>
              <th className="py-3.5 px-3 text-center">Expires In</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500 font-mono text-xs">
                  Loading real-time risk exceptions...
                </td>
              </tr>
            ) : exceptions.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500 font-mono text-xs">
                  No risk exceptions found. Click "Request Risk Exception" to register a waiver.
                </td>
              </tr>
            ) : (
              exceptions.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-extrabold text-qred">QID {item.qid}</span>
                      {item.cve && <span className="text-[10px] font-mono text-slate-400">({item.cve})</span>}
                    </div>
                    <div className="text-slate-900 font-bold text-xs mt-0.5">{item.title}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-mono font-bold text-slate-800">{item.hostname || 'All correlated hosts'}</div>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200 mt-1 inline-block">
                      {item.asset_group}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 max-w-sm">
                    <p className="line-clamp-2 leading-relaxed">{item.reason}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-slate-900 font-bold">{item.requested_by}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Appr: {item.approved_by}</div>
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <select
                      value={item.status}
                      onChange={(e) => handleStatusChange(item.id, e.target.value)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold border outline-none cursor-pointer ${
                        item.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200' :
                        item.status === 'PENDING_APPROVAL' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      <option value="APPROVED">APPROVED</option>
                      <option value="PENDING_APPROVAL">PENDING APPROVAL</option>
                      <option value="FALSE_POSITIVE">FALSE POSITIVE</option>
                      <option value="EXPIRED">EXPIRED</option>
                    </select>
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-800">
                    {item.expires_in_days} days
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-xs text-red-500 hover:text-qred font-bold hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-display font-extrabold text-base text-slate-900">
                Request Risk Exception / False Positive
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateException} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-600 font-bold block mb-1">Qualys QID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 38173"
                  value={newException.qid}
                  onChange={(e) => setNewException({ ...newException, qid: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-600 font-bold block mb-1">Vulnerability Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. OpenSSH Race Condition (RegreSSHion)"
                  value={newException.title}
                  onChange={(e) => setNewException({ ...newException, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-600 font-bold block mb-1">Impacted Hostname / IP</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. aws-ec2-prod-01"
                  value={newException.hostname}
                  onChange={(e) => setNewException({ ...newException, hostname: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-600 font-bold block mb-1">Business Reason &amp; Compensating Controls</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detail the technical compensating controls or false positive validation..."
                  value={newException.reason}
                  onChange={(e) => setNewException({ ...newException, reason: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 font-bold block mb-1">Requested By</label>
                  <input
                    type="text"
                    required
                    placeholder="Your Name / Team"
                    value={newException.requested_by}
                    onChange={(e) => setNewException({ ...newException, requested_by: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-bold block mb-1">Waiver Duration (Days)</label>
                  <input
                    type="number"
                    value={newException.expires_in_days}
                    onChange={(e) => setNewException({ ...newException, expires_in_days: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-qred text-white hover:bg-qred-hover shadow-red-pill"
                >
                  Submit Exception
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
