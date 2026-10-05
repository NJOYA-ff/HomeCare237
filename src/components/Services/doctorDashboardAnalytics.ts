export interface DashboardAppointment {
  patientId: string;
  date: string;
  status: string;
  consultationFee: string | number;
}

// Booking dates are calendar dates, not UTC instants.
export function appointmentDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  if (match && (date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 || date.getDate() !== Number(match[3]))) return null;
  return date;
}

// Preserve free consultations; missing/invalid fees are not invented from profile defaults.
export function consultationAmount(value: string | number): number | null {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : null;
  const normalized = value.replace(/(?:FCFA|XAF)/gi, "").replace(/\s/g, "").trim();
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(normalized)) return null;
  const amount = Number(normalized.replace(/,/g, ""));
  return Number.isFinite(amount) ? amount : null;
}

export function canUpdateAppointment(current: string, next: string): boolean {
  return (current === "pending" && (next === "accepted" || next === "rejected")) ||
    ((current === "accepted" || current === "confirmed") && next === "completed");
}

export function dashboardAnalytics(appointments: DashboardAppointment[], now = new Date()) {
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      earnings: 0,
      completed: 0,
    };
  });
  let earnings = 0;
  let projected = 0;
  let missingFees = 0;
  let undatedCompleted = 0;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (const appointment of appointments) {
    const fee = consultationAmount(appointment.consultationFee);
    const date = appointmentDate(appointment.date);
    if (appointment.status === "completed") {
      earnings += fee ?? 0;
      if (fee === null) missingFees++;
      if (!date) undatedCompleted++;
      const month = date && months.find((item) => item.key === `${date.getFullYear()}-${date.getMonth()}`);
      if (month) {
        month.earnings += fee ?? 0;
        month.completed++;
      }
    } else if ((appointment.status === "accepted" || appointment.status === "confirmed") && date && date >= today) {
      projected += fee ?? 0;
    }
  }
  return {
    totalAppointments: appointments.length,
    totalPatients: new Set(appointments.map((item) => item.patientId).filter(Boolean)).size,
    completedAppointments: appointments.filter((item) => item.status === "completed").length,
    pendingAppointments: appointments.filter((item) => item.status === "pending").length,
    earnings,
    projected,
    missingFees,
    undatedCompleted,
    months,
    thisMonth: months[5].earnings,
    previousMonth: months[4].earnings,
  };
}
