const RISK_CONFIG = {
  CRITICAL: {
    bg: 'bg-red-600',
    text: 'text-white',
    border: 'border-red-600',
    light: 'bg-red-50 border-red-200',
    label: '🔴 CRITICAL',
  },
  HIGH: {
    bg: 'bg-amber-500',
    text: 'text-white',
    border: 'border-amber-500',
    light: 'bg-amber-50 border-amber-200',
    label: '🟠 HIGH',
  },
  MEDIUM: {
    bg: 'bg-yellow-400',
    text: 'text-yellow-900',
    border: 'border-yellow-400',
    light: 'bg-yellow-50 border-yellow-200',
    label: '🟡 MEDIUM',
  },
  LOW: {
    bg: 'bg-green-500',
    text: 'text-white',
    border: 'border-green-500',
    light: 'bg-green-50 border-green-200',
    label: '🟢 LOW',
  },
}

function RiskBadge({ level }) {
  const cfg = RISK_CONFIG[level] ?? RISK_CONFIG.LOW
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold tracking-wide shadow ${cfg.bg} ${cfg.text}`}
    >
      {cfg.label}
    </span>
  )
}

function EmergencyBanner() {
  return (
    <div className="bg-red-600 text-white rounded-xl px-4 py-3 flex items-start gap-3 shadow">
      <span className="text-2xl mt-0.5">🚨</span>
      <div>
        <p className="font-bold text-base">Emergency Referral Required</p>
        <p className="text-red-100 text-sm mt-0.5">
          This patient must be immediately referred to the nearest hospital or
          doctor. Do not delay — contact emergency services if available.
        </p>
      </div>
    </div>
  )
}

function SummaryCallout({ summary, risk_level }) {
  const cfg = RISK_CONFIG[risk_level] ?? RISK_CONFIG.LOW
  return (
    <div className={`rounded-xl border px-4 py-3 ${cfg.light}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
        Clinical Summary
      </p>
      <p className="text-slate-800 text-sm leading-relaxed">{summary}</p>
    </div>
  )
}

function VitalsConcern({ concern }) {
  if (!concern || concern === 'None' || concern === 'None.') return null
  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-orange-600 mb-1">
        ⚠️ Vitals Concern
      </p>
      <p className="text-orange-800 text-sm leading-relaxed">{concern}</p>
    </div>
  )
}

function FirstAidList({ instructions }) {
  if (!instructions?.length) return null
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-blue-700 uppercase tracking-wider mb-3 flex items-center gap-2">
        <span>🩹</span> First Aid Instructions
      </h3>
      <ol className="space-y-2">
        {instructions.map((step, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
            <span className="flex-shrink-0 bg-blue-100 text-blue-700 font-bold rounded-full w-6 h-6 flex items-center justify-center text-xs">
              {i + 1}
            </span>
            <span className="leading-relaxed">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function OTCCard({ rec }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-slate-800 text-sm">{rec.medicine}</p>
        <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap">
          OTC
        </span>
      </div>
      <p className="text-xs text-slate-500 mt-1">
        <span className="font-medium text-slate-700">Dose: </span>
        {rec.dosage}
      </p>
      {rec.warning && (
        <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <p className="text-xs text-red-700">
            <span className="font-semibold">⚠ Warning: </span>
            {rec.warning}
          </p>
        </div>
      )}
    </div>
  )
}

function OTCSection({ recommendations }) {
  if (!recommendations?.length) return null
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-blue-700 uppercase tracking-wider mb-3 flex items-center gap-2">
        <span>💊</span> OTC Recommendations
        <span className="text-xs text-slate-400 font-normal normal-case ml-1">
          (AI-suggested — pending doctor approval)
        </span>
      </h3>
      <div className="grid grid-cols-1 gap-3">
        {recommendations.map((rec, i) => (
          <OTCCard key={i} rec={rec} />
        ))}
      </div>
    </div>
  )
}

function RecommendedAction({ action }) {
  if (!action) return null
  return (
    <div className="bg-blue-700 text-white rounded-xl px-4 py-3 flex items-start gap-3">
      <span className="text-xl mt-0.5">➡️</span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-200 mb-0.5">
          Recommended Next Action
        </p>
        <p className="text-sm font-medium">{action}</p>
      </div>
    </div>
  )
}

function PatientMeta({ result }) {
  return (
    <div className="flex flex-wrap gap-2 text-xs text-slate-500">
      <span className="bg-slate-100 rounded-full px-3 py-1">
        <span className="font-medium text-slate-700">ID:</span> #{result.id}
      </span>
      <span className="bg-slate-100 rounded-full px-3 py-1">
        <span className="font-medium text-slate-700">Patient:</span>{' '}
        {result.name}, {result.age}y {result.gender}
      </span>
      <span className="bg-slate-100 rounded-full px-3 py-1">
        <span className="font-medium text-slate-700">Status:</span>{' '}
        {result.status}
      </span>
    </div>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-5 animate-pulse">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <div className="h-4 bg-slate-200 rounded w-1/3 mb-4" />
        <div className="h-8 bg-slate-200 rounded w-1/4 mb-4" />
        <div className="h-16 bg-slate-100 rounded" />
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="h-4 bg-slate-200 rounded w-1/4 mb-3" />
        <div className="space-y-2">
          <div className="h-3 bg-slate-100 rounded w-full" />
          <div className="h-3 bg-slate-100 rounded w-5/6" />
          <div className="h-3 bg-slate-100 rounded w-4/6" />
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="h-4 bg-slate-200 rounded w-1/4 mb-3" />
        <div className="grid grid-cols-1 gap-3">
          <div className="h-20 bg-slate-100 rounded-xl" />
          <div className="h-20 bg-slate-100 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

// ── Empty placeholder ─────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-6">
      <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-4xl mb-4 border border-blue-100">
        🏥
      </div>
      <h3 className="text-slate-700 font-semibold text-base mb-1">
        AI Assessment Panel
      </h3>
      <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
        Complete the patient intake form on the left and click{' '}
        <span className="font-medium text-blue-600">Run AI Assessment</span> to
        see the triage results here.
      </p>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────
export default function AssessmentResult({ result, loading }) {
  if (loading) return <LoadingSkeleton />
  if (!result)  return <EmptyState />

  const { triage } = result

  return (
    <div className="flex flex-col gap-5">
      {/* Header card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
            AI Triage Assessment
          </h2>
          <RiskBadge level={triage.risk_level} />
        </div>
        <PatientMeta result={result} />
      </div>

      {/* Emergency banner — shown first if true */}
      {triage.emergency_referral && <EmergencyBanner />}

      {/* Summary callout */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col gap-3">
        <SummaryCallout summary={triage.summary} risk_level={triage.risk_level} />
        <VitalsConcern concern={triage.vitals_concern} />
      </div>

      {/* First aid */}
      <FirstAidList instructions={triage.first_aid_instructions} />

      {/* OTC recommendations */}
      <OTCSection recommendations={triage.otc_recommendations} />

      {/* Recommended action */}
      <RecommendedAction action={triage.recommended_action} />

      {/* OCR notes if present */}
      {result.ocr_notes && !result.ocr_notes.startsWith('[OCR unavailable') && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-blue-700 uppercase tracking-wider mb-2 flex items-center gap-2">
            <span>📄</span> Extracted Medical Records (OCR)
          </h3>
          <pre className="text-xs text-slate-600 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap leading-relaxed border border-slate-200">
            {result.ocr_notes}
          </pre>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-slate-400 text-center pb-2">
        ⚕️ AI-generated — not a substitute for professional medical diagnosis.
        All recommendations require doctor review before acting.
      </p>
    </div>
  )
}
