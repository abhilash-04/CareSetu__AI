"""
CareSetu AI — Extended Features Module
=======================================
Features 1–10 backend logic, models, and endpoints.
Import and mount this router in main.py via:
    from features import router as features_router
    app.include_router(features_router)
"""

import re
import uuid
import random
import string
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()

# ─────────────────────────────────────────────────────────────────────────────
# In-memory stores (extend PATIENT_DB pattern from main.py)
# ─────────────────────────────────────────────────────────────────────────────

PATIENT_HISTORY_DB: dict[int, dict] = {}   # patient_id → {diagnoses, allergies, meds}
ENCOUNTER_DB: dict[str, dict] = {}         # encounter_id → encounter record
ENCOUNTER_QUESTIONS_DB: list[dict] = []    # all EncounterQuestion records
CARE_CARD_DB: dict[str, dict] = {}         # encounter_id → CareCard
QR_TOKEN_DB: dict[str, int] = {}           # qr_token → patient_id
CAREGIVER_DB: dict[int, dict] = {}         # patient_id → caregiver info
CONSULT_SESSION_DB: dict[str, dict] = {}   # session_id → ConsultSession
TRANSCRIPT_DB: list[dict] = []             # ConsultTranscriptLine records
CLUSTER_ALERT_DB: list[dict] = []          # ClusterAlert records
REFERRAL_TOKEN_DB: dict[str, str] = {}     # referral_token → encounter_id


# ─────────────────────────────────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════
# FEATURE 1 — Medication Safety Check
# ══════════════════════════════════════════════════════════════════════════════
# ─────────────────────────────────────────────────────────────────────────────

# Simple hand-coded rule set: condition → list of contraindicated drug keywords
CONTRAINDICATION_RULES: list[dict] = [
    {
        "condition": "hypertension",
        "drugs": ["ibuprofen", "naproxen", "diclofenac", "indomethacin", "pseudoephedrine"],
        "message": "NSAIDs and decongestants can raise blood pressure in hypertensive patients.",
    },
    {
        "condition": "diabetes",
        "drugs": ["prednisolone", "dexamethasone", "betamethasone", "cortisone"],
        "message": "Corticosteroids elevate blood glucose and are risky in diabetic patients.",
    },
    {
        "condition": "kidney disease",
        "drugs": ["ibuprofen", "naproxen", "diclofenac", "metformin", "gentamicin"],
        "message": "NSAIDs and certain antibiotics reduce renal perfusion and are nephrotoxic.",
    },
    {
        "condition": "liver disease",
        "drugs": ["paracetamol", "acetaminophen", "methotrexate", "isoniazid"],
        "message": "High-dose paracetamol is hepatotoxic; reduce dose or avoid in liver disease.",
    },
    {
        "condition": "asthma",
        "drugs": ["aspirin", "ibuprofen", "naproxen", "propranolol", "atenolol"],
        "message": "NSAIDs and beta-blockers can precipitate bronchospasm in asthmatic patients.",
    },
    {
        "condition": "peptic ulcer",
        "drugs": ["aspirin", "ibuprofen", "naproxen", "diclofenac", "steroids"],
        "message": "NSAIDs and steroids worsen gastrointestinal ulcers.",
    },
    {
        "condition": "pregnancy",
        "drugs": ["ibuprofen", "naproxen", "doxycycline", "ciprofloxacin", "methotrexate", "warfarin"],
        "message": "This drug is contraindicated or requires caution during pregnancy.",
    },
    {
        "condition": "heart failure",
        "drugs": ["ibuprofen", "naproxen", "verapamil", "diltiazem"],
        "message": "NSAIDs cause fluid retention and worsen heart failure.",
    },
]


class PatientHistoryIn(BaseModel):
    diagnoses: list[str] = Field(default_factory=list,
        description="e.g. ['hypertension', 'diabetes']")
    allergies: list[str] = Field(default_factory=list,
        description="e.g. ['penicillin', 'sulfa']")
    current_medications: list[str] = Field(default_factory=list)


class MedicationSafetyRequest(BaseModel):
    patient_id: int
    proposed_medications: list[str]


class MedicationSafetyResponse(BaseModel):
    ok: bool
    warnings: list[str]


def evaluate_medication_safety(
    patient_id: int,
    proposed_medications: list[str],
) -> MedicationSafetyResponse:
    """
    Rule-based medication safety check.
    Checks proposed drugs against known diagnoses (contraindications)
    and known allergies (direct name match).
    No external drug database required.
    """
    history = PATIENT_HISTORY_DB.get(patient_id, {})
    diagnoses = [d.lower() for d in history.get("diagnoses", [])]
    allergies  = [a.lower() for a in history.get("allergies", [])]
    warnings: list[str] = []

    for drug in proposed_medications:
        drug_lower = drug.lower()

        # 1. Allergy check — direct name match
        for allergy in allergies:
            if allergy in drug_lower or drug_lower in allergy:
                warnings.append(
                    f"⚠ ALLERGY: Patient has a recorded allergy to '{allergy}' — "
                    f"'{drug}' may be contraindicated."
                )

        # 2. Contraindication rules
        for rule in CONTRAINDICATION_RULES:
            if rule["condition"] in diagnoses:
                for banned in rule["drugs"]:
                    if banned in drug_lower:
                        warnings.append(
                            f"⚠ CONTRAINDICATION [{rule['condition'].upper()}]: "
                            f"'{drug}' — {rule['message']}"
                        )

    return MedicationSafetyResponse(ok=len(warnings) == 0, warnings=warnings)


# Endpoints
@router.post("/safety/medication-check", response_model=MedicationSafetyResponse,
             tags=["Feature 1 – Medication Safety"])
def medication_check(req: MedicationSafetyRequest):
    """Check proposed medications against patient history for safety warnings."""
    return evaluate_medication_safety(req.patient_id, req.proposed_medications)


@router.post("/patients/{patient_id}/history", tags=["Feature 1 – Medication Safety"])
def upsert_patient_history(patient_id: int, history: PatientHistoryIn):
    """Store or update a patient's medical history (diagnoses, allergies, medications)."""
    PATIENT_HISTORY_DB[patient_id] = history.model_dump()
    return {"message": "Patient history saved.", "patient_id": patient_id}


@router.get("/patients/{patient_id}/history", tags=["Feature 1 – Medication Safety"])
def get_patient_history(patient_id: int):
    if patient_id not in PATIENT_HISTORY_DB:
        return {"diagnoses": [], "allergies": [], "current_medications": []}
    return PATIENT_HISTORY_DB[patient_id]


# ─────────────────────────────────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════
# FEATURE 2 — Smart Question Tree Engine
# ══════════════════════════════════════════════════════════════════════════════
# ─────────────────────────────────────────────────────────────────────────────

# Embedded question tree — keyed by complaint+ageGroup → entry node
# Each node: id, questionText, answerType, options, nextQuestionMap, isRedFlag
QUESTION_TREE: dict[str, dict] = {
    # ── Fever tree ──────────────────────────────────────────────────────────
    "fever_adult_q1": {
        "id": "fever_adult_q1",
        "questionText": "How many days have you had fever?",
        "answerType": "multi_choice",
        "options": ["1 day", "2–3 days", "4–7 days", "More than 7 days"],
        "isRedFlag": False,
        "nextQuestionMap": {
            "1 day": "fever_adult_q2",
            "2–3 days": "fever_adult_q2",
            "4–7 days": "fever_adult_q3",
            "More than 7 days": "fever_adult_q3",
        },
    },
    "fever_adult_q2": {
        "id": "fever_adult_q2",
        "questionText": "Do you have chills or rigors (severe shivering)?",
        "answerType": "yes_no",
        "options": ["Yes", "No"],
        "isRedFlag": False,
        "nextQuestionMap": {"Yes": "fever_adult_q4", "No": "fever_adult_q5"},
    },
    "fever_adult_q3": {
        "id": "fever_adult_q3",
        "questionText": "Do you have any bleeding — from nose, gums, or in stool/urine?",
        "answerType": "yes_no",
        "options": ["Yes", "No"],
        "isRedFlag": True,
        "nextQuestionMap": {"Yes": "fever_adult_q4", "No": "fever_adult_q5"},
    },
    "fever_adult_q4": {
        "id": "fever_adult_q4",
        "questionText": "Rate your headache severity (0 = none, 10 = worst):",
        "answerType": "scale",
        "options": [],
        "isRedFlag": False,
        "nextQuestionMap": {"__any__": "fever_adult_q5"},
    },
    "fever_adult_q5": {
        "id": "fever_adult_q5",
        "questionText": "Do you have difficulty breathing or chest pain?",
        "answerType": "yes_no",
        "options": ["Yes", "No"],
        "isRedFlag": True,
        "nextQuestionMap": {"Yes": None, "No": None},
    },
    # ── Pediatric fever tree ─────────────────────────────────────────────────
    "fever_child_q1": {
        "id": "fever_child_q1",
        "questionText": "Is the child's temperature above 102°F (38.9°C)?",
        "answerType": "yes_no",
        "options": ["Yes", "No"],
        "isRedFlag": False,
        "nextQuestionMap": {"Yes": "fever_child_q2", "No": "fever_child_q3"},
    },
    "fever_child_q2": {
        "id": "fever_child_q2",
        "questionText": "Is the child having fits or seizures?",
        "answerType": "yes_no",
        "options": ["Yes", "No"],
        "isRedFlag": True,
        "nextQuestionMap": {"Yes": None, "No": "fever_child_q3"},
    },
    "fever_child_q3": {
        "id": "fever_child_q3",
        "questionText": "Is the child eating and drinking normally?",
        "answerType": "yes_no",
        "options": ["Yes", "No"],
        "isRedFlag": False,
        "nextQuestionMap": {"Yes": None, "No": None},
    },
    # ── Cough/breathlessness tree ────────────────────────────────────────────
    "cough_adult_q1": {
        "id": "cough_adult_q1",
        "questionText": "How long have you had the cough?",
        "answerType": "multi_choice",
        "options": ["Less than 1 week", "1–3 weeks", "More than 3 weeks"],
        "isRedFlag": False,
        "nextQuestionMap": {
            "Less than 1 week": "cough_adult_q2",
            "1–3 weeks": "cough_adult_q2",
            "More than 3 weeks": "cough_adult_q3",
        },
    },
    "cough_adult_q2": {
        "id": "cough_adult_q2",
        "questionText": "Are you coughing up blood or blood-stained sputum?",
        "answerType": "yes_no",
        "options": ["Yes", "No"],
        "isRedFlag": True,
        "nextQuestionMap": {"Yes": None, "No": "cough_adult_q3"},
    },
    "cough_adult_q3": {
        "id": "cough_adult_q3",
        "questionText": "Do you feel short of breath even at rest?",
        "answerType": "yes_no",
        "options": ["Yes", "No"],
        "isRedFlag": True,
        "nextQuestionMap": {"Yes": None, "No": None},
    },
    # ── Chest pain tree ──────────────────────────────────────────────────────
    "chest_pain_adult_q1": {
        "id": "chest_pain_adult_q1",
        "questionText": "Does the pain spread to your arm, jaw, or shoulder?",
        "answerType": "yes_no",
        "options": ["Yes", "No"],
        "isRedFlag": True,
        "nextQuestionMap": {"Yes": None, "No": "chest_pain_adult_q2"},
    },
    "chest_pain_adult_q2": {
        "id": "chest_pain_adult_q2",
        "questionText": "Are you sweating heavily or feeling dizzy along with chest pain?",
        "answerType": "yes_no",
        "options": ["Yes", "No"],
        "isRedFlag": True,
        "nextQuestionMap": {"Yes": None, "No": None},
    },
}

COMPLAINT_ENTRY_MAP: dict[str, dict[str, str]] = {
    # chief_complaint_keyword → {adult: nodeId, child: nodeId}
    "fever":       {"adult": "fever_adult_q1",      "child": "fever_child_q1"},
    "temperature": {"adult": "fever_adult_q1",      "child": "fever_child_q1"},
    "cough":       {"adult": "cough_adult_q1",      "child": "cough_adult_q1"},
    "breathless":  {"adult": "cough_adult_q1",      "child": "cough_adult_q1"},
    "chest":       {"adult": "chest_pain_adult_q1", "child": "chest_pain_adult_q1"},
}


class EncounterQuestion(BaseModel):
    encounter_id: str
    question_id: str
    question_text: str
    answer_value: str
    is_red_flag: bool


class NextQuestionRequest(BaseModel):
    current_question_id: str
    answer_value: str
    encounter_id: str


class QuestionResponse(BaseModel):
    question: Optional[dict]
    done: bool


def get_first_question(chief_complaint: str, age_years: int) -> Optional[dict]:
    complaint_lower = chief_complaint.lower()
    age_group = "child" if age_years < 12 else "adult"
    for keyword, mapping in COMPLAINT_ENTRY_MAP.items():
        if keyword in complaint_lower:
            node_id = mapping.get(age_group) or mapping.get("adult")
            if node_id and node_id in QUESTION_TREE:
                return QUESTION_TREE[node_id]
    return None


def get_next_question(current_question_id: str, answer_value: str) -> Optional[dict]:
    node = QUESTION_TREE.get(current_question_id)
    if not node:
        return None
    nqm = node.get("nextQuestionMap", {})
    next_id = nqm.get(answer_value) or nqm.get("__any__")
    if not next_id:
        return None
    return QUESTION_TREE.get(next_id)


@router.get("/questions/first", tags=["Feature 2 – Smart Questioning"])
def first_question(chief_complaint: str, age_years: int):
    """Return the opening question node for a given chief complaint and patient age."""
    q = get_first_question(chief_complaint, age_years)
    return QuestionResponse(question=q, done=(q is None))


@router.post("/questions/next", response_model=QuestionResponse,
             tags=["Feature 2 – Smart Questioning"])
def next_question(req: NextQuestionRequest):
    """Record an answer and return the next question node (or done=True)."""
    # Store the answered question
    current_node = QUESTION_TREE.get(req.current_question_id)
    if current_node:
        ENCOUNTER_QUESTIONS_DB.append({
            "encounter_id":  req.encounter_id,
            "question_id":   req.current_question_id,
            "question_text": current_node["questionText"],
            "answer_value":  req.answer_value,
            "is_red_flag":   current_node.get("isRedFlag", False),
        })
    q = get_next_question(req.current_question_id, req.answer_value)
    return QuestionResponse(question=q, done=(q is None))


@router.get("/encounters/{encounter_id}/questions",
            tags=["Feature 2 – Smart Questioning"])
def get_encounter_questions(encounter_id: str):
    """Return all Q&A pairs for a given encounter."""
    return [q for q in ENCOUNTER_QUESTIONS_DB if q["encounter_id"] == encounter_id]


# ─────────────────────────────────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════
# FEATURE 3 — Care Card
# ══════════════════════════════════════════════════════════════════════════════
# ─────────────────────────────────────────────────────────────────────────────

class CareCardMedication(BaseModel):
    name: str
    time: str   # e.g. "Morning & Evening"


class CareCard(BaseModel):
    encounter_id: str
    patient_name: str
    summary: str
    today_actions: list[str]
    medication_plan: list[CareCardMedication]
    warning_signs: list[str]
    generated_at: str
    reminder_flag: bool = False
    reminders_per_day: int = 2


class ReminderFlagRequest(BaseModel):
    reminder_flag: bool
    reminders_per_day: int = 2


def generate_care_card(encounter_id: str, patient_record: dict) -> CareCard:
    """
    Build a plain-language Care Card from encounter data.
    Uses triage output if available; falls back to safe defaults.
    """
    triage  = patient_record.get("triage", {})
    name    = patient_record.get("name", "Patient")
    otc     = triage.get("otc_recommendations", [])
    steps   = triage.get("first_aid_instructions", [])
    summary = triage.get("summary", "Examination completed. Follow instructions below.")

    medication_plan = [
        CareCardMedication(
            name=m.get("medicine", ""),
            time=_infer_timing(m.get("dosage", "")),
        )
        for m in otc if m.get("medicine")
    ]

    warning_signs = [
        "High fever returning (> 102 °F) — return to clinic immediately.",
        "Difficulty breathing or chest pain — seek emergency care.",
        "Vomiting / unable to drink fluids — risk of dehydration.",
    ]
    if triage.get("emergency_referral"):
        warning_signs.insert(0, "🚨 Doctor has flagged this case for emergency referral.")

    today_actions = steps[:4] if steps else [
        "Rest and drink plenty of fluids.",
        "Take prescribed medicines on time.",
        "Monitor temperature every 4 hours.",
        "Return to clinic if symptoms worsen.",
    ]

    return CareCard(
        encounter_id=encounter_id,
        patient_name=name,
        summary=summary,
        today_actions=today_actions,
        medication_plan=medication_plan,
        warning_signs=warning_signs,
        generated_at=datetime.utcnow().isoformat() + "Z",
    )


def _infer_timing(dosage_text: str) -> str:
    text = dosage_text.lower()
    if "twice" in text or "bd" in text or "2 times" in text:
        return "Morning & Evening"
    if "thrice" in text or "tds" in text or "3 times" in text:
        return "Morning, Afternoon & Evening"
    if "four" in text or "qid" in text:
        return "Every 6 hours"
    if "night" in text or "bedtime" in text or "hs" in text:
        return "Bedtime"
    return "As directed"


@router.get("/encounters/{encounter_id}/care-card", response_model=CareCard,
            tags=["Feature 3 – Care Card"])
def get_care_card(encounter_id: str):
    """Return (or generate) the Care Card for a finalized encounter."""
    if encounter_id in CARE_CARD_DB:
        return CARE_CARD_DB[encounter_id]
    record = ENCOUNTER_DB.get(encounter_id)
    if not record:
        raise HTTPException(status_code=404, detail="Encounter not found.")
    card = generate_care_card(encounter_id, record)
    CARE_CARD_DB[encounter_id] = card.model_dump()
    return card


@router.post("/encounters/{encounter_id}/care-card/reminder",
             tags=["Feature 3 – Care Card"])
def set_reminder_flag(encounter_id: str, req: ReminderFlagRequest):
    """Toggle the reminder flag and times-per-day on a Care Card."""
    if encounter_id not in CARE_CARD_DB:
        raise HTTPException(status_code=404, detail="Care Card not found.")
    CARE_CARD_DB[encounter_id]["reminder_flag"]      = req.reminder_flag
    CARE_CARD_DB[encounter_id]["reminders_per_day"]  = req.reminders_per_day
    return {"message": "Reminder preference saved.", "encounter_id": encounter_id}


@router.post("/encounters/{encounter_id}/register",
             tags=["Feature 3 – Care Card"])
def register_encounter(encounter_id: str, record: dict):
    """Register a patient record against an encounter ID (called from main.py after assess)."""
    ENCOUNTER_DB[encounter_id] = record
    return {"message": "Encounter registered.", "encounter_id": encounter_id}


# ─────────────────────────────────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════
# FEATURE 4 — Patient QR Token + Caregiver Assignment
# ══════════════════════════════════════════════════════════════════════════════
# ─────────────────────────────────────────────────────────────────────────────

class CaregiverInfo(BaseModel):
    name: str
    relation: str
    phone: str


def _generate_token(length: int = 12) -> str:
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))


@router.post("/patients/{patient_id}/caregiver", tags=["Feature 4 – QR & Caregiver"])
def upsert_caregiver(patient_id: int, info: CaregiverInfo):
    CAREGIVER_DB[patient_id] = info.model_dump()
    return {"message": "Caregiver saved.", "patient_id": patient_id}


@router.get("/patients/{patient_id}/caregiver", tags=["Feature 4 – QR & Caregiver"])
def get_caregiver(patient_id: int):
    if patient_id not in CAREGIVER_DB:
        return {}
    return CAREGIVER_DB[patient_id]


@router.post("/patients/{patient_id}/qr-token", tags=["Feature 4 – QR & Caregiver"])
def ensure_qr_token(patient_id: int):
    """Generate a QR token for a patient if one does not already exist."""
    existing = next((t for t, pid in QR_TOKEN_DB.items() if pid == patient_id), None)
    if existing:
        return {"qr_token": existing, "url": f"/qr/{existing}"}
    token = _generate_token()
    QR_TOKEN_DB[token] = patient_id
    return {"qr_token": token, "url": f"/qr/{token}"}


@router.get("/qr/{token}", tags=["Feature 4 – QR & Caregiver"])
def caregiver_qr_view(token: str):
    """
    Read-only patient summary for caregivers (accessed by scanning QR code).
    Returns demographics, key history, and encounter summaries.
    """
    patient_id = QR_TOKEN_DB.get(token)
    if patient_id is None:
        raise HTTPException(status_code=404, detail="Invalid or expired QR token.")

    history   = PATIENT_HISTORY_DB.get(patient_id, {})
    caregiver = CAREGIVER_DB.get(patient_id, {})

    # Gather latest encounter summaries (up to 3)
    encounter_summaries = []
    for enc_id, rec in list(ENCOUNTER_DB.items())[-3:]:
        triage = rec.get("triage", {})
        encounter_summaries.append({
            "encounter_id":   enc_id,
            "date":           rec.get("created_at", ""),
            "summary":        triage.get("summary", ""),
            "risk_level":     triage.get("risk_level", ""),
            "care_card":      CARE_CARD_DB.get(enc_id),
        })

    return {
        "patient_id":         patient_id,
        "caregiver":          caregiver,
        "diagnoses":          history.get("diagnoses", []),
        "allergies":          history.get("allergies", []),
        "current_medications": history.get("current_medications", []),
        "encounter_summaries": encounter_summaries,
    }


# ─────────────────────────────────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════
# FEATURE 5 — Consult Session Transcripts + Stats
# ══════════════════════════════════════════════════════════════════════════════
# ─────────────────────────────────────────────────────────────────────────────

RED_FLAG_KEYWORDS = [
    "chest pain", "bleeding", "unconscious", "seizure", "fits",
    "difficulty breathing", "shortness of breath", "cannot breathe",
    "vomiting blood", "high fever", "severe headache", "stroke",
    "paralysis", "not responding", "collapsed",
]


class SessionStart(BaseModel):
    encounter_id: str
    session_type: str = "doctor_worker_patient"  # or "doctor_worker"


class TranscriptLineIn(BaseModel):
    session_id: str
    speaker: str   # "doctor" | "worker" | "patient"
    text: str


@router.post("/consult/sessions/start", tags=["Feature 5 – Consult Transcript"])
def start_session(req: SessionStart):
    session_id = str(uuid.uuid4())[:8]
    CONSULT_SESSION_DB[session_id] = {
        "session_id":   session_id,
        "encounter_id": req.encounter_id,
        "type":         req.session_type,
        "started_at":   datetime.utcnow().isoformat() + "Z",
        "ended_at":     None,
    }
    return {"session_id": session_id}


@router.post("/consult/sessions/{session_id}/end",
             tags=["Feature 5 – Consult Transcript"])
def end_session(session_id: str):
    if session_id not in CONSULT_SESSION_DB:
        raise HTTPException(status_code=404, detail="Session not found.")
    CONSULT_SESSION_DB[session_id]["ended_at"] = datetime.utcnow().isoformat() + "Z"
    return {"message": "Session ended.", "session_id": session_id}


@router.post("/consult/transcript", tags=["Feature 5 – Consult Transcript"])
def append_transcript(line: TranscriptLineIn):
    if line.session_id not in CONSULT_SESSION_DB:
        raise HTTPException(status_code=404, detail="Session not found.")
    text_lower   = line.text.lower()
    is_red_flag  = any(kw in text_lower for kw in RED_FLAG_KEYWORDS)
    entry = {
        "session_id":  line.session_id,
        "speaker":     line.speaker,
        "timestamp":   datetime.utcnow().isoformat() + "Z",
        "text":        line.text,
        "is_red_flag": is_red_flag,
    }
    TRANSCRIPT_DB.append(entry)
    return entry


@router.get("/consult/sessions/{session_id}/stats",
            tags=["Feature 5 – Consult Transcript"])
def session_stats(session_id: str):
    """Return question count, red-flag count, and speaker breakdown."""
    lines = [l for l in TRANSCRIPT_DB if l["session_id"] == session_id]
    questions     = sum(1 for l in lines if "?" in l["text"])
    red_flags     = sum(1 for l in lines if l["is_red_flag"])
    by_speaker: dict[str, int] = {}
    for l in lines:
        by_speaker[l["speaker"]] = by_speaker.get(l["speaker"], 0) + 1
    return {
        "session_id":        session_id,
        "total_lines":       len(lines),
        "questions_asked":   questions,
        "red_flags_mentioned": red_flags,
        "by_speaker":        by_speaker,
    }


@router.get("/consult/sessions/{session_id}/transcript",
            tags=["Feature 5 – Consult Transcript"])
def get_transcript(session_id: str):
    return [l for l in TRANSCRIPT_DB if l["session_id"] == session_id]


# ─────────────────────────────────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════
# FEATURE 6 — Offline PDF Summary  (backend side: ensure full fields)
# ══════════════════════════════════════════════════════════════════════════════
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/encounters/{encounter_id}/offline-summary",
            tags=["Feature 6 – Offline Summary"])
def offline_summary(encounter_id: str):
    """
    Returns a complete, flat JSON object suitable for client-side caching
    in IndexedDB and offline PDF rendering.
    Includes: patient info, vitals, Q&A, Care Card, triage, warnings.
    """
    record = ENCOUNTER_DB.get(encounter_id)
    if not record:
        raise HTTPException(status_code=404, detail="Encounter not found.")
    questions = [q for q in ENCOUNTER_QUESTIONS_DB if q["encounter_id"] == encounter_id]
    care_card = CARE_CARD_DB.get(encounter_id)
    return {
        "encounter_id": encounter_id,
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "patient":      {k: record.get(k) for k in
                         ["name", "age", "gender", "language", "symptoms"]},
        "vitals":       record.get("vitals", {}),
        "triage":       record.get("triage", {}),
        "ocr_notes":    record.get("ocr_notes"),
        "qa_history":   questions,
        "care_card":    care_card,
    }


# ─────────────────────────────────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════
# FEATURE 7 — Village Disease Heatmap + Cluster Alerts
# ══════════════════════════════════════════════════════════════════════════════
# ─────────────────────────────────────────────────────────────────────────────

SYNDROME_KEYWORDS: dict[str, list[str]] = {
    "ACUTE_FEVER":          ["fever", "temperature", "pyrexia"],
    "COUGH_BREATHLESSNESS": ["cough", "breathless", "shortness of breath", "respiratory"],
    "DIARRHOEA_VOMITING":   ["diarrhoea", "vomiting", "loose stool", "gastro"],
    "WOUND_INJURY":         ["wound", "injury", "cut", "fracture", "burn"],
    "CHEST_PAIN":           ["chest pain", "cardiac", "heart"],
    "UNCONSCIOUSNESS":      ["unconscious", "fits", "seizure", "collapse"],
}

VILLAGE_ENCOUNTERS: list[dict] = []  # {encounter_id, village_id, syndrome_tag, created_at}
CLUSTER_THRESHOLD = 4


class VillageEncounterIn(BaseModel):
    encounter_id: str
    village_id: str
    chief_complaint: str


def _tag_syndrome(complaint: str) -> str:
    complaint_lower = complaint.lower()
    for tag, keywords in SYNDROME_KEYWORDS.items():
        if any(kw in complaint_lower for kw in keywords):
            return tag
    return "OTHER"


def _run_cluster_detection():
    """Group last-7-day encounters and raise alerts if ≥ CLUSTER_THRESHOLD."""
    cutoff = datetime.utcnow() - timedelta(days=7)
    recent = [
        e for e in VILLAGE_ENCOUNTERS
        if datetime.fromisoformat(e["created_at"].rstrip("Z")) >= cutoff
    ]
    counts: dict[tuple, int] = {}
    for e in recent:
        key = (e["village_id"], e["syndrome_tag"])
        counts[key] = counts.get(key, 0) + 1

    global CLUSTER_ALERT_DB
    CLUSTER_ALERT_DB = []
    for (village_id, syndrome_tag), count in counts.items():
        if count >= CLUSTER_THRESHOLD:
            CLUSTER_ALERT_DB.append({
                "village_id":    village_id,
                "syndrome_tag":  syndrome_tag,
                "count":         count,
                "alert_level":   "HIGH" if count >= 6 else "MODERATE",
                "detected_at":   datetime.utcnow().isoformat() + "Z",
            })


@router.post("/villages/encounter", tags=["Feature 7 – Disease Heatmap"])
def record_village_encounter(enc: VillageEncounterIn):
    """Record a village + syndrome tag entry and rerun cluster detection."""
    VILLAGE_ENCOUNTERS.append({
        "encounter_id": enc.encounter_id,
        "village_id":   enc.village_id,
        "syndrome_tag": _tag_syndrome(enc.chief_complaint),
        "created_at":   datetime.utcnow().isoformat() + "Z",
    })
    _run_cluster_detection()
    return {"syndrome_tag": _tag_syndrome(enc.chief_complaint)}


@router.get("/analytics/cluster-alerts", tags=["Feature 7 – Disease Heatmap"])
def cluster_alerts():
    """Return active cluster alerts grouped by village and syndrome."""
    _run_cluster_detection()
    return {"alerts": CLUSTER_ALERT_DB, "total": len(CLUSTER_ALERT_DB)}


@router.get("/analytics/village-counts", tags=["Feature 7 – Disease Heatmap"])
def village_counts():
    """Return raw per-village syndrome counts for heatmap rendering."""
    counts: dict[str, dict] = {}
    for e in VILLAGE_ENCOUNTERS:
        vid = e["village_id"]
        stag = e["syndrome_tag"]
        if vid not in counts:
            counts[vid] = {}
        counts[vid][stag] = counts[vid].get(stag, 0) + 1
    return counts


# ─────────────────────────────────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════
# FEATURE 8 — Pediatric Safety Mode
# ══════════════════════════════════════════════════════════════════════════════
# ─────────────────────────────────────────────────────────────────────────────

# Safe dose config: mg/kg limits by age band
PEDIATRIC_DOSE_CONFIG: dict[str, dict] = {
    "paracetamol": {
        "max_mg_per_kg":     15,
        "max_single_dose_mg": 500,
        "min_interval_hours": 4,
        "note": "Max 4 doses per day. Do not exceed 60 mg/kg/day.",
    },
    "ibuprofen": {
        "max_mg_per_kg":     10,
        "max_single_dose_mg": 200,
        "min_interval_hours": 6,
        "note": "Avoid under 3 months. Not for children with renal impairment.",
    },
    "amoxicillin": {
        "max_mg_per_kg":     25,
        "max_single_dose_mg": 500,
        "min_interval_hours": 8,
        "note": "Standard dose; adjust for renal impairment.",
    },
    "ors": {
        "max_mg_per_kg":     9999,
        "max_single_dose_mg": 9999,
        "min_interval_hours": 0,
        "note": "Give freely for dehydration. No dose ceiling for ORS.",
    },
}


class PediatricDoseCheck(BaseModel):
    age_years: int
    weight_kg: Optional[float] = None
    medication: str
    proposed_dose_mg: float


class PediatricDoseResponse(BaseModel):
    is_pediatric: bool
    ok: bool
    warnings: list[str]


def is_pediatric(age_years: int) -> bool:
    return age_years < 12


def validate_pediatric_dose(
    age_years: int,
    weight_kg: Optional[float],
    medication: str,
    proposed_dose_mg: float,
) -> PediatricDoseResponse:
    if not is_pediatric(age_years):
        return PediatricDoseResponse(is_pediatric=False, ok=True, warnings=[])

    med_lower  = medication.lower()
    config     = next(
        (v for k, v in PEDIATRIC_DOSE_CONFIG.items() if k in med_lower), None
    )
    warnings: list[str] = []

    if config is None:
        warnings.append(
            f"⚠ '{medication}' is not in the pediatric dose reference. "
            "Verify dosage with a pharmacist or doctor."
        )
        return PediatricDoseResponse(is_pediatric=True, ok=False, warnings=warnings)

    # Single-dose ceiling check
    if proposed_dose_mg > config["max_single_dose_mg"]:
        warnings.append(
            f"⚠ Single dose of {proposed_dose_mg} mg exceeds maximum "
            f"{config['max_single_dose_mg']} mg for {medication}."
        )

    # Weight-based check (if weight provided)
    if weight_kg:
        max_dose_by_weight = weight_kg * config["max_mg_per_kg"]
        if proposed_dose_mg > max_dose_by_weight:
            warnings.append(
                f"⚠ Dose {proposed_dose_mg} mg exceeds weight-based limit "
                f"({config['max_mg_per_kg']} mg/kg × {weight_kg} kg = "
                f"{max_dose_by_weight:.0f} mg) for {medication}."
            )

    if config.get("note"):
        warnings.append(f"ℹ {config['note']}")

    return PediatricDoseResponse(
        is_pediatric=True,
        ok=len([w for w in warnings if w.startswith("⚠")]) == 0,
        warnings=warnings,
    )


@router.post("/pediatric/dose-check", response_model=PediatricDoseResponse,
             tags=["Feature 8 – Pediatric Safety"])
def pediatric_dose_check(req: PediatricDoseCheck):
    """Validate a proposed dose for a pediatric patient."""
    return validate_pediatric_dose(
        req.age_years, req.weight_kg, req.medication, req.proposed_dose_mg
    )


# ─────────────────────────────────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════
# FEATURE 9 — Referral QR Code
# ══════════════════════════════════════════════════════════════════════════════
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/encounters/{encounter_id}/referral-token",
             tags=["Feature 9 – Referral QR"])
def ensure_referral_token(encounter_id: str):
    """Generate a referral token for the encounter if one does not exist."""
    existing = next(
        (t for t, eid in REFERRAL_TOKEN_DB.items() if eid == encounter_id), None
    )
    if existing:
        return {"referral_token": existing, "url": f"/referral/{existing}"}
    token = "ref-" + _generate_token(10)
    REFERRAL_TOKEN_DB[token] = encounter_id
    return {"referral_token": token, "url": f"/referral/{token}"}


@router.get("/referral/{token}", tags=["Feature 9 – Referral QR"])
def referral_summary(token: str):
    """
    Read-only referral summary for receiving hospital.
    Returns: reason, vitals, triage level, conditions, allergies, meds.
    """
    encounter_id = REFERRAL_TOKEN_DB.get(token)
    if not encounter_id:
        raise HTTPException(status_code=404, detail="Invalid referral token.")
    record = ENCOUNTER_DB.get(encounter_id)
    if not record:
        raise HTTPException(status_code=404, detail="Encounter record not found.")

    patient_id = record.get("id")
    history    = PATIENT_HISTORY_DB.get(patient_id, {})
    triage     = record.get("triage", {})

    return {
        "referral_token":    token,
        "encounter_id":      encounter_id,
        "patient_name":      record.get("name"),
        "age":               record.get("age"),
        "gender":            record.get("gender"),
        "reason_for_referral": triage.get("recommended_action", record.get("symptoms", "")),
        "vitals":            record.get("vitals", {}),
        "triage_level":      triage.get("risk_level", "UNKNOWN"),
        "ai_summary":        triage.get("summary", ""),
        "known_conditions":  history.get("diagnoses", []),
        "allergies":         history.get("allergies", []),
        "current_medications": history.get("current_medications", []),
        "generated_at":      datetime.utcnow().isoformat() + "Z",
    }


# ─────────────────────────────────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════
# FEATURE 10 — AI Review Alignment Check (placeholder, LLM-ready stub)
# ══════════════════════════════════════════════════════════════════════════════
# ─────────────────────────────────────────────────────────────────────────────

class ReviewCheckRequest(BaseModel):
    encounter_id: str
    ai_draft_summary: str
    doctor_final_notes: str


class ReviewCheckResponse(BaseModel):
    alignment_score: int                # 0–100
    flags: list[str]
    recommendation: str
    disclaimer: str = (
        "This is an AI advisory check only. "
        "The doctor's clinical decision is final and legally binding."
    )


def _compute_alignment(ai_summary: str, doctor_notes: str) -> tuple[int, list[str]]:
    """
    Placeholder alignment scorer.
    Checks keyword overlap and note length ratio.
    Structured so a real LLM call can replace this function body later.

    To plug in a real LLM:
        1. Replace the body of this function with a call to groq_client.chat.completions.create()
        2. Pass ai_summary and doctor_notes in the prompt
        3. Parse the returned alignment_score and flags from the JSON response
    """
    flags: list[str] = []

    # Simple keyword overlap score
    ai_words     = set(re.findall(r'\b\w{4,}\b', ai_summary.lower()))
    doc_words    = set(re.findall(r'\b\w{4,}\b', doctor_notes.lower()))
    overlap      = ai_words & doc_words
    union        = ai_words | doc_words
    jaccard      = len(overlap) / max(len(union), 1)
    base_score   = int(jaccard * 100)

    # Length ratio check
    len_ratio = len(doctor_notes) / max(len(ai_summary), 1)
    if len_ratio < 0.1:
        flags.append("Doctor notes are very brief compared to AI summary — consider adding more detail.")
        base_score = max(0, base_score - 15)

    # Red-flag keyword mismatch
    ai_red_flags  = [kw for kw in RED_FLAG_KEYWORDS if kw in ai_summary.lower()]
    doc_red_flags = [kw for kw in RED_FLAG_KEYWORDS if kw in doctor_notes.lower()]
    unacknowledged = set(ai_red_flags) - set(doc_red_flags)
    if unacknowledged:
        flags.append(
            f"AI flagged: {', '.join(unacknowledged)} — not explicitly mentioned in doctor notes."
        )
        base_score = max(0, base_score - 10 * len(unacknowledged))

    score = min(100, max(0, base_score))
    return score, flags


@router.post("/ai/review-check", response_model=ReviewCheckResponse,
             tags=["Feature 10 – AI Review Check"])
def ai_review_check(req: ReviewCheckRequest):
    """
    Soft AI alignment check between the AI draft and doctor's final notes.
    Returns an alignment score (0–100) and advisory flags.
    Doctor's decision is always final.
    """
    score, flags = _compute_alignment(req.ai_draft_summary, req.doctor_final_notes)

    if score >= 75:
        recommendation = "Good alignment between AI assessment and doctor notes."
    elif score >= 45:
        recommendation = "Moderate alignment — review flagged items above."
    else:
        recommendation = "Low alignment detected — please verify AI recommendations are addressed."

    return ReviewCheckResponse(
        alignment_score=score,
        flags=flags,
        recommendation=recommendation,
    )
