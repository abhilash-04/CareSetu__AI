import { useState, useEffect, useCallback, useRef } from 'react'
import {
  RefreshCw,
  Video,
  VideoOff,
  CheckCheck,
  AlertOctagon,
  Edit3,
  Thermometer,
  Activity,
  Heart,
  Wind,
  FileText,
  User,
  Clock,
  ChevronRight,
  X,
  AlertTriangle,
  Stethoscope,
  ClipboardList,
  Pill,
  Phone,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const RISK_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

const RISK_META = {
  CRITICAL: { color: '#FF2E93', bg: 'rgba(255,46,147,0.10)', border: 'rgba(255,46,147,0.40)', label: 'CRITICAL', dot: '#FF2E93' },
  HIGH:     { color: '#F59E0B', bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.40)',  label: 'HIGH',     dot: '#F59E0B' },
  MEDIUM:   { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.35)',  label: 'MEDIUM',   dot: '#F59E0B' },
  LOW:      { color: '#10B981', bg: 'rgba(16,185,129,0.10)',  border: 'rgba(16,185,129,0.40)',  label: 'LOW',      dot: '#10B981' },
}

const VITALS_CONFIG = [
  {
    key: 'spo2',
    label: 'SpO₂',
    unit: '%',
    icon: Wind,
    isCritical: v => parseFloat(v) < 92,
    isWarning:  v => parseFloat(v) < 95,
  },
  {
    key: 'temperature',
    label: 'Temp',
    unit: '°F',
    icon: Thermometer,
    isCritical: v => parseFloat(v) > 103,
    isWarning:  v => parseFloat(v) > 100.4,
  },
  {
    key: 'bp_systolic',
    label: 'Sys BP',
    unit: 'mmHg',
    icon: Activity,
    isCritical: v => parseFloat(v) > 180 || parseFloat(v) < 80,
    isWarning:  v => parseFloat(v) > 140 || parseFloat(v) < 90,
  },
  {
    key: 'pulse',
    label: 'Pulse',
    unit: 'bpm',
    icon: Heart,
    isCritical: v => parseFloat(v) > 140 || parseFloat(v) < 40,
    isWarning:  v => parseFloat(v) > 100 || parseFloat(v) < 55,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Tiny shared primitives
// ─────────────────────────────────────────────────────────────────────────────

function RiskTag({ level }) {
  const m = RISK_META[level] ?? RISK_META.LOW
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2.5 py-1 rounded-md uppercase tracking-wider flex-shrink-0"
      style={{ color: m.color, background: m.bg, border: `1px solid ${m.border}` }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full animate-pulse"
        style={{ background: m.dot, boxShadow: `0 0 5px ${m.dot}` }}
      />
      {m.label}
    </span>
  )
}

function StatusPill({ approved }) {
  return approved ? (
    <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981]">
      <CheckCheck size={9} /> Approved
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B]">
      <Clock size={9} /> Awaiting Review
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Vitals Grid — 2×2 cards
// ─────────────────────────────────────────────────────────────────────────────

function VitalCard({ config, value }) {
  const { label, unit, icon: Icon, isCritical, isWarning } = config
  const crit = value && isCritical(value)
  const warn = value && !crit && isWarning(value)
  const color = crit ? '#FF2E93' : warn ? '#F59E0B' : '#00F5D4'
  const statusLabel = crit ? 'CRITICAL' : warn ? 'WARN' : 'NORMAL'

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2 border transition-all duration-300"
      style={{
        background: `${color}08`,
        borderColor: `${color}35`,
        boxShadow: `0 0 14px ${color}18`,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon size={12} style={{ color }} />
          <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">{label}</span>
        </div>
        <span
          className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded"
          style={{ color, background: `${color}18`, border: `1px solid ${color}35` }}
        >
          {statusLabel}
        </span>
      </div>
      <div className="flex items-end gap-1.5">
        <span
          className="font-mono text-2xl font-bold leading-none"
          style={{ color, textShadow: `0 0 10px ${color}70` }}
        >
          {value ?? '—'}
        </span>
        <span className="text-xs text-slate-500 mb-0.5">{unit}</span>
      </div>
    </div>
  )
}

function VitalsGrid({ vitals }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {VITALS_CONFIG.map(cfg => (
        <VitalCard key={cfg.key} config={cfg} value={vitals?.[cfg.key]} />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Teleconsult modal — Daily.co iframe embed
// ─────────────────────────────────────────────────────────────────────────────

function TeleconsultModal({ patient, onClose }) {
  const iframeRef  = useRef(null)

  // Generate a stable room name from patient id so re-opening rejoins same room
  const roomName = `caresetu-patient-${patient.id}-${patient.name.toLowerCase().replace(/\s+/g, '-')}`
  // Demo Daily.co public room — in production replace with dynamically created room URL from Daily REST API
  const roomUrl  = `https://caresetu.daily.co/${roomName}`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10,15,29,0.92)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-4xl flex flex-col rounded-2xl overflow-hidden border"
        style={{
          background: '#0D1424',
          borderColor: 'rgba(0,245,212,0.3)',
          boxShadow: '0 0 60px rgba(0,245,212,0.15), 0 24px 80px rgba(0,0,0,0.7)',
          maxHeight: '90vh',
        }}
      >
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-5 py-3.5 border-b"
          style={{ borderColor: 'rgba(42,54,79,0.8)', background: 'rgba(13,20,36,0.95)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)' }}
            >
              <Video size={14} style={{ color: '#818CF8' }} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-100">Encrypted Teleconsult</p>
              <p className="text-[10px] text-slate-500 font-mono">
                Patient: {patient.name} · ID #{patient.id} · <span style={{ color: '#00F5D4' }}>{patient.triage?.risk_level}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Live indicator */}
            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
              <span className="w-2 h-2 rounded-full bg-[#FF2E93] animate-pulse" style={{ boxShadow: '0 0 6px #FF2E93' }} />
              LIVE SESSION
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-slate-700/60 hover:border-[#FF2E93]/50 hover:bg-[#FF2E93]/5 transition-all"
            >
              <X size={14} className="text-slate-400 hover:text-[#FF2E93]" />
            </button>
          </div>
        </div>

        {/* Patient quick-stats bar */}
        <div
          className="flex items-center gap-4 px-5 py-2.5 border-b text-[10px] font-mono flex-wrap"
          style={{ borderColor: 'rgba(42,54,79,0.5)', background: 'rgba(26,37,64,0.4)' }}
        >
          {[
            { label: 'SpO₂', val: patient.vitals?.spo2, unit: '%', warn: v => v < 92 },
            { label: 'Temp',  val: patient.vitals?.temperature, unit: '°F', warn: v => v > 103 },
            { label: 'BP',    val: patient.vitals?.bp_systolic ? `${patient.vitals.bp_systolic}/${patient.vitals.bp_diastolic}` : null, unit: 'mmHg', warn: () => false },
            { label: 'Pulse', val: patient.vitals?.pulse, unit: 'bpm', warn: v => v > 140 || v < 40 },
          ].map(({ label, val, unit, warn }) => {
            const isWarn = val && warn(parseFloat(val))
            return (
              <span key={label} className="flex items-center gap-1">
                <span className="text-slate-600">{label}</span>
                <span
                  className="font-bold"
                  style={{ color: isWarn ? '#FF2E93' : '#00F5D4' }}
                >
                  {val ?? '—'} {unit}
                </span>
              </span>
            )
          })}
          <span className="ml-auto text-slate-600">
            Room: <span style={{ color: '#6366F1' }}>{roomName}</span>
          </span>
        </div>

        {/* Video iframe */}
        <div className="relative flex-1" style={{ minHeight: '480px' }}>
          {/* Neon corner brackets */}
          {['top-2 left-2', 'top-2 right-2', 'bottom-2 left-2', 'bottom-2 right-2'].map((pos, i) => (
            <div key={i} className={`absolute ${pos} w-4 h-4 pointer-events-none`}
              style={{ borderColor: 'rgba(0,245,212,0.5)',
                borderTopWidth:    i < 2 ? '2px' : '0',
                borderBottomWidth: i >= 2 ? '2px' : '0',
                borderLeftWidth:   i % 2 === 0 ? '2px' : '0',
                borderRightWidth:  i % 2 === 1 ? '2px' : '0',
              }}
            />
          ))}
          <iframe
            ref={iframeRef}
            src={roomUrl}
            title="CareSetu Teleconsult"
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            className="w-full h-full border-0"
            style={{ minHeight: '480px', background: '#060910' }}
          />
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 py-3 border-t"
          style={{ borderColor: 'rgba(42,54,79,0.6)', background: 'rgba(13,20,36,0.95)' }}
        >
          <p className="text-[9px] font-mono text-slate-600 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" style={{ boxShadow: '0 0 5px #10B981' }} />
            End-to-end encrypted · Powered by Daily.co WebRTC
          </p>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all"
            style={{
              borderColor: 'rgba(255,46,147,0.4)',
              color: '#FF2E93',
              background: 'rgba(255,46,147,0.06)',
            }}
          >
            <VideoOff size={12} />
            End Consult
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Queue patient card
// ─────────────────────────────────────────────────────────────────────────────

function QueueCard({ patient, isSelected, onSelect }) {
  const approved   = patient.status === 'Approved & Protocol Finalized'
  const riskLevel  = patient.triage?.risk_level ?? 'LOW'
  const m          = RISK_META[riskLevel] ?? RISK_META.LOW
  const snippet    = patient.symptoms?.slice(0, 72) + (patient.symptoms?.length > 72 ? '…' : '')
  const timeStr    = patient.created_at
    ? new Date(patient.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <button
      type="button"
      onClick={() => onSelect(patient)}
      className="w-full text-left rounded-xl border px-4 py-3.5 transition-all duration-200 group"
      style={
        isSelected
          ? { background: 'rgba(0,245,212,0.06)', borderColor: 'rgba(0,245,212,0.45)', boxShadow: '0 0 18px rgba(0,245,212,0.12)' }
          : { background: 'rgba(19,27,46,0.7)', borderColor: 'rgba(42,54,79,0.6)' }
      }
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = 'rgba(42,54,79,0.9)' }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = 'rgba(42,54,79,0.6)' }}
    >
      {/* Row 1: name + risk tag + chevron */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* severity accent dot */}
          <span
            className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse"
            style={{ background: m.dot, boxShadow: `0 0 6px ${m.dot}` }}
          />
          <span className="text-sm font-semibold text-slate-100 truncate">{patient.name}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <RiskTag level={riskLevel} />
          <ChevronRight
            size={14}
            className="text-slate-600 group-hover:text-[#00F5D4] transition-colors"
          />
        </div>
      </div>

      {/* Row 2: meta */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-slate-500">
          {patient.age}y · {patient.gender} · {patient.language}
        </span>
        {timeStr && (
          <span className="text-[9px] font-mono text-slate-600 flex items-center gap-1">
            <Clock size={8} />
            {timeStr}
          </span>
        )}
      </div>

      {/* Row 3: chief complaint snippet */}
      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-2.5">{snippet}</p>

      {/* Row 4: status pill */}
      <StatusPill approved={approved} />
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Patient detail pane
// ─────────────────────────────────────────────────────────────────────────────

function EmptyDetailPane() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[520px] gap-5 select-none">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-2 border-[#00F5D4]/15 animate-[ping_2.5s_ease_infinite]" />
        <div className="absolute inset-2 rounded-full border border-[#00F5D4]/25" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Stethoscope size={28} style={{ color: '#00F5D4', opacity: 0.5 }} />
        </div>
      </div>
      <div className="text-center space-y-1">
        <p className="text-slate-400 text-sm font-semibold">No patient selected</p>
        <p className="text-slate-600 text-xs max-w-[200px] leading-relaxed">
          Select a patient from the priority queue to open their medical record
        </p>
      </div>
    </div>
  )
}

function SectionHeading({ icon: Icon, label, accent = '#00F5D4' }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-0.5 h-4 rounded-full" style={{ background: accent, boxShadow: `0 0 6px ${accent}` }} />
      {Icon && <Icon size={12} style={{ color: accent }} />}
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</span>
    </div>
  )
}

function DetailPane({ patient, onApprove, approving, onTeleconsult }) {
  if (!patient) return <EmptyDetailPane />

  const { triage, vitals, ocr_notes, name, age, gender, language, symptoms, id, status, created_at } = patient
  const isApproved     = status === 'Approved & Protocol Finalized'
  const hasOCR         = ocr_notes && !ocr_notes.startsWith('[OCR unavailable')
  const timeFormatted  = created_at
    ? new Date(created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    : null

  return (
    <div className="flex flex-col gap-5 overflow-y-auto h-full pr-0.5">
      {/* ── Patient header ── */}
      <div
        className="rounded-2xl border p-5"
        style={{ background: 'rgba(19,27,46,0.85)', borderColor: 'rgba(42,54,79,0.7)' }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(0,245,212,0.08)', border: '1px solid rgba(0,245,212,0.25)' }}
            >
              <User size={18} style={{ color: '#00F5D4' }} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 leading-tight">{name}</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {age}y · {gender} · {language}
                {timeFormatted && <span className="ml-2 text-slate-600">· Admitted {timeFormatted}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <RiskTag level={triage?.risk_level} />
            <StatusPill approved={isApproved} />
            <span className="text-[9px] font-mono text-slate-600 border border-navy-400/40 px-2 py-0.5 rounded">
              ID #{id}
            </span>
          </div>
        </div>

        {/* Chief complaint */}
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(42,54,79,0.5)' }}>
          <p className="text-[9px] font-mono text-slate-600 uppercase tracking-widest mb-1.5">
            Chief Complaint
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">{symptoms}</p>
        </div>

        {/* Emergency banner if flagged */}
        {triage?.emergency_referral && (
          <div
            className="mt-4 rounded-xl px-4 py-3 flex items-start gap-3 border"
            style={{ background: 'rgba(255,46,147,0.06)', borderColor: 'rgba(255,46,147,0.4)', boxShadow: '0 0 18px rgba(255,46,147,0.15)' }}
          >
            <AlertTriangle size={16} className="text-[#FF2E93] flex-shrink-0 mt-0.5 animate-pulse" />
            <div>
              <p className="text-sm font-bold text-[#FF2E93]">Emergency Referral Required</p>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                Critical vitals detected. Immediate hospital transfer recommended.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Vitals grid ── */}
      <div
        className="rounded-2xl border p-5"
        style={{ background: 'rgba(19,27,46,0.85)', borderColor: 'rgba(42,54,79,0.7)' }}
      >
        <SectionHeading icon={Activity} label="Vitals Telemetry" />
        <VitalsGrid vitals={vitals} />
        {vitals?.bp_diastolic && (
          <p className="mt-2 text-[10px] text-slate-600 font-mono">
            Diastolic BP: <span className="text-slate-400">{vitals.bp_diastolic} mmHg</span>
          </p>
        )}
      </div>

      {/* ── AI Summary ── */}
      {triage?.summary && (
        <div
          className="rounded-2xl border p-5"
          style={{
            background: 'rgba(19,27,46,0.85)',
            borderColor: 'rgba(42,54,79,0.7)',
            borderLeft: '3px solid #00F5D4',
            boxShadow: '-3px 0 14px rgba(0,245,212,0.15)',
          }}
        >
          <SectionHeading icon={Stethoscope} label="AI Diagnostic Summary" />
          <p className="text-sm text-slate-300 leading-relaxed mb-4">{triage.summary}</p>

          {/* Vitals concern callout */}
          {triage.vitals_concern && triage.vitals_concern !== 'None' && triage.vitals_concern !== 'None.' && (
            <div
              className="rounded-lg px-3 py-2.5 flex items-start gap-2 mb-4"
              style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.3)' }}
            >
              <AlertTriangle size={12} className="text-[#F59E0B] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[#F59E0B] leading-relaxed">{triage.vitals_concern}</p>
            </div>
          )}

          {/* First aid steps */}
          {triage.first_aid_instructions?.length > 0 && (
            <div>
              <p className="text-[9px] font-mono text-slate-600 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                <ClipboardList size={9} style={{ color: '#10B981' }} />
                First-Aid Protocol
              </p>
              <ol className="space-y-2">
                {triage.first_aid_instructions.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-400">
                    <span
                      className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold font-mono mt-0.5"
                      style={{
                        background: 'rgba(16,185,129,0.1)',
                        border: '1px solid rgba(16,185,129,0.35)',
                        color: '#10B981',
                      }}
                    >
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Recommended action */}
          {triage.recommended_action && (
            <div
              className="mt-4 rounded-lg px-3 py-2.5 flex items-start gap-2"
              style={{ background: 'rgba(0,245,212,0.04)', border: '1px solid rgba(0,245,212,0.2)' }}
            >
              <ChevronRight size={12} className="text-[#00F5D4] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-300 leading-relaxed">
                <span className="text-[#00F5D4] font-semibold">Recommended: </span>
                {triage.recommended_action}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── OTC Recommendations ── */}
      {triage?.otc_recommendations?.length > 0 && (
        <div
          className="rounded-2xl border p-5"
          style={{ background: 'rgba(19,27,46,0.85)', borderColor: 'rgba(42,54,79,0.7)' }}
        >
          <SectionHeading icon={Pill} label="OTC Recommendations" />
          <p className="text-[9px] font-mono text-slate-600 -mt-1 mb-3 uppercase tracking-widest">
            AI-suggested · Pending doctor approval
          </p>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {triage.otc_recommendations.map((rec, i) => (
              <div
                key={i}
                className="rounded-xl border p-3.5"
                style={{ background: 'rgba(10,15,29,0.5)', borderColor: 'rgba(42,54,79,0.6)' }}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-sm font-semibold text-slate-200">{rec.medicine}</p>
                  <span
                    className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded uppercase flex-shrink-0"
                    style={{ color: '#00F5D4', background: 'rgba(0,245,212,0.07)', border: '1px solid rgba(0,245,212,0.25)' }}
                  >
                    OTC
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-2">
                  <span className="text-slate-400 font-medium">Dose: </span>{rec.dosage}
                </p>
                {rec.warning && (
                  <div
                    className="rounded-lg px-2.5 py-2 flex items-start gap-1.5"
                    style={{ background: 'rgba(255,46,147,0.05)', border: '1px solid rgba(255,46,147,0.25)' }}
                  >
                    <AlertTriangle size={10} className="text-[#FF2E93] flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-[#FF2E93] leading-relaxed">{rec.warning}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── OCR Context ── */}
      {hasOCR && (
        <div
          className="rounded-2xl border p-5"
          style={{
            background: 'rgba(19,27,46,0.85)',
            borderColor: 'rgba(42,54,79,0.7)',
            borderLeft: '3px solid #6366F1',
            boxShadow: '-3px 0 14px rgba(99,102,241,0.12)',
          }}
        >
          <SectionHeading icon={FileText} label="Prescription OCR / Medical Records" accent="#6366F1" />
          <pre
            className="text-xs text-slate-400 font-mono leading-relaxed whitespace-pre-wrap rounded-xl p-4 border max-h-48 overflow-y-auto"
            style={{ background: 'rgba(10,15,29,0.6)', borderColor: 'rgba(42,54,79,0.5)' }}
          >
            {ocr_notes}
          </pre>
        </div>
      )}

      {/* ── Action footer bar ── */}
      <div
        className="rounded-2xl border p-4 flex items-center gap-3 flex-wrap sticky bottom-0"
        style={{
          background: 'rgba(13,20,36,0.96)',
          backdropFilter: 'blur(16px)',
          borderColor: 'rgba(42,54,79,0.8)',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
        }}
      >
        {/* Approve */}
        <button
          type="button"
          onClick={() => onApprove(id)}
          disabled={approving || isApproved}
          className="flex-1 min-w-[160px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border font-bold text-xs uppercase tracking-widest transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style={
            isApproved
              ? { background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.35)', color: '#10B981' }
              : {
                  background: 'rgba(16,185,129,0.10)',
                  borderColor: 'rgba(16,185,129,0.50)',
                  color: '#10B981',
                  boxShadow: '0 0 16px rgba(16,185,129,0.18)',
                }
          }
          onMouseEnter={e => { if (!isApproved && !approving) e.currentTarget.style.boxShadow = '0 0 24px rgba(16,185,129,0.35)' }}
          onMouseLeave={e => { if (!isApproved && !approving) e.currentTarget.style.boxShadow = '0 0 16px rgba(16,185,129,0.18)' }}
        >
          <CheckCheck size={13} />
          {isApproved ? 'Protocol Approved ✓' : approving ? 'Approving…' : 'Approve AI Recommendations'}
        </button>

        {/* Override */}
        <button
          type="button"
          className="flex items-center gap-2 py-2.5 px-4 rounded-xl border font-bold text-xs uppercase tracking-widest transition-all duration-200"
          style={{ borderColor: 'rgba(245,158,11,0.40)', color: '#F59E0B', background: 'rgba(245,158,11,0.06)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.10)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.06)' }}
        >
          <Edit3 size={12} />
          Override
        </button>

        {/* Teleconsult */}
        <button
          type="button"
          onClick={onTeleconsult}
          className="flex items-center gap-2 py-2.5 px-4 rounded-xl border font-bold text-xs uppercase tracking-widest transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(0,245,212,0.08))',
            borderColor: 'rgba(99,102,241,0.50)',
            color: '#818CF8',
            boxShadow: '0 0 14px rgba(99,102,241,0.18)',
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 24px rgba(99,102,241,0.35)' }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 14px rgba(99,102,241,0.18)' }}
        >
          <Video size={13} />
          Start Doctor Teleconsult
        </button>

        {/* Emergency transfer */}
        <button
          type="button"
          className="flex items-center gap-2 py-2.5 px-4 rounded-xl border font-bold text-xs uppercase tracking-widest transition-all duration-200"
          style={{ borderColor: 'rgba(255,46,147,0.40)', color: '#FF2E93', background: 'rgba(255,46,147,0.06)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,46,147,0.10)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,46,147,0.06)' }}
        >
          <AlertOctagon size={12} />
          Emergency Transfer
        </button>
      </div>

      {/* Disclaimer */}
      <p className="text-[9px] font-mono text-slate-700 text-center pb-1">
        ⚕ AI-GENERATED TRIAGE — REQUIRES LICENSED DOCTOR REVIEW BEFORE ACTING
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main DoctorPortal export
// ─────────────────────────────────────────────────────────────────────────────

export default function DoctorPortal() {
  const [queue, setQueue]             = useState([])
  const [selected, setSelected]       = useState(null)
  const [loadingQueue, setLoadingQueue] = useState(false)
  const [approving, setApproving]     = useState(false)
  const [teleconsultOpen, setTeleconsultOpen] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [approveError, setApproveError] = useState(null)

  // ── Fetch queue ──────────────────────────────────────────────────────────
  const fetchQueue = useCallback(async () => {
    setLoadingQueue(true)
    try {
      const res  = await fetch(`${API_BASE}/api/doctor/queue`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      // Backend sorts by risk already; keep that order, stable sort as safety net
      const sorted = [...data].sort(
        (a, b) =>
          (RISK_ORDER[a.triage?.risk_level] ?? 99) -
          (RISK_ORDER[b.triage?.risk_level] ?? 99)
      )
      setQueue(sorted)
      setLastRefresh(new Date())
      // Keep selected record in sync after refresh
      setSelected(prev => prev ? (sorted.find(p => p.id === prev.id) ?? prev) : null)
    } catch {
      // fail silently — queue shows stale data
    } finally {
      setLoadingQueue(false)
    }
  }, [])

  useEffect(() => {
    fetchQueue()
  }, [fetchQueue])

  // ── Approve ───────────────────────────────────────────────────────────────
  const handleApprove = async (patientId) => {
    setApproving(true)
    setApproveError(null)
    try {
      const res = await fetch(`${API_BASE}/api/doctor/approve/${patientId}`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error(`Approval failed (${res.status})`)
      await fetchQueue()
    } catch (err) {
      setApproveError(err.message)
    } finally {
      setApproving(false)
    }
  }

  // ── Derived stats ─────────────────────────────────────────────────────────
  const criticalCount  = queue.filter(p => p.triage?.risk_level === 'CRITICAL').length
  const highCount      = queue.filter(p => p.triage?.risk_level === 'HIGH').length
  const pendingCount   = queue.filter(p => p.status !== 'Approved & Protocol Finalized').length
  const approvedCount  = queue.length - pendingCount

  return (
    <>
      {/* Teleconsult modal */}
      {teleconsultOpen && selected && (
        <TeleconsultModal patient={selected} onClose={() => setTeleconsultOpen(false)} />
      )}

      <div className="flex gap-5" style={{ height: 'calc(100vh - 144px)' }}>
        {/* ═════════════════════════════════════════════════════════════
            LEFT: Priority Queue Sidebar  (1/3 width)
        ═════════════════════════════════════════════════════════════ */}
        <div className="w-[340px] flex-shrink-0 flex flex-col gap-3 overflow-hidden">

          {/* Queue header */}
          <div
            className="rounded-2xl border px-4 py-3.5 flex items-center justify-between"
            style={{ background: 'rgba(19,27,46,0.9)', borderColor: 'rgba(42,54,79,0.7)' }}
          >
            <div>
              <p className="text-[9px] font-mono text-slate-600 uppercase tracking-widest mb-0.5">
                Priority Stream
              </p>
              <p className="text-base font-bold text-slate-100">{queue.length} Patients</p>
            </div>
            <button
              type="button"
              onClick={fetchQueue}
              title="Refresh queue"
              className="p-2 rounded-xl border border-navy-400/40 hover:border-[#00F5D4]/40 transition-colors"
            >
              <RefreshCw
                size={13}
                className={`text-slate-500 hover:text-[#00F5D4] transition-colors ${loadingQueue ? 'animate-spin' : ''}`}
              />
            </button>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'CRIT',     count: criticalCount,  color: '#FF2E93' },
              { label: 'HIGH',     count: highCount,       color: '#F59E0B' },
              { label: 'PENDING',  count: pendingCount,    color: '#6366F1' },
              { label: 'APPROVED', count: approvedCount,   color: '#10B981' },
            ].map(({ label, count, color }) => (
              <div
                key={label}
                className="rounded-xl border p-2 text-center"
                style={{ background: `${color}08`, borderColor: `${color}25` }}
              >
                <p className="font-mono text-base font-bold" style={{ color, textShadow: `0 0 8px ${color}60` }}>
                  {count}
                </p>
                <p className="text-[7px] text-slate-600 uppercase tracking-widest mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Approve error */}
          {approveError && (
            <div className="rounded-xl border px-3 py-2.5 text-xs text-[#FF2E93] flex items-center gap-2"
              style={{ background: 'rgba(255,46,147,0.06)', borderColor: 'rgba(255,46,147,0.3)' }}>
              <AlertTriangle size={12} />
              {approveError}
              <button className="ml-auto font-bold" onClick={() => setApproveError(null)}>×</button>
            </div>
          )}

          {/* Scrollable patient list */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-0.5">
            {loadingQueue && queue.length === 0 ? (
              /* Skeleton */
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border px-4 py-3.5 animate-pulse"
                  style={{ background: 'rgba(19,27,46,0.6)', borderColor: 'rgba(42,54,79,0.5)' }}
                >
                  <div className="h-3 bg-navy-600/60 rounded w-2/3 mb-2" />
                  <div className="h-2 bg-navy-600/40 rounded w-1/3 mb-3" />
                  <div className="h-2 bg-navy-600/40 rounded w-full mb-1" />
                  <div className="h-2 bg-navy-600/40 rounded w-4/5" />
                </div>
              ))
            ) : queue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <Phone size={24} className="text-slate-700" />
                <p className="text-xs text-slate-600 font-mono">NO PATIENTS IN QUEUE</p>
                <p className="text-[10px] text-slate-700">Submit a patient via the Health Worker portal</p>
              </div>
            ) : (
              queue.map(patient => (
                <QueueCard
                  key={patient.id}
                  patient={patient}
                  isSelected={selected?.id === patient.id}
                  onSelect={setSelected}
                />
              ))
            )}
          </div>

          {/* Last sync timestamp */}
          {lastRefresh && (
            <p className="text-[8px] font-mono text-slate-700 text-center py-1">
              LAST SYNC {lastRefresh.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* ═════════════════════════════════════════════════════════════
            RIGHT: Medical Command Pane  (2/3 width)
        ═════════════════════════════════════════════════════════════ */}
        <div
          className="flex-1 rounded-2xl border overflow-hidden flex flex-col"
          style={{ background: 'rgba(13,20,36,0.6)', borderColor: 'rgba(42,54,79,0.5)' }}
        >
          {/* Pane header */}
          <div
            className="px-5 py-3.5 border-b flex items-center justify-between flex-shrink-0"
            style={{ borderColor: 'rgba(42,54,79,0.6)', background: 'rgba(13,20,36,0.85)' }}
          >
            <div className="flex items-center gap-2">
              <Stethoscope size={14} style={{ color: '#00F5D4' }} />
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-slate-500">
                Medical Command Pane
              </span>
            </div>
            {selected && (
              <div className="flex items-center gap-2 text-[9px] font-mono text-slate-600">
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: '#00F5D4', boxShadow: '0 0 5px #00F5D4' }}
                />
                RECORD LOADED
              </div>
            )}
          </div>

          {/* Scrollable detail content */}
          <div className="flex-1 overflow-y-auto p-5">
            <DetailPane
              patient={selected}
              onApprove={handleApprove}
              approving={approving}
              onTeleconsult={() => setTeleconsultOpen(true)}
            />
          </div>
        </div>
      </div>
    </>
  )
}
