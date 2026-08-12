import { CheckCircle2, AlertTriangle, Pill, Zap } from 'lucide-react'
import { RiskBadge, GlassPanel, SectionHead } from './shared'

// ── Empty / Loading states ────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[480px] gap-5">
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 rounded-full border-2 border-[#00F5D4]/20 animate-ping-slow" />
        <div className="absolute inset-2 rounded-full border border-[#00F5D4]/30" />
        <div className="absolute inset-0 flex items-center justify-center text-4xl">🧬</div>
      </div>
      <div className="text-center">
        <p className="text-slate-400 font-semibold text-sm">AI Clinical Output HUD</p>
        <p className="text-slate-600 text-xs mt-1.5 max-w-[220px] leading-relaxed">
          Submit patient intake to activate the triage engine
        </p>
      </div>
      <div className="flex gap-2 mt-2">
        {['AWAITING INPUT', 'STANDBY MODE'].map(t => (
          <span key={t} className="text-[9px] font-mono font-bold text-slate-600 border border-slate-700 px-2 py-1 rounded">{t}</span>
        ))}
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      {[0.7, 1, 0.6, 0.8].map((w, i) => (
        <div key={i} className="glass-card p-5">
          <div className="h-3 bg-navy-600 rounded mb-3" style={{ width: `${w * 100}%` }} />
          <div className="space-y-2">
            <div className="h-2.5 bg-navy-600/60 rounded w-full" />
            <div className="h-2.5 bg-navy-600/60 rounded w-5/6" />
            <div className="h-2.5 bg-navy-600/60 rounded w-4/6" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Emergency banner ──────────────────────────────────────────────────────
function EmergencyBanner() {
  return (
    <div
      className="rounded-xl px-4 py-3.5 flex items-start gap-3 border"
      style={{
        background: 'rgba(255,46,147,0.08)',
        borderColor: 'rgba(255,46,147,0.5)',
        boxShadow: '0 0 24px rgba(255,46,147,0.2)',
      }}
    >
      <AlertTriangle size={18} className="text-[#FF2E93] flex-shrink-0 mt-0.5 animate-pulse" />
      <div>
        <p className="font-bold text-[#FF2E93] text-sm tracking-wide">EMERGENCY REFERRAL REQUIRED</p>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          Patient must be immediately transferred to the nearest hospital. Contact emergency services — do not delay.
        </p>
      </div>
    </div>
  )
}

// ── First aid checklist ───────────────────────────────────────────────────
function FirstAidList({ steps }) {
  if (!steps?.length) return null
  return (
    <GlassPanel>
      <SectionHead icon={CheckCircle2} label="First-Aid Protocol" color="#10B981" />
      <ol className="space-y-2.5">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3">
            <span
              className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold font-mono mt-0.5"
              style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.4)', color: '#10B981', boxShadow: '0 0 6px rgba(16,185,129,0.2)' }}
            >
              {i + 1}
            </span>
            <span className="text-sm text-slate-300 leading-relaxed">{step}</span>
          </li>
        ))}
      </ol>
    </GlassPanel>
  )
}

// ── OTC medicine card ─────────────────────────────────────────────────────
function OTCCard({ rec }) {
  return (
    <div className="glass-card-sm p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Pill size={12} className="text-[#00F5D4]" />
          <span className="text-sm font-semibold text-slate-200">{rec.medicine}</span>
        </div>
        <span
          className="text-[8px] font-mono font-bold px-2 py-0.5 rounded uppercase"
          style={{ color: '#00F5D4', background: 'rgba(0,245,212,0.08)', border: '1px solid rgba(0,245,212,0.3)' }}
        >
          OTC
        </span>
      </div>
      <p className="text-xs text-slate-400 mb-2.5">
        <span className="text-slate-500 font-medium">Dose: </span>{rec.dosage}
      </p>
      {rec.warning && (
        <div
          className="rounded-lg px-3 py-2 flex items-start gap-2"
          style={{ background: 'rgba(255,46,147,0.06)', border: '1px solid rgba(255,46,147,0.25)' }}
        >
          <AlertTriangle size={11} className="text-[#FF2E93] flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-[#FF2E93] leading-relaxed">{rec.warning}</p>
        </div>
      )}
    </div>
  )
}

function OTCSection({ recs }) {
  if (!recs?.length) return null
  return (
    <GlassPanel>
      <SectionHead icon={Pill} label="OTC Recommendations" color="#00F5D4" />
      <p className="text-[10px] text-slate-600 -mt-1 mb-3 font-mono">AI-SUGGESTED — PENDING DOCTOR APPROVAL</p>
      <div className="flex flex-col gap-2.5">
        {recs.map((r, i) => <OTCCard key={i} rec={r} />)}
      </div>
    </GlassPanel>
  )
}

// ── Recommended action strip ──────────────────────────────────────────────
function ActionStrip({ action }) {
  if (!action) return null
  return (
    <div
      className="rounded-xl px-4 py-3 flex items-start gap-3 border"
      style={{
        background: 'rgba(0,245,212,0.05)',
        borderColor: 'rgba(0,245,212,0.25)',
      }}
    >
      <Zap size={14} className="text-[#00F5D4] flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-[9px] font-mono font-bold text-[#00F5D4] uppercase tracking-widest mb-0.5">Next Action</p>
        <p className="text-sm text-slate-300">{action}</p>
      </div>
    </div>
  )
}

// ── OCR text panel ────────────────────────────────────────────────────────
function OCRPanel({ text }) {
  if (!text || text.startsWith('[OCR unavailable')) return null
  return (
    <GlassPanel>
      <SectionHead icon={null} label="Extracted Medical Records (OCR)" color="#6366F1" />
      <pre className="text-xs text-slate-400 bg-navy-800/60 rounded-lg p-3 whitespace-pre-wrap leading-relaxed border border-navy-400/30 font-mono max-h-40 overflow-y-auto">
        {text}
      </pre>
    </GlassPanel>
  )
}

// ── Main export ───────────────────────────────────────────────────────────
export default function ClinicalOutputHUD({ result, loading }) {
  if (loading) return <Skeleton />
  if (!result)  return <EmptyState />

  const { triage } = result

  return (
    <div className="flex flex-col gap-4">
      {/* Header card */}
      <GlassPanel>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1">Triage Assessment</p>
            <p className="text-base font-bold text-slate-100">{result.name}</p>
            <p className="text-xs text-slate-500">{result.age}y · {result.gender} · {result.language}</p>
          </div>
          <RiskBadge level={triage.risk_level} size="lg" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className="text-[9px] font-mono text-slate-500 border border-navy-400/40 px-2 py-0.5 rounded">ID #{result.id}</span>
          <span className="text-[9px] font-mono text-[#F59E0B] border border-[#F59E0B]/30 px-2 py-0.5 rounded bg-[#F59E0B]/5">{result.status}</span>
        </div>
      </GlassPanel>

      {/* Emergency banner */}
      {triage.emergency_referral && <EmergencyBanner />}

      {/* Summary */}
      <div
        className={`glass-card p-5 ${
          triage.risk_level === 'CRITICAL' ? 'glow-border-left-coral' :
          triage.risk_level === 'HIGH'     ? 'glow-border-left-amber' :
          triage.risk_level === 'LOW'      ? 'glow-border-left-emerald' :
                                             'glow-border-left-cyan'
        }`}
      >
        <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-2">Clinical Summary</p>
        <p className="text-sm text-slate-300 leading-relaxed">{triage.summary}</p>
        {triage.vitals_concern && triage.vitals_concern !== 'None' && (
          <div className="mt-3 flex items-start gap-2 bg-[#F59E0B]/5 border border-[#F59E0B]/25 rounded-lg px-3 py-2">
            <AlertTriangle size={12} className="text-[#F59E0B] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[#F59E0B] leading-relaxed">{triage.vitals_concern}</p>
          </div>
        )}
      </div>

      {/* First aid */}
      <FirstAidList steps={triage.first_aid_instructions} />

      {/* OTC */}
      <OTCSection recs={triage.otc_recommendations} />

      {/* Action */}
      <ActionStrip action={triage.recommended_action} />

      {/* OCR */}
      <OCRPanel text={result.ocr_notes} />

      {/* Disclaimer */}
      <p className="text-[10px] text-slate-600 text-center font-mono pb-2">
        ⚕ AI-GENERATED · NOT A SUBSTITUTE FOR LICENSED MEDICAL DIAGNOSIS
      </p>
    </div>
  )
}
