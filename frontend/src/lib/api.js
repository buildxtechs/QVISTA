const BASE = '/api'

function qs(params = {}) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== 'undefined')
  )
  const str = new URLSearchParams(clean).toString()
  return str ? `?${str}` : ''
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const data = await res.json()
      detail = data.detail || detail
    } catch (_) {}
    throw new Error(detail)
  }
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) return res.json()
  return res.blob()
}

export const api = {
  health: () => request('/health'),

  // Qualys Connections (Full CRUD & Multi-profile)
  getConnection: () => request('/qualys/connection'),
  listConnections: () => request('/qualys/connections'),
  saveConnection: (payload) => request('/qualys/connection', { method: 'POST', body: JSON.stringify(payload) }),
  createConnection: (payload) => request('/qualys/connections', { method: 'POST', body: JSON.stringify(payload) }),
  updateConnection: (id, payload) => request(`/qualys/connections/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteConnection: (id) => request(`/qualys/connections/${id}`, { method: 'DELETE' }),
  setActiveConnection: (id) => request(`/qualys/connections/${id}/set-active`, { method: 'POST' }),
  testConnectionId: (id) => request(`/qualys/connections/${id}/test`, { method: 'POST' }),
  testConnection: () => request('/qualys/connection/test', { method: 'POST' }),
  triggerSync: () => request('/qualys/sync', { method: 'POST' }),
  syncHistory: () => request('/qualys/sync/history'),
  syncStatus: (id) => request(`/qualys/sync/${id}`),

  // CMDB / APM
  uploadCmdb: (file) => {
    const form = new FormData()
    form.append('file', file)
    return request('/cmdb/upload', { method: 'POST', body: form })
  },
  listApms: (params = {}) => request(`/cmdb/apms${qs(params)}`),
  apmDetail: (apmId) => request(`/cmdb/apms/${encodeURIComponent(apmId)}`),

  // Dashboard
  dashboardSummary: (params = {}) => request(`/dashboard/summary${qs(params)}`),
  dashboardAging: (params = {}) => request(`/dashboard/aging${qs(params)}`),
  dashboardTrend: () => request('/dashboard/trend'),
  topApplications: () => request('/dashboard/top-vulnerable-applications'),
  topCriticalQids: () => request('/dashboard/top-critical-qids'),

  // Assets
  listAssets: (params = {}) => request(`/assets${qs(params)}`),
  assetDetail: (id) => request(`/assets/${id}`),
  cloudMatchSummary: () => request('/assets/summary/cloud-match'),
  compareAgentsByIp: () => request('/assets/comparison/ip-agents'),
  cloudAgentsOverview: (params = {}) => request(`/assets/cloud-agents/overview${qs(params)}`),

  // Vulnerabilities
  listVulnerabilities: (params = {}) => request(`/vulnerabilities${qs(params)}`),
  listDetectionsGrid: (params = {}) => request(`/vulnerabilities/detections-grid${qs(params)}`),
  vulnerabilityDetail: (qid) => request(`/vulnerabilities/${qid}`),
  reopenedSummary: () => request('/vulnerabilities/reopened/summary'),

  // Applications
  listApplications: () => request('/applications'),
  applicationDetail: (id) => request(`/applications/${id}`),

  // Upload
  uploadInventory: (file, cloudProvider) => {
    const form = new FormData()
    form.append('file', file)
    form.append('cloud_provider', cloudProvider)
    return request('/upload/cloud-inventory', { method: 'POST', body: form })
  },
  rematch: () => request('/upload/rematch', { method: 'POST' }),
  matchPostScan: () => request('/upload/rematch', { method: 'POST' }),
  uploadHistory: () => request('/upload/history'),

  // Cloud Comparison & Multi-Account Breakdown
  cloudComparison: () => request('/cloud/comparison'),
  cloudMatrix: (params = {}) => request(`/cloud/matrix${qs(params)}`),
  // Exceptions & Risk Acceptance CRUD
  listExceptions: (params = {}) => request(`/exceptions${qs(params)}`),
  createException: (payload) => request('/exceptions', { method: 'POST', body: JSON.stringify(payload) }),
  updateException: (id, payload) => request(`/exceptions/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteException: (id) => request(`/exceptions/${id}`, { method: 'DELETE' }),

  // SLA Governance & Remediation Intelligence
  slaGovernance: (params = {}) => request(`/sla/governance-overview${qs(params)}`),
  getSlaRules: () => request('/sla/rules'),
  updateSlaRules: (rules) => request('/sla/rules', { method: 'PUT', body: JSON.stringify(rules) }),

  // Seed & Demo Data
  seedDemoData: () => request('/seed/demo-data', { method: 'POST' }),
  resetData: () => request('/seed/reset', { method: 'POST' }),

  // AI Gemini Agent & Copilot
  askAi: (prompt, context = {}) => request('/ai/chat', { method: 'POST', body: JSON.stringify({ prompt, context }) }),
  getWelcomeNote: (user = 'IVM Team') => request(`/ai/welcome-note?user=${encodeURIComponent(user)}`),

  // Reports Exporters (IASP, Power BI, Legacy)
  iaspExportUrl: (params = {}) => `${BASE}/reports/export/iasp.xlsx${qs(params)}`,
  powerBiExportUrl: (params = {}) => `${BASE}/reports/export/powerbi.xlsx${qs(params)}`,
  reportUrl: (name) => `${BASE}/reports/${name}`,
}
