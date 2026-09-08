import { useState } from 'react'
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Clock,
  Shield,
  Layers,
  FileText,
  Mail,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Database,
  BarChart2,
} from 'lucide-react'
import { api } from '../lib/api.js'

export default function ReportsHub() {
  const [activeTab, setActiveTab] = useState('templates')
  const [scheduleSuccess, setScheduleSuccess] = useState(false)
  const [emailTo, setEmailTo] = useState('security-team@enterprise.corp')
  const [frequency, setFrequency] = useState('Weekly on Monday 08:00 AM')

  const reportTemplates = [
    {
      id: 'iasp',
      title: 'IASP Executive & Audit Findings Matrix',
      description: 'Full Qualys VMDR vulnerability extract mapped to Enterprise 5-digit Correlation IDs, APM IDs, and SLAs.',
      format: 'XLSX',
      tag: 'IASP STANDARD',
      url: api.iaspExportUrl(),
      icon: FileSpreadsheet,
    },
    {
      id: 'powerbi',
      title: 'Power BI Analytics & Executive Dashboard Schema',
      description: 'Denormalized dimensional dataset optimized for Power BI, Tableau, and Snowflake vulnerability pipeline sync.',
      format: 'XLSX',
      tag: 'POWER BI COMPATIBLE',
      url: api.powerBiExportUrl(),
      icon: BarChart2,
    },
    {
      id: 'shadow',
      title: 'Unmatched Shadow IT Cloud Inventory Discrepancy',
      description: 'AWS EC2 and Azure VMs running without active Qualys Cloud Agent sensors.',
      format: 'XLSX',
      tag: 'SHADOW IT AUDIT',
      url: api.reportUrl('unmatched-assets.xlsx'),
      icon: Database,
    },
    {
      id: 'cve_critical',
      title: 'Active Severity 5 Critical Findings & Zero-Day Alert',
      description: 'All 7,105 critical active vulnerabilities with direct CVSS v3, TruRisk, and exploitability flags.',
      format: 'CSV',
      tag: 'IMMEDIATE ACTION',
      url: api.reportUrl('vulnerabilities.csv'),
      icon: Shield,
    },
  ]

  const handleScheduleSubmit = (e) => {
    e.preventDefault()
    setScheduleSuccess(true)
    setTimeout(() => setScheduleSuccess(false), 3000)
  }

  return (
    <div className="px-8 py-8 space-y-8 max-w-[1600px] mx-auto animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-50 text-qred border border-red-200">
              EXECUTIVE COMPLIANCE
            </span>
            <span className="text-xs text-slate-500 font-mono">AUTOMATED REPORT GENERATION &amp; EXPORT</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 font-display tracking-tight">
            Security Reports &amp; Scheduled Delivery Hub
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Generate standardized IASP Excel spreadsheets, Power BI data schemas, executive PDFs, and recurring email delivery.
          </p>
        </div>

        {/* Global Instant Export */}
        <div className="flex items-center gap-3">
          <a
            href={api.iaspExportUrl()}
            download
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-qred text-white hover:bg-qred-hover shadow-red-pill transition-all"
          >
            <Download size={14} />
            <span>Download Full IASP Report (.xlsx)</span>
          </a>
        </div>
      </div>

      {/* 4 Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {reportTemplates.map((tpl) => {
          const Icon = tpl.icon
          return (
            <div
              key={tpl.id}
              className="p-6 rounded-2xl border border-slate-200 bg-white hover:border-qred hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-qred flex items-center justify-center border border-red-200 group-hover:scale-105 transition-transform">
                    <Icon size={20} />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    {tpl.tag}
                  </span>
                </div>

                <h3 className="font-display font-extrabold text-base text-slate-900 group-hover:text-qred transition-colors">
                  {tpl.title}
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  {tpl.description}
                </p>
              </div>

              <div className="pt-6 border-t border-slate-100 mt-6 flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-500 uppercase">
                  Format: <strong className="text-slate-900">{tpl.format}</strong>
                </span>
                <a
                  href={tpl.url}
                  download
                  className="px-4 py-2 rounded-xl bg-slate-50 hover:bg-qred hover:text-white text-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Download size={14} />
                  <span>Download Now</span>
                </a>
              </div>
            </div>
          )
        })}
      </div>

      {/* Scheduled Automation & Email Subscriptions Box */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 mb-2">
          <Clock size={18} className="text-qred" />
          <h3 className="font-display font-extrabold text-base text-slate-900">
            Automated Scheduled Report Subscriptions
          </h3>
        </div>
        <p className="text-xs text-slate-600 mb-6">
          Configure recurring email delivery of vulnerability status reports directly to leadership, CISO office, and App Owners.
        </p>

        <form onSubmit={handleScheduleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="text-slate-600 font-bold block mb-1">Recipient Email(s)</label>
            <input
              type="text"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 outline-none"
            />
          </div>

          <div>
            <label className="text-slate-600 font-bold block mb-1">Recurring Delivery Cadence</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 outline-none font-medium"
            >
              <option>Daily at 07:00 AM UTC</option>
              <option>Weekly on Monday 08:00 AM</option>
              <option>Bi-Weekly SLA Review Cycle</option>
              <option>Monthly Executive Attestation</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-qred text-white font-bold text-xs hover:bg-qred-hover transition-all shadow-red-pill flex items-center justify-center gap-2"
            >
              <Mail size={15} />
              <span>Save Report Schedule</span>
            </button>
          </div>
        </form>

        {scheduleSuccess && (
          <div className="mt-4 p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 size={15} className="shrink-0" />
            <span>Scheduled delivery configured for {emailTo} ({frequency}).</span>
          </div>
        )}
      </div>
    </div>
  )
}
