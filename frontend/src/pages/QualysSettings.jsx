import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  XCircle,
  ShieldCheck,
  RefreshCw,
  Activity,
  ArrowRight,
  Shield,
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  Star,
  Server,
  Zap,
} from 'lucide-react'
import { api } from '../lib/api.js'

const PLATFORM_PRESETS = [
  { name: 'US Platform 1', url: 'https://qualysapi.qualys.com' },
  { name: 'US Platform 2', url: 'https://qualysapi.qg2.apps.qualys.com' },
  { name: 'US Platform 3', url: 'https://qualysapi.qg3.apps.qualys.com' },
  { name: 'EU Platform 1', url: 'https://qualysapi.qualys.eu' },
  { name: 'EU Platform 2', url: 'https://qualysapi.qg2.apps.qualys.eu' },
  { name: 'India Platform', url: 'https://qualysapi.qg1.apps.qualys.in' },
]

export default function QualysSettings() {
  const [connections, setConnections] = useState([])
  const [activeConnection, setActiveConnection] = useState(null)
  const [syncHistory, setSyncHistory] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({
    name: 'Production Qualys Scanner',
    platform_url: 'https://qualysapi.qg2.apps.qualys.com',
    username: '',
    password: '',
  })

  const [saving, setSaving] = useState(false)
  const [testingId, setTestingId] = useState(null)
  const [testResult, setTestResult] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState(null)

  async function loadData() {
    try {
      const [conns, active, history] = await Promise.all([
        api.listConnections().catch(() => []),
        api.getConnection().catch(() => null),
        api.syncHistory().catch(() => []),
      ])
      setConnections(conns || [])
      setActiveConnection(active)
      setSyncHistory(history || [])
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
    const timer = setInterval(() => {
      api.syncHistory().then((h) => setSyncHistory(h || [])).catch(() => {})
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  function openCreateModal() {
    setEditingId(null)
    setForm({
      name: `Qualys Connection ${connections.length + 1}`,
      platform_url: 'https://qualysapi.qg2.apps.qualys.com',
      username: '',
      password: '',
    })
    setTestResult(null)
    setError(null)
    setIsModalOpen(true)
  }

  function openEditModal(conn) {
    setEditingId(conn.id)
    setForm({
      name: conn.name,
      platform_url: conn.platform_url,
      username: conn.username,
      password: '',
    })
    setTestResult(null)
    setError(null)
    setIsModalOpen(true)
  }

  async function handleSaveConnection(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (editingId) {
        await api.updateConnection(editingId, form)
      } else {
        await api.createConnection(form)
      }
      setIsModalOpen(false)
      loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this Qualys connection?')) return
    try {
      await api.deleteConnection(id)
      loadData()
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleSetActive(id) {
    try {
      await api.setActiveConnection(id)
      loadData()
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleTest(connId) {
    setTestingId(connId)
    setTestResult(null)
    try {
      const res = await api.testConnectionId(connId)
      setTestResult({ id: connId, ok: true, message: res.message || 'Connection verified successfully!' })
      loadData()
    } catch (err) {
      setTestResult({ id: connId, ok: false, message: err.message })
    } finally {
      setTestingId(null)
    }
  }

  async function handleSync() {
    setSyncing(true)
    try {
      await api.triggerSync()
      setTimeout(() => {
        loadData()
        setSyncing(false)
      }, 1800)
    } catch (err) {
      alert(err.message)
      setSyncing(false)
    }
  }

  return (
    <div className="px-8 py-8 space-y-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-50 text-qred border border-red-200">
              QUALYS VMDR SENSORS
            </span>
            <span className="text-xs text-slate-500 font-mono">ENCRYPTED AT REST (FERNET)</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-display">Qualys VMDR Connections (CRUD)</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage multiple Qualys VMDR API profiles, test authentication, switch active scanners, and sync detections.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-qred text-white hover:bg-qred-hover shadow-red-pill transition-all"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>Add Connection Profile</span>
          </button>
        </div>
      </div>

      {/* Connections List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {connections.map((c) => (
          <div
            key={c.id}
            className={`glass-panel p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
              c.is_active
                ? 'border-qred shadow-sm bg-white ring-2 ring-red-100'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-display font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Shield size={16} className="text-qred" />
                  {c.name}
                </span>
                {c.is_active ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-red-50 text-qred border border-red-200 flex items-center gap-1">
                    <Star size={10} className="fill-qred" /> ACTIVE
                  </span>
                ) : (
                  <button
                    onClick={() => handleSetActive(c.id)}
                    className="text-[10px] font-mono text-slate-500 hover:text-slate-900 underline"
                  >
                    Set Active
                  </button>
                )}
              </div>

              <div className="text-xs space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono">
                <div className="flex justify-between text-slate-500">
                  <span>Username:</span>
                  <span className="text-slate-900 font-bold">{c.username}</span>
                </div>
                <div className="flex justify-between text-slate-500 truncate">
                  <span>Platform:</span>
                  <span className="text-slate-800 truncate max-w-[150px]">{c.platform_url.replace('https://', '')}</span>
                </div>
                <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-200">
                  <span>Last Test:</span>
                  <span
                    className={`font-bold ${
                      c.last_test_status === 'success' ? 'text-green-600' : 'text-orange-600'
                    }`}
                  >
                    {c.last_test_status || 'Not tested'}
                  </span>
                </div>
              </div>

              {testResult && testResult.id === c.id && (
                <div
                  className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
                    testResult.ok
                      ? 'bg-green-50 border-green-200 text-green-700'
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}
                >
                  {testResult.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  <span className="truncate text-[11px]">{testResult.message}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleTest(c.id)}
                  disabled={testingId === c.id}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-all"
                >
                  <ShieldCheck size={13} className={testingId === c.id ? 'animate-spin text-qred' : 'text-qred'} />
                  <span>{testingId === c.id ? 'Testing...' : 'Test'}</span>
                </button>

                {c.is_active && (
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 hover:bg-red-100 text-qred border border-red-200 transition-all"
                  >
                    <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
                    <span>Sync</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEditModal(c)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  title="Edit Connection"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 transition-colors"
                  title="Delete Connection"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {connections.length === 0 && (
          <div className="col-span-full py-16 text-center glass-panel rounded-2xl border border-slate-200 p-6 space-y-3">
            <p className="text-xs text-slate-500">No Qualys VMDR connections configured yet.</p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-qred text-white hover:bg-qred-hover shadow-red-pill"
            >
              Add Your First Qualys Connection
            </button>
          </div>
        )}
      </div>

      {/* Sync History Table */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-slate-900 font-display uppercase tracking-wider flex items-center gap-2">
            <RefreshCw size={15} className="text-qred" /> Sync History &amp; Background Detection Jobs
          </h2>
          <button
            onClick={loadData}
            className="text-xs text-qred hover:underline flex items-center gap-1 font-mono font-bold"
          >
            Refresh History <ArrowRight size={12} />
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 bg-slate-50 font-mono font-bold">
                <th className="py-2.5 px-3">Job ID</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Started</th>
                <th className="py-2.5 px-3">Finished</th>
                <th className="py-2.5 px-3">Hosts Processed</th>
                <th className="py-2.5 px-3">Findings</th>
                <th className="py-2.5 px-3">Details / Errors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {syncHistory.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono text-slate-900 font-bold">#{s.id}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        s.status === 'success'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : s.status === 'running'
                          ? 'bg-red-50 text-qred border border-red-200 animate-pulse'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">
                    {s.started_at ? new Date(s.started_at).toLocaleTimeString() : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">
                    {s.finished_at ? new Date(s.finished_at).toLocaleTimeString() : 'In progress...'}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-900 font-bold">{s.hosts_processed}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-700">{s.findings_processed}</td>
                  <td className="py-2.5 px-3 text-slate-500 truncate max-w-xs">
                    {s.error_message ? (
                      <span className="text-red-600 text-[11px] font-bold">{s.error_message}</span>
                    ) : (
                      s.status === 'success' ? `${s.new_findings} new findings, ${s.fixed_findings} fixed` : '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {syncHistory.length === 0 && (
            <p className="text-xs text-slate-400 py-8 text-center">
              No sync jobs executed yet. Trigger a sync using the button above.
            </p>
          )}
        </div>
      </div>

      {/* CRUD Connection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Shield size={20} className="text-qred" />
                <h2 className="text-base font-bold text-slate-900 font-display">
                  {editingId ? 'Edit Qualys Connection' : 'Add Qualys Connection'}
                </h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>

            <form onSubmit={handleSaveConnection} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Connection Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-qred focus:bg-white px-3.5 py-2 rounded-xl outline-none text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">API Platform URL *</label>
                <input
                  type="text"
                  required
                  value={form.platform_url}
                  onChange={(e) => setForm({ ...form, platform_url: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-qred focus:bg-white px-3.5 py-2 rounded-xl outline-none text-slate-900 font-mono"
                />
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400 uppercase">Presets:</span>
                  {PLATFORM_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setForm({ ...form, platform_url: p.url })}
                      className="px-2 py-0.5 text-[10px] rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 font-mono transition-colors"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Username *</label>
                <input
                  type="text"
                  required
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-qred focus:bg-white px-3.5 py-2 rounded-xl outline-none text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Password {editingId ? '(leave blank to keep unchanged)' : '*'}
                </label>
                <input
                  type="password"
                  required={!editingId}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-qred focus:bg-white px-3.5 py-2 rounded-xl outline-none text-slate-900 font-mono"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-slate-800 flex items-center gap-2">
                  <AlertTriangle size={15} className="text-qred shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 font-bold rounded-xl bg-qred text-white hover:bg-qred-hover disabled:opacity-50 transition-all shadow-red-pill"
                >
                  {saving ? 'Saving...' : 'Save Connection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
