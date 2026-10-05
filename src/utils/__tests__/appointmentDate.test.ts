/**
 * Appointment date helper tests.
 *
 * The admin appointment list used to filter on `new Date(renderedString)`, which
 * only worked on en-US devices — on a French phone every row was discarded and
 * the date filter looked dead. These tests pin the coercion of every shape the
 * `appointments` collection can hold, plus the local-day range maths that keeps
 * `IonDatetime` selections inclusive and timezone-safe.
 */
import { describe, expect, it } from "vitest";

import {
  appointmentMillis,
  DATE_PRESETS,
  dayRange,
  formatDayLabel,
  formatAppointmentWhen,
  formatPickerLabel,
  formatTimeLabel,
  isWithinRange,
  matchesPreset,
  presetRange,
  slotToMinutes,
  toInputDate,
  toMillis,
} from "../appointmentDate";

/** Fixed instants so the suite never depends on the wall clock. */
const SEP_29_2026_10_30 = new Date(2026, 8, 29, 10, 30, 0).getTime();

describe("toMillis", () => {
  it("reads Firestore Timestamps through toDate()", () => {
    const timestamp = {
      seconds: Math.floor(SEP_29_2026_10_30 / 1000),
      nanoseconds: 0,
      toDate: () => new Date(SEP_29_2026_10_30),
    };
    expect(toMillis(timestamp)).toBe(SEP_29_2026_10_30);
  });

  it("reads bare timestamp payloads including nanoseconds", () => {
    const seconds = Math.floor(SEP_29_2026_10_30 / 1000);
    expect(toMillis({ seconds, nanoseconds: 0 })).toBe(seconds * 1000);
    expect(toMillis({ _seconds: seconds, _nanoseconds: 500_000_000 })).toBe(
      seconds * 1000 + 500,
    );
  });

  it("treats small numbers as seconds and large ones as milliseconds", () => {
    expect(toMillis(SEP_29_2026_10_30)).toBe(SEP_29_2026_10_30);
    expect(toMillis(Math.floor(SEP_29_2026_10_30 / 1000))).toBe(
      Math.floor(SEP_29_2026_10_30 / 1000) * 1000,
    );
  });

  it("keeps date-only ISO strings on the local calendar", () => {
    const ms = toMillis("2026-09-29");
    expect(ms).not.toBeNull();
    const local = new Date(ms as number);
    expect([local.getFullYear(), local.getMonth(), local.getDate()]).toEqual([
      2026, 8, 29,
    ]);
    expect(local.getHours()).toBe(0);
  });

  it("parses both en-US and day-first locale renderings", () => {
    expect(toMillis("9/29/2026 10:30:00 AM", false)).toBe(SEP_29_2026_10_30);
    expect(toMillis("29/09/2026 10:30:00", true)).toBe(SEP_29_2026_10_30);
    expect(toMillis("9/29/2026 10:30:00 AM", true)).toBe(SEP_29_2026_10_30);
  });

  it("resolves the ambiguous order from the hint, not luck", () => {
    expect(new Date(toMillis("03/04/2026", false) as number).getMonth()).toBe(2);
    expect(new Date(toMillis("03/04/2026", true) as number).getMonth()).toBe(3);
  });

  it("rejects unusable values instead of returning Invalid Date", () => {
    expect(toMillis(null)).toBeNull();
    expect(toMillis(undefined)).toBeNull();
    expect(toMillis("")).toBeNull();
    expect(toMillis("not a date")).toBeNull();
    expect(toMillis("31/02/2026")).toBeNull();
    expect(toMillis("13/13/2026", false)).toBeNull();
    expect(toMillis({})).toBeNull();
    expect(toMillis(Number.NaN)).toBeNull();
  });
});

describe("toInputDate", () => {
  it("writes local dates the way IonDatetime expects them", () => {
    expect(toInputDate(new Date(2026, 8, 29))).toBe("2026-09-29");
    expect(toInputDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("round-trips through toMillis", () => {
    const iso = toInputDate(new Date(2026, 11, 24));
    expect(toMillis(iso)).toBe(new Date(2026, 11, 24).getTime());
  });
});

describe("dayRange", () => {
  it("covers the whole local day at both ends", () => {
    const range = dayRange("2026-09-29", "2026-09-29");
    expect(range.reversed).toBe(false);
    expect(range.from).toBe(new Date(2026, 8, 29, 0, 0, 0, 0).getTime());
    expect(range.to).toBe(new Date(2026, 8, 29, 23, 59, 59, 999).getTime());
    expect(isWithinRange(SEP_29_2026_10_30, range)).toBe(true);
    expect(isWithinRange(new Date(2026, 8, 30, 8, 0).getTime(), range)).toBe(false);
  });

  it("stays open-ended when only one side is set", () => {
    const open = dayRange("", "2026-09-29");
    expect(open.from).toBeNull();
    expect(isWithinRange(new Date(2020, 0, 1).getTime(), open)).toBe(true);

    const openFrom = dayRange("2026-09-29", "");
    expect(openFrom.to).toBeNull();
    expect(isWithinRange(new Date(2030, 0, 1).getTime(), openFrom)).toBe(true);
  });

  it("swaps a reversed selection instead of returning nothing", () => {
    const range = dayRange("2026-09-29", "2026-09-01");
    expect(range.reversed).toBe(true);
    expect(isWithinRange(SEP_29_2026_10_30, range)).toBe(true);
    expect(isWithinRange(new Date(2026, 8, 15).getTime(), range)).toBe(true);
    expect(isWithinRange(new Date(2026, 7, 31).getTime(), range)).toBe(false);
  });

  it("never matches rows without a date once a range is active", () => {
    expect(isWithinRange(null, dayRange("2026-09-01", "2026-09-30"))).toBe(false);
    expect(isWithinRange(null, dayRange("", ""))).toBe(false);
  });
});

describe("presets", () => {
  const now = new Date(2026, 8, 29, 9, 15);

  it("builds inclusive day pairs", () => {
    expect(presetRange("today", now)).toEqual({ from: "2026-09-29", to: "2026-09-29" });
    expect(presetRange("7d", now)).toEqual({ from: "2026-09-23", to: "2026-09-29" });
    expect(presetRange("30d", now)).toEqual({ from: "2026-08-31", to: "2026-09-29" });
    expect(presetRange("month", now)).toEqual({ from: "2026-09-01", to: "2026-09-30" });
  });

  it("never produces a reversed range", () => {
    for (const preset of DATE_PRESETS) {
      const { from, to } = presetRange(preset.key, now);
      expect(dayRange(from, to).reversed).toBe(false);
      expect(dayRange(from, to).from).not.toBeNull();
    }
  });

  it("only reports a match for the exact current window", () => {
    const { from, to } = presetRange("7d", now);
    expect(matchesPreset("7d", from, to, now)).toBe(true);
    expect(matchesPreset("30d", from, to, now)).toBe(false);
    expect(matchesPreset("7d", "", "", now)).toBe(false);
  });
});

describe("formatting", () => {
  it("renders the requested language and degrades when there is no date", () => {
    expect(formatDayLabel(SEP_29_2026_10_30, "en")).toContain("2026");
    expect(formatDayLabel(SEP_29_2026_10_30, "fr")).toContain("2026");
    expect(formatDayLabel(SEP_29_2026_10_30, "xx")).toContain("2026");
    expect(formatDayLabel(null)).toBe("Date not set");
    expect(formatTimeLabel(SEP_29_2026_10_30, "en")).toContain("30");
    expect(formatTimeLabel(null, "en")).toBe("");
  });

  it("labels picker values without a timezone shift", () => {
    expect(formatPickerLabel("2026-09-29", "en")).toContain("2026");
    expect(formatPickerLabel("2026-09-29", "en")).toContain("29");
    // Unparseable input is echoed back instead of turning into "Invalid Date".
    expect(formatPickerLabel("sometime", "en")).toBe("sometime");
  });
});

describe("slotToMinutes", () => {
  it("reads the doctor's free-form availableSlots", () => {
    expect(slotToMinutes("09:00")).toBe(9 * 60);
    expect(slotToMinutes("9:00")).toBe(9 * 60);
    expect(slotToMinutes("09:30")).toBe(9 * 60 + 30);
    expect(slotToMinutes("14:05")).toBe(14 * 60 + 5);
    expect(slotToMinutes("09:00:00")).toBe(9 * 60);
    expect(slotToMinutes("14h30")).toBe(14 * 60 + 30);
    expect(slotToMinutes("  10:15  ")).toBe(10 * 60 + 15);
  });

  it("honours an AM/PM suffix", () => {
    expect(slotToMinutes("9:00 AM")).toBe(9 * 60);
    expect(slotToMinutes("12:00 AM")).toBe(0);
    expect(slotToMinutes("12:30 PM")).toBe(12 * 60 + 30);
    expect(slotToMinutes("1:00 PM")).toBe(13 * 60);
    expect(slotToMinutes("11:59 PM")).toBe(23 * 60 + 59);
  });

  it("returns null instead of guessing at unusable slots", () => {
    expect(slotToMinutes("sometime")).toBeNull();
    expect(slotToMinutes("")).toBeNull();
    expect(slotToMinutes(null)).toBeNull();
    expect(slotToMinutes(undefined)).toBeNull();
    expect(slotToMinutes(900)).toBeNull();
    expect(slotToMinutes("25:00")).toBeNull();
    expect(slotToMinutes("09:99")).toBeNull();
  });
});

describe("formatAppointmentWhen", () => {
  // Fixed "now" so Today/Tomorrow labels never depend on the wall clock.
  const NOW = new Date(2026, 8, 29, 12, 0, 0);

  it("shows the booked slot, not the date-picker clock time", () => {
    // `date` carries a 23:45 artefact; the patient picked the 09:30 slot.
    const date = new Date(2026, 8, 29, 23, 45, 0).getTime();
    const label = formatAppointmentWhen(
      appointmentMillis(date, "09:30"),
      "en",
      NOW,
    );
    expect(label).toBe("Today, 09:30 AM");
  });

  it("labels the next calendar day as Tomorrow", () => {
    const tomorrow = new Date(2026, 8, 30, 0, 5, 0).getTime();
    expect(formatAppointmentWhen(tomorrow, "en", NOW)).toBe("Tomorrow, 12:05 AM");
  });

  it("falls back to a full day label further out", () => {
    const later = new Date(2026, 9, 2, 14, 0, 0).getTime();
    expect(formatAppointmentWhen(later, "en", NOW)).toBe(
      "Fri, Oct 2, 2026, 02:00 PM",
    );
  });

  it("does not call yesterday 'Today' across the midnight boundary", () => {
    const yesterday = new Date(2026, 8, 28, 23, 30, 0).getTime();
    const label = formatAppointmentWhen(yesterday, "en", NOW);
    expect(label).not.toContain("Today");
    expect(label).toContain("11:30 PM");
  });

  it("returns the fallback when the date is unusable", () => {
    expect(formatAppointmentWhen(null, "en", NOW)).toBe("No date");
    expect(formatAppointmentWhen(null, "en", NOW, "N/A")).toBe("N/A");
  });
});

describe("appointmentMillis", () => {
  it("takes the day from `date` and the clock from the booked slot", () => {
    // `date` deliberately carries a 23:45 clock time — the artefact of the
    // date-only IonDatetime picker that made the old code show the wrong hour.
    const date = new Date(2026, 8, 29, 23, 45, 0).getTime();
    const ms = appointmentMillis(date, "09:30");

    const local = new Date(ms as number);
    expect([local.getFullYear(), local.getMonth(), local.getDate()]).toEqual([
      2026, 8, 29,
    ]);
    expect(local.getHours()).toBe(9);
    expect(local.getMinutes()).toBe(30);
  });

  it("orders two appointments on one day by their slot, not by write order", () => {
    const date = new Date(2026, 8, 29, 0, 0, 0).getTime();
    const morning = appointmentMillis(date, "08:00") as number;
    const evening = appointmentMillis(date, "17:45") as number;

    expect(morning).toBeLessThan(evening);
    expect(new Date(evening).getHours()).toBe(17);
  });

  it("falls back to the stored instant when there is no readable slot", () => {
    const date = new Date(2026, 8, 29, 14, 0, 0).getTime();
    expect(appointmentMillis(date)).toBe(date);
    expect(appointmentMillis(date, "whenever")).toBe(date);
  });

  it("returns null when the date itself is unusable", () => {
    expect(appointmentMillis(null, "09:00")).toBeNull();
    expect(appointmentMillis("not-a-date", "09:00")).toBeNull();
  });

  it("reads a Firestore Timestamp the way booking writes it", () => {
    const base = new Date(2026, 8, 29, 23, 45, 0).getTime();
    const timestamp = {
      seconds: Math.floor(base / 1000),
      nanoseconds: 0,
      toDate: () => new Date(base),
    };
    const local = new Date(appointmentMillis(timestamp, "10:00") as number);
    expect(local.getDate()).toBe(29);
    expect(local.getHours()).toBe(10);
  });
});
