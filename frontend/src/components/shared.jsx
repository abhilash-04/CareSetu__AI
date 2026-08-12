// ── Shared constants & tiny components used across all panels ──────────────

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const RISK_CONFIG = {
  CRITICAL: {
    label: 'CRITICAL',
    color: '#FF2E93',
    colorClass: 'text-[#FF2E93]',
    bgClass: 'bg-[#FF2E93]/10',
    borderClass: 'border-[#FF2E93]/40',
    glowClass: 'shadow-glow-coral',
    glowBorder: 'glow-border-left-coral',
    ledClass: 'led-red',
  },
  HIGH: {
    label: 'HIGH',
    color: '#F59E0B',
    colorClass: 'text-[#F59E0B]',
    bgClass: 'bg-[#F59E0B]/10',
    borderClass: 'border-[#F59E0B]/40',
    glowClass: 'shadow-glow-amber',
    glowBorder: 'glow-border-left-amber',
    ledClass: 'led-amber',
  },
  MEDIUM: {
    label: 'MEDIUM',
    color: '#F59E0B',
    colorClass: 'text-[#F59E0B]',
    bgClass: 'bg-[#F59E0B]/10',
    borderClass: 'border-[#F59E0B]/40',
    glowClass: 'shadow-glow-amber',
    glowBorder: 'glow-border-left-amber',
    ledClass: 'led-amber',
  },
  LOW: {
    label: 'LOW',
    color: '#10B981',
    colorClass: 'text-[#10B981]',
    bgClass: 'bg-[#10B981]/10',
    borderClass: 'border-[#10B981]/40',
    glowClass: 'shadow-glow-emerald',
    glowBorder: 'glow-border-left-emerald',
    ledClass: 'led-green',
  },
}

export const LANGUAGES = [
  'English','Hindi','Tamil','Telugu','Kannada',
  'Bengali','Marathi','Gujarati','Punjabi','Odia',
]

// ── Waveform visualizer (8 animated bars) ────────────────────────────────
export function Waveform({ active }) {
  if (!active) return null
  return (
    <div className="flex items-center gap-[3px] h-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="waveform-bar"
          style={{ height: `${12 + Math.random() * 12}px`, animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  )
}

// ── Glowing risk badge ────────────────────────────────────────────────────
export function RiskBadge({ level, size = 'md' }) {
  const cfg = RISK_CONFIG[level] ?? RISK_CONFIG.LOW
  const sz = size === 'lg'
    ? 'text-sm px-5 py-2 tracking-widest'
    : 'text-xs px-3 py-1.5 tracking-wider'
  return (
    <span
      className={`inline-flex items-center gap-2 font-mono font-bold rounded-lg border ${sz} ${cfg.bgClass} ${cfg.borderClass} ${cfg.colorClass}`}
      style={{ boxShadow: `0 0 14px ${cfg.color}40, 0 0 4px ${cfg.color}60` }}
    >
      <span className={`w-1.5 h-1.5 rounded-full animate-pulse`} style={{ background: cfg.color, boxShadow: `0 0 6px ${cfg.color}` }} />
      {level}
    </span>
  )
}

// ── LED status dot ────────────────────────────────────────────────────────
export function LED({ color = 'cyan', pulse = false }) {
  const map = {
    cyan:    { bg: '#00F5D4', shadow: '0 0 8px rgba(0,245,212,0.8)' },
    green:   { bg: '#10B981', shadow: '0 0 8px rgba(16,185,129,0.8)' },
    amber:   { bg: '#F59E0B', shadow: '0 0 8px rgba(245,158,11,0.8)' },
    coral:   { bg: '#FF2E93', shadow: '0 0 8px rgba(255,46,147,0.8)' },
  }
  const c = map[color] ?? map.cyan
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${pulse ? 'animate-pulse' : ''}`}
      style={{ background: c.bg, boxShadow: c.shadow }}
    />
  )
}

// ── Section heading with neon accent line ────────────────────────────────
export function SectionHead({ icon: Icon, label, color = '#00F5D4' }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-0.5 h-4 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      {Icon && <Icon size={13} style={{ color }} />}
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{label}</span>
    </div>
  )
}

// ── Generic glass panel wrapper ───────────────────────────────────────────
export function GlassPanel({ children, className = '' }) {
  return (
    <div className={`glass-card p-5 ${className}`}>
      {children}
    </div>
  )
}
