import { useState } from 'react'
import { X, UploadCloud, PlusCircle, CheckCircle2, AlertCircle, FileText } from 'lucide-react'
import { api } from '../lib/api.js'

export default function AddInventoryModal({ isOpen, onClose, onSuccess }) {
  const [tab, setTab] = useState('upload') // 'upload' | 'manual'
  const [provider, setProvider] = useState('AWS')
  
  // File Upload State
  const [file, setFile] = useState(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [uploadError, setUploadError] = useState(null)

  // Manual Form State
  const [formData, setFormData] = useState({
    instance_name: '',
    account_or_subscription: '',
    account_id: '',
    private_ip: '',
    public_ip: '',
    instance_id: '',
    region: 'us-east-1',
    resource_group: '',
    os: 'Linux',
    status: 'Running',
    application_name: '',
    owner_name: '',
  })
  const [manualLoading, setManualLoading] = useState(false)
  const [manualResult, setManualResult] = useState(null)
  const [manualError, setManualError] = useState(null)

  if (!isOpen) return null

  async function handleFileUpload(e) {
    e.preventDefault()
    if (!file) return
    setUploadLoading(true)
    setUploadError(null)
    setUploadResult(null)
    try {
      const res = await api.uploadInventory(file, provider)
      setUploadResult(res)
      if (onSuccess) onSuccess()
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setUploadLoading(false)
    }
  }

  async function handleManualSubmit(e) {
    e.preventDefault()
    setManualLoading(true)
    setManualError(null)
    setManualResult(null)

    const rawAccount = formData.account_id
      ? `${formData.account_or_subscription || (provider === 'AWS' ? 'AWS-Account' : 'Azure-Sub')} (${formData.account_id})`
      : formData.account_or_subscription

    try {
      const res = await api.addManualCloudRecord({
        cloud_provider: provider,
        instance_name: formData.instance_name || undefined,
        account_or_subscription: rawAccount,
        private_ip: formData.private_ip || undefined,
        public_ip: formData.public_ip || undefined,
        instance_id: formData.instance_id || undefined,
        region: formData.region || undefined,
        resource_group: formData.resource_group || undefined,
        os: formData.os || 'Linux',
        status: formData.status || 'Running',
        application_name: formData.application_name || undefined,
        owner_name: formData.owner_name || undefined,
      })
      setManualResult(res)
      if (onSuccess) onSuccess()
    } catch (err) {
      setManualError(err.message)
    } finally {
      setManualLoading(false)
    }
  }

  function downloadSampleCsv() {
    const headers = provider === 'AWS'
      ? 'Instance Name,Account Name,Account ID,Private IP,Public IP,Instance ID,Region,OS,Status,Application,Owner\n'
      : 'VM Name,Subscription Name,Subscription ID,Resource Group,Private IP,Public IP,VM ID,Region,OS,Status,Application,Owner\n'
    const sampleRow = provider === 'AWS'
      ? 'prod-api-server-01,AWS-Prod-Core,112233445566,10.20.4.12,54.210.88.90,i-0a8b9c1d2e3f4g,us-east-1,Amazon Linux 2023,Running,Payment Gateway Core,Payments Engineering\n'
      : 'az-billing-vm-01,Azure-Corp-Production,sub-4a8f9b21-e304-4c19,rg-prod-fintech,10.40.2.15,20.120.45.67,/subscriptions/sub-4a8f9b21/resourceGroups/rg-prod-fintech/vms/az-billing-01,eastus,Ubuntu 22.04 LTS,Running,Enterprise Auth Service,Identity & Access Ops\n'
    
    const blob = new Blob([headers + sampleRow], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${provider.toLowerCase()}_inventory_template.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full bg-qred" />
          <h2 className="text-lg font-bold text-slate-900 font-display">Add Cloud Inventory</h2>
        </div>
        <p className="text-xs text-slate-500 mb-5">
          Ingest AWS or Azure inventory to correlate against Qualys assets and compare account &amp; subscription posture.
        </p>

        {/* Cloud Provider Toggle */}
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-5">
          {['AWS', 'AZURE'].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setProvider(p)
                setUploadResult(null)
                setManualResult(null)
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                provider === p
                  ? 'bg-white text-qred shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {p === 'AWS' ? 'Amazon Web Services (AWS)' : 'Microsoft Azure'}
            </button>
          ))}
        </div>

        {/* Tab Selection: Upload vs Manual */}
        <div className="flex border-b border-slate-200 mb-5 text-sm">
          <button
            onClick={() => setTab('upload')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 font-bold transition-colors ${
              tab === 'upload'
                ? 'border-qred text-qred'
                : 'border-transparent text-slate-500 hover:text-slate-850'
            }`}
          >
            <UploadCloud size={15} /> Upload CSV / Excel
          </button>
          <button
            onClick={() => setTab('manual')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 font-bold transition-colors ${
              tab === 'manual'
                ? 'border-qred text-qred'
                : 'border-transparent text-slate-500 hover:text-slate-850'
            }`}
          >
            <PlusCircle size={15} /> Manual Entry
          </button>
        </div>

        {tab === 'upload' && (
          <form onSubmit={handleFileUpload} className="space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Supports .csv, .xlsx, .xls</span>
              <button
                type="button"
                onClick={downloadSampleCsv}
                className="text-qred hover:underline flex items-center gap-1 font-mono font-bold"
              >
                <FileText size={12} /> Download Sample Template
              </button>
            </div>

            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 hover:border-qred py-10 px-4 rounded-2xl cursor-pointer bg-slate-50 transition-all">
              <UploadCloud size={32} className="text-qred/70" />
              <span className="text-sm font-semibold text-slate-800">
                {file ? file.name : 'Click to select CSV or XLSX export file'}
              </span>
              <span className="text-xs text-slate-500">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Auto-detects Account Name, Subscription, IP & Instance IDs'}
              </span>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => setFile(e.target.files[0])}
              />
            </label>

            {uploadError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {uploadResult && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-2 text-green-700 font-bold">
                  <CheckCircle2 size={16} /> File processed successfully
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-600 pt-2 border-t border-green-200">
                  <div>Rows Detected: <span className="text-slate-900 font-bold">{uploadResult.rows_detected}</span></div>
                  <div>Valid Instances: <span className="text-slate-900 font-bold">{uploadResult.valid}</span></div>
                  <div>Matched with Qualys: <span className="text-green-700 font-bold">{uploadResult.matched}</span></div>
                  <div>Unmatched (Shadow): <span className="text-orange-600 font-bold">{uploadResult.unmatched}</span></div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs text-slate-500 hover:text-slate-800 rounded-lg"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={!file || uploadLoading}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-qred text-white hover:bg-qred-hover disabled:opacity-50 transition-all shadow-red-pill"
              >
                {uploadLoading ? 'Processing...' : `Upload ${provider} Inventory`}
              </button>
            </div>
          </form>
        )}

        {tab === 'manual' && (
          <form onSubmit={handleManualSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  {provider === 'AWS' ? 'AWS Account Name' : 'Azure Subscription Name'} *
                </label>
                <input
                  required
                  type="text"
                  placeholder={provider === 'AWS' ? 'e.g. AWS-Prod-Core' : 'e.g. Azure-Corp-Production'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none focus:border-qred focus:bg-white"
                  value={formData.account_or_subscription}
                  onChange={(e) => setFormData({ ...formData, account_or_subscription: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  {provider === 'AWS' ? 'AWS Account ID' : 'Subscription ID'}
                </label>
                <input
                  type="text"
                  placeholder={provider === 'AWS' ? '12-digit ID e.g. 112233445566' : 'UUID e.g. sub-4a8f9b...'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none focus:border-qred focus:bg-white"
                  value={formData.account_id}
                  onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Host / Instance Name</label>
                <input
                  type="text"
                  placeholder={provider === 'AWS' ? 'e.g. ec2-api-prod-01' : 'e.g. vm-billing-01'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none focus:border-qred focus:bg-white"
                  value={formData.instance_name}
                  onChange={(e) => setFormData({ ...formData, instance_name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Private IP Address *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. 10.20.4.15"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none focus:border-qred focus:bg-white"
                  value={formData.private_ip}
                  onChange={(e) => setFormData({ ...formData, private_ip: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Public IP Address</label>
                <input
                  type="text"
                  placeholder="e.g. 54.210.88.90"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none focus:border-qred focus:bg-white"
                  value={formData.public_ip}
                  onChange={(e) => setFormData({ ...formData, public_ip: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Instance / Resource ID</label>
                <input
                  type="text"
                  placeholder={provider === 'AWS' ? 'i-0a1b2c3d4e5f' : '/subscriptions/.../vms/vm-01'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none focus:border-qred focus:bg-white"
                  value={formData.instance_id}
                  onChange={(e) => setFormData({ ...formData, instance_id: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Region</label>
                <input
                  type="text"
                  placeholder="e.g. us-east-1 / eastus"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none focus:border-qred focus:bg-white"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                />
              </div>

              {provider === 'AZURE' && (
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Resource Group</label>
                  <input
                    type="text"
                    placeholder="e.g. rg-prod-network"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none focus:border-qred focus:bg-white"
                    value={formData.resource_group}
                    onChange={(e) => setFormData({ ...formData, resource_group: e.target.value })}
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Application Name</label>
                <input
                  type="text"
                  placeholder="e.g. Payment Gateway Core"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none focus:border-qred focus:bg-white"
                  value={formData.application_name}
                  onChange={(e) => setFormData({ ...formData, application_name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Owner Team</label>
                <input
                  type="text"
                  placeholder="e.g. Payments Engineering"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none focus:border-qred focus:bg-white"
                  value={formData.owner_name}
                  onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                />
              </div>
            </div>

            {manualError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{manualError}</span>
              </div>
            )}

            {manualResult && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-xs flex items-center gap-2">
                <CheckCircle2 size={14} />
                <span>
                  Instance added! Match status with Qualys: <strong>{manualResult.match_status}</strong>
                  {manualResult.match_method ? ` via ${manualResult.match_method}` : ''}
                </span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs text-slate-500 hover:text-slate-800"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={manualLoading}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-qred text-white hover:bg-qred-hover disabled:opacity-50 transition-all shadow-red-pill"
              >
                {manualLoading ? 'Correlating...' : 'Save & Correlate Asset'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
