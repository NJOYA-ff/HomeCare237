/**
 * Family-booking recipient helper tests.
 *
 * The three appointment lists (patient, doctor, admin) now read the same
 * `patientDetails` map that the booking form writes when a patient books for a
 * relative. These tests pin the detection rule — a `patientDetails` object means
 * "booked for someone else" — and the normalisation of every shape that field
 * can realistically hold, including the blank maps written by the previous
 * booking flow before it captured the recipient correctly.
 */
import { describe, expect, it } from "vitest";

import {
  formatRecipientMeta,
  getBookingRecipient,
  resolveRecipientName,
} from "../appointmentRecipient";

describe("getBookingRecipient", () => {
  it("returns null for appointments booked for the account holder", () => {
    expect(getBookingRecipient(undefined)).toBeNull();
    expect(getBookingRecipient(null)).toBeNull();
  });

  it("returns null for values that are not recipient maps", () => {
    expect(getBookingRecipient("child")).toBeNull();
    expect(getBookingRecipient(42)).toBeNull();
    expect(getBookingRecipient(true)).toBeNull();
    expect(getBookingRecipient([])).toBeNull();
  });

  it("normalises a full recipient map", () => {
    expect(
      getBookingRecipient({
        name: "Grace Mbah",
        age: 8,
        gender: "female",
        relationship: "child",
        bloodType: "O+",
      }),
    ).toEqual({
      name: "Grace Mbah",
      age: "8",
      gender: "female",
      relationship: "child",
      bloodType: "O+",
    });
  });

  it("trims whitespace and tolerates missing fields", () => {
    expect(getBookingRecipient({ name: "  Grace Mbah  " })).toEqual({
      name: "Grace Mbah",
      age: "",
      gender: "",
      relationship: "",
      bloodType: "",
    });
  });

  it("still reports a family booking when the old flow wrote a blank map", () => {
    // The previous booking flow never wrote the recipient's details, so these
    // rows only prove the appointment was booked for a relative.
    const recipient = getBookingRecipient({ name: "", age: "", gender: "" });
    expect(recipient).not.toBeNull();
    expect(recipient?.name).toBe("");
  });
});

describe("formatRecipientMeta", () => {
  it("joins the available fields in booking-form order", () => {
    expect(
      formatRecipientMeta({
        name: "Grace Mbah",
        age: "8",
        gender: "female",
        relationship: "child",
        bloodType: "O+",
      }),
    ).toBe("child · 8 yrs · female · O+");
  });

  it("drops empty fields instead of leaving separators behind", () => {
    expect(
      formatRecipientMeta({
        name: "Grace Mbah",
        age: "",
        gender: "",
        relationship: "child",
        bloodType: "",
      }),
    ).toBe("child");

    expect(
      formatRecipientMeta({
        name: "",
        age: "",
        gender: "",
        relationship: "",
        bloodType: "",
      }),
    ).toBe("");
  });

  it("returns an empty string when there is no recipient", () => {
    expect(formatRecipientMeta(null)).toBe("");
  });
});

describe("resolveRecipientName", () => {
  it("prefers the recipient's own name", () => {
    expect(
      resolveRecipientName(
        {
          name: "Grace Mbah",
          age: "8",
          gender: "female",
          relationship: "child",
          bloodType: "O+",
        },
        "Paul Mbah",
      ),
    ).toBe("Grace Mbah");
  });

  it("falls back to the stored patient name for legacy rows", () => {
    expect(
      resolveRecipientName(
        {
          name: "",
          age: "",
          gender: "",
          relationship: "",
          bloodType: "",
        },
        "Paul Mbah",
      ),
    ).toBe("Paul Mbah");
  });

  it("falls back when the appointment has no recipient at all", () => {
    expect(resolveRecipientName(null, "Paul Mbah")).toBe("Paul Mbah");
  });
});
