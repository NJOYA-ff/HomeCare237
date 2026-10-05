/**
 * Appointment date helpers.
 *
 * Appointment dates arrive at the client in several shapes — a Firestore
 * `Timestamp`, an epoch number, an ISO string, or the locale string produced by
 * the legacy `toLocaleDateString()` conversion ("9/29/2026 10:30:00 AM", or
 * "29/09/2026 10:30:00" on a French device). `new Date(text)` only parses some
 * of those, so a date filter silently dropped every row depending on the device
 * locale. Everything therefore goes through `toMillis()` first, and range maths
 * is done on local calendar days rather than UTC string parsing.
 */

const MS_PER_SECOND = 1000;
/** Below this a number cannot be milliseconds since 1970 (that would be year 33658). */
const SECONDS_CUTOFF = 1e12;

/** `YYYY-MM-DD` (date only) — must not be read as a UTC instant. */
const ISO_DATE_ONLY = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
/** `9/29/2026`, `29.09.2026`, `2026/09/29` optionally followed by a time. */
const SLASHED_DATE =
  /^(\d{1,4})[./-](\d{1,2})[./-](\d{1,4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i;

const LOCALES: Record<string, string> = {
  en: "en-US",
  fr: "fr-FR",
};

/** Cached guess at whether the runtime writes dates day-first (fr-FR, en-GB…). */
let dayFirstCache: boolean | null = null;

function runtimePrefersDayFirst(): boolean {
  if (dayFirstCache !== null) return dayFirstCache;
  const locale =
    (typeof Intl !== "undefined" && Intl.DateTimeFormat().resolvedOptions().locale) || "en-US";
  // en-US is the notable month-first locale; most of the world is day-first.
  dayFirstCache = !/^en-US/i.test(locale);
  return dayFirstCache;
}

function safeTime(value: number): number | null {
  return Number.isFinite(value) ? value : null;
}

/** Builds a local date from parts, rejecting calendar-impossible values. */
function clampParts(year: number, month: number, day: number): number | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return safeTime(date.getTime());
}

/**
 * Parses a human date string such as "9/29/2026 10:30:00 AM" or
 * "29.09.2026, 10:30". Ambiguous values (both parts ≤ 12) follow the runtime
 * locale unless `preferDayFirst` says otherwise.
 */
function parseHumanDate(text: string, preferDayFirst?: boolean): number | null {
  const match = SLASHED_DATE.exec(text.trim());
  if (!match) return null;

  const [, a, b, c, hourText, minuteText, secondText, meridiem] = match;
  let year: number;
  let month: number;
  let day: number;

  if (a.length === 4) {
    year = Number(a);
    month = Number(b);
    day = Number(c);
  } else {
    const first = Number(a);
    const second = Number(b);
    year = c.length === 2 ? 2000 + Number(c) : Number(c);
    const dayFirst = preferDayFirst ?? runtimePrefersDayFirst();
    if (first > 12 && second <= 12) {
      day = first;
      month = second;
    } else if (second > 12 && first <= 12) {
      month = first;
      day = second;
    } else if (dayFirst) {
      day = first;
      month = second;
    } else {
      month = first;
      day = second;
    }
  }

  const base = clampParts(year, month, day);
  if (base === null) return null;
  if (!hourText) return base;

  let hour = Number(hourText);
  const minute = Number(minuteText);
  const second = secondText ? Number(secondText) : 0;
  const suffix = meridiem?.toUpperCase();
  if (suffix === "PM" && hour < 12) hour += 12;
  if (suffix === "AM" && hour === 12) hour = 0;
  if (hour > 23 || minute > 59 || second > 59) return null;

  return safeTime(new Date(year, month - 1, day, hour, minute, second).getTime());
}

/**
 * Coerces anything the `appointments` collection may hold for a date field into
 * epoch milliseconds, or `null` when there is nothing usable.
 */
export function toMillis(value: unknown, preferDayFirst?: boolean): number | null {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date) return safeTime(value.getTime());

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return value < SECONDS_CUTOFF ? value * MS_PER_SECOND : value;
  }

  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return null;

    // Date-only ISO strings are local calendar days, not UTC instants.
    const isoOnly = ISO_DATE_ONLY.exec(text);
    if (isoOnly) {
      return clampParts(Number(isoOnly[1]), Number(isoOnly[2]), Number(isoOnly[3]));
    }

    const human = parseHumanDate(text, preferDayFirst);
    if (human !== null) return human;

    const parsed = Date.parse(text);
    return Number.isNaN(parsed) ? null : parsed;
  }

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.toMillis === "function") {
    try {
      return safeTime(Number((candidate.toMillis as () => number)()));
    } catch {
      /* fall through to the other shapes */
    }
  }
  const toDateFn = candidate.toDate as (() => Date) | undefined;
  if (typeof toDateFn === "function") {
    try {
      const date = toDateFn.call(candidate);
      return date instanceof Date ? safeTime(date.getTime()) : null;
    } catch {
      /* fall through to the raw fields */
    }
  }
  const seconds = (candidate.seconds ?? candidate._seconds) as unknown;
  if (typeof seconds === "number") {
    const nanos = ((candidate.nanoseconds ?? candidate._nanoseconds) as number) || 0;
    return safeTime(seconds * MS_PER_SECOND + nanos / 1e6);
  }

  return null;
}

/** Local `YYYY-MM-DD` — the format `IonDatetime` exchanges with the user. */
export function toInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date): number {
  const local = new Date(date);
  local.setHours(0, 0, 0, 0);
  return local.getTime();
}

function endOfDay(date: Date): number {
  const local = new Date(date);
  local.setHours(23, 59, 59, 999);
  return local.getTime();
}

export interface DayRange {
  /** Inclusive lower bound (local 00:00:00), or null when unset. */
  from: number | null;
  /** Inclusive upper bound (local 23:59:59.999), or null when unset. */
  to: number | null;
  /** True when the user picked the dates the wrong way round (auto-corrected). */
  reversed: boolean;
}

/** `09:00`, `9:00`, `09:00:00`, optionally with an `AM`/`PM` suffix. */
const SLOT_TIME = /^(\d{1,2})(?:[:.h](\d{2}))?(?::\d{2})?\s*(AM|PM)?$/i;

/**
 * Parses one of the doctor's `availableSlots` strings into minutes past local
 * midnight, or `null` when it is not a time we can read.
 *
 * The doctor's slot list is free-form text ("09:00", "9:00 AM", "14h30"), so
 * anything unparseable is reported as `null` rather than guessed at.
 */
export function slotToMinutes(slot: unknown): number | null {
  if (typeof slot !== "string") return null;
  const match = SLOT_TIME.exec(slot.trim());
  if (!match) return null;

  const [, hourText, minuteText, meridiem] = match;
  let hour = Number(hourText);
  const minute = minuteText ? Number(minuteText) : 0;
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;

  const suffix = meridiem?.toUpperCase();
  if (suffix === "PM" && hour < 12) hour += 12;
  if (suffix === "AM" && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return null;

  return hour * 60 + minute;
}

/**
 * Builds the real instant of an appointment from its stored `date` plus the
 * `time` slot the patient actually picked.
 *
 * This is the fix for "upcoming appointment shows the wrong time". Booking
 * stores the slot as a *separate* string (`time: selectedTime`, e.g. `"09:00"`)
 * while `date` is a `Timestamp` built from the `IonDatetime` value. That
 * datetime carries whatever time of day the date-only picker happened to
 * produce, so reading the clock time out of `date` showed an arbitrary time
 * rather than the booked slot. Taking the calendar day from `date` and the
 * clock time from `time` is what the user actually chose.
 *
 * @param dateValue the `appointments.date` field (Timestamp, ISO, …)
 * @param timeValue the `appointments.time` slot string
 * @returns epoch ms, or `null` when the date is unusable
 */
export function appointmentMillis(
  dateValue: unknown,
  timeValue?: unknown,
): number | null {
  const base = toMillis(dateValue);
  if (base === null) return null;

  const minutes = slotToMinutes(timeValue);
  // No readable slot: fall back to the stored instant rather than dropping the
  // appointment entirely, so legacy rows without a `time` field still render.
  if (minutes === null) return base;

  const local = new Date(base);
  local.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return local.getTime();
}

/**
 * Turns the two `YYYY-MM-DD` values coming from `IonDatetime` into an inclusive
 * local range. A reversed selection is swapped so the filter stays useful
 * instead of silently returning nothing.
 */
export function dayRange(fromISO?: string | null, toISO?: string | null): DayRange {
  const fromMs = fromISO ? toMillis(fromISO) : null;
  const toMs = toISO ? toMillis(toISO) : null;

  if (fromMs !== null && toMs !== null && fromMs > toMs) {
    return {
      from: startOfDay(new Date(toMs)),
      to: endOfDay(new Date(fromMs)),
      reversed: true,
    };
  }
  return {
    from: fromMs === null ? null : startOfDay(new Date(fromMs)),
    to: toMs === null ? null : endOfDay(new Date(toMs)),
    reversed: false,
  };
}

/** True when `ms` falls inside `range`; rows without a usable date never match. */
export function isWithinRange(ms: number | null, range: DayRange): boolean {
  if (ms === null) return false;
  if (range.from !== null && ms < range.from) return false;
  if (range.to !== null && ms > range.to) return false;
  return true;
}

export type PresetKey = "today" | "7d" | "30d" | "month";

export const DATE_PRESETS: { key: PresetKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "month", label: "This month" },
];

/** Inclusive `from`/`to` day pair for a quick-filter preset. */
export function presetRange(
  key: PresetKey,
  now: Date = new Date(),
): { from: string; to: string } {
  const to = new Date(now);
  const from = new Date(now);

  switch (key) {
    case "7d":
      from.setDate(from.getDate() - 6);
      break;
    case "30d":
      from.setDate(from.getDate() - 29);
      break;
    case "month":
      from.setDate(1);
      to.setMonth(to.getMonth() + 1, 0);
      break;
    default:
      break;
  }
  return { from: toInputDate(from), to: toInputDate(to) };
}

/** True when the current selection is exactly this preset. */
export function matchesPreset(
  key: PresetKey,
  fromISO: string,
  toISO: string,
  now: Date = new Date(),
): boolean {
  if (!fromISO || !toISO) return false;
  const expected = presetRange(key, now);
  return expected.from === fromISO && expected.to === toISO;
}

function formatter(
  language: string | undefined,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const short = (language || "en").slice(0, 2);
  const locale = LOCALES[short] || language || "en-US";
  try {
    return new Intl.DateTimeFormat(locale, options);
  } catch {
    return new Intl.DateTimeFormat("en-US", options);
  }
}

/** "Mon, Sep 29, 2026" (locale aware), or `fallback` when there is no date. */
export function formatDayLabel(
  ms: number | null,
  language?: string,
  fallback = "Date not set",
): string {
  if (ms === null) return fallback;
  return formatter(language, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(ms));
}

/** "09:30 AM" (locale aware) derived from the stored instant. */
export function formatTimeLabel(
  ms: number | null,
  language?: string,
  fallback = "",
): string {
  if (ms === null) return fallback;
  return formatter(
    language,
    { hour: "2-digit", minute: "2-digit", hour12: true },
  ).format(new Date(ms));
}

/**
 * Days since the epoch for a *local calendar day*, ignoring the clock time.
 * Comparing these instead of raw millisecond differences keeps "today" correct
 * across a daylight-saving jump, where a day is 23 or 25 hours long.
 */
function calendarDayIndex(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * "Today, 09:00 AM" / "Tomorrow, 02:30 PM" / "Tue, Sep 29, 2026, 09:00 AM".
 *
 * IMPORTANT: feed this `appointmentMillis(date, time)`, never the raw `date`
 * field. Booking keeps the doctor's picked slot in a separate `time` string
 * while `date` is stamped by a date-only picker, so formatting `date` on its
 * own shows a time the patient never chose.
 *
 * @param ms the appointment instant, or `null` when the date is unusable
 * @param language active UI language, for locale-aware date/time text
 * @param now injectable "current" instant, so callers and tests stay deterministic
 * @param fallback text used when `ms` is `null`
 */
export function formatAppointmentWhen(
  ms: number | null,
  language?: string,
  now: Date = new Date(),
  fallback = "No date",
): string {
  if (ms === null) return fallback;

  const date = new Date(ms);
  const time = formatTimeLabel(ms, language);
  const dayDelta = Math.round(
    (calendarDayIndex(date) - calendarDayIndex(now)) / 86400000,
  );

  if (dayDelta === 0) return `Today, ${time}`;
  if (dayDelta === 1) return `Tomorrow, ${time}`;
  return `${formatDayLabel(ms, language)}, ${time}`;
}

/** Short label for a `YYYY-MM-DD` picker value, e.g. "Sep 29, 2026". */
export function formatPickerLabel(iso: string, language?: string): string {
  const ms = toMillis(iso);
  if (ms === null) return iso;
  return formatter(language, { year: "numeric", month: "short", day: "numeric" }).format(
    new Date(ms),
  );
}
