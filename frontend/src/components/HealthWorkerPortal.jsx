import { useState, useRef } from 'react'
import IntakeForm from './IntakeForm'
import AssessmentResult from './AssessmentResult'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function HealthWorkerPortal() {
  const [result, setResult]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  // Audio recording state
  const [recording, setRecording]         = useState(false)
  const [transcript, setTranscript]       = useState('')
  const mediaRecorderRef                  = useRef(null)
  const audioChunksRef                    = useRef([])

  // ── Voice recording helpers ──────────────────────────────────────────────
  const startRecording = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        stream.getTracks().forEach((t) => t.stop())
        await transcribeAudio(blob)
      }

      mediaRecorder.start()
      setRecording(true)
    } catch {
      setError('Microphone access denied. Please allow microphone permissions.')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  const transcribeAudio = async (blob) => {
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('audio', blob, 'recording.wav')
      const res = await fetch(`${API_BASE}/api/transcribe`, { method: 'POST', body: fd })
      if (!res.ok) throw new Error(`Transcription failed (${res.status})`)
      const data = await res.json()
      setTranscript(data.transcript)
    } catch (err) {
      setError(`Transcription error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // ── Patient assessment submission ────────────────────────────────────────
  const handleSubmit = async (formData) => {
    setLoading(true)
    setError(null)
    setResult(null)

    // Inject transcript into symptoms if recorded
    if (transcript && !formData.get('symptoms')) {
      formData.set('symptoms', transcript)
    } else if (transcript) {
      const existing = formData.get('symptoms')
      formData.set('symptoms', `${existing} ${transcript}`.trim())
    }

    try {
      const res = await fetch(`${API_BASE}/api/assess-patient`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.detail || `Server error (${res.status})`)
      }
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(`Assessment failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* ── Header ── */}
      <header className="bg-blue-700 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
          <span className="text-2xl">🏥</span>
          <div>
            <h1 className="text-xl font-bold tracking-tight leading-tight">
              Virtual Village Clinic
            </h1>
            <p className="text-blue-200 text-xs">AI-Assisted Rural Health Triage</p>
          </div>
          <span className="ml-auto bg-blue-600 text-blue-100 text-xs px-3 py-1 rounded-full border border-blue-400">
            Health Worker Portal
          </span>
        </div>
      </header>

      {/* ── Body ── */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-300 text-red-700 rounded-lg px-4 py-3 text-sm flex items-start gap-2">
            <span className="mt-0.5">⚠️</span>
            <span>{error}</span>
            <button
              className="ml-auto text-red-400 hover:text-red-600 font-bold"
              onClick={() => setError(null)}
            >
              ×
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column */}
          <IntakeForm
            onSubmit={handleSubmit}
            loading={loading}
            recording={recording}
            transcript={transcript}
            onTranscriptChange={setTranscript}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
          />

          {/* Right column */}
          <AssessmentResult result={result} loading={loading} />
        </div>
      </main>
    </div>
  )
}
