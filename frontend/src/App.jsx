import { useState, useEffect } from 'react'
import { Activity, Stethoscope, HeartPulse } from 'lucide-react'
import { LED } from './components/shared'
import IntakeHUD from './components/IntakeHUD'
import ClinicalOutputHUD from './components/ClinicalOutputHUD'
import DoctorPortal from './components/DoctorPortal'
import FeaturesPanel from './components/FeaturesPanel'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── Live network latency indicator ────────────────────────────────────────
function NetworkPulse() {
  const [online, setOnline]   = useState(true)
  const [latency, setLatency] = useState(null)

  useEffect(() => {
    const check = async () => {
      const t0 = performance.now()
      try {
        await fetch(`${API_BASE}/`, { cache: 'no-store' })
        setLatency(Math.round(performance.now() - t0))
        setOnline(true)
      } catch {
        setOnline(false)
        setLatency(null)
      }
    }
    check()
    const id = setInterval(check, 10000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex items-center gap-2">
      <LED color={online ? 'cyan' : 'coral'} pulse />
      <span className="text-[10px] font-mono text-slate-500 hidden sm:block">
        CareSetu Network ·{' '}
        {online
          ? <span style={{ color: '#00F5D4' }}>Online{latency != null ? ` (${latency}ms)` : ''}</span>
          : <span style={{ color: '#FF2E93' }}>Offline</span>
        }
      </span>
    </div>
  )
}

// ── Tab switcher ──────────────────────────────────────────────────────────
const TABS = [
  {
    id: 'health-worker',
    label: 'Health Worker View',
    shortLabel: 'Worker',
    icon: HeartPulse,
    accent: '#00F5D4',
  },
  {
    id: 'doctor',
    label: 'Doctor Queue Portal',
    shortLabel: 'Doctor',
    icon: Stethoscope,
    accent: '#818CF8',
  },
]

function TabSwitcher({ active, onChange, queueCount }) {
  return (
    <div
      className="flex rounded-xl p-1 gap-1"
      style={{
        background: 'rgba(10,15,29,0.85)',
        border: '1px solid rgba(42,54,79,0.8)',
      }}
    >
      {TABS.map(({ id, label, shortLabel, icon: Icon, accent }) => {
        const isActive = active === id
        const showBadge = id === 'doctor' && queueCount > 0
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className="relative flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all duration-200"
            style={
              isActive
                ? {
                    color: id === 'health-worker' ? '#0A0F1D' : '#FFFFFF',
                    background: id === 'health-worker'
                      ? 'linear-gradient(135deg, #00F5D4, #0EA5E9)'
                      : 'linear-gradient(135deg, #6366F1, #818CF8)',
                    boxShadow: `0 0 18px ${accent}40`,
                  }
                : {
                    color: '#64748B',
                    background: 'transparent',
                  }
            }
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = '#CBD5E1' }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = '#64748B' }}
          >
            <Icon size={13} />
            <span className="hidden md:block">{label}</span>
            <span className="md:hidden">{shortLabel}</span>

            {/* Queue count badge */}
            {showBadge && (
              <span
                className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-full"
                style={
                  isActive
                    ? { background: 'rgba(255,255,255,0.2)', color: '#FFFFFF' }
                    : { background: 'rgba(255,46,147,0.15)', color: '#FF2E93', border: '1px solid rgba(255,46,147,0.35)' }
                }
              >
                {queueCount}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ── Global navigation header ──────────────────────────────────────────────
function NavHeader({ activeTab, onTabChange, queueCount }) {
  return (
    <header
      className="h-[68px] flex items-center px-4 md:px-8 gap-4 sticky top-0 z-40"
      style={{
        background: 'rgba(13,20,36,0.94)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(42,54,79,0.7)',
        boxShadow: '0 4px 32px rgba(0,0,0,0.5)',
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg animate-[float_3s_ease-in-out_infinite] flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, rgba(0,245,212,0.15), rgba(14,165,233,0.10))',
            border: '1px solid rgba(0,245,212,0.35)',
            boxShadow: '0 0 18px rgba(0,245,212,0.22)',
          }}
        >
          ⚕
        </div>
        <div className="hidden sm:block">
          <p
            className="text-sm font-bold leading-tight tracking-tight"
            style={{ color: '#00F5D4', textShadow: '0 0 12px rgba(0,245,212,0.55)' }}
          >
            CareSetu AI
          </p>
          <p className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">
            Virtual Village Clinic
          </p>
        </div>
      </div>

      <div className="flex-1" />
      <NetworkPulse />
      <TabSwitcher active={activeTab} onChange={onTabChange} queueCount={queueCount} />
    </header>
  )
}

// ── Section label bar (below header, per portal) ──────────────────────────
function PortalBar({ tab, queueCount }) {
  const cfg = TABS.find(t => t.id === tab)
  if (!cfg) return null
  return (
    <div
      className="flex items-center gap-3 px-4 md:px-6 py-2.5 border-b"
      style={{ borderColor: 'rgba(42,54,79,0.5)', background: 'rgba(10,15,29,0.4)' }}
    >
      <div
        className="w-1.5 h-5 rounded-full flex-shrink-0"
        style={{ background: cfg.accent, boxShadow: `0 0 8px ${cfg.accent}` }}
      />
      <cfg.icon size={13} style={{ color: cfg.accent }} />
      <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-slate-500">
        {cfg.label}
      </span>
      {tab === 'doctor' && queueCount > 0 && (
        <span
          className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ml-1"
          style={{ background: 'rgba(255,46,147,0.10)', color: '#FF2E93', border: '1px solid rgba(255,46,147,0.30)' }}
        >
          {queueCount} in queue
        </span>
      )}
      <div className="ml-auto flex items-center gap-1.5">
        <LED color={tab === 'health-worker' ? 'cyan' : 'coral'} pulse />
        <span className="text-[9px] font-mono text-slate-700 uppercase tracking-widest">
          {tab === 'health-worker' ? 'Intake Active' : 'Reviewing Queue'}
        </span>
      </div>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState('health-worker')
  const [result, setResult]       = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [queueCount, setQueueCount] = useState(0)

  // Poll queue count every 15s for the doctor tab badge
  useEffect(() => {
    const poll = async () => {
      try {
        const res  = await fetch(`${API_BASE}/api/doctor/queue`)
        const data = await res.json()
        setQueueCount(Array.isArray(data) ? data.length : 0)
      } catch { /* silent */ }
    }
    poll()
    const id = setInterval(poll, 15000)
    return () => clearInterval(id)
  }, [])

  // ── Patient assessment ────────────────────────────────────────────────
  const handleAssess = async (formData) => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`${API_BASE}/api/assess-patient`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `Server error (${res.status})`)
      }
      const data = await res.json()
      setResult(data)
      setQueueCount(c => c + 1)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy-900 grid-dots font-sans">
      <NavHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        queueCount={queueCount}
      />

      <PortalBar tab={activeTab} queueCount={queueCount} />

      <main className="max-w-[1440px] mx-auto px-4 md:px-6 py-5">
        {/* Global error toast */}
        {error && (
          <div
            className="mb-5 flex items-start gap-3 rounded-xl border px-4 py-3"
            style={{ background: 'rgba(255,46,147,0.06)', borderColor: 'rgba(255,46,147,0.35)' }}
          >
            <Activity size={14} className="text-[#FF2E93] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-[#FF2E93] flex-1 leading-relaxed">{error}</p>
            <button
              className="text-slate-500 hover:text-slate-300 font-bold text-lg leading-none ml-2"
              onClick={() => setError(null)}
            >×</button>
          </div>
        )}

        {/* ── Health Worker View ── */}
        {activeTab === 'health-worker' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            {/* Left: Intake HUD */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <LED color="cyan" pulse />
                <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
                  Patient Intake HUD
                </span>
              </div>
              <IntakeHUD onSubmit={handleAssess} loading={loading} />
            </div>
            {/* Center: Clinical output */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <LED
                  color={
                    result
                      ? result.triage?.risk_level === 'CRITICAL' ? 'coral'
                      : result.triage?.risk_level === 'HIGH'     ? 'amber'
                      : 'green'
                      : 'amber'
                  }
                  pulse
                />
                <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
                  AI Clinical Output HUD
                </span>
              </div>
              <ClinicalOutputHUD result={result} loading={loading} />
            </div>
            {/* Right: Extended features */}
            <div>
              <FeaturesPanel
                patientId={result?.id}
                encounterId={result ? `enc_${result.id}` : null}
                ageYears={result?.age}
                chiefComplaint={result?.symptoms}
                aiSummary={result?.triage?.summary}
              />
            </div>
          </div>
        )}

        {/* ── Doctor Queue Portal ── */}
        {activeTab === 'doctor' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2">
              <DoctorPortal />
            </div>
            <div>
              <FeaturesPanel
                patientId={null}
                encounterId={null}
                ageYears={null}
                chiefComplaint={null}
                aiSummary={null}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
