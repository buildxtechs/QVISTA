import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Server, Shield, AlertTriangle, Cloud, Network, CheckCircle2, Zap } from 'lucide-react'
import { api } from '../lib/api.js'
import SeverityBadge, { SlaBadge } from '../components/SeverityBadge.jsx'

export default function AssetDetail() {
  const { id } = useParams()
  const [asset, setAsset] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.assetDetail(id).then((res) => {
      setAsset(res)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  if (loading || !asset) {
    return <div className="p-12 text-center text-slate-500 text-xs font-mono">Loading asset telemetry…</div>
  }

  const critical = asset.detections.filter((d) => d.severity === 5 && d.status !== 'Fixed').length
  const high = asset.detections.filter((d) => d.severity === 4 && d.status !== 'Fixed').length
  const medium = asset.detections.filter((d) => d.severity === 3 && d.status !== 'Fixed').length
  const oldest = asset.detections
    .filter((d) => d.age_days != null)
    .sort((a, b) => b.age_days - a.age_days)[0]

  return (
    <div className="px-8 py-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Top Banner */}
      <div>
        <Link to="/assets" className="text-xs font-bold text-qred hover:underline inline-flex items-center gap-1 mb-3">
          <ArrowLeft size={13} /> Back to Asset Explorer
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-50 text-qred border border-red-200">
                HOST ASSET TELEMETRY
              </span>
              <span className="text-xs text-slate-500 font-mono">{asset.ip}</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 font-display">{asset.hostname || asset.ip}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Application: <strong className="text-slate-800">{asset.application || 'Unassigned'}</strong> · Cloud: <strong className="text-slate-800">{asset.cloud_provider || 'On-Premises Network'}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Info & Vulnerability Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-panel p-5 rounded-2xl border border-slate-200 space-y-3">
          <h3 className="text-xs uppercase tracking-wider text-slate-500 font-mono font-bold flex items-center gap-2">
            <Server size={14} className="text-qred" /> Host &amp; Cloud Agent Metadata
          </h3>
          <dl className="space-y-2 text-xs divide-y divide-slate-100">
            <Row label="IP Address" value={asset.ip} mono />
            <Row label="FQDN" value={asset.fqdn} />
            <Row label="Operating System" value={asset.os} />
            <Row label="Asset Group" value={asset.asset_group || asset.cloud_provider} />
            <Row label="Tracking Sensor" value={asset.tracking_method || 'AGENT'} mono />
            <Row label="Sensor Health" value={asset.agent_status || 'Active'} />
            <Row label="Asset Status" value={asset.asset_status} />
            <Row label="Last Qualys Scan" value={asset.last_scan ? new Date(asset.last_scan).toLocaleString() : '—'} />
          </dl>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-200 flex flex-col justify-between">
          <div>
            <h3 className="text-xs uppercase tracking-wider text-slate-500 font-mono font-bold mb-3 flex items-center gap-2">
              <Cloud size={14} className="text-qblue" /> AWS / EC2 Account &amp; APM Mapping
            </h3>
            <dl className="space-y-2 text-xs divide-y divide-slate-100">
              <Row label="Cloud Provider" value={asset.cloud_provider || 'AWS'} />
              <Row label="EC2 Instance ID" value={asset.cloud_instance_id} mono />
              <Row label="AWS Account ID" value={asset.cloud_account_id} mono />
              <Row label="AWS Account Name" value={asset.cloud_account_name} />
              <Row label="APM ID" value={asset.apm_id} mono />
              <Row label="Application Name" value={asset.application} />
              <Row label="IT App Owner" value={asset.app_owner || asset.owner} />
              <Row label="Correlation ID" value={asset.correlation_id ? `Corr-${asset.correlation_id}` : '—'} mono />
            </dl>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Scope:</span>
            <div className="flex items-center gap-1.5 font-mono font-bold">
              {asset.internet_facing && <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px]">INTERNET FACING</span>}
              {asset.pci_scope && <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[9px]">PCI-DSS</span>}
              {!asset.internet_facing && !asset.pci_scope && <span className="text-slate-400">Internal</span>}
            </div>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-200 flex flex-col justify-between">
          <div>
            <h3 className="text-xs uppercase tracking-wider text-slate-500 font-mono font-bold mb-4 flex items-center gap-2">
              <Shield size={14} className="text-qred" /> Risk Posture &amp; Detection Breakdown
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <p className="text-[10px] uppercase text-slate-500 font-mono font-bold">Critical (Sev 5)</p>
                <p className="text-2xl font-extrabold text-qred font-display mt-0.5">{critical}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <p className="text-[10px] uppercase text-slate-500 font-mono font-bold">High (Sev 4)</p>
                <p className="text-2xl font-extrabold text-orange-600 font-display mt-0.5">{high}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <p className="text-[10px] uppercase text-slate-500 font-mono font-bold">Medium (Sev 3)</p>
                <p className="text-2xl font-extrabold text-amber-600 font-display mt-0.5">{medium}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <p className="text-[10px] uppercase text-slate-500 font-mono font-bold">Oldest Age</p>
                <p className="text-2xl font-extrabold text-slate-900 font-display mt-0.5">{oldest ? `${oldest.age_days}d` : '0d'}</p>
              </div>
            </div>
          </div>

          {asset.cloud_records && asset.cloud_records.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-[10px] text-slate-500 font-mono font-bold mb-1.5 uppercase">AWS Inventory Matched Row</p>
              <div className="space-y-1">
                {asset.cloud_records.map((c, i) => (
                  <div key={i} className="text-[11px] text-slate-800 flex items-center justify-between">
                    <span className="font-mono text-qblue">{c.cloud_provider} · {c.instance_id}</span>
                    <span className="px-1.5 py-0.5 rounded bg-green-50 text-green-700 text-[9px] font-bold border border-green-200">
                      {c.match_status} ({c.match_method})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Findings Table */}
      <div className="glass-panel rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-xs uppercase tracking-wider text-slate-600 font-mono font-bold">
            Vulnerability Findings ({asset.detections.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 bg-slate-50/50 font-mono font-bold">
                <th className="py-3 px-4">QID</th>
                <th className="py-3 px-4">Vulnerability Title</th>
                <th className="py-3 px-4 text-center">Severity</th>
                <th className="py-3 px-4">Port / Protocol</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Age</th>
                <th className="py-3 px-4 text-right">SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {asset.detections.map((d, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-qred">
                    <Link to={`/vulnerabilities/${d.qid}`} className="hover:underline">
                      {d.qid}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-slate-900 font-medium max-w-md truncate">
                    <Link to={`/vulnerabilities/${d.qid}`} className="hover:text-qred">
                      {d.title}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-center"><SeverityBadge severity={d.severity} /></td>
                  <td className="py-3 px-4 text-slate-500 font-mono">{d.port ? `${d.port}/${d.protocol}` : '—'}</td>
                  <td className="py-3 px-4 text-slate-800 font-medium">{d.status}</td>
                  <td className="py-3 px-4 text-right text-slate-500 font-mono">{d.age_days != null ? `${d.age_days}d` : '—'}</td>
                  <td className="py-3 px-4 text-right"><SlaBadge status={d.sla_status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {asset.detections.length === 0 && (
            <p className="text-xs text-slate-400 py-8 text-center">No active vulnerabilities recorded for this host asset.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, mono = false }) {
  return (
    <div className="flex justify-between py-1.5">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`text-slate-900 font-semibold truncate max-w-[200px] ${mono ? 'font-mono' : ''}`}>
        {value || '—'}
      </dd>
    </div>
  )
}
