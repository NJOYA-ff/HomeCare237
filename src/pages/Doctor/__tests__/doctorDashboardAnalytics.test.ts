import { describe, expect, it } from "vitest";
import { appointmentDate, consultationAmount, dashboardAnalytics, canUpdateAppointment } from "../../../components/Services/doctorDashboardAnalytics";

describe("doctor dashboard analytics", () => {
  const now = new Date(2026, 8, 17);
  it("counts only completed fees as earnings and future confirmed fees as projected", () => {
    const result = dashboardAnalytics([
      { patientId: "a", date: "2026-09-01", status: "completed", consultationFee: "5,000 XAF" },
      { patientId: "a", date: "2026-09-18", status: "accepted", consultationFee: 6000 },
      { patientId: "b", date: "2026-09-18", status: "pending", consultationFee: 9000 },
      { patientId: "c", date: "2026-08-18", status: "completed", consultationFee: "2 000 FCFA" },
      { patientId: "", date: "2026-09-18", status: "rejected", consultationFee: 5000 },
    ], now);
    expect(result.earnings).toBe(7000);
    expect(result.projected).toBe(6000);
    expect(result.totalPatients).toBe(3);
    expect(result.completedAppointments).toBe(2);
    expect(result.pendingAppointments).toBe(1);
    expect(result.thisMonth).toBe(5000);
    expect(result.previousMonth).toBe(2000);
  });
  it("preserves zero fees and flags invalid or missing data", () => {
    expect(consultationAmount("0 XAF")).toBe(0);
    for (const value of ["", "N/A", "-500", "5,00", Infinity]) expect(consultationAmount(value)).toBeNull();
    const result = dashboardAnalytics([{ patientId: "a", date: "bad", status: "completed", consultationFee: "" }], now);
    expect(result.missingFees).toBe(1);
    expect(result.undatedCompleted).toBe(1);
    expect(result.earnings).toBe(0);
  });
  it("fills six months including year boundaries and handles empty data", () => {
    const result = dashboardAnalytics([], new Date(2026, 0, 1));
    expect(result.months).toHaveLength(6);
    expect(result.months[0].key).toBe("2025-7");
    expect(result.months[5].key).toBe("2026-0");
    expect(result.earnings).toBe(0);
  });
  it("parses calendar dates locally and rejects invalid dates", () => {
    expect(appointmentDate("2026-09-17")?.getDate()).toBe(17);
    expect(appointmentDate("2026-02-30")).toBeNull();
    expect(appointmentDate("bad")).toBeNull();
  });
  it("allows only pending decisions and confirmed completion", () => {
    expect(canUpdateAppointment("pending", "accepted")).toBe(true);
    expect(canUpdateAppointment("pending", "rejected")).toBe(true);
    expect(canUpdateAppointment("confirmed", "completed")).toBe(true);
    expect(canUpdateAppointment("accepted", "completed")).toBe(true);
    expect(canUpdateAppointment("completed", "accepted")).toBe(false);
    expect(canUpdateAppointment("pending", "completed")).toBe(false);
    expect(canUpdateAppointment("rejected", "accepted")).toBe(false);
  });
});
