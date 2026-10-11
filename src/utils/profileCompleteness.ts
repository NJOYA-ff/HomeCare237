/**
 * profileCompleteness.ts
 *
 * Calculates how complete a patient or doctor profile is.
 * Returns a percentage (0–100) and a list of human-readable missing-field labels.
 */

export interface ProfileProgress {
  percent: number;       // 0–100 rounded to nearest integer
  filled: number;        // how many fields are complete
  total: number;         // total tracked fields
  missing: string[];     // human-readable labels of unfilled fields
}

/** A single tracked field definition. */
interface FieldSpec {
  label: string;
  getValue: (data: any) => any;
}

// ── Patient fields ─────────────────────────────────────────────────────────

const PATIENT_FIELDS: FieldSpec[] = [
  { label: "Full name",           getValue: (d) => d.name },
  { label: "Phone",               getValue: (d) => d.contact || d.phone },
  { label: "Age",                 getValue: (d) => d.age },
  { label: "Gender / Sex",        getValue: (d) => d.gender || d.sex },
  { label: "Blood type",          getValue: (d) => d.bloodType },
  { label: "Region",              getValue: (d) => d.region },
  { label: "Subdivision",         getValue: (d) => d.subdivision },
  { label: "Street address",      getValue: (d) => d.address || d.street },
  { label: "Emergency contact",   getValue: (d) => d.emergencyContact?.name || d.emergencyContact },
  { label: "Profile photo",       getValue: (d) => d.avatar || d.profilePhoto || d.profileImage },
  { label: "Language",            getValue: (d) => d.language },
  { label: "Occupation",          getValue: (d) => d.occupation },
];

// ── Doctor fields ──────────────────────────────────────────────────────────

const DOCTOR_FIELDS: FieldSpec[] = [
  { label: "Full name",           getValue: (d) => d.name },
  { label: "Specialization",      getValue: (d) => d.specialization },
  { label: "Phone",               getValue: (d) => d.contact || d.phone },
  { label: "License number",      getValue: (d) => d.licenseNumber },
  { label: "Experience (years)",  getValue: (d) => d.experience ?? d.yearsOfExperience },
  { label: "Consultation fee",    getValue: (d) => d.consultationFee },
  { label: "Region",              getValue: (d) => d.region },
  { label: "Subdivision",         getValue: (d) => d.subdivision },
  { label: "Available slots",     getValue: (d) => d.availableSlots?.length > 0 ? d.availableSlots : null },
  { label: "Bio",                 getValue: (d) => d.bio },
  { label: "Languages",           getValue: (d) => d.languages?.length > 0 ? d.languages : null },
  { label: "Profile photo",       getValue: (d) => d.avatar || d.profilePhoto },
];

// ── Core calculator ────────────────────────────────────────────────────────

function calcProgress(fields: FieldSpec[], data: Record<string, any>): ProfileProgress {
  const missing: string[] = [];
  let filled = 0;

  for (const field of fields) {
    const val = field.getValue(data);
    const isEmpty =
      val === null ||
      val === undefined ||
      val === "" ||
      val === 0 ||
      (Array.isArray(val) && val.length === 0);

    if (isEmpty) {
      missing.push(field.label);
    } else {
      filled++;
    }
  }

  const total = fields.length;
  const percent = Math.round((filled / total) * 100);

  return { percent, filled, total, missing };
}

/** Calculate profile completeness for a **patient** Firestore document. */
export function calcPatientProgress(data: Record<string, any>): ProfileProgress {
  return calcProgress(PATIENT_FIELDS, data);
}

/** Calculate profile completeness for a **doctor** Firestore document. */
export function calcDoctorProgress(data: Record<string, any>): ProfileProgress {
  return calcProgress(DOCTOR_FIELDS, data);
}
