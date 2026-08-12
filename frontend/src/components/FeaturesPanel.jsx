/**
 * CareSetu AI — Extended Features Panel
 * Features 1–10 frontend components.
 * Rendered as a collapsible tab panel inside the Doctor Portal / Health Worker view.
 */

import { useState, useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import {
  ShieldCheck, Brain, Heart, QrCode, Mic,
  Download, MapPin, Baby, FileCheck, Sparkles,
  AlertTriangle, CheckCircle2, XCircle, ChevronDown,
  ChevronRight, RefreshCw, Plus, Trash2, Bell,
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── Shared micro-components ───────────────────────────────────────────────

function Panel({ icon: Icon, title, accent = '#00F5D4', children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ borderColor: 'rgba(42,54,79,0.7)', background: 'rgba(13,20,36,0.8)' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-white/[0.02]"
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${accent}15`, border: `1px solid ${accent}35` }}>
          <Icon size={13} style={{ color: accent }} />
        </div>
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400 flex-1">{title}</span>
        {open
          ? <ChevronDown size={13} className="text-slate-600" />
          : <ChevronRight size={13} className="text-slate-600" />}
      </button>
      {open && (
        <div className="px-5 pb-5 border-t" style={{ borderColor: 'rgba(42,54,79,0.5)' }}>
          <div className="pt-4">{children}</div>
        </div>
      )}
    </div>
  )
}

function NeonInput({ label, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">{label}</label>}
      <input className="neon-input" {...props} />
    </div>
  )
}

function Btn({ children, color = '#00F5D4', onClick, disabled, small }) {
  const sz = small ? 'px-3 py-1.5 text-[10px]' : 'px-4 py-2.5 text-xs'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 ${sz} rounded-xl border font-bold uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
      style={{ color, background: `${color}10`, borderColor: `${color}40` }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = `${color}18` }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = `${color}10` }}
    >
      {children}
    </button>
  )
}

function Tag({ children, color = '#00F5D4' }) {
  return (
    <span className="inline-flex items-center text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider"
      style={{ color, background: `${color}12`, border: `1px solid ${color}35` }}>
      {children}
    </span>
  )
}

function InfoBox({ type = 'info', children }) {
  const styles = {
    info:    { bg: 'rgba(0,245,212,0.05)',   border: 'rgba(0,245,212,0.25)',   text: '#00F5D4',  icon: CheckCircle2 },
    warning: { bg: 'rgba(245,158,11,0.06)',  border: 'rgba(245,158,11,0.30)',  text: '#F59E0B',  icon: AlertTriangle },
    error:   { bg: 'rgba(255,46,147,0.06)',  border: 'rgba(255,46,147,0.35)',  text: '#FF2E93',  icon: XCircle },
    success: { bg: 'rgba(16,185,129,0.06)',  border: 'rgba(16,185,129,0.30)',  text: '#10B981',  icon: CheckCircle2 },
  }
  const s = styles[type] ?? styles.info
  const Icon = s.icon
  return (
    <div className="rounded-xl px-3 py-2.5 flex items-start gap-2 border"
      style={{ background: s.bg, borderColor: s.border }}>
      <Icon size={12} style={{ color: s.text }} className="flex-shrink-0 mt-0.5" />
      <span className="text-xs leading-relaxed" style={{ color: s.text }}>{children}</span>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// FEATURE 1 — Medication Safety Check
// ═════════════════════════════════════════════════════════════════════════════

function MedicationSafetyPanel({ patientId }) {
  const [drugInput, setDrugInput]   = useState('')
  const [drugs, setDrugs]           = useState([])
  const [result, setResult]         = useState(null)
  const [loading, setLoading]       = useState(false)
  const [history, setHistory]       = useState({ diagnoses: [], allergies: [], current_medications: [] })
  const [diagInput, setDiagInput]   = useState('')
  const [allergyInput, setAllergyInput] = useState('')

  const runCheck = async () => {
    if (!drugs.length || !patientId) return
    setLoading(true)
    try {
      const res  = await fetch(`${API}/safety/medication-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId, proposed_medications: drugs }),
      })
      setResult(await res.json())
    } catch { setResult({ ok: false, warnings: ['Network error reaching safety endpoint.'] }) }
    finally { setLoading(false) }
  }

  const saveHistory = async () => {
    await fetch(`${API}/patients/${patientId}/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(history),
    })
  }

  const addItem = (key, val, clear) => {
    if (!val.trim()) return
    setHistory(h => ({ ...h, [key]: [...h[key], val.trim()] }))
    clear('')
  }
  const removeItem = (key, idx) =>
    setHistory(h => ({ ...h, [key]: h[key].filter((_, i) => i !== idx) }))

  return (
    <div className="space-y-4">
      {/* Patient history inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-2">Known Diagnoses</p>
          <div className="flex gap-2 mb-2">
            <input className="neon-input text-xs" placeholder="e.g. hypertension"
              value={diagInput} onChange={e => setDiagInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem('diagnoses', diagInput, setDiagInput)} />
            <Btn small color="#00F5D4" onClick={() => addItem('diagnoses', diagInput, setDiagInput)}>
              <Plus size={10} />
            </Btn>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {history.diagnoses.map((d, i) => (
              <span key={i} className="flex items-center gap-1 text-[10px] bg-[#00F5D4]/10 border border-[#00F5D4]/25 text-[#00F5D4] px-2 py-0.5 rounded-full">
                {d} <button onClick={() => removeItem('diagnoses', i)}><Trash2 size={8} /></button>
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-2">Allergies</p>
          <div className="flex gap-2 mb-2">
            <input className="neon-input text-xs" placeholder="e.g. penicillin"
              value={allergyInput} onChange={e => setAllergyInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem('allergies', allergyInput, setAllergyInput)} />
            <Btn small color="#FF2E93" onClick={() => addItem('allergies', allergyInput, setAllergyInput)}>
              <Plus size={10} />
            </Btn>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {history.allergies.map((a, i) => (
              <span key={i} className="flex items-center gap-1 text-[10px] bg-[#FF2E93]/10 border border-[#FF2E93]/25 text-[#FF2E93] px-2 py-0.5 rounded-full">
                {a} <button onClick={() => removeItem('allergies', i)}><Trash2 size={8} /></button>
              </span>
            ))}
          </div>
        </div>
      </div>
      <Btn color="#6366F1" onClick={saveHistory}><ShieldCheck size={11} /> Save Patient History</Btn>

      {/* Proposed medications */}
      <div>
        <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-2">Proposed Medications</p>
        <div className="flex gap-2 mb-2">
          <input className="neon-input text-xs flex-1" placeholder="e.g. Ibuprofen, Paracetamol"
            value={drugInput} onChange={e => setDrugInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && drugInput.trim()) {
                setDrugs(d => [...d, drugInput.trim()]); setDrugInput('')
              }
            }} />
          <Btn small color="#F59E0B" onClick={() => { if (drugInput.trim()) { setDrugs(d => [...d, drugInput.trim()]); setDrugInput('') } }}>
            <Plus size={10} />
          </Btn>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {drugs.map((d, i) => (
            <span key={i} className="flex items-center gap-1 text-[10px] bg-[#F59E0B]/10 border border-[#F59E0B]/25 text-[#F59E0B] px-2 py-0.5 rounded-full">
              {d} <button onClick={() => setDrugs(ds => ds.filter((_, j) => j !== i))}><Trash2 size={8} /></button>
            </span>
          ))}
        </div>
        <Btn color="#00F5D4" onClick={runCheck} disabled={loading || !drugs.length}>
          <ShieldCheck size={12} /> {loading ? 'Checking…' : 'Run Safety Check'}
        </Btn>
      </div>

      {/* Result */}
      {result && (
        <div className="space-y-2 mt-2">
          {result.ok
            ? <InfoBox type="success">✓ Safe based on known patient history — no contraindications detected.</InfoBox>
            : result.warnings.map((w, i) => <InfoBox key={i} type={w.includes('ALLERGY') ? 'error' : 'warning'}>{w}</InfoBox>)
          }
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// FEATURE 2 — Smart Question Tree
// ═════════════════════════════════════════════════════════════════════════════

function SmartQuestioning({ encounterId, chiefComplaint, ageYears }) {
  const [question, setQuestion]   = useState(null)
  const [answers, setAnswers]     = useState([])
  const [done, setDone]           = useState(false)
  const [started, setStarted]     = useState(false)
  const [freeText, setFreeText]   = useState('')

  const start = async () => {
    const res  = await fetch(`${API}/questions/first?chief_complaint=${encodeURIComponent(chiefComplaint)}&age_years=${ageYears}`)
    const data = await res.json()
    setQuestion(data.question)
    setDone(data.done)
    setStarted(true)
    setAnswers([])
  }

  const answer = async (val) => {
    if (!question) return
    setAnswers(a => [...a, { q: question.questionText, a: val, redFlag: question.isRedFlag }])
    const res  = await fetch(`${API}/questions/next`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_question_id: question.id, answer_value: val, encounter_id: encounterId }),
    })
    const data = await res.json()
    setQuestion(data.question)
    setDone(data.done)
  }

  return (
    <div className="space-y-4">
      {!started ? (
        <Btn color="#818CF8" onClick={start}><Brain size={12} /> Start AI Questioning</Btn>
      ) : done ? (
        <div className="space-y-3">
          <InfoBox type="success">Questioning complete — {answers.length} questions answered.</InfoBox>
          <div className="space-y-2">
            {answers.map((a, i) => (
              <div key={i} className="rounded-xl border px-3 py-2.5"
                style={{ background: a.redFlag ? 'rgba(255,46,147,0.05)' : 'rgba(19,27,46,0.6)',
                         borderColor: a.redFlag ? 'rgba(255,46,147,0.3)' : 'rgba(42,54,79,0.5)' }}>
                <p className="text-[9px] text-slate-500 mb-1 flex items-center gap-1.5">
                  {a.redFlag && <span className="text-[#FF2E93]">⚑ RED FLAG</span>}
                  Q{i + 1}
                </p>
                <p className="text-xs text-slate-300 mb-0.5">{a.q}</p>
                <p className="text-xs font-semibold" style={{ color: '#00F5D4' }}>→ {a.a}</p>
              </div>
            ))}
          </div>
          <Btn small color="#818CF8" onClick={() => { setStarted(false); setDone(false); setAnswers([]) }}>
            <RefreshCw size={10} /> Restart
          </Btn>
        </div>
      ) : question ? (
        <div className="rounded-2xl border p-4 space-y-3"
          style={{ background: 'rgba(19,27,46,0.8)', borderColor: question.isRedFlag ? 'rgba(255,46,147,0.4)' : 'rgba(42,54,79,0.6)' }}>
          {question.isRedFlag && <Tag color="#FF2E93">⚑ Red Flag Question</Tag>}
          <p className="text-sm font-semibold text-slate-200">{question.questionText}</p>
          {question.answerType === 'yes_no' && (
            <div className="flex gap-3">
              {['Yes', 'No'].map(opt => (
                <Btn key={opt} color={opt === 'Yes' ? '#10B981' : '#FF2E93'} onClick={() => answer(opt)}>{opt}</Btn>
              ))}
            </div>
          )}
          {question.answerType === 'multi_choice' && (
            <div className="flex flex-wrap gap-2">
              {question.options.map(opt => (
                <Btn key={opt} small color="#00F5D4" onClick={() => answer(opt)}>{opt}</Btn>
              ))}
            </div>
          )}
          {question.answerType === 'scale' && (
            <div className="space-y-2">
              <input type="range" min="0" max="10" className="w-full accent-[#00F5D4]"
                value={freeText || 5} onChange={e => setFreeText(e.target.value)} />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                <span>0 – None</span><span className="text-[#00F5D4] font-bold">{freeText || 5}</span><span>10 – Severe</span>
              </div>
              <Btn color="#00F5D4" onClick={() => answer(String(freeText || 5))}>Confirm</Btn>
            </div>
          )}
          {question.answerType === 'free_text' && (
            <div className="flex gap-2">
              <input className="neon-input text-xs flex-1" value={freeText} onChange={e => setFreeText(e.target.value)} placeholder="Type answer…" />
              <Btn color="#00F5D4" onClick={() => { answer(freeText); setFreeText('') }}>Submit</Btn>
            </div>
          )}
          <div className="text-[9px] font-mono text-slate-700 mt-1">
            {answers.length} answered · {question.id}
          </div>
        </div>
      ) : null}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// FEATURE 3 — Care Card View
// ═════════════════════════════════════════════════════════════════════════════

function CareCardView({ encounterId }) {
  const [card, setCard]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [remPD, setRemPD]     = useState(2)

  const load = async () => {
    setLoading(true)
    try {
      const res  = await fetch(`${API}/encounters/${encounterId}/care-card`)
      if (res.ok) setCard(await res.json())
    } catch { /* silent */ } finally { setLoading(false) }
  }

  const toggleReminder = async (flag) => {
    await fetch(`${API}/encounters/${encounterId}/care-card/reminder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reminder_flag: flag, reminders_per_day: remPD }),
    })
    setCard(c => c ? { ...c, reminder_flag: flag, reminders_per_day: remPD } : c)
  }

  if (!card) return (
    <Btn color="#10B981" onClick={load} disabled={loading}>
      <Heart size={12} /> {loading ? 'Loading…' : 'Load Care Card'}
    </Btn>
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border px-4 py-3" style={{ background: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.3)' }}>
        <p className="text-[9px] font-mono text-[#10B981] uppercase tracking-widest mb-1">Care Card · {card.patient_name}</p>
        <p className="text-sm text-slate-300 leading-relaxed">{card.summary}</p>
      </div>
      {/* Today actions */}
      <div>
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-2">Today's Actions</p>
        <ul className="space-y-1.5">
          {card.today_actions?.map((a, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
              <CheckCircle2 size={12} style={{ color: '#10B981' }} className="mt-0.5 flex-shrink-0" />
              {a}
            </li>
          ))}
        </ul>
      </div>
      {/* Medication plan */}
      {card.medication_plan?.length > 0 && (
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-2">Medication Plan</p>
          <div className="space-y-1.5">
            {card.medication_plan.map((m, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border px-3 py-2"
                style={{ background: 'rgba(0,245,212,0.04)', borderColor: 'rgba(0,245,212,0.2)' }}>
                <span className="text-sm font-semibold text-slate-200">{m.name}</span>
                <Tag color="#00F5D4">{m.time}</Tag>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Warning signs */}
      <div>
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-2">⚠ Warning Signs — Return Immediately If:</p>
        <ul className="space-y-1.5">
          {card.warning_signs?.map((w, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-[#F59E0B]">
              <AlertTriangle size={11} className="mt-0.5 flex-shrink-0" />
              {w}
            </li>
          ))}
        </ul>
      </div>
      {/* Reminder toggle */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Bell size={12} style={{ color: card.reminder_flag ? '#10B981' : '#64748B' }} />
          <span className="text-xs text-slate-400">Reminders per day:</span>
          <select className="neon-input w-16 text-xs py-1" value={remPD} onChange={e => setRemPD(+e.target.value)}>
            {[1,2,3,4].map(n => <option key={n}>{n}</option>)}
          </select>
        </div>
        <Btn small color={card.reminder_flag ? '#10B981' : '#64748B'} onClick={() => toggleReminder(!card.reminder_flag)}>
          <Bell size={10} /> {card.reminder_flag ? 'Reminders ON' : 'Set Reminder'}
        </Btn>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// FEATURE 4 — Caregiver + QR Code
// ═════════════════════════════════════════════════════════════════════════════

function CaregiverQRPanel({ patientId }) {
  const [form, setForm]     = useState({ name: '', relation: '', phone: '' })
  const [token, setToken]   = useState(null)
  const [saved, setSaved]   = useState(false)

  const save = async () => {
    await fetch(`${API}/patients/${patientId}/caregiver`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaved(true)
  }

  const generateQR = async () => {
    const res  = await fetch(`${API}/patients/${patientId}/qr-token`, { method: 'POST' })
    const data = await res.json()
    setToken(data.qr_token)
  }

  const qrUrl = token ? `${API}/qr/${token}` : null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <NeonInput label="Caregiver Name" placeholder="e.g. Sita Devi" value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <NeonInput label="Relation" placeholder="e.g. Daughter" value={form.relation}
          onChange={e => setForm(f => ({ ...f, relation: e.target.value }))} />
        <NeonInput label="Phone" placeholder="+91 9XXXXXXXXX" value={form.phone}
          onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
      </div>
      <div className="flex gap-3">
        <Btn color="#00F5D4" onClick={save}><CheckCircle2 size={12} /> Save Caregiver</Btn>
        {saved && <Btn color="#818CF8" onClick={generateQR}><QrCode size={12} /> Generate QR Code</Btn>}
      </div>
      {saved && <InfoBox type="success">Caregiver details saved.</InfoBox>}
      {qrUrl && (
        <div className="rounded-xl border p-4 flex flex-col items-center gap-3"
          style={{ background: 'rgba(19,27,46,0.8)', borderColor: 'rgba(0,245,212,0.3)' }}>
          <p className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">Caregiver QR Code</p>
          <div className="p-3 bg-white rounded-xl">
            <QRCodeSVG value={qrUrl} size={160} level="M" />
          </div>
          <p className="text-[9px] text-[#00F5D4] font-mono break-all text-center">{qrUrl}</p>
          <p className="text-[9px] text-slate-600 text-center">
            Caregiver scans this code to view read-only patient summary
          </p>
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// FEATURE 5 — Consult Transcript Panel
// ═════════════════════════════════════════════════════════════════════════════

function ConsultTranscriptPanel({ encounterId }) {
  const [sessionId, setSessionId]   = useState(null)
  const [lines, setLines]           = useState([])
  const [stats, setStats]           = useState(null)
  const [lineText, setLineText]     = useState('')
  const [speaker, setSpeaker]       = useState('doctor')
  const [ended, setEnded]           = useState(false)
  const bottomRef                   = useRef(null)

  const startSession = async () => {
    const res  = await fetch(`${API}/consult/sessions/start`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ encounter_id: encounterId }),
    })
    const data = await res.json()
    setSessionId(data.session_id)
    setLines([])
    setStats(null)
    setEnded(false)
  }

  const addLine = async () => {
    if (!lineText.trim() || !sessionId) return
    const res  = await fetch(`${API}/consult/transcript`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, speaker, text: lineText.trim() }),
    })
    const entry = await res.json()
    setLines(l => [...l, entry])
    setLineText('')
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  const endSession = async () => {
    await fetch(`${API}/consult/sessions/${sessionId}/end`, { method: 'POST' })
    const res  = await fetch(`${API}/consult/sessions/${sessionId}/stats`)
    setStats(await res.json())
    setEnded(true)
  }

  const SPEAKER_COLOR = { doctor: '#818CF8', worker: '#00F5D4', patient: '#10B981' }

  return (
    <div className="space-y-3">
      {!sessionId ? (
        <Btn color="#818CF8" onClick={startSession}><Mic size={12} /> Start Transcript Session</Btn>
      ) : (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <Tag color="#818CF8">Session {sessionId}</Tag>
            {ended
              ? <Tag color="#10B981">Ended</Tag>
              : <span className="text-[9px] font-mono text-[#FF2E93] animate-pulse">● LIVE</span>
            }
          </div>
          {/* Transcript scroll pane */}
          <div className="rounded-xl border p-3 h-40 overflow-y-auto space-y-2"
            style={{ background: 'rgba(10,15,29,0.7)', borderColor: 'rgba(42,54,79,0.5)' }}>
            {lines.map((l, i) => (
              <div key={i} className={`flex items-start gap-2 ${l.is_red_flag ? 'animate-pulse' : ''}`}>
                <span className="text-[9px] font-mono font-bold flex-shrink-0 w-12"
                  style={{ color: SPEAKER_COLOR[l.speaker] ?? '#00F5D4' }}>
                  {l.speaker.toUpperCase()}
                </span>
                <span className={`text-xs leading-relaxed ${l.is_red_flag ? 'text-[#FF2E93]' : 'text-slate-300'}`}>
                  {l.is_red_flag && '⚑ '}{l.text}
                </span>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          {/* Input */}
          {!ended && (
            <div className="flex gap-2">
              <select className="neon-input w-28 text-xs" value={speaker} onChange={e => setSpeaker(e.target.value)}>
                <option value="doctor">Doctor</option>
                <option value="worker">Worker</option>
                <option value="patient">Patient</option>
              </select>
              <input className="neon-input flex-1 text-xs" placeholder="Type or paste sentence…"
                value={lineText} onChange={e => setLineText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addLine()} />
              <Btn small color="#00F5D4" onClick={addLine}><Plus size={10} /></Btn>
              <Btn small color="#FF2E93" onClick={endSession}>End</Btn>
            </div>
          )}
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Questions', val: stats.questions_asked, color: '#818CF8' },
                { label: 'Red Flags', val: stats.red_flags_mentioned, color: '#FF2E93' },
                { label: 'Lines', val: stats.total_lines, color: '#00F5D4' },
              ].map(({ label, val, color }) => (
                <div key={label} className="rounded-xl border p-3 text-center"
                  style={{ background: `${color}08`, borderColor: `${color}25` }}>
                  <p className="font-mono text-xl font-bold" style={{ color }}>{val}</p>
                  <p className="text-[8px] text-slate-600 uppercase tracking-widest">{label}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// FEATURE 6 — Offline PDF Summary
// ═════════════════════════════════════════════════════════════════════════════

const IDB_STORE = 'caresetu-summaries'

async function saveToIndexedDB(encounterId, data) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('CareSetu', 1)
    req.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE, { keyPath: 'encounter_id' })
    req.onsuccess = e => {
      const tx = e.target.result.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).put({ ...data, encounter_id: encounterId })
      tx.oncomplete = () => resolve()
      tx.onerror    = () => reject()
    }
    req.onerror = () => reject()
  })
}

async function loadFromIndexedDB(encounterId) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('CareSetu', 1)
    req.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE, { keyPath: 'encounter_id' })
    req.onsuccess = e => {
      const tx   = e.target.result.transaction(IDB_STORE, 'readonly')
      const get  = tx.objectStore(IDB_STORE).get(encounterId)
      get.onsuccess = () => resolve(get.result ?? null)
      get.onerror   = () => reject()
    }
    req.onerror = () => reject()
  })
}

function renderPrintHTML(summary) {
  return `
    <html><head><title>CareSetu — Patient Summary</title>
    <style>
      body { font-family: system-ui, sans-serif; padding: 32px; color: #1f2328; max-width: 720px; margin: 0 auto; }
      h1 { font-size: 22px; margin-bottom: 4px; } h2 { font-size: 14px; color: #57606a; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-top: 24px; }
      .badge { display:inline-block; padding: 2px 10px; border-radius: 999px; font-size:11px; font-weight:700; }
      .crit { background:#ffe0ef; color:#c0185c; } .high { background:#fff3cd; color:#856404; }
      .low  { background:#d1fae5; color:#065f46; } .med  { background:#fff3cd; color:#856404; }
      ul { margin: 8px 0; padding-left: 20px; } li { margin: 4px 0; font-size:13px; }
      .vgrid { display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:12px; margin:12px 0; }
      .vcard { border:1px solid #e5e7eb; border-radius:8px; padding:10px; text-align:center; }
      .vnum  { font-size:20px; font-weight:700; font-family:monospace; }
      .vlbl  { font-size:10px; color:#57606a; }
      footer { margin-top:40px; font-size:10px; color:#57606a; border-top:1px solid #e5e7eb; padding-top:8px; }
    </style></head><body>
    <h1>CareSetu AI — Patient Summary</h1>
    <p style="font-size:12px;color:#57606a;">Generated: ${summary.generated_at ?? new Date().toISOString()}</p>
    <h2>Patient</h2>
    <p><b>${summary.patient?.name}</b> · ${summary.patient?.age}y · ${summary.patient?.gender} · ${summary.patient?.language}</p>
    <p><b>Chief Complaint:</b> ${summary.patient?.symptoms}</p>
    <h2>Vitals</h2>
    <div class="vgrid">
      <div class="vcard"><div class="vnum">${summary.vitals?.spo2 ?? '—'}</div><div class="vlbl">SpO₂ %</div></div>
      <div class="vcard"><div class="vnum">${summary.vitals?.temperature ?? '—'}</div><div class="vlbl">Temp °F</div></div>
      <div class="vcard"><div class="vnum">${summary.vitals?.bp_systolic ?? '—'}/${summary.vitals?.bp_diastolic ?? '—'}</div><div class="vlbl">BP mmHg</div></div>
      <div class="vcard"><div class="vnum">${summary.vitals?.pulse ?? '—'}</div><div class="vlbl">Pulse bpm</div></div>
    </div>
    <h2>AI Triage — <span class="${(summary.triage?.risk_level ?? 'LOW').toLowerCase()} badge">${summary.triage?.risk_level ?? 'N/A'}</span></h2>
    <p>${summary.triage?.summary ?? ''}</p>
    ${summary.triage?.first_aid_instructions?.length ? `<h2>First Aid</h2><ul>${summary.triage.first_aid_instructions.map(s => `<li>${s}</li>`).join('')}</ul>` : ''}
    ${summary.qa_history?.length ? `<h2>Q&A History</h2><ul>${summary.qa_history.map(q => `<li><b>${q.question_text}</b> → ${q.answer_value}${q.is_red_flag ? ' 🚩' : ''}</li>`).join('')}</ul>` : ''}
    ${summary.care_card ? `<h2>Care Card</h2><ul>${summary.care_card.today_actions?.map(a => `<li>${a}</li>`).join('') ?? ''}</ul>` : ''}
    <footer>CareSetu AI · Offline Summary · Not a substitute for professional medical advice.</footer>
    </body></html>`
}

function OfflineSummaryPanel({ encounterId }) {
  const [status, setStatus] = useState('')

  const cacheSummary = async () => {
    setStatus('Fetching…')
    try {
      const res  = await fetch(`${API}/encounters/${encounterId}/offline-summary`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      await saveToIndexedDB(encounterId, data)
      setStatus('Cached to device ✓')
    } catch { setStatus('Fetch failed — trying local cache…'); loadOffline() }
  }

  const loadOffline = async () => {
    const data = await loadFromIndexedDB(encounterId)
    if (!data) { setStatus('No cached data available.'); return }
    printSummary(data)
  }

  const printSummary = (data) => {
    const win = window.open('', '_blank')
    win.document.write(renderPrintHTML(data))
    win.document.close()
    win.print()
  }

  const handleDownload = async () => {
    let data = null
    try {
      const res = await fetch(`${API}/encounters/${encounterId}/offline-summary`)
      if (res.ok) { data = await res.json(); await saveToIndexedDB(encounterId, data) }
    } catch { /* offline */ }
    if (!data) data = await loadFromIndexedDB(encounterId)
    if (!data) { setStatus('No data available.'); return }
    printSummary(data)
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3 flex-wrap">
        <Btn color="#6366F1" onClick={cacheSummary}><Download size={12} /> Cache to Device</Btn>
        <Btn color="#00F5D4" onClick={handleDownload}><Download size={12} /> Download / Print PDF</Btn>
      </div>
      {status && <InfoBox type={status.includes('✓') ? 'success' : 'info'}>{status}</InfoBox>}
      <p className="text-[9px] text-slate-600 leading-relaxed">
        Cached data is stored in your browser's IndexedDB and available offline.
        "Download / Print PDF" works even without network using cached data.
      </p>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// FEATURE 7 — Disease Heatmap
// ═════════════════════════════════════════════════════════════════════════════

const SYNDROME_COLORS = {
  ACUTE_FEVER:          '#FF2E93',
  COUGH_BREATHLESSNESS: '#F59E0B',
  DIARRHOEA_VOMITING:   '#818CF8',
  WOUND_INJURY:         '#10B981',
  CHEST_PAIN:           '#EF4444',
  UNCONSCIOUSNESS:      '#EC4899',
  OTHER:                '#64748B',
}

function DiseaseHeatmap() {
  const [alerts, setAlerts]   = useState([])
  const [counts, setCounts]   = useState({})
  const [loading, setLoading] = useState(false)
  const [form, setForm]       = useState({ encounter_id: '', village_id: '', chief_complaint: '' })

  const load = async () => {
    setLoading(true)
    try {
      const [aRes, cRes] = await Promise.all([
        fetch(`${API}/analytics/cluster-alerts`),
        fetch(`${API}/analytics/village-counts`),
      ])
      const aData = await aRes.json()
      const cData = await cRes.json()
      setAlerts(aData.alerts ?? [])
      setCounts(cData)
    } catch { /* silent */ } finally { setLoading(false) }
  }

  const record = async () => {
    await fetch(`${API}/villages/encounter`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    load()
    setForm({ encounter_id: '', village_id: '', chief_complaint: '' })
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-4">
      {/* Record form */}
      <div className="grid grid-cols-3 gap-3">
        <NeonInput label="Encounter ID" placeholder="enc_001" value={form.encounter_id}
          onChange={e => setForm(f => ({ ...f, encounter_id: e.target.value }))} />
        <NeonInput label="Village ID" placeholder="VILL_A1" value={form.village_id}
          onChange={e => setForm(f => ({ ...f, village_id: e.target.value }))} />
        <NeonInput label="Chief Complaint" placeholder="fever, cough…" value={form.chief_complaint}
          onChange={e => setForm(f => ({ ...f, chief_complaint: e.target.value }))} />
      </div>
      <div className="flex gap-3">
        <Btn color="#818CF8" onClick={record}><Plus size={12} /> Record Encounter</Btn>
        <Btn small color="#00F5D4" onClick={load} disabled={loading}>
          <RefreshCw size={10} className={loading ? 'animate-spin' : ''} /> Refresh
        </Btn>
      </div>

      {/* Cluster alerts */}
      {alerts.length > 0 && (
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#FF2E93] mb-2">⚠ Active Cluster Alerts</p>
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div key={i} className="rounded-xl border px-3 py-2.5 flex items-center justify-between"
                style={{ background: 'rgba(255,46,147,0.06)', borderColor: 'rgba(255,46,147,0.3)' }}>
                <div>
                  <span className="text-xs font-bold text-slate-200">{a.village_id}</span>
                  <span className="ml-2 text-[10px] text-slate-500">{a.syndrome_tag.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-[#FF2E93]">{a.count} cases</span>
                  <Tag color={a.alert_level === 'HIGH' ? '#FF2E93' : '#F59E0B'}>{a.alert_level}</Tag>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Village table */}
      {Object.keys(counts).length > 0 && (
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-2">Village Syndrome Counts</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b" style={{ borderColor: 'rgba(42,54,79,0.5)' }}>
                  <th className="text-left py-2 pr-4 text-slate-500 font-bold text-[9px] uppercase">Village</th>
                  {Object.keys(SYNDROME_COLORS).map(s => (
                    <th key={s} className="text-center px-2 py-2 text-[8px] font-bold uppercase"
                      style={{ color: SYNDROME_COLORS[s] }}>{s.split('_')[0]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(counts).map(([vid, syndromes]) => (
                  <tr key={vid} className="border-b" style={{ borderColor: 'rgba(42,54,79,0.3)' }}>
                    <td className="py-1.5 pr-4 text-slate-300 font-mono text-[10px]">{vid}</td>
                    {Object.keys(SYNDROME_COLORS).map(s => {
                      const cnt = syndromes[s] ?? 0
                      return (
                        <td key={s} className="text-center px-2 py-1.5">
                          {cnt > 0 ? (
                            <span className="font-mono font-bold text-xs rounded px-1.5 py-0.5"
                              style={{ color: SYNDROME_COLORS[s], background: `${SYNDROME_COLORS[s]}18` }}>
                              {cnt}
                            </span>
                          ) : <span className="text-slate-700">—</span>}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {alerts.length === 0 && Object.keys(counts).length === 0 && (
        <p className="text-xs text-slate-600 font-mono text-center py-4">No village data recorded yet.</p>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// FEATURE 8 — Pediatric Safety Mode
// ═════════════════════════════════════════════════════════════════════════════

function PediatricSafetyPanel({ ageYears }) {
  const [med, setMed]     = useState('')
  const [dose, setDose]   = useState('')
  const [weight, setWeight] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const isPediatric = (ageYears ?? 99) < 12

  const check = async () => {
    setLoading(true)
    try {
      const res  = await fetch(`${API}/pediatric/dose-check`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age_years: ageYears, weight_kg: weight ? +weight : null,
          medication: med, proposed_dose_mg: +dose,
        }),
      })
      setResult(await res.json())
    } catch { /* silent */ } finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      {isPediatric && (
        <div className="rounded-xl border px-4 py-3 flex items-center gap-3 animate-pulse"
          style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.4)' }}>
          <Baby size={16} style={{ color: '#F59E0B' }} />
          <div>
            <p className="text-sm font-bold text-[#F59E0B]">Pediatric Safety Mode Active</p>
            <p className="text-[10px] text-slate-400">Patient age {ageYears}y — all doses subject to weight-based validation.</p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        <NeonInput label="Medication" placeholder="e.g. Paracetamol" value={med}
          onChange={e => setMed(e.target.value)} />
        <NeonInput label="Proposed Dose (mg)" type="number" placeholder="250" value={dose}
          onChange={e => setDose(e.target.value)} />
        <NeonInput label="Weight (kg, optional)" type="number" placeholder="18" value={weight}
          onChange={e => setWeight(e.target.value)} />
      </div>
      <Btn color="#F59E0B" onClick={check} disabled={loading || !med || !dose}>
        <Baby size={12} /> {loading ? 'Checking…' : 'Validate Pediatric Dose'}
      </Btn>
      {result && (
        <div className="space-y-2">
          {result.ok
            ? <InfoBox type="success">✓ Dose within safe range for this patient.</InfoBox>
            : null
          }
          {result.warnings?.map((w, i) => (
            <InfoBox key={i} type={w.startsWith('⚠') ? 'warning' : 'info'}>{w}</InfoBox>
          ))}
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// FEATURE 9 — Referral QR
// ═════════════════════════════════════════════════════════════════════════════

function ReferralQRPanel({ encounterId }) {
  const [token, setToken]   = useState(null)
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    setLoading(true)
    try {
      const res  = await fetch(`${API}/encounters/${encounterId}/referral-token`, { method: 'POST' })
      const data = await res.json()
      setToken(data.referral_token)
    } catch { /* silent */ } finally { setLoading(false) }
  }

  const qrUrl = token ? `${API}/referral/${token}` : null

  return (
    <div className="space-y-4">
      <Btn color="#10B981" onClick={generate} disabled={loading || !!token}>
        <QrCode size={12} /> {loading ? 'Generating…' : token ? 'Referral QR Generated' : 'Generate Referral QR'}
      </Btn>
      {qrUrl && (
        <div className="rounded-xl border p-4 flex flex-col items-center gap-3"
          style={{ background: 'rgba(16,185,129,0.04)', borderColor: 'rgba(16,185,129,0.3)' }}>
          <p className="text-[9px] font-mono text-[#10B981] uppercase tracking-widest">Hospital Referral QR</p>
          <div className="p-3 bg-white rounded-xl">
            <QRCodeSVG value={qrUrl} size={160} level="M" />
          </div>
          <p className="text-[9px] text-[#10B981] font-mono break-all text-center">{qrUrl}</p>
          <p className="text-[9px] text-slate-600 text-center max-w-xs">
            Receiving hospital scans this code to instantly access patient vitals,
            triage level, conditions, allergies and current medications.
          </p>
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// FEATURE 10 — AI Review Alignment Check
// ═════════════════════════════════════════════════════════════════════════════

function AIReviewCheck({ encounterId, aiSummary }) {
  const [doctorNotes, setDoctorNotes] = useState('')
  const [result, setResult]           = useState(null)
  const [loading, setLoading]         = useState(false)

  const run = async () => {
    setLoading(true)
    try {
      const res  = await fetch(`${API}/ai/review-check`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          encounter_id: encounterId,
          ai_draft_summary: aiSummary ?? '',
          doctor_final_notes: doctorNotes,
        }),
      })
      setResult(await res.json())
    } catch { /* silent */ } finally { setLoading(false) }
  }

  const scoreColor = result
    ? result.alignment_score >= 75 ? '#10B981'
    : result.alignment_score >= 45 ? '#F59E0B'
    : '#FF2E93'
    : '#00F5D4'

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block mb-1.5">
          Doctor's Final Notes
        </label>
        <textarea
          className="neon-input resize-none text-xs"
          rows={4}
          placeholder="Enter your clinical assessment and final notes here…"
          value={doctorNotes}
          onChange={e => setDoctorNotes(e.target.value)}
        />
      </div>
      <Btn color="#818CF8" onClick={run} disabled={loading || !doctorNotes.trim()}>
        <Sparkles size={12} /> {loading ? 'Analysing…' : 'Run AI Safety Check (Beta)'}
      </Btn>

      {result && (
        <div className="space-y-3">
          {/* Score ring */}
          <div className="rounded-xl border p-4 flex items-center gap-5"
            style={{ background: `${scoreColor}06`, borderColor: `${scoreColor}30` }}>
            <div className="relative w-16 h-16 flex-shrink-0">
              <svg viewBox="0 0 60 60" className="w-full h-full">
                <circle cx="30" cy="30" r="24" fill="none" stroke="rgba(42,54,79,0.8)" strokeWidth="5" />
                <circle cx="30" cy="30" r="24" fill="none"
                  stroke={scoreColor} strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={`${(result.alignment_score / 100) * 150.8} 150.8`}
                  transform="rotate(-90 30 30)"
                  style={{ filter: `drop-shadow(0 0 4px ${scoreColor})`, transition: 'all 0.8s ease' }}
                />
                <text x="30" y="35" textAnchor="middle" fontSize="11" fontWeight="700"
                  fontFamily="JetBrains Mono, monospace" fill={scoreColor}>{result.alignment_score}</text>
              </svg>
            </div>
            <div>
              <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1">Alignment Score</p>
              <p className="text-sm font-semibold text-slate-200">{result.recommendation}</p>
            </div>
          </div>
          {/* Flags */}
          {result.flags?.map((f, i) => <InfoBox key={i} type="warning">{f}</InfoBox>)}
          {/* Disclaimer */}
          <InfoBox type="info">{result.disclaimer}</InfoBox>
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Main export — accordion of all 10 feature panels
// ═════════════════════════════════════════════════════════════════════════════

export default function FeaturesPanel({ patientId, encounterId, ageYears, chiefComplaint, aiSummary }) {
  const hasEncounter = !!encounterId
  const pid = patientId ?? 1
  const eid = encounterId ?? `enc_${pid}`

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-0.5 h-4 rounded-full bg-[#818CF8]" style={{ boxShadow: '0 0 6px #818CF8' }} />
        <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-slate-500">
          Extended Features
        </span>
        <span className="text-[8px] font-mono text-slate-700 ml-1">· 10 modules active</span>
      </div>

      <Panel icon={ShieldCheck} title="1 — Medication Safety Check" accent="#10B981" defaultOpen>
        <MedicationSafetyPanel patientId={pid} />
      </Panel>

      <Panel icon={Brain} title="2 — AI Smart Questioning" accent="#818CF8">
        <SmartQuestioning encounterId={eid} chiefComplaint={chiefComplaint ?? 'fever'} ageYears={ageYears ?? 30} />
      </Panel>

      <Panel icon={Heart} title="3 — Care Card" accent="#10B981">
        {hasEncounter
          ? <CareCardView encounterId={eid} />
          : <InfoBox type="info">Submit a patient assessment first to generate a Care Card.</InfoBox>}
      </Panel>

      <Panel icon={QrCode} title="4 — Caregiver & Patient QR" accent="#00F5D4">
        <CaregiverQRPanel patientId={pid} />
      </Panel>

      <Panel icon={Mic} title="5 — Consult Transcript" accent="#818CF8">
        <ConsultTranscriptPanel encounterId={eid} />
      </Panel>

      <Panel icon={Download} title="6 — Offline PDF Summary" accent="#6366F1">
        {hasEncounter
          ? <OfflineSummaryPanel encounterId={eid} />
          : <InfoBox type="info">A patient encounter is required for offline summary caching.</InfoBox>}
      </Panel>

      <Panel icon={MapPin} title="7 — Village Disease Heatmap" accent="#FF2E93">
        <DiseaseHeatmap />
      </Panel>

      <Panel icon={Baby} title="8 — Pediatric Safety Mode" accent="#F59E0B">
        <PediatricSafetyPanel ageYears={ageYears ?? 30} />
      </Panel>

      <Panel icon={FileCheck} title="9 — Referral QR Code" accent="#10B981">
        {hasEncounter
          ? <ReferralQRPanel encounterId={eid} />
          : <InfoBox type="info">A patient encounter is required to generate a referral QR code.</InfoBox>}
      </Panel>

      <Panel icon={Sparkles} title="10 — AI Review Alignment Check (Beta)" accent="#818CF8">
        <AIReviewCheck encounterId={eid} aiSummary={aiSummary} />
      </Panel>
    </div>
  )
}
