import { useState, useEffect, useCallback } from 'react'
import {
  RefreshCw, Video, CheckCheck, AlertOctagon, Edit3,
  Thermometer, Activity, Heart, Wind, FileText, User,
} from 'lucide-react'
import { API_BASE, RiskBadge, LED, GlassPanel, SectionHead, RISK_CONFIG } from './shared'

// ── Vitals telemetry strip (read-only display) ────────────────────────────
function TelemetryStrip({ vitals }) {
  const cards = [
    { key: 'temperature', label: 'Temp',  unit: '°F',  icon: Thermometer, warn: v => v > 103 || v < 96 },
    { key: 'spo2',        label: 'SpO₂',  unit: '%',   icon: Wind,         warn: v => v < 92 },
    { key: 'bp_systolic', label: 'SYS BP', unit: 'mmHg', icon: Activity,   warn: v => v > 180 || v < 80 },
    { key: 'pulse',       label: 'Pulse',  unit: 'bpm', icon: Heart,        warn: v => v > 140 || v < 40 },
  ]
  return (
    <div className="grid grid-cols-4 gap-2">
      {cards.map(({ key, label, unit, icon: Icon, warn }) => {
        const val     = vitals?.[key]
        const isWarn  = val && warn(parseFloat(val))
        const color   = isWarn ? '#FF2E93' : '#00F5D4'
        return (
          <div key={key} className="glass-card-sm p-3 text-center"
            style={{ borderColor: `${color}40`, boxShadow: `0 0 10px ${color}18` }}>
            <Icon size={12} style={{ color }} className="mx-auto mb-1" />
            <p className="font-mono text-lg font-bold leading-tight" style={{ color, textShadow: `0 0 8px ${color}80` }}>
              {val || '—'}
            </p>
            <p className="text-[8px] text-slate-500 font-mono">{unit}</p>
            <p className="text-[8px] text-slate-600 uppercase tracking-widest mt-0.5">{label}</p>
          </div>
        )
      })}
    </div>
  )
}

// ── Patient queue card ─────────────────────────────────────────────────────
function QueueCard({ patient, selected, onSelect }) {
  const cfg   = RISK_CONFIG[patient.triage?.risk_level] ?? RISK_CONFIG.LOW
  const isApproved = patient.status === 'Approved & Protocol Finalized'
  return (
    <button
      type="button"
      onClick={() => onSelect(patient)}
      className={`w-full text-left px-3.5 py-3 rounded-xl border transition-all duration-200 ${
        selected
          ? 'bg-[#00F5D4]/8 border-[#00F5D4]/50 shadow-glow-cyan'
          : 'bg-navy-700/50 border-navy-400/30 hover:border-navy-300/50 hover:bg-navy-600/40'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse"
            style={{ background: cfg.color, boxShadow: `0 0 5px ${cfg.color}` }}
          />
          <span className="text-xs font-semibold text-slate-200 truncate">{patient.name}</span>
        </div>
        <RiskBadge level={patient.triage?.risk_level} />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-slate-500">{patient.age}y · {patient.gender}</p>
        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
          isApproved
            ? 'text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/30'
            : 'text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/30'
        }`}>
          {isApproved ? '✓ Approved' : '⏳ Review'}
        </span>
      </div>
      <p className="text-[10px] text-slate-600 mt-1.5 line-clamp-1">{patient.symptoms}</p>
    </button>
  )
}

// ── Medical command pane ───────────────────────────────────────────────────
function CommandPane({ patient, onApprove, approving }) {
  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[500px] gap-4 text-center">
        <div className="text-5xl animate-float">🏥</div>
        <p className="text-slate-500 text-sm font-medium">Select a patient from the queue</p>
        <p className="text-slate-600 text-xs">to open the Medical Command Pane</p>
      </div>
    )
  }

  const { triage, vitals, ocr_notes, name, age, gender, language, symptoms, id, status } = patient
  const isApproved = status === 'Approved & Protocol Finalized'

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1">
      {/* Patient header */}
      <GlassPanel>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00F5D4]/10 border border-[#00F5D4]/30 flex items-center justify-center">
              <User size={16} className="text-[#00F5D4]" />
            </div>
            <div>
              <p className="font-bold text-slate-100 text-base">{name}</p>
              <p className="text-xs text-slate-500">{age}y · {gender} · {language} · ID #{id}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <RiskBadge level={triage?.risk_level} size="lg" />
            {/* Teleconsult button */}
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(0,245,212,0.08))',
                borderColor: 'rgba(99,102,241,0.5)',
                color: '#818CF8',
                boxShadow: '0 0 12px rgba(99,102,241,0.2)',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 20px rgba(99,102,241,0.4)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 12px rgba(99,102,241,0.2)' }}
            >
              <Video size={13} />
              Launch Teleconsult
            </button>
          </div>
        </div>
      </GlassPanel>

      {/* Vitals strip */}
      <div>
        <SectionHead icon={Activity} label="Vitals Telemetry" color="#00F5D4" />
        <TelemetryStrip vitals={vitals} />
      </div>

      {/* Summary + OCR dual-view */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* AI Diagnostic Summary */}
        <GlassPanel className="glow-border-left-cyan">
          <SectionHead icon={null} label="AI Diagnostic Summary" color="#00F5D4" />
          <p className="text-sm text-slate-300 leading-relaxed mb-3">{triage?.summary}</p>
          {triage?.vitals_concern && triage.vitals_concern !== 'None' && (
            <div className="bg-[#F59E0B]/5 border border-[#F59E0B]/25 rounded-lg px-3 py-2 text-xs text-[#F59E0B]">
              ⚠ {triage.vitals_concern}
            </div>
          )}
          {/* First aid condensed */}
          {triage?.first_aid_instructions?.length > 0 && (
            <div className="mt-3">
              <p className="text-[9px] text-slate-600 font-mono uppercase tracking-widest mb-2">First-Aid Protocol</p>
              <ul className="space-y-1.5">
                {triage.first_aid_instructions.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                    <span className="text-[#10B981] font-bold mt-0.5">›</span>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </GlassPanel>

        {/* OCR + Image viewer */}
        <GlassPanel className="glow-border-left-cyan">
          <SectionHead icon={FileText} label="Prescription OCR / Image" color="#6366F1" />
          {ocr_notes && !ocr_notes.startsWith('[OCR unavailable') ? (
            <pre className="text-xs text-slate-400 font-mono leading-relaxed whitespace-pre-wrap bg-navy-800/50 rounded-lg p-3 border border-navy-400/30 max-h-40 overflow-y-auto">
              {ocr_notes}
            </pre>
          ) : (
            <p className="text-xs text-slate-600 italic">No OCR data available for this patient.</p>
          )}
          {/* Patient symptoms */}
          <div className="mt-3">
            <p className="text-[9px] text-slate-600 font-mono uppercase tracking-widest mb-1.5">Chief Complaint</p>
            <p className="text-xs text-slate-400 leading-relaxed">{symptoms}</p>
          </div>
        </GlassPanel>
      </div>

      {/* OTC recommendations */}
      {triage?.otc_recommendations?.length > 0 && (
        <GlassPanel>
          <SectionHead icon={null} label="OTC Recommendations" color="#00F5D4" />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
            {triage.otc_recommendations.map((r, i) => (
              <div key={i} className="glass-card-sm p-3">
                <p className="text-xs font-semibold text-slate-200 mb-0.5">{r.medicine}</p>
                <p className="text-[10px] text-slate-500">{r.dosage}</p>
                {r.warning && <p className="text-[10px] text-[#FF2E93] mt-1.5">⚠ {r.warning}</p>}
              </div>
            ))}
          </div>
        </GlassPanel>
      )}

      {/* Action footer bar */}
      <div
        className="glass-card p-4 flex items-center gap-3 flex-wrap sticky bottom-0"
        style={{ background: 'rgba(13,20,36,0.95)' }}
      >
        {/* Approve */}
        <button
          type="button"
          onClick={() => onApprove(id)}
          disabled={approving || isApproved}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border font-bold text-xs uppercase tracking-widest transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style={isApproved
            ? { background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.4)', color: '#10B981' }
            : { background: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.5)', color: '#10B981', boxShadow: '0 0 14px rgba(16,185,129,0.2)' }
          }
        >
          <CheckCheck size={13} />
          {isApproved ? 'Protocol Approved' : approving ? 'Approving…' : 'Approve AI Protocol'}
        </button>

        {/* Override */}
        <button
          type="button"
          className="flex items-center gap-2 py-2.5 px-4 rounded-xl border font-bold text-xs uppercase tracking-widest transition-all duration-200 hover:bg-[#F59E0B]/10"
          style={{ borderColor: 'rgba(245,158,11,0.4)', color: '#F59E0B' }}
        >
          <Edit3 size={13} />
          Override
        </button>

        {/* Emergency Transfer */}
        <button
          type="button"
          className="flex items-center gap-2 py-2.5 px-4 rounded-xl border font-bold text-xs uppercase tracking-widest transition-all duration-200 hover:bg-[#FF2E93]/10"
          style={{ borderColor: 'rgba(255,46,147,0.4)', color: '#FF2E93' }}
        >
          <AlertOctagon size={13} />
          Emergency Transfer
        </button>
      </div>
    </div>
  )
}

// ── Main Doctor Command Center export ────────────────────────────────────
const RISK_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

export default function DoctorCommandCenter() {
  const [queue, setQueue]           = useState([])
  const [selected, setSelected]     = useState(null)
  const [loading, setLoading]       = useState(false)
  const [approving, setApproving]   = useState(false)
  const [lastRefresh, setLastRefresh] = useState(null)

  const fetchQueue = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`${API_BASE}/api/doctor/queue`)
      const data = await res.json()
      const sorted = [...data].sort(
        (a, b) => (RISK_ORDER[a.triage?.risk_level] ?? 99) - (RISK_ORDER[b.triage?.risk_level] ?? 99)
      )
      setQueue(sorted)
      setLastRefresh(new Date())
      // keep selected in sync
      if (selected) {
        const updated = sorted.find(p => p.id === selected.id)
        if (updated) setSelected(updated)
      }
    } catch { /* silent fail */ } finally {
      setLoading(false)
    }
  }, [selected])

  useEffect(() => { fetchQueue() }, [])

  const handleApprove = async (patientId) => {
    setApproving(true)
    try {
      await fetch(`${API_BASE}/api/doctor/approve/${patientId}`, { method: 'POST' })
      await fetchQueue()
    } catch { /* silent */ } finally {
      setApproving(false)
    }
  }

  const criticalCount = queue.filter(p => p.triage?.risk_level === 'CRITICAL').length
  const pendingCount  = queue.filter(p => p.status !== 'Approved & Protocol Finalized').length

  return (
    <div className="flex gap-4 h-[calc(100vh-88px)] overflow-hidden">
      {/* ── Sidebar queue ── */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-3">
        {/* Queue header */}
        <GlassPanel className="flex items-center justify-between py-3">
          <div>
            <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Priority Stream</p>
            <p className="text-sm font-bold text-slate-200 mt-0.5">{queue.length} Patients</p>
          </div>
          <div className="flex items-center gap-3">
            {criticalCount > 0 && (
              <span className="text-xs font-mono font-bold text-[#FF2E93] bg-[#FF2E93]/10 border border-[#FF2E93]/30 px-2 py-0.5 rounded animate-pulse">
                {criticalCount} CRIT
              </span>
            )}
            <button
              type="button" onClick={fetchQueue}
              className="p-1.5 rounded-lg border border-navy-400/40 hover:border-[#00F5D4]/40 transition-colors"
            >
              <RefreshCw size={12} className={`text-slate-500 hover:text-[#00F5D4] ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </GlassPanel>

        {/* Stats bar */}
        <div className="grid grid-cols-2 gap-2">
          <div className="glass-card-sm p-2.5 text-center">
            <p className="font-mono text-xl font-bold text-[#FF2E93]">{criticalCount}</p>
            <p className="text-[8px] text-slate-600 uppercase tracking-widest">Critical</p>
          </div>
          <div className="glass-card-sm p-2.5 text-center">
            <p className="font-mono text-xl font-bold text-[#F59E0B]">{pendingCount}</p>
            <p className="text-[8px] text-slate-600 uppercase tracking-widest">Pending</p>
          </div>
        </div>

        {/* Patient list */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-0.5">
          {queue.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-600 text-xs font-mono">NO PATIENTS IN QUEUE</p>
              <LED color="cyan" pulse className="mx-auto mt-3" />
            </div>
          ) : (
            queue.map(p => (
              <QueueCard
                key={p.id}
                patient={p}
                selected={selected?.id === p.id}
                onSelect={setSelected}
              />
            ))
          )}
        </div>

        {lastRefresh && (
          <p className="text-[8px] font-mono text-slate-700 text-center">
            LAST SYNC {lastRefresh.toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* ── Command pane ── */}
      <div className="flex-1 overflow-y-auto">
        <CommandPane patient={selected} onApprove={handleApprove} approving={approving} />
      </div>
    </div>
  )
}
