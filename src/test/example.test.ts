import { describe, it, expect } from "vitest";
import {
  normalizeString,
  getGoogleCalendarUrl,
  generateNumericCode,
  calculateAttendanceStats,
  getGuestPassCode,
  buildWhatsAppUrl,
  toWebPFileName,
  getEventCountdownBadge,
} from "@/lib/utils";
import { isOwnerEmail } from "@/hooks/useAuth";

describe("normalizeString", () => {
  it("strips accents, diacritics, and converts to lowercase", () => {
    expect(normalizeString("José María Pérez")).toBe("jose maria perez");
    expect(normalizeString("ÑOÑO ÁÉÍÓÚ")).toBe("nono aeiou");
    expect(normalizeString("")).toBe("");
  });
});

describe("generateNumericCode", () => {
  it("generates a 6-digit numeric string", () => {
    for (let i = 0; i < 10; i++) {
      const code = generateNumericCode();
      expect(code).toMatch(/^\d{6}$/);
    }
  });
});

describe("getGoogleCalendarUrl", () => {
  it("builds a valid Google Calendar template URL", () => {
    const url = getGoogleCalendarUrl({
      name: "Boda Real",
      date: "2026-11-20",
      location: "Hacienda San José",
    });

    expect(url).toContain("https://calendar.google.com/calendar/render?action=TEMPLATE");
    expect(url).toContain("text=Boda+Real");
    expect(url).toContain("dates=20261120%2F20261121");
    expect(url).toContain("location=Hacienda+San+Jos%C3%A9");
  });
});

describe("calculateAttendanceStats", () => {
  it("calculates consistent attendance totals across confirmed, arrived, pending, and cancelled guests", () => {
    const guests = [
      { status: "arrived" as const, companions: 2, tableId: "t1" },
      { status: "confirmed" as const, companions: 1, tableId: "t1" },
      { status: "pending" as const, companions: 1, tableId: null },
      { status: "cancelled" as const, companions: 3, tableId: null },
    ];

    const stats = calculateAttendanceStats(guests);

    expect(stats.activeGuestsCount).toBe(3);
    expect(stats.arrivedCount).toBe(1);
    expect(stats.confirmedCount).toBe(1);
    expect(stats.pendingCount).toBe(1);
    expect(stats.cancelledCount).toBe(1);
    expect(stats.totalExpected).toBe(7);
    expect(stats.totalArrived).toBe(3);
    expect(stats.assignedSeats).toBe(5);
    expect(stats.checkInPct).toBe(43);
  });

  it("supports partial companion check-in via arrivedCompanions", () => {
    const stats = calculateAttendanceStats([
      { status: "arrived" as const, companions: 4, arrivedCompanions: 1, tableId: "t1" },
    ]);
    expect(stats.totalExpected).toBe(5); // 1 + 4
    expect(stats.totalArrived).toBe(2); // 1 + 1 arrived companion
    expect(stats.checkInPct).toBe(40);
  });

  it("returns 0% check-in rate when there are no guests", () => {
    const stats = calculateAttendanceStats([]);
    expect(stats.checkInPct).toBe(0);
    expect(stats.totalExpected).toBe(0);
    expect(stats.totalArrived).toBe(0);
  });
});

describe("toWebPFileName", () => {
  it("converts any image filename extension to .webp", () => {
    expect(toWebPFileName("plano_salon.png")).toBe("plano_salon.webp");
    expect(toWebPFileName("croquis.alta.calidad.JPG")).toBe("croquis.alta.calidad.webp");
    expect(toWebPFileName("mapa")).toBe("mapa.webp");
  });
});

describe("getGuestPassCode & buildWhatsAppUrl", () => {
  it("generates a deterministic pass code and valid wa.me link", () => {
    expect(getGuestPassCode("123456", "a1b2-c3d4")).toBe("ONE-123456-A1B2");
    const waUrl = buildWhatsAppUrl("55 1234 5678", "Hola Juan");
    expect(waUrl).toBe("https://wa.me/525512345678?text=Hola%20Juan");
  });
});

describe("getEventCountdownBadge", () => {
  it("returnsFinalizado for past dates", () => {
    const badge = getEventCountdownBadge("2020-01-01T12:00:00.000Z");
    expect(badge.variant).toBe("past");
    expect(badge.label).toBe("Finalizado");
  });
});

describe("isOwnerEmail", () => {
  it("recognizes owner emails case-insensitively", () => {
    expect(isOwnerEmail("pepe.jlfc.16@gmail.com")).toBe(true);
    expect(isOwnerEmail("  ISAALEXANDRA40@GMAIL.COM ")).toBe(true);
    expect(isOwnerEmail("invitado@externo.com")).toBe(false);
    expect(isOwnerEmail(null)).toBe(false);
    expect(isOwnerEmail(undefined)).toBe(false);
  });
});
