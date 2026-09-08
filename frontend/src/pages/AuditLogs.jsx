import { useState } from 'react'
import {
  FileText,
  Search,
  Shield,
  Clock,
  User,
  Activity,
  CheckCircle2,
  Lock,
  ArrowUpDown,
  Filter,
  RefreshCw,
} from 'lucide-react'

export default function AuditLogs() {
  const [logs] = useState([
    {
      id: 101,
      timestamp: '2026-09-08 11:45:12',
      actor: 'Admin (IVM Lead)',
      action: 'CLOUD_INVENTORY_SYNC',
      resource: 'AWS-Prod-Core (112233445566)',
      status: 'SUCCESS',
      detail: 'Auto-correlated 33 EC2 instances and matched 101 Qualys host agents.',
    },
    {
      id: 102,
      timestamp: '2026-09-08 11:20:05',
      actor: 'Qualys Sync Scheduler',
      action: 'VMDR_SCAN_INGESTION',
      resource: 'Qualys API v2 Host Detection',
      status: 'SUCCESS',
      detail: 'Processed 1,936 assets and 61,685 detections (7,804 new findings).',
    },
    {
      id: 103,
      timestamp: '2026-09-08 10:15:33',
      actor: 'Security Auditor',
      action: 'RISK_EXCEPTION_CREATED',
      resource: 'QID 38173 (CVE-2023-48795)',
      status: 'APPROVED',
      detail: 'Created 60-day risk waiver on Payment Gateway Core gateway instances.',
    },
    {
      id: 104,
      timestamp: '2026-09-08 09:30:18',
      actor: 'System Engine',
      action: 'SLA_CALCULATION_RUN',
      resource: 'SLA Rules (Sev 5: 15d, Sev 4: 30d)',
      status: 'SUCCESS',
      detail: 'Evaluated 61,685 host findings: 36,926 marked as BREACHED.',
    },
    {
      id: 105,
      timestamp: '2026-09-08 08:00:00',
      actor: 'Automation Cron',
      action: 'REPORT_DISPATCH',
      resource: 'IASP Executive Findings Matrix',
      status: 'SENT',
      detail: 'Dispatched automated weekly report to security leadership distribution list.',
    },
  ])

  const [search, setSearch] = useState('')

  const filtered = logs.filter(
    (l) =>
      l.actor.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.resource.toLowerCase().includes(search.toLowerCase()) ||
      l.detail.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="px-8 py-8 space-y-8 max-w-[1600px] mx-auto animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
              AUDIT &amp; TRACEABILITY
            </span>
            <span className="text-xs text-slate-500 font-mono">SOC 2 &amp; ISO 27001 AUDIT TRAIL</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 font-display tracking-tight">
            Security Audit Logs &amp; Activity Stream
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Immutable system and user actions, scan ingestions, SLA recalculations, and risk exception audit entries.
          </p>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm transition-all self-start md:self-auto"
        >
          <RefreshCw size={14} />
          <span>Refresh Activity</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 bg-white flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 hover:border-slate-300 px-3.5 py-1.5 rounded-full text-xs w-80">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search actor, action, resource, detail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent outline-none text-slate-800 w-full placeholder:text-slate-400"
          />
        </div>

        <span className="text-xs text-slate-500 font-mono">
          Showing <strong>{filtered.length}</strong> Audit Events
        </span>
      </div>

      {/* Log Table */}
      <div className="glass-panel rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 bg-slate-50 font-mono font-bold">
              <th className="py-3.5 px-4">Timestamp (UTC)</th>
              <th className="py-3.5 px-4">Actor / Origin</th>
              <th className="py-3.5 px-4">Event Action</th>
              <th className="py-3.5 px-4">Target Resource</th>
              <th className="py-3.5 px-4">Event Details</th>
              <th className="py-3.5 px-3 text-center">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3.5 px-4 font-mono text-slate-500">{l.timestamp}</td>
                <td className="py-3.5 px-4 font-bold text-slate-900">{l.actor}</td>
                <td className="py-3.5 px-4">
                  <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                    {l.action}
                  </span>
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-700">{l.resource}</td>
                <td className="py-3.5 px-4 text-slate-600 leading-relaxed max-w-md">{l.detail}</td>
                <td className="py-3.5 px-3 text-center">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-green-50 text-green-700 border border-green-200">
                    {l.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
