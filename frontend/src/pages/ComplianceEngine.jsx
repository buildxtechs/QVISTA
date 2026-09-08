import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  Lock,
  Download,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  Key,
  Database,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  FileText,
  Percent,
} from 'lucide-react'

export default function ComplianceEngine() {
  const [reportType, setReportType] = useState('Executive Summary')
  const [format, setFormat] = useState('PDF')
  const [includeEvidence, setIncludeEvidence] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedMsg, setGeneratedMsg] = useState(null)

  const frameworks = [
    {
      id: 'soc2',
      title: 'SOC 2 Type II',
      status: 'COMPLIANT',
      lastSync: '2h ago',
      score: 92,
      color: '#16A34A',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      borderColor: 'border-green-200',
    },
    {
      id: 'iso27001',
      title: 'ISO 27001',
      status: 'ACTION REQUIRED',
      lastSync: '10m ago',
      score: 78,
      color: '#EA580C',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700',
      borderColor: 'border-amber-200',
    },
    {
      id: 'gdpr',
      title: 'GDPR Privacy',
      status: 'COMPLIANT',
      lastSync: '1d ago',
      score: 100,
      color: '#16A34A',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      borderColor: 'border-green-200',
    },
    {
      id: 'pci',
      title: 'PCI-DSS v4.0',
      status: 'AT RISK',
      lastSync: '5m ago',
      score: 64,
      color: '#ED1C24',
      bgColor: 'bg-red-50',
      textColor: 'text-qred',
      borderColor: 'border-red-200',
    },
    {
      id: 'hipaa',
      title: 'HIPAA Security',
      status: 'PENDING SCAN',
      lastSync: 'Never',
      score: 0,
      color: '#94A3B8',
      bgColor: 'bg-slate-50',
      textColor: 'text-slate-600',
      borderColor: 'border-slate-200',
    },
  ]

  const priorityQueue = [
    {
      title: 'Rotate Root AWS & Azure API Keys',
      affects: 'Affects PCI-DSS CC 3.4.1 • Access Control',
      severity: 'CRITICAL',
      icon: Key,
    },
    {
      title: 'Update Password Entropy & MFA Policy',
      affects: 'Affects ISO 27001 A.9.4.3 • IAM Governance',
      severity: 'HIGH',
      icon: Lock,
    },
    {
      title: 'Q3 Access Review & Orphaned Role Audit',
      affects: 'Affects SOC 2 CC 6.1 • Review Procedures',
      severity: 'MEDIUM',
      icon: FileCheck,
    },
    {
      title: 'Decommission Staging-04 DB Unmanaged Asset',
      affects: 'Data Minimization • Internal Security Policy',
      severity: 'LOW',
      icon: Database,
    },
  ]

  const handleGenerateReport = () => {
    setIsGenerating(true)
    setGeneratedMsg(null)
    setTimeout(() => {
      setIsGenerating(false)
      setGeneratedMsg(`Audit-ready ${reportType} (${format}) generated successfully.`)
    }, 1200)
  }

  return (
    <div className="px-8 py-8 space-y-8 max-w-[1600px] mx-auto animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-slate-500 font-mono">Enterprise Suite</span>
            <ChevronRight size={13} className="text-slate-400" />
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200">
              Compliance &amp; Reports
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 font-display tracking-tight">
            Compliance Engine
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Automated continuous monitoring across global security standards. Next global audit scheduled in{' '}
            <strong className="text-qred">14 days</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm transition-all"
          >
            <RefreshCw size={14} />
            <span>Force Global Rescan</span>
          </button>
          <button
            onClick={handleGenerateReport}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-qred text-white hover:bg-qred-hover shadow-red-pill transition-all"
          >
            <Download size={14} />
            <span>Export Data</span>
          </button>
        </div>
      </div>

      {/* 5 Standard Framework Compliance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {frameworks.map((f) => (
          <div
            key={f.id}
            className="p-5 rounded-2xl border bg-white border-slate-200 hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className={`w-8 h-8 rounded-xl ${f.bgColor} ${f.textColor} border ${f.borderColor} flex items-center justify-center`}>
                  <ShieldCheck size={16} />
                </div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${f.bgColor} ${f.textColor} border ${f.borderColor}`}>
                  {f.status}
                </span>
              </div>

              <div className="mt-4">
                <h3 className="font-display font-extrabold text-sm text-slate-900">{f.title}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Last sync: {f.lastSync}</p>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-baseline justify-between text-xs mb-1.5 font-mono">
                <span className="text-[10px] text-slate-400 uppercase">Coverage</span>
                <span className="font-extrabold text-slate-900">{f.score}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${f.score}%`, backgroundColor: f.color }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3 Interactive Grid Columns: Control Coverage / Remediation Queue / Report Generator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Control Coverage Donut / Stat Box */}
        <div className="lg:col-span-4 glass-panel p-6 rounded-2xl border border-slate-200 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-sm text-slate-900 uppercase tracking-wide">
                Control Coverage
              </h3>
              <span className="text-xs text-slate-400 font-mono">Audit Ready</span>
            </div>

            {/* Circular Gauge Center */}
            <div className="py-6 flex flex-col items-center justify-center relative">
              <div className="w-40 h-40 rounded-full border-8 border-slate-100 border-t-emerald-500 border-r-emerald-500 border-b-emerald-500 flex flex-col items-center justify-center relative shadow-inner">
                <span className="text-3xl font-extrabold text-slate-900 font-display">84%</span>
                <span className="text-[9px] uppercase tracking-wider font-mono text-slate-400 font-bold">
                  OVERALL MAPPED
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-slate-100 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-700">Mapped &amp; Passing</span>
              </div>
              <span className="font-mono font-bold text-slate-900">1,248</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-slate-700">Mapped &amp; Failing</span>
              </div>
              <span className="font-mono font-bold text-amber-700">212</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                <span className="text-slate-500">Unmapped Controls</span>
              </div>
              <span className="font-mono font-bold text-slate-500">186</span>
            </div>
          </div>
        </div>

        {/* Center Column: Remediation Priority Queue */}
        <div className="lg:col-span-5 glass-panel p-6 rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-sm text-slate-900 uppercase tracking-wide">
              Remediation Priority Queue
            </h3>
            <Link to="/vulnerabilities" className="text-xs text-qred hover:underline font-bold font-mono">
              View All Tasks &rarr;
            </Link>
          </div>

          <div className="space-y-3">
            {priorityQueue.map((item, idx) => {
              const Icon = item.icon
              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/70 hover:bg-slate-50 transition-colors flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <Icon size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{item.title}</h4>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                        item.severity === 'CRITICAL' ? 'bg-red-50 text-qred border border-red-200' :
                        item.severity === 'HIGH' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {item.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{item.affects}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Column: Report Generator */}
        <div className="lg:col-span-3 glass-panel p-6 rounded-2xl border border-slate-200 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <FileText size={16} className="text-qred" />
              <h3 className="font-display font-bold text-sm text-slate-900 uppercase tracking-wide">
                Report Generator
              </h3>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-1.5">
                  REPORT TYPE
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none font-medium"
                >
                  <option>Executive Summary</option>
                  <option>PCI-DSS Technical Attestation</option>
                  <option>SOC 2 Security Controls Audit</option>
                  <option>ISO 27001 Risk Ledger</option>
                  <option>Cloud Asset Discrepancy Matrix</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-1.5">
                  FORMAT
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormat('PDF')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      format === 'PDF' ? 'bg-qred text-white border-qred shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat('CSV')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      format === 'CSV' ? 'bg-qred text-white border-qred shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    CSV / Excel
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={includeEvidence}
                  onChange={(e) => setIncludeEvidence(e.target.checked)}
                  className="accent-qred rounded"
                />
                <span className="text-[11px] font-medium">Include audit evidence &amp; host logs</span>
              </label>

              {generatedMsg && (
                <div className="p-2.5 rounded-xl bg-green-50 border border-green-200 text-green-700 text-[11px] flex items-center gap-1.5 animate-fadeIn">
                  <CheckCircle2 size={13} className="shrink-0" />
                  <span>{generatedMsg}</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={handleGenerateReport}
              disabled={isGenerating}
              className="w-full py-2.5 rounded-xl bg-qred text-white font-bold text-xs hover:bg-qred-hover disabled:opacity-50 transition-all shadow-red-pill flex items-center justify-center gap-2"
            >
              <FileCheck size={15} />
              <span>{isGenerating ? 'Compiling Report...' : 'Generate Report'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
