import os
import json
import re
import base64
from datetime import datetime, timezone
from typing import Optional

from dotenv import load_dotenv
load_dotenv()  # loads GROQ_API_KEY and GEMINI_API_KEY from .env file

import google.generativeai as genai
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pydantic import BaseModel, Field

from features import router as features_router

# ---------------------------------------------------------------------------
# App & Middleware
# ---------------------------------------------------------------------------

app = FastAPI(
    title="AI-Powered Virtual Village Clinic",
    description="Backend API for rural healthcare AI triage and teleconsultation.",
    version="1.0.0",
)

# Allow origins: comma-separated list from env, defaults to * for local dev only
_raw_origins = os.environ.get("ALLOWED_ORIGINS", "*")
_origins = [o.strip() for o in _raw_origins.split(",")] if _raw_origins != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# API Clients
# ---------------------------------------------------------------------------

_groq_key: str = os.environ.get("GROQ_API_KEY", "")
if not _groq_key:
    raise RuntimeError("GROQ_API_KEY is not set. Add it to your .env file or environment.")
groq_client = Groq(api_key=_groq_key)

_gemini_key: str = os.environ.get("GEMINI_API_KEY", "")
if not _gemini_key:
    raise RuntimeError("GEMINI_API_KEY is not set. Add it to your .env file or environment.")
genai.configure(api_key=_gemini_key)
gemini_model = genai.GenerativeModel("gemini-2.5-flash")

# Mount all extended feature endpoints (Features 1–10)
# Mounted after API clients are initialized to respect startup order
app.include_router(features_router)

# ---------------------------------------------------------------------------
# In-Memory Database
# ---------------------------------------------------------------------------

PATIENT_DB: list[dict] = []

# ---------------------------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------------------------

RISK_ORDER = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}


class OTCRecommendation(BaseModel):
    medicine: str
    dosage: str
    warning: str


class TriageOutput(BaseModel):
    summary: str
    risk_level: str = Field(..., pattern="^(LOW|MEDIUM|HIGH|CRITICAL)$")
    emergency_referral: bool
    vitals_concern: str
    first_aid_instructions: list[str]
    otc_recommendations: list[OTCRecommendation]
    recommended_action: str


class PatientRecord(BaseModel):
    id: int
    name: str
    age: int
    gender: str
    language: str
    symptoms: str
    vitals: dict
    ocr_notes: Optional[str]
    triage: TriageOutput
    status: str
    created_at: str


class TranscriptResponse(BaseModel):
    transcript: str


class ApproveResponse(BaseModel):
    message: str
    patient_id: int
    status: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

TRIAGE_SYSTEM_PROMPT = """
You are a clinical triage AI assistant deployed in a rural village health clinic.
Your role is to assist trained (non-doctor) health workers by generating safe,
structured first-aid guidance.

STRICT OUTPUT RULES:
- You MUST respond with valid JSON only. No markdown, no prose, no code fences.
- The JSON must conform exactly to this schema:
{
  "summary": "<1-2 sentence clinical summary>",
  "risk_level": "<LOW | MEDIUM | HIGH | CRITICAL>",
  "emergency_referral": <true | false>,
  "vitals_concern": "<Brief description of any alarming vitals, or 'None'>",
  "first_aid_instructions": ["<step 1>", "<step 2>", ...],
  "otc_recommendations": [
    {
      "medicine": "<generic OTC drug name>",
      "dosage": "<dose and frequency>",
      "warning": "<contraindications or cautions>"
    }
  ],
  "recommended_action": "<Concise next action for the health worker>"
}

SAFETY RULES:
- Never recommend prescription-only drugs.
- Always include age-appropriate dosing caveats.
- If you are uncertain, prefer escalating risk_level rather than under-reporting.
- OTC recommendations must only include universally available generics (e.g., Paracetamol, ORS, Antacids).
"""


def _build_triage_prompt(
    name: str,
    age: int,
    gender: str,
    language: str,
    symptoms: str,
    vitals: dict,
    ocr_notes: Optional[str],
) -> str:
    lines = [
        f"Patient: {name}, Age: {age}, Gender: {gender}, Language: {language}",
        f"Reported Symptoms: {symptoms}",
        "",
        "Vitals:",
        f"  - SpO2: {vitals['spo2']}%",
        f"  - Temperature: {vitals['temperature']}°F",
        f"  - Blood Pressure: {vitals['bp_systolic']}/{vitals['bp_diastolic']} mmHg",
        f"  - Pulse: {vitals['pulse']} bpm",
    ]
    if ocr_notes:
        lines += ["", "Extracted Prior Medical Records (OCR):", ocr_notes]

    lines += [
        "",
        "Based on the above, provide a complete clinical triage assessment in the specified JSON format.",
    ]
    return "\n".join(lines)


def _extract_json(raw: str) -> dict:
    """
    Robustly extract the first JSON object from a model response,
    handling cases where the model wraps output in markdown fences.
    """
    # Strip markdown code fences if present
    cleaned = re.sub(r"```(?:json)?", "", raw).strip()
    # Find the first { ... } block
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON object found in model response: {raw[:300]}")
    return json.loads(match.group())


def _apply_safety_overrides(triage: dict, spo2: float, temperature: float) -> dict:
    """
    Hard safety rule: if vitals cross critical thresholds, forcibly
    override risk_level and emergency_referral regardless of LLM output.
    """
    if spo2 < 92 or temperature > 103:
        triage["risk_level"] = "CRITICAL"
        triage["emergency_referral"] = True
        concern = triage.get("vitals_concern", "")
        flags = []
        if spo2 < 92:
            flags.append(f"SpO2 critically low at {spo2}%")
        if temperature > 103:
            flags.append(f"Temperature critically high at {temperature}°F")
        override_note = "; ".join(flags)
        triage["vitals_concern"] = (
            f"[SAFETY OVERRIDE] {override_note}. {concern}".strip(" .")
        )
    return triage


# ---------------------------------------------------------------------------
# Endpoint 1 — POST /api/transcribe
# ---------------------------------------------------------------------------


@app.post("/api/transcribe", response_model=TranscriptResponse, tags=["Health Worker"])
async def transcribe_audio(audio: UploadFile = File(...)):
    """
    Accepts an audio file and returns a Whisper transcription via Groq.
    Supports formats: mp3, mp4, mpeg, mpga, m4a, wav, webm.
    """
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Uploaded audio file is empty.")

    try:
        transcription = groq_client.audio.transcriptions.create(
            file=(audio.filename or "audio.wav", audio_bytes),
            model="whisper-large-v3",
            response_format="text",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Groq Whisper transcription failed: {exc}",
        )

    transcript_text = (
        transcription if isinstance(transcription, str) else transcription.text
    )
    return TranscriptResponse(transcript=transcript_text)


# ---------------------------------------------------------------------------
# Endpoint 2 — POST /api/assess-patient
# ---------------------------------------------------------------------------


@app.post("/api/assess-patient", response_model=PatientRecord, tags=["Health Worker"])
async def assess_patient(
    name: str = Form(...),
    age: int = Form(...),
    gender: str = Form(...),
    language: str = Form(...),
    symptoms: str = Form(...),
    temperature: float = Form(...),
    bp_systolic: int = Form(...),
    bp_diastolic: int = Form(...),
    pulse: int = Form(...),
    spo2: float = Form(...),
    image: Optional[UploadFile] = File(None),
):
    """
    Full patient assessment pipeline:
    1. Optional OCR via Gemini 1.5 Flash (if image provided).
    2. Clinical triage via Groq Llama-3.3-70B.
    3. Hard safety overrides for critical vitals.
    4. Persists record to PATIENT_DB and returns the full record.
    """
    vitals = {
        "temperature": temperature,
        "bp_systolic": bp_systolic,
        "bp_diastolic": bp_diastolic,
        "pulse": pulse,
        "spo2": spo2,
    }

    # --- Step 1: OCR via Gemini (optional) ---
    ocr_notes: Optional[str] = None
    if image is not None:
        image_bytes = await image.read()
        if image_bytes:
            try:
                b64_image = base64.b64encode(image_bytes).decode("utf-8")
                mime_type = image.content_type or "image/jpeg"
                gemini_response = gemini_model.generate_content(
                    [
                        (
                            "You are a medical OCR assistant. Extract all readable text from this "
                            "prescription or medical document image. If the image shows a wound or "
                            "physical symptom, describe what you observe clinically. "
                            "Return only the extracted/observed content, no commentary."
                        ),
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": b64_image,
                            }
                        },
                    ]
                )
                ocr_notes = gemini_response.text.strip()
            except Exception as exc:
                # OCR failure is non-fatal — log and continue without it
                ocr_notes = f"[OCR unavailable: {exc}]"

    # --- Step 2: LLM Triage via Groq Llama-3.3-70B ---
    triage_prompt = _build_triage_prompt(
        name, age, gender, language, symptoms, vitals, ocr_notes
    )

    try:
        chat_response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": TRIAGE_SYSTEM_PROMPT},
                {"role": "user", "content": triage_prompt},
            ],
            temperature=0.2,
            max_tokens=1024,
        )
        raw_output = chat_response.choices[0].message.content
        triage_dict = _extract_json(raw_output)
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Groq triage model failed: {exc}",
        )

    # --- Step 3: Hard Safety Overrides ---
    triage_dict = _apply_safety_overrides(triage_dict, spo2, temperature)

    # --- Step 4: Validate triage shape via Pydantic ---
    try:
        triage_obj = TriageOutput(**triage_dict)
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Triage output failed schema validation: {exc}. Raw: {triage_dict}",
        )

    # --- Step 5: Persist to in-memory DB ---
    patient_id = len(PATIENT_DB) + 1
    record = PatientRecord(
        id=patient_id,
        name=name,
        age=age,
        gender=gender,
        language=language,
        symptoms=symptoms,
        vitals=vitals,
        ocr_notes=ocr_notes,
        triage=triage_obj,
        status="Pending Doctor Review",
        created_at=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    )
    PATIENT_DB.append(record.model_dump())
    return record


# ---------------------------------------------------------------------------
# Endpoint 3 — GET /api/doctor/queue
# ---------------------------------------------------------------------------


@app.get("/api/doctor/queue", response_model=list[PatientRecord], tags=["Doctor"])
def get_doctor_queue():
    """
    Returns all patient records sorted by clinical risk severity:
    CRITICAL → HIGH → MEDIUM → LOW.
    """
    sorted_queue = sorted(
        PATIENT_DB,
        key=lambda r: RISK_ORDER.get(r["triage"]["risk_level"], 99),
    )
    return sorted_queue


# ---------------------------------------------------------------------------
# Endpoint 4 — POST /api/doctor/approve/{patient_id}
# ---------------------------------------------------------------------------


@app.post(
    "/api/doctor/approve/{patient_id}",
    response_model=ApproveResponse,
    tags=["Doctor"],
)
def approve_patient(patient_id: int):
    """
    Marks a patient record as 'Approved & Protocol Finalized' by the reviewing doctor.
    """
    for record in PATIENT_DB:
        if record["id"] == patient_id:
            record["status"] = "Approved & Protocol Finalized"
            return ApproveResponse(
                message="Patient protocol approved successfully.",
                patient_id=patient_id,
                status=record["status"],
            )

    raise HTTPException(
        status_code=404,
        detail=f"Patient with ID {patient_id} not found.",
    )


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------


@app.get("/", tags=["System"])
def root():
    return {
        "service": "AI-Powered Virtual Village Clinic API",
        "status": "operational",
        "docs": "/docs",
    }
