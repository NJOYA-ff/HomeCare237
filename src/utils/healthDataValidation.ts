/**
 * healthDataValidation.ts
 *
 * Healthcare-specific data validation utilities
 * Ensures medical data integrity and compliance with healthcare standards
 */

import { validateMedicalData } from "./securityUtils";

/**
 * Medical terminology validation
 */
export const medicalTerminology = {
  // Valid blood types
  bloodTypes: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
  
  // Common medication routes
  medicationRoutes: ["oral", "intravenous", "intramuscular", "subcutaneous", "topical", "inhaled"],
  
  // Frequency units
  frequencyUnits: ["daily", "twice daily", "three times daily", "four times daily", "weekly", "monthly", "as needed"],
  
  // Vital signs ranges
  vitalRanges: {
    heartRate: { min: 40, max: 180, unit: "bpm" },
    bloodPressureSystolic: { min: 70, max: 250, unit: "mmHg" },
    bloodPressureDiastolic: { min: 40, max: 130, unit: "mmHg" },
    temperature: { min: 35, max: 42, unit: "°C" },
    oxygenSaturation: { min: 70, max: 100, unit: "%" },
    weight: { min: 1, max: 300, unit: "kg" },
    height: { min: 30, max: 250, unit: "cm" },
    glucose: { min: 2, max: 30, unit: "mmol/L" },
  },
  
  // Severity levels
  severityLevels: ["mild", "moderate", "severe", "critical"],
  
  // Appointment status
  appointmentStatus: ["pending", "accepted", "rejected", "completed", "cancelled", "no-show"],
  
  // Payment status
  paymentStatus: ["pending", "paid", "failed", "refunded"],
};

/**
 * Validate patient data
 */
export const validatePatientData = (data: {
  name?: string;
  email?: string;
  phone?: string;
  bloodType?: string;
  allergies?: string[];
  conditions?: string[];
  dateOfBirth?: string;
}): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Name validation
  if (data.name && data.name.length < 2) {
    errors.push("Name must be at least 2 characters");
  }

  // Email validation
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push("Invalid email format");
  }

  // Phone validation (Cameroon format)
  if (data.phone) {
    const cleaned = data.phone.replace(/[\s\-+()]/g, "");
    if (!/^6[0-9]{8}$/.test(cleaned)) {
      errors.push("Invalid Cameroon phone number format");
    }
  }

  // Blood type validation
  if (data.bloodType && !medicalTerminology.bloodTypes.includes(data.bloodType)) {
    errors.push("Invalid blood type");
  }

  // Date of birth validation
  if (data.dateOfBirth) {
    const dob = new Date(data.dateOfBirth);
    const now = new Date();
    const age = now.getFullYear() - dob.getFullYear();
    
    if (age < 0 || age > 120) {
      errors.push("Invalid date of birth");
    }
  }

  // Medical data validation
  const medicalValidation = validateMedicalData({
    bloodType: data.bloodType,
    allergies: data.allergies,
    conditions: data.conditions,
  });
  
  errors.push(...medicalValidation.errors);

  return { valid: errors.length === 0, errors };
};

/**
 * Validate medication data
 */
export const validateMedicationData = (data: {
  name?: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  startDate?: string;
  endDate?: string;
}): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Name validation
  if (!data.name || data.name.trim().length < 2) {
    errors.push("Medication name is required and must be at least 2 characters");
  }

  // Dosage validation
  if (!data.dosage || data.dosage.trim().length < 1) {
    errors.push("Dosage is required");
  }

  // Frequency validation
  if (data.frequency && !medicalTerminology.frequencyUnits.includes(data.frequency)) {
    errors.push("Invalid frequency unit");
  }

  // Route validation
  if (data.route && !medicalTerminology.medicationRoutes.includes(data.route)) {
    errors.push("Invalid medication route");
  }

  // Date validation
  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    
    if (end < start) {
      errors.push("End date cannot be before start date");
    }
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Validate vital signs data
 */
export const validateVitalsData = (data: {
  heartRate?: number;
  bloodPressure?: string;
  temperature?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
  glucose?: number;
}): { valid: boolean; errors: string[]; warnings: string[] } => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Heart rate validation
  if (data.heartRate !== undefined) {
    const { min, max, unit } = medicalTerminology.vitalRanges.heartRate;
    if (data.heartRate < min || data.heartRate > max) {
      errors.push(`Heart rate must be between ${min}-${max} ${unit}`);
    } else if (data.heartRate < 60 || data.heartRate > 100) {
      warnings.push("Heart rate outside normal range (60-100 bpm)");
    }
  }

  // Blood pressure validation
  if (data.bloodPressure) {
    const parts = data.bloodPressure.split("/").map(Number);
    if (parts.length === 2) {
      const [systolic, diastolic] = parts;
      const sysRange = medicalTerminology.vitalRanges.bloodPressureSystolic;
      const diaRange = medicalTerminology.vitalRanges.bloodPressureDiastolic;
      
      if (systolic < sysRange.min || systolic > sysRange.max) {
        errors.push(`Systolic pressure must be between ${sysRange.min}-${sysRange.max} ${sysRange.unit}`);
      }
      if (diastolic < diaRange.min || diastolic > diaRange.max) {
        errors.push(`Diastolic pressure must be between ${diaRange.min}-${diaRange.max} ${diaRange.unit}`);
      }
      
      // Hypertension warning
      if (systolic >= 140 || diastolic >= 90) {
        warnings.push("Blood pressure indicates possible hypertension");
      }
    } else {
      errors.push("Blood pressure must be in format 'systolic/diastolic'");
    }
  }

  // Temperature validation
  if (data.temperature !== undefined) {
    const { min, max, unit } = medicalTerminology.vitalRanges.temperature;
    if (data.temperature < min || data.temperature > max) {
      errors.push(`Temperature must be between ${min}-${max} ${unit}`);
    } else if (data.temperature > 37.5) {
      warnings.push("Temperature indicates possible fever");
    } else if (data.temperature < 36) {
      warnings.push("Temperature below normal range");
    }
  }

  // Oxygen saturation validation
  if (data.oxygenSaturation !== undefined) {
    const { min, max, unit } = medicalTerminology.vitalRanges.oxygenSaturation;
    if (data.oxygenSaturation < min || data.oxygenSaturation > max) {
      errors.push(`Oxygen saturation must be between ${min}-${max} ${unit}`);
    } else if (data.oxygenSaturation < 95) {
      warnings.push("Oxygen saturation below normal range (95-100%)");
    }
  }

  // Weight validation
  if (data.weight !== undefined) {
    const { min, max, unit } = medicalTerminology.vitalRanges.weight;
    if (data.weight < min || data.weight > max) {
      errors.push(`Weight must be between ${min}-${max} ${unit}`);
    }
  }

  // Height validation
  if (data.height !== undefined) {
    const { min, max, unit } = medicalTerminology.vitalRanges.height;
    if (data.height < min || data.height > max) {
      errors.push(`Height must be between ${min}-${max} ${unit}`);
    }
  }

  // Glucose validation
  if (data.glucose !== undefined) {
    const { min, max, unit } = medicalTerminology.vitalRanges.glucose;
    if (data.glucose < min || data.glucose > max) {
      errors.push(`Glucose must be between ${min}-${max} ${unit}`);
    } else if (data.glucose > 7) {
      warnings.push("Glucose level indicates possible hyperglycemia");
    } else if (data.glucose < 3.9) {
      warnings.push("Glucose level indicates possible hypoglycemia");
    }
  }

  return { valid: errors.length === 0, errors, warnings };
};

/**
 * Validate appointment data
 */
export const validateAppointmentData = (data: {
  date?: string;
  time?: string;
  reason?: string;
  consultationFee?: number;
}): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Date validation
  if (data.date) {
    const appointmentDate = new Date(data.date);
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (appointmentDate.getTime() < today.getTime()) {
      errors.push("Appointment date cannot be in the past");
    }
  }

  // Time validation
  if (data.time) {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(data.time)) {
      errors.push("Invalid time format (use HH:MM)");
    }
  }

  // Reason validation
  if (!data.reason || data.reason.trim().length < 5) {
    errors.push("Reason must be at least 5 characters");
  }

  // Consultation fee validation
  if (data.consultationFee !== undefined) {
    if (data.consultationFee < 0 || data.consultationFee > 100000) {
      errors.push("Consultation fee must be between 0 and 100,000 XAF");
    }
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Sanitize medical notes for display
 */
export const sanitizeMedicalNotes = (notes: string): string => {
  // Remove potentially harmful content while preserving medical terminology
  return notes
    .replace(/<script[^>]*>.*?<\/script>/gi, "") // Remove scripts
    .replace(/<[^>]+>/g, "") // Remove HTML tags
    .trim()
    .substring(0, 5000); // Limit length
};

/**
 * Validate diagnosis data
 */
export const validateDiagnosisData = (data: {
  diagnosis?: string;
  description?: string;
  severity?: string;
  symptoms?: string[];
}): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Diagnosis validation
  if (!data.diagnosis || data.diagnosis.trim().length < 3) {
    errors.push("Diagnosis must be at least 3 characters");
  }

  // Description validation
  if (!data.description || data.description.trim().length < 10) {
    errors.push("Description must be at least 10 characters");
  }

  // Severity validation
  if (data.severity && !medicalTerminology.severityLevels.includes(data.severity)) {
    errors.push("Invalid severity level");
  }

  // Symptoms validation
  if (data.symptoms && data.symptoms.some(s => !s.trim())) {
    errors.push("Symptoms cannot be empty");
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Drug interaction checker (simplified version)
 */
export const checkDrugInteractions = (medications: string[]): { interactions: string[]; warnings: string[] } => {
  const interactions: string[] = [];
  const warnings: string[] = [];

  // This is a simplified version - in production, integrate with a proper drug interaction database
  const knownInteractions: Record<string, string[]> = {
    "warfarin": ["aspirin", "ibuprofen", "clopidogrel"],
    "insulin": ["prednisone", "hydrochlorothiazide"],
    "digoxin": ["amiodarone", "verapamil"],
  };

  const lowerCaseMeds = medications.map(m => m.toLowerCase());

  for (const [drug, interactingDrugs] of Object.entries(knownInteractions)) {
    if (lowerCaseMeds.includes(drug)) {
      const foundInteractions = interactingDrugs.filter(d => lowerCaseMeds.includes(d));
      if (foundInteractions.length > 0) {
        interactions.push(`${drug} may interact with ${foundInteractions.join(", ")}`);
      }
    }
  }

  // General warnings
  if (medications.length > 5) {
    warnings.push("Multiple medications may increase risk of interactions");
  }

  return { interactions, warnings };
};

/**
 * Allergy checker for medications
 */
export const checkMedicationAllergies = (
  patientAllergies: string[],
  medicationName: string
): { hasAllergy: boolean; severity: "none" | "mild" | "moderate" | "severe" } => {
  const lowerCaseAllergies = patientAllergies.map(a => a.toLowerCase());
  const lowerCaseMedication = medicationName.toLowerCase();

  // Check for exact match
  if (lowerCaseAllergies.includes(lowerCaseMedication)) {
    return { hasAllergy: true, severity: "severe" };
  }

  // Check for related medications (simplified)
  const relatedMeds: Record<string, string[]> = {
    "penicillin": ["amoxicillin", "ampicillin", "oxacillin"],
    "sulfa": ["sulfamethoxazole", "sulfadiazine"],
    "aspirin": ["nsaids", "ibuprofen", "naproxen"],
  };

  for (const [allergen, related] of Object.entries(relatedMeds)) {
    if (lowerCaseAllergies.includes(allergen) && related.some(r => lowerCaseMedication.includes(r))) {
      return { hasAllergy: true, severity: "moderate" };
    }
  }

  return { hasAllergy: false, severity: "none" };
};