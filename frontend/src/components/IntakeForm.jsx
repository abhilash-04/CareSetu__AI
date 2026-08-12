import { useRef } from 'react'

const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Bengali', 'Marathi', 'Gujarati', 'Punjabi', 'Odia']

export default function IntakeForm({
  onSubmit,
  loading,
  recording,
  transcript,
  onTranscriptChange,
  onStartRecording,
  onStopRecording,
}) {
  const formRef    = useRef(null)
  const fileRef    = useRef(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    const fd = new FormData(formRef.current)
    // File input — attach if selected
    const file = fileRef.current?.files?.[0]
    if (file) fd.set('image', file)
    onSubmit(fd)
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="flex flex-col gap-5"
      encType="multipart/form-data"
    >
      {/* ── Patient Information ── */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-blue-700 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span>👤</span> Patient Information
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              name="name"
              type="text"
              required
              placeholder="e.g. Ramesh Kumar"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Age <span className="text-red-500">*</span>
            </label>
            <input
              name="age"
              type="number"
              required
              min="0"
              max="120"
              placeholder="Years"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Gender <span className="text-red-500">*</span>
            </label>
            <select
              name="gender"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            >
              <option value="">Select…</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Preferred Language <span className="text-red-500">*</span>
            </label>
            <select
              name="language"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            >
              <option value="">Select language…</option>
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* ── Vitals ── */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-blue-700 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span>🩺</span> Vitals
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Temperature (°F) <span className="text-red-500">*</span>
            </label>
            <input
              name="temperature"
              type="number"
              step="0.1"
              required
              min="90"
              max="115"
              placeholder="98.6"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              SpO₂ (%) <span className="text-red-500">*</span>
            </label>
            <input
              name="spo2"
              type="number"
              step="0.1"
              required
              min="50"
              max="100"
              placeholder="98"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              BP Systolic (mmHg) <span className="text-red-500">*</span>
            </label>
            <input
              name="bp_systolic"
              type="number"
              required
              min="50"
              max="250"
              placeholder="120"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              BP Diastolic (mmHg) <span className="text-red-500">*</span>
            </label>
            <input
              name="bp_diastolic"
              type="number"
              required
              min="30"
              max="150"
              placeholder="80"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Pulse (BPM) <span className="text-red-500">*</span>
            </label>
            <input
              name="pulse"
              type="number"
              required
              min="20"
              max="250"
              placeholder="72"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            />
          </div>
        </div>
      </section>

      {/* ── Symptoms ── */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-blue-700 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span>📋</span> Symptoms
        </h2>

        {/* Mic button */}
        <div className="flex items-center gap-3 mb-3">
          <button
            type="button"
            onClick={recording ? onStopRecording : onStartRecording}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
              recording
                ? 'bg-red-50 border-red-400 text-red-600 animate-pulse'
                : 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
            }`}
          >
            <span className="text-base">{recording ? '⏹' : '🎙️'}</span>
            {recording ? 'Stop Recording' : 'Record Voice'}
          </button>
          {transcript && (
            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
              ✅ Voice captured
            </span>
          )}
        </div>

        {/* Transcript preview */}
        {transcript && (
          <div className="mb-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-800">
            <span className="font-semibold">Transcribed:</span> {transcript}
          </div>
        )}

        <textarea
          name="symptoms"
          rows={4}
          placeholder="Describe patient symptoms here, or use voice recording above…"
          value={transcript}
          onChange={(e) => onTranscriptChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 resize-none"
        />
        <p className="text-xs text-slate-400 mt-1">
          You can edit the transcribed text or type directly.
        </p>
      </section>

      {/* ── Photo / Document Upload ── */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-blue-700 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span>📎</span> Prescription / Photo (Optional)
        </h2>
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-6 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
          <span className="text-3xl mb-2">📄</span>
          <span className="text-sm text-slate-600 font-medium">
            Click to upload or drag and drop
          </span>
          <span className="text-xs text-slate-400 mt-1">
            JPG, PNG, PDF — prescriptions, lab reports, wound photos
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
          />
        </label>
      </section>

      {/* ── Submit ── */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-6 rounded-xl bg-blue-700 text-white font-semibold text-sm tracking-wide shadow-md hover:bg-blue-800 active:scale-95 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Analysing Patient…
          </>
        ) : (
          <>🧠 Run AI Assessment</>
        )}
      </button>
    </form>
  )
}
