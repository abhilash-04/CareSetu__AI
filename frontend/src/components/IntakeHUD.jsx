import { useState, useRef } from 'react'
import { Mic, MicOff, Upload, User, Languages, ChevronDown } from 'lucide-react'
import { LANGUAGES, SectionHead, GlassPanel, Waveform, API_BASE } from './shared'
import VitalsHUD from './VitalsHUD'

const EMPTY_VITALS = {
  temperature: '', spo2: '', bp_systolic: '', bp_diastolic: '', pulse: '',
}

export default function IntakeHUD({ onSubmit, loading }) {
  const [fields, setFields]     = useState({ name: '', age: '', gender: '', language: '' })
  const [vitals, setVitals]     = useState(EMPTY_VITALS)
  const [symptoms, setSymptoms] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [recording, setRecording]   = useState(false)
  const [transcript, setTranscript] = useState('')
  const [dragOver, setDragOver]     = useState(false)

  const mediaRef       = useRef(null)
  const audioChunksRef = useRef([])
  const fileInputRef   = useRef(null)

  // ── Voice ──────────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      mediaRef.current = mr
      audioChunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        await sendTranscribe(blob)
      }
      mr.start()
      setRecording(true)
    } catch {
      alert('Microphone access denied.')
    }
  }

  const stopRecording = () => {
    mediaRef.current?.stop()
    setRecording(false)
  }

  const sendTranscribe = async (blob) => {
    const fd = new FormData()
    fd.append('audio', blob, 'recording.wav')
    try {
      const res  = await fetch(`${API_BASE}/api/transcribe`, { method: 'POST', body: fd })
      const data = await res.json()
      setTranscript(data.transcript || '')
      setSymptoms(prev => `${prev} ${data.transcript || ''}`.trim())
    } catch { /* non-fatal */ }
  }

  // ── Image upload ───────────────────────────────────────────────────────
  const handleImage = (file) => {
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = e => setImagePreview(e.target.result)
    reader.readAsDataURL(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleImage(e.dataTransfer.files[0])
  }

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault()
    const fd = new FormData()
    Object.entries(fields).forEach(([k, v]) => fd.append(k, v))
    Object.entries(vitals).forEach(([k, v]) => fd.append(k, v))
    fd.append('symptoms', symptoms)
    if (imageFile) fd.append('image', imageFile)
    onSubmit(fd)
  }

  const setField  = (k, v) => setFields(p  => ({ ...p, [k]: v }))
  const setVital  = (k, v) => setVitals(p  => ({ ...p, [k]: v }))

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* ── Patient Demographics ── */}
      <GlassPanel>
        <SectionHead icon={User} label="Patient Demographics" />
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 flex flex-col gap-1.5">
            <label className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">Full Name</label>
            <input className="neon-input" required placeholder="e.g. Ramesh Kumar"
              value={fields.name} onChange={e => setField('name', e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">Age</label>
            <input className="neon-input" required type="number" min="0" max="120" placeholder="Age"
              value={fields.age} onChange={e => setField('age', e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">Gender</label>
            <div className="relative">
              <select className="neon-select pr-7" required
                value={fields.gender} onChange={e => setField('gender', e.target.value)}>
                <option value="">Select…</option>
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <label className="text-[10px] text-slate-500 uppercase tracking-widest font-medium flex items-center gap-1.5">
              <Languages size={10} className="text-[#00F5D4]" /> Preferred Language
            </label>
            <div className="relative">
              <select className="neon-select pr-7" required
                value={fields.language} onChange={e => setField('language', e.target.value)}>
                <option value="">Select language…</option>
                {LANGUAGES.map(l => <option key={l}>{l}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* ── Vitals HUD ── */}
      <GlassPanel>
        <SectionHead icon={null} label="Vitals Telemetry HUD" color="#00F5D4" />
        <VitalsHUD vitals={vitals} onChange={setVital} />
      </GlassPanel>

      {/* ── Voice & Vision Suite ── */}
      <GlassPanel>
        <SectionHead icon={Mic} label="Voice & Vision Suite" color="#FF2E93" />

        {/* Mic button + waveform */}
        <div className="flex items-center gap-3 mb-3">
          <button
            type="button"
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            onClick={e => e.preventDefault()}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-semibold text-xs uppercase tracking-widest transition-all duration-200 select-none ${
              recording
                ? 'bg-[#FF2E93]/10 border-[#FF2E93]/60 text-[#FF2E93] shadow-glow-coral scale-95'
                : 'bg-[#00F5D4]/5 border-[#00F5D4]/30 text-[#00F5D4] hover:bg-[#00F5D4]/10 hover:shadow-glow-cyan'
            }`}
          >
            {recording ? <MicOff size={14} /> : <Mic size={14} />}
            {recording ? 'Release to Send' : 'Hold to Speak'}
          </button>
          <Waveform active={recording} />
          {transcript && !recording && (
            <span className="text-[10px] text-[#10B981] font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              Voice captured
            </span>
          )}
        </div>

        {/* Transcript preview */}
        {transcript && (
          <div className="mb-3 bg-[#10B981]/5 border border-[#10B981]/30 rounded-lg px-3 py-2">
            <p className="text-[10px] text-[#10B981] font-bold uppercase tracking-widest mb-1">Transcribed</p>
            <p className="text-xs text-slate-300 leading-relaxed">{transcript}</p>
          </div>
        )}

        {/* Symptoms textarea */}
        <label className="text-[10px] text-slate-500 uppercase tracking-widest font-medium mb-1.5 block">
          Chief Complaint / Symptoms
        </label>
        <textarea
          rows={3}
          required
          placeholder="Describe patient symptoms… or use voice recording above"
          value={symptoms}
          onChange={e => setSymptoms(e.target.value)}
          className="neon-input resize-none mb-3"
        />

        {/* Image / Document drag-drop zone */}
        <label
          className={`block relative border-2 border-dashed rounded-xl p-5 cursor-pointer transition-all duration-200 ${
            dragOver
              ? 'border-[#00F5D4] bg-[#00F5D4]/5 shadow-glow-cyan'
              : 'border-navy-400/60 hover:border-[#00F5D4]/50 hover:bg-[#00F5D4]/5'
          }`}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {imagePreview ? (
            <div className="relative overflow-hidden rounded-lg">
              <img src={imagePreview} alt="preview" className="w-full max-h-40 object-cover rounded-lg" />
              {/* scan beam overlay */}
              <div className="absolute inset-0 overflow-hidden rounded-lg">
                <div className="scan-beam" />
              </div>
              <div className="absolute inset-0 rounded-lg border border-[#00F5D4]/30" />
              <p className="mt-2 text-[10px] text-[#00F5D4] text-center font-mono">
                {imageFile?.name}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-center">
              <Upload size={22} className="text-slate-500" />
              <p className="text-xs text-slate-400 font-medium">Drop prescription or wound photo here</p>
              <p className="text-[10px] text-slate-600">JPG · PNG · PDF — OCR auto-extracted</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file" accept="image/*,.pdf"
            className="hidden"
            onChange={e => handleImage(e.target.files[0])}
          />
        </label>
      </GlassPanel>

      {/* ── CTA ── */}
      <button type="submit" disabled={loading} className="btn-triage flex items-center justify-center gap-3">
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Engaging AI Triage Engine…
          </>
        ) : (
          '⚡ ENGAGE AI TRIAGE ENGINE'
        )}
      </button>
    </form>
  )
}
