import { Activity, Thermometer, Heart, Wind } from 'lucide-react'

// Determine glow/color from value vs thresholds
function getVitalStatus(key, val) {
  const n = parseFloat(val)
  if (isNaN(n)) return 'normal'
  if (key === 'temperature') {
    if (n > 103) return 'critical'
    if (n > 100.4) return 'warning'
    return 'normal'
  }
  if (key === 'spo2') {
    if (n < 92) return 'critical'
    if (n < 95) return 'warning'
    return 'normal'
  }
  if (key === 'bp_systolic') {
    if (n > 180 || n < 80) return 'critical'
    if (n > 140 || n < 90) return 'warning'
    return 'normal'
  }
  if (key === 'pulse') {
    if (n > 140 || n < 40) return 'critical'
    if (n > 100 || n < 55) return 'warning'
    return 'normal'
  }
  return 'normal'
}

const STATUS_STYLES = {
  critical: { color: '#FF2E93', shadow: '0 0 20px rgba(255,46,147,0.4)', label: 'CRITICAL' },
  warning:  { color: '#F59E0B', shadow: '0 0 20px rgba(245,158,11,0.4)',  label: 'WARN' },
  normal:   { color: '#00F5D4', shadow: '0 0 12px rgba(0,245,212,0.2)',   label: 'NORMAL' },
}

// ── Heartbeat SVG line ───────────────────────────────────────────────────
function HeartbeatLine({ color }) {
  return (
    <svg viewBox="0 0 120 30" className="w-full h-7" fill="none">
      <polyline
        className="heartbeat-path"
        points="0,15 20,15 28,5 34,25 40,10 46,20 52,15 120,15"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 3px ${color})` }}
      />
    </svg>
  )
}

// ── SpO₂ circular ring ───────────────────────────────────────────────────
function SpO2Ring({ value, color }) {
  const pct   = Math.min(100, Math.max(0, parseFloat(value) || 0))
  const r     = 34
  const circ  = 2 * Math.PI * r          // ~213.6
  const offset = circ - (pct / 100) * circ
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" className="flex-shrink-0">
      {/* track */}
      <circle cx="44" cy="44" r={r} fill="none" stroke="#1A2540" strokeWidth="5" />
      {/* value arc */}
      <circle
        cx="44" cy="44" r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 44 44)"
        style={{ filter: `drop-shadow(0 0 5px ${color})`, transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text x="44" y="48" textAnchor="middle" fontSize="14" fontWeight="700"
        fontFamily="JetBrains Mono, monospace" fill={color}
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}>
        {value || '--'}
      </text>
    </svg>
  )
}

// ── Individual vital card ─────────────────────────────────────────────────
function VitalCard({ label, value, unit, vitalKey, icon: Icon }) {
  const status = getVitalStatus(vitalKey, value)
  const s      = STATUS_STYLES[status]
  const isSpO2 = vitalKey === 'spo2'
  const isPulse = vitalKey === 'pulse'

  return (
    <div
      className="glass-card-sm p-4 flex flex-col gap-2 relative overflow-hidden transition-all duration-300"
      style={{ borderColor: `${s.color}50`, boxShadow: s.shadow }}
    >
      {/* status tag */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon size={12} style={{ color: s.color }} />
          <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">{label}</span>
        </div>
        <span
          className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded"
          style={{ color: s.color, background: `${s.color}18`, border: `1px solid ${s.color}40` }}
        >
          {s.label}
        </span>
      </div>

      {/* value display */}
      {isSpO2 ? (
        <div className="flex items-center justify-center py-1">
          <SpO2Ring value={value} color={s.color} />
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <div className="flex items-end gap-1">
            <span className="font-mono text-2xl font-bold leading-none" style={{ color: s.color, textShadow: `0 0 12px ${s.color}80` }}>
              {value || '—'}
            </span>
            <span className="text-xs text-slate-500 mb-0.5">{unit}</span>
          </div>
          {isPulse && <HeartbeatLine color={s.color} />}
        </div>
      )}

      {/* corner glow dot */}
      <div
        className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full animate-pulse"
        style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }}
      />
    </div>
  )
}

// ── BP sub-card (two values) ──────────────────────────────────────────────
function BPCard({ systolic, diastolic }) {
  const sStatus = getVitalStatus('bp_systolic', systolic)
  const s       = STATUS_STYLES[sStatus]
  return (
    <div
      className="glass-card-sm p-4 flex flex-col gap-2 relative overflow-hidden transition-all duration-300"
      style={{ borderColor: `${s.color}50`, boxShadow: s.shadow }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Activity size={12} style={{ color: s.color }} />
          <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Blood Pressure</span>
        </div>
        <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded"
          style={{ color: s.color, background: `${s.color}18`, border: `1px solid ${s.color}40` }}>
          {s.label}
        </span>
      </div>
      <div className="flex items-end gap-2 mt-1">
        <div className="flex flex-col items-center">
          <span className="font-mono text-xl font-bold leading-none" style={{ color: s.color, textShadow: `0 0 10px ${s.color}80` }}>
            {systolic || '—'}
          </span>
          <span className="text-[9px] text-slate-500 mt-0.5">SYS</span>
        </div>
        <span className="font-mono text-lg text-slate-600 mb-3">/</span>
        <div className="flex flex-col items-center">
          <span className="font-mono text-xl font-bold leading-none" style={{ color: s.color, textShadow: `0 0 10px ${s.color}80` }}>
            {diastolic || '—'}
          </span>
          <span className="text-[9px] text-slate-500 mt-0.5">DIA</span>
        </div>
        <span className="text-[10px] text-slate-500 mb-0.5 ml-1">mmHg</span>
      </div>
      <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full animate-pulse"
        style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
    </div>
  )
}

// ── Exported Vitals HUD Grid ──────────────────────────────────────────────
export default function VitalsHUD({ vitals, onChange }) {
  return (
    <div className="flex flex-col gap-3">
      {/* input row + live cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Temperature */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Temp °F</label>
          <input
            className="neon-input"
            type="number" step="0.1" min="90" max="115"
            placeholder="98.6"
            value={vitals.temperature}
            onChange={e => onChange('temperature', e.target.value)}
          />
        </div>
        {/* SpO2 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">SpO₂ %</label>
          <input
            className="neon-input"
            type="number" step="0.1" min="50" max="100"
            placeholder="98"
            value={vitals.spo2}
            onChange={e => onChange('spo2', e.target.value)}
          />
        </div>
        {/* BP Systolic */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Sys mmHg</label>
          <input
            className="neon-input"
            type="number" min="50" max="250"
            placeholder="120"
            value={vitals.bp_systolic}
            onChange={e => onChange('bp_systolic', e.target.value)}
          />
        </div>
        {/* BP Diastolic */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Dia mmHg</label>
          <input
            className="neon-input"
            type="number" min="30" max="150"
            placeholder="80"
            value={vitals.bp_diastolic}
            onChange={e => onChange('bp_diastolic', e.target.value)}
          />
        </div>
        {/* Pulse */}
        <div className="col-span-2 flex flex-col gap-1.5">
          <label className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Pulse BPM</label>
          <input
            className="neon-input"
            type="number" min="20" max="250"
            placeholder="72"
            value={vitals.pulse}
            onChange={e => onChange('pulse', e.target.value)}
          />
        </div>
      </div>

      {/* Live telemetry display cards */}
      {(vitals.temperature || vitals.spo2 || vitals.pulse || vitals.bp_systolic) && (
        <div className="grid grid-cols-2 gap-2 mt-1">
          {vitals.temperature && (
            <VitalCard label="Temperature" value={vitals.temperature} unit="°F" vitalKey="temperature" icon={Thermometer} />
          )}
          {vitals.spo2 && (
            <VitalCard label="SpO₂" value={vitals.spo2} unit="%" vitalKey="spo2" icon={Wind} />
          )}
          {(vitals.bp_systolic || vitals.bp_diastolic) && (
            <BPCard systolic={vitals.bp_systolic} diastolic={vitals.bp_diastolic} />
          )}
          {vitals.pulse && (
            <VitalCard label="Pulse" value={vitals.pulse} unit="bpm" vitalKey="pulse" icon={Heart} />
          )}
        </div>
      )}
    </div>
  )
}
