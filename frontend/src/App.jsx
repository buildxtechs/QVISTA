import { useState, useEffect } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  ShieldAlert,
  Server,
  Network,
  Cloud,
  Layers,
  Lock,
  Activity,
  MoreHorizontal,
  Shield,
  FileSpreadsheet,
  Flame,
  Radio,
  FileCheck2,
  FileClock,
  FileBarChart2,
  ScrollText,
} from 'lucide-react'

import Dashboard from './pages/Dashboard.jsx'
import Assets from './pages/Assets.jsx'
import AssetDetail from './pages/AssetDetail.jsx'
import Vulnerabilities from './pages/Vulnerabilities.jsx'
import VulnerabilityDetail from './pages/VulnerabilityDetail.jsx'
import Applications from './pages/Applications.jsx'
import ApplicationDetail from './pages/ApplicationDetail.jsx'
import ApmExplorer from './pages/ApmExplorer.jsx'
import SlaGovernance from './pages/SlaGovernance.jsx'
import ComplianceEngine from './pages/ComplianceEngine.jsx'
import ExceptionsManagement from './pages/ExceptionsManagement.jsx'
import ReportsHub from './pages/ReportsHub.jsx'
import AuditLogs from './pages/AuditLogs.jsx'
import Upload from './pages/Upload.jsx'
import QualysSettings from './pages/QualysSettings.jsx'
import TopNavbar from './components/TopNavbar.jsx'
import { api } from './lib/api.js'

export default function App() {
  const location = useLocation()
  const [counts, setCounts] = useState({ assets: '0', vulns: '0' })

  useEffect(() => {
    api.dashboardSummary().then((s) => {
      if (s) {
        setCounts({
          assets: s.assets > 999 ? `${(s.assets / 1000).toFixed(1)}k` : s.assets,
          vulns: s.vulnerabilities_open > 999 ? `${(s.vulnerabilities_open / 1000).toFixed(0)}k` : s.vulnerabilities_open,
        })
      }
    }).catch(() => {})
  }, [])

  const getPageTitle = () => {
    const p = location.pathname
    if (p === '/') return { title: 'Executive Overview', subtitle: 'QUALYS THREAT & CLOUD POSTURE' }
    if (p.startsWith('/apms')) return { title: 'APM Explorer & CMDB', subtitle: 'APPLICATION RISK CORRELATION' }
    if (p.startsWith('/vulnerabilities')) return { title: 'Vulnerabilities & Findings', subtitle: 'THREAT INTELLIGENCE & REMEDIATION' }
    if (p.startsWith('/sla-governance')) return { title: 'SLA Governance & Remediation Velocity', subtitle: 'REMEDIATION COMPLIANCE & BREACH WATCH' }
    if (p.startsWith('/compliance')) return { title: 'Compliance Engine & Security Controls', subtitle: 'MULTI-STANDARD AUDIT READINESS' }
    if (p.startsWith('/exceptions')) return { title: 'Risk Exceptions & False Positive Hub', subtitle: 'GOVERNANCE & RISK ACCEPTANCE' }
    if (p.startsWith('/assets')) return { title: 'Asset Explorer', subtitle: 'UNIFIED MULTI-CLOUD INVENTORY' }
    if (p.startsWith('/reports')) return { title: 'Reporting & Analytics Hub', subtitle: 'IASP, EXECUTIVE & AUDIT EXPORTS' }
    if (p.startsWith('/audit-logs')) return { title: 'Immutable Audit Trail', subtitle: 'SYSTEM & USER ACTION LOGS' }
    if (p.startsWith('/applications')) return { title: 'Applications & Workloads', subtitle: 'BUSINESS CONTEXT' }
    if (p.startsWith('/upload')) return { title: 'Cloud Inventory Hub', subtitle: 'AWS & AZURE INGESTION' }
    if (p.startsWith('/settings')) return { title: 'Qualys VMDR Connections', subtitle: 'INTEGRATIONS & SENSORS' }
    return { title: 'Operations', subtitle: 'SECURITY POSTURE' }
  }

  const { title, subtitle } = getPageTitle()

  return (
    <div className="flex h-screen bg-white text-slate-900 overflow-hidden font-sans">
      {/* Sidebar with Crisp White Canvas, Royal Blue & Qualys Red Accents */}
      <aside className="w-64 shrink-0 border-r border-slate-200 bg-white flex flex-col justify-between shadow-sm">
        <div>
          {/* Brand Logo Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3 bg-white">
            <div className="w-10 h-10 rounded-xl bg-qred flex items-center justify-center text-white shadow-md shadow-red-500/20">
              <Shield size={22} className="fill-white/20 stroke-white" />
            </div>
            <div>
              <div className="font-display font-extrabold tracking-wider text-base text-slate-900 flex items-center gap-1.5">
                QVISTA
                <span className="w-2 h-2 rounded-full bg-qred animate-ping" />
              </div>
              <p className="text-[9px] font-mono tracking-widest text-qblue font-bold uppercase leading-tight">
                QUALYS INTELLIGENCE
              </p>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="px-3 py-4 space-y-6 max-h-[calc(100vh-145px)] overflow-y-auto">
            {/* WORKSPACE GROUP */}
            <div>
              <div className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 font-mono">
                WORKSPACE
              </div>
              <nav className="space-y-1">
                <NavLink
                  to="/"
                  end
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                      isActive
                        ? 'bg-qblue text-white shadow-md shadow-blue-500/25 font-bold'
                        : 'text-slate-600 hover:text-qblue hover:bg-blue-50/60 border border-transparent'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <LayoutDashboard size={16} />
                    <span>Overview</span>
                  </div>
                </NavLink>

                <NavLink
                  to="/apms"
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                      isActive
                        ? 'bg-qblue text-white shadow-md shadow-blue-500/25 font-bold'
                        : 'text-slate-600 hover:text-qblue hover:bg-blue-50/60 border border-transparent'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <Layers size={16} />
                    <span>APM Explorer</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-100 text-qblue">
                    CMDB
                  </span>
                </NavLink>

                <NavLink
                  to="/vulnerabilities"
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                      isActive
                        ? 'bg-qblue text-white shadow-md shadow-blue-500/25 font-bold'
                        : 'text-slate-600 hover:text-qblue hover:bg-blue-50/60 border border-transparent'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldAlert size={16} />
                    <span>Vulnerabilities</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-red-100 text-qred font-bold">
                    {counts.vulns}
                  </span>
                </NavLink>

                <NavLink
                  to="/assets"
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                      isActive
                        ? 'bg-qblue text-white shadow-md shadow-blue-500/25 font-bold'
                        : 'text-slate-600 hover:text-qblue hover:bg-blue-50/60 border border-transparent'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <Server size={16} />
                    <span>Asset Explorer</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-slate-100 text-slate-700 font-bold">
                    {counts.assets}
                  </span>
                </NavLink>

                <NavLink
                  to="/applications"
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                      isActive
                        ? 'bg-qblue text-white shadow-md shadow-blue-500/25 font-bold'
                        : 'text-slate-600 hover:text-qblue hover:bg-blue-50/60 border border-transparent'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <Network size={16} />
                    <span>Applications</span>
                  </div>
                </NavLink>

                <NavLink
                  to="/upload"
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                      isActive
                        ? 'bg-qblue text-white shadow-md shadow-blue-500/25 font-bold'
                        : 'text-slate-600 hover:text-qblue hover:bg-blue-50/60 border border-transparent'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <Cloud size={16} />
                    <span>Cloud Inventory</span>
                  </div>
                </NavLink>
              </nav>
            </div>

            {/* GOVERNANCE & OPERATIONS GROUP */}
            <div>
              <div className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 font-mono">
                GOVERNANCE &amp; VELOCITY
              </div>
              <nav className="space-y-1">
                <NavLink
                  to="/sla-governance"
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                      isActive
                        ? 'bg-qblue text-white shadow-md shadow-blue-500/25 font-bold'
                        : 'text-slate-600 hover:text-qblue hover:bg-blue-50/60 border border-transparent'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <Flame size={16} className="text-qred" />
                    <span>SLA Governance</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-100 text-amber-700">
                    SLA
                  </span>
                </NavLink>

                <NavLink
                  to="/compliance"
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                      isActive
                        ? 'bg-qblue text-white shadow-md shadow-blue-500/25 font-bold'
                        : 'text-slate-600 hover:text-qblue hover:bg-blue-50/60 border border-transparent'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <FileCheck2 size={16} />
                    <span>Compliance Engine</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-100 text-emerald-700">
                    SOC2
                  </span>
                </NavLink>

                <NavLink
                  to="/exceptions"
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                      isActive
                        ? 'bg-qblue text-white shadow-md shadow-blue-500/25 font-bold'
                        : 'text-slate-600 hover:text-qblue hover:bg-blue-50/60 border border-transparent'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <FileClock size={16} />
                    <span>Risk Exceptions</span>
                  </div>
                </NavLink>

                <NavLink
                  to="/reports"
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                      isActive
                        ? 'bg-qblue text-white shadow-md shadow-blue-500/25 font-bold'
                        : 'text-slate-600 hover:text-qblue hover:bg-blue-50/60 border border-transparent'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <FileBarChart2 size={16} />
                    <span>Reports &amp; IASP</span>
                  </div>
                </NavLink>

                <NavLink
                  to="/settings"
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                      isActive
                        ? 'bg-qblue text-white shadow-md shadow-blue-500/25 font-bold'
                        : 'text-slate-600 hover:text-qblue hover:bg-blue-50/60 border border-transparent'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <Lock size={16} />
                    <span>Qualys Connections</span>
                  </div>
                </NavLink>

                <div className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-400">
                  <div className="flex items-center gap-2.5">
                    <Activity size={16} />
                    <span>Sync Activity</span>
                  </div>
                  <span className="text-[9px] font-mono text-emerald-600 flex items-center gap-1 font-bold">
                    <Radio size={10} className="animate-pulse text-emerald-500" /> LIVE
                  </span>
                </div>
              </nav>
            </div>
          </div>

          <div className="px-4 py-3 mx-3 mb-2 rounded-xl bg-blue-50/60 border border-blue-200 text-center">
            <div className="text-[9px] font-mono tracking-wider text-qblue font-bold uppercase">
              AWS • AZURE • NETWORK
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5 font-medium leading-tight">
              Unified Qualys VMDR Correlation
            </div>
          </div>
        </div>

        {/* User Profile Card - IVM Team */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-qblue flex items-center justify-center text-white font-extrabold text-xs shadow-sm">
                IVM
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 leading-tight">IVM Team</div>
                <div className="text-[10px] text-slate-500 leading-tight">Vulnerability Management</div>
              </div>
            </div>
            <button className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors">
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-white">
        <TopNavbar title={title} subtitle={subtitle} />

        <main className="flex-1 overflow-y-auto bg-slate-50/40">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/apms" element={<ApmExplorer />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/assets/:id" element={<AssetDetail />} />
            <Route path="/vulnerabilities" element={<Vulnerabilities />} />
            <Route path="/vulnerabilities/:qid" element={<VulnerabilityDetail />} />
            <Route path="/sla-governance" element={<SlaGovernance />} />
            <Route path="/compliance" element={<ComplianceEngine />} />
            <Route path="/exceptions" element={<ExceptionsManagement />} />
            <Route path="/reports" element={<ReportsHub />} />
            <Route path="/applications" element={<Applications />} />
            <Route path="/applications/:id" element={<ApplicationDetail />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/settings" element={<QualysSettings />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
