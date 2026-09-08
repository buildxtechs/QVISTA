import { useState, useRef, useEffect } from 'react'
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  Shield,
  Zap,
  HelpCircle,
  CheckCircle2,
  Copy,
  Check,
  Flame,
  ArrowRight,
} from 'lucide-react'
import { api } from '../lib/api.js'

export default function GeminiCopilotModal({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Hello! I am your QVISTA AI Security Copilot powered by Google Gemini. Ask me any doubts about vulnerability remediation, Qualys QIDs, TruRisk, CVE prioritization, or cloud asset posture.",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState(null)
  const chatEndRef = useRef(null)

  const SUGGESTED_QUERIES = [
    "How to patch OpenSSH RegreSSHion (CVE-2024-6387)?",
    "What is the difference between Qualys TruRisk and CVSS v3 score?",
    "Explain how 5-digit Correlation IDs link AWS/Azure assets with CMDB APMs",
    "How do I prioritize 36,000+ SLA breached vulnerabilities?",
  ]

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  if (!isOpen) return null

  async function handleSend(textToSend) {
    const promptText = (textToSend || input).trim()
    if (!promptText || loading) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text: promptText }])
    setLoading(true)

    try {
      const res = await api.askAi(promptText)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: res.reply || 'Response received from Gemini.',
          model: res.model,
        },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `Error connecting to Gemini Copilot: ${err.message}`,
          isError: true,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text, idx) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(idx)
    setTimeout(() => setCopiedIndex(null), 1800)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-[#12111A] border border-[#2B293E] rounded-3xl w-full max-w-2xl h-[650px] flex flex-col shadow-2xl overflow-hidden relative text-white">
        {/* Header matching Fortify360 aesthetic */}
        <div className="px-6 py-4 border-b border-[#232035] bg-[#171523] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-sm tracking-wide text-white">
                  QVISTA AI Copilot
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Google Gemini Live
                </span>
              </div>
              <p className="text-[10px] font-mono text-[#8E8B9E] mt-0.5">
                Vulnerability Remediation &amp; Doubts Resolution Agent
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#232035] hover:bg-[#2F2B47] text-[#8E8B9E] hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-[#1F1C2E] border border-[#2F2B47] text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={16} />
                </div>
              )}

              <div
                className={`max-w-[82%] rounded-2xl p-4 text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-none shadow-md'
                    : m.isError
                    ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-bl-none'
                    : 'bg-[#181625] border border-[#27233D] text-[#D2CFE0] rounded-bl-none shadow-inner'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.text}</div>

                {m.role === 'assistant' && !m.isError && (
                  <div className="mt-2.5 pt-2 border-t border-[#232035] flex items-center justify-between text-[10px] text-[#8E8B9E]">
                    <span className="font-mono">Gemini 2.5 Flash</span>
                    <button
                      onClick={() => copyToClipboard(m.text, i)}
                      className="flex items-center gap-1 hover:text-white transition-colors"
                    >
                      {copiedIndex === i ? (
                        <>
                          <Check size={11} className="text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={11} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {m.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <User size={16} />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 items-center">
              <div className="w-8 h-8 rounded-lg bg-[#1F1C2E] border border-[#2F2B47] text-purple-400 flex items-center justify-center shrink-0 animate-pulse">
                <Sparkles size={16} />
              </div>
              <div className="bg-[#181625] border border-[#27233D] text-xs text-[#8E8B9E] px-4 py-3 rounded-2xl rounded-bl-none flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce [animation-delay:0.4s]" />
                <span className="ml-1 font-mono">Gemini Agent analyzing vulnerability context...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Suggested Queries Chips */}
        {messages.length <= 2 && (
          <div className="px-6 pb-2">
            <div className="text-[10px] uppercase font-mono font-bold text-[#8E8B9E] mb-2 flex items-center gap-1">
              <HelpCircle size={11} /> Suggested Doubts &amp; Queries
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_QUERIES.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  className="px-2.5 py-1 rounded-lg bg-[#1E1B2D] hover:bg-[#2A263E] border border-[#2E2A44] text-[#B7B3C9] text-[11px] text-left transition-all flex items-center gap-1.5 hover:border-purple-500/50"
                >
                  <ArrowRight size={10} className="text-purple-400" />
                  <span>{q}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-4 border-t border-[#232035] bg-[#171523]">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex items-center gap-2 bg-[#12111A] border border-[#2E2A44] focus-within:border-purple-500 rounded-2xl px-4 py-2 shadow-inner"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask any doubt regarding Qualys QIDs, CVEs, remediation commands, TruRisk..."
              className="bg-transparent outline-none text-white text-xs w-full placeholder:text-[#646175]"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white disabled:opacity-30 hover:opacity-90 transition-opacity"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
