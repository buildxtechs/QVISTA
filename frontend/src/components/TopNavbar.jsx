import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Bell, Settings, Shield, X, Server, Bug, Sparkles } from 'lucide-react'
import GeminiCopilotModal from './GeminiCopilotModal.jsx'

export default function TopNavbar({ title = 'Executive Overview', subtitle = 'QUALYS THREAT & CLOUD POSTURE' }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [isCopilotOpen, setIsCopilotOpen] = useState(false)
  const navigate = useNavigate()

  const notifications = [
    {
      id: 1,
      title: 'SLA Breach Warning',
      text: '14 Critical findings on Payment Gateway Core exceeded the 14-day SLA limit.',
      time: '12m ago',
      type: 'critical',
    },
    {
      id: 2,
      title: 'Cloud Inventory Auto-Correlated',
      text: 'AWS-Prod-Core inventory matched 33 EC2 instances with Qualys assets.',
      time: '35m ago',
      type: 'success',
    },
    {
      id: 3,
      title: 'New High Severity Vulnerability',
      text: 'CVE-2024-6387 (regreSSHion) detected on 8 internet-facing servers.',
      time: '2h ago',
      type: 'high',
    },
  ]

  function handleSearchSubmit(e) {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/assets?search=${encodeURIComponent(searchQuery.trim())}`)
      setIsSearching(false)
    }
  }

  return (
    <header className="px-8 py-3.5 border-b border-slate-200 bg-white sticky top-0 z-30 flex items-center justify-between gap-4 shadow-sm">
      {/* Page Title & Section Tag */}
      <div>
        <div className="text-[10px] uppercase font-bold tracking-widest text-qblue font-mono mb-0.5 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-qred animate-pulse" />
          {subtitle}
        </div>
        <h1 className="text-xl font-extrabold text-slate-900 font-display tracking-tight">
          {title}
        </h1>
      </div>

      {/* Center / Right Section */}
      <div className="flex items-center gap-4">
        {/* Global Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-72 sm:w-80">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-50 border border-slate-200 hover:border-blue-400 focus-within:border-qblue focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <Search size={14} className="text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search assets, QIDs, APMs, correlation IDs..."
              className="bg-transparent text-xs text-slate-800 placeholder:text-slate-400 outline-none w-full font-sans"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setIsSearching(Boolean(e.target.value))
              }}
              onFocus={() => setIsSearching(Boolean(searchQuery))}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setIsSearching(false)
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Quick Search Dropdown */}
          {isSearching && searchQuery.length > 1 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl p-2 text-xs z-50 animate-fadeIn">
              <div className="text-[10px] uppercase text-slate-400 px-2 py-1 font-semibold">Quick Jump</div>
              <button
                type="button"
                onClick={() => {
                  navigate(`/assets?search=${encodeURIComponent(searchQuery)}`)
                  setIsSearching(false)
                }}
                className="w-full text-left px-2.5 py-1.5 hover:bg-red-50 rounded-lg text-slate-700 hover:text-qred flex items-center gap-2 font-medium"
              >
                <Server size={13} className="text-qred" />
                <span>Search Assets for &ldquo;<strong>{searchQuery}</strong>&rdquo;</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  navigate(`/vulnerabilities?search=${encodeURIComponent(searchQuery)}`)
                  setIsSearching(false)
                }}
                className="w-full text-left px-2.5 py-1.5 hover:bg-red-50 rounded-lg text-slate-700 hover:text-qred flex items-center gap-2 font-medium"
              >
                <Bug size={13} className="text-qred" />
                <span>Search Vulnerabilities for &ldquo;<strong>{searchQuery}</strong>&rdquo;</span>
              </button>
            </div>
          )}
        </form>

        {/* AI Copilot Quick Trigger */}
        <button
          onClick={() => setIsCopilotOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold hover:opacity-95 shadow-sm transition-opacity"
        >
          <Sparkles size={13} className="text-yellow-300" />
          <span className="hidden sm:inline">AI Copilot</span>
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 relative transition-colors shadow-sm"
            aria-label="Notifications"
          >
            <Bell size={16} />
            <span className="w-2 h-2 rounded-full bg-qred absolute top-1.5 right-1.5 ring-2 ring-white" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-50 text-xs animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Shield size={14} className="text-qred" /> Security Alerts
                </span>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {notifications.map((n) => (
                  <div key={n.id} className="p-2.5 rounded-lg bg-slate-50 hover:bg-red-50/50 border border-slate-100 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-bold ${n.type === 'critical' ? 'text-qred' : n.type === 'high' ? 'text-orange-600' : 'text-green-600'}`}>
                        {n.title}
                      </span>
                      <span className="text-[10px] text-slate-400">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{n.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Settings Button */}
        <Link
          to="/settings"
          className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 transition-colors shadow-sm"
          aria-label="Settings"
        >
          <Settings size={16} />
        </Link>
      </div>

      <GeminiCopilotModal
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
      />
    </header>
  )
}
