import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalizes a string by converting to lowercase and removing accents/diacritics.
 * Example: "José" -> "jose"
 */
export function normalizeString(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Generates a Google Calendar URL for an event.
 */
export function getGoogleCalendarUrl(event: { name: string; date: string; location: string }): string {
  const baseUrl = "https://calendar.google.com/calendar/render?action=TEMPLATE";

  // Format date to YYYYMMDD
  const date = new Date(event.date);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const dateStr = `${year}${month}${day}`;

  // End date is day after for all-day events
  const nextDate = new Date(date);
  nextDate.setUTCDate(date.getUTCDate() + 1);
  const nextYear = nextDate.getUTCFullYear();
  const nextMonth = String(nextDate.getUTCMonth() + 1).padStart(2, "0");
  const nextDay = String(nextDate.getUTCDate()).padStart(2, "0");
  const nextDateStr = `${nextYear}${nextMonth}${nextDay}`;

  const params = new URLSearchParams({
    text: event.name,
    dates: `${dateStr}/${nextDateStr}`,
    location: event.location,
    details: "Evento gestionado por ONE Event Flow.",
  });

  return `${baseUrl}&${params.toString()}`;
}

/**
 * Generates a unique 6-digit numeric code.
 */
export function generateNumericCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export interface GuestLike {
  status: "pending" | "confirmed" | "cancelled" | "arrived";
  companions: number;
  arrivedCompanions?: number;
  tableId?: string | null;
}

export interface AttendanceStats {
  activeGuestsCount: number;
  arrivedCount: number;
  confirmedCount: number;
  pendingCount: number;
  cancelledCount: number;
  totalExpected: number;
  totalArrived: number;
  assignedSeats: number;
  checkInPct: number;
}

/**
 * Calculates unified attendance and check-in metrics for an event's guest list.
 * Excludes cancelled invitations from expected totals and includes companions
 * (respecting partial companion check-in via arrivedCompanions when present).
 */
export function calculateAttendanceStats(guests: GuestLike[] = []): AttendanceStats {
  const activeGuests = guests.filter((g) => g.status !== "cancelled");
  const arrivedGuests = activeGuests.filter((g) => g.status === "arrived");
  const confirmedCount = activeGuests.filter((g) => g.status === "confirmed").length;
  const pendingCount = activeGuests.filter((g) => g.status === "pending").length;
  const cancelledCount = guests.filter((g) => g.status === "cancelled").length;

  const totalExpected = activeGuests.reduce((sum, g) => sum + 1 + (Number(g.companions) || 0), 0);
  const totalArrived = arrivedGuests.reduce((sum, g) => {
    const arrivedComp =
      g.arrivedCompanions !== undefined
        ? Math.min(Math.max(0, Number(g.arrivedCompanions) || 0), Number(g.companions) || 0)
        : Number(g.companions) || 0;
    return sum + 1 + arrivedComp;
  }, 0);
  const assignedSeats = activeGuests
    .filter((g) => g.tableId !== null && g.tableId !== undefined)
    .reduce((sum, g) => sum + 1 + (Number(g.companions) || 0), 0);

  const checkInPct = totalExpected > 0 ? Math.round((totalArrived / totalExpected) * 100) : 0;

  return {
    activeGuestsCount: activeGuests.length,
    arrivedCount: arrivedGuests.length,
    confirmedCount,
    pendingCount,
    cancelledCount,
    totalExpected,
    totalArrived,
    assignedSeats,
    checkInPct,
  };
}

/**
 * Generates a deterministic, human-friendly pass code for a guest.
 */
export function getGuestPassCode(eventCode: string, guestId: string): string {
  const suffix = (guestId || "0000").replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase();
  return `ONE-${eventCode}-${suffix}`;
}

/**
 * Builds a WhatsApp wa.me link with sanitized phone number and pre-filled message.
 */
export function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return "";
  // If 10 digits (standard local MX/US number), prefix with 52 unless it already has country code
  const normalizedPhone = digits.length === 10 ? `52${digits}` : digits;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Computes countdown status and label for an event date.
 */
export function getEventCountdownBadge(dateStr: string): {
  label: string;
  variant: "today" | "upcoming" | "past";
  daysDiff: number;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - today.getTime();
  const daysDiff = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (daysDiff === 0) {
    return { label: "¡Es Hoy!", variant: "today", daysDiff: 0 };
  }
  if (daysDiff === 1) {
    return { label: "Mañana", variant: "upcoming", daysDiff: 1 };
  }
  if (daysDiff > 1) {
    return { label: `En ${daysDiff} días`, variant: "upcoming", daysDiff };
  }
  return { label: "Finalizado", variant: "past", daysDiff };
}

/**
 * Replaces the extension of a filename with .webp
 */
export function toWebPFileName(originalName: string): string {
  const trimmed = (originalName || "croquis").trim();
  const base = trimmed.replace(/\.[^/.]+$/, "");
  return `${base || "croquis"}.webp`;
}

/**
 * Converts an image File into a compressed .webp Blob and Data URL using HTML5 Canvas.
 */
export async function convertImageToWebP(
  file: File,
  options: { maxWidth?: number; maxHeight?: number; quality?: number } = {}
): Promise<{
  blob: Blob;
  dataUrl: string;
  fileName: string;
  width: number;
  height: number;
}> {
  const maxWidth = options.maxWidth ?? 1800;
  const maxHeight = options.maxHeight ?? 1800;
  let quality = options.quality ?? 0.82;

  const dataUrlSource = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer el archivo de imagen."));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Formato de imagen inválido."));
    image.src = dataUrlSource;
  });

  let width = img.naturalWidth || img.width || 1200;
  let height = img.naturalHeight || img.height || 800;

  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("No se pudo inicializar el lienzo de conversión WebP.");
  }

  ctx.drawImage(img, 0, 0, width, height);

  let webpDataUrl = canvas.toDataURL("image/webp", quality);
  // Step down quality if dataUrl exceeds ~650KB so it stays fast and fits Firestore fallback limits
  while (webpDataUrl.length > 650_000 && quality > 0.45) {
    quality -= 0.12;
    webpDataUrl = canvas.toDataURL("image/webp", quality);
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error("Error al codificar la imagen en formato .webp"));
      },
      "image/webp",
      quality
    );
  });

  return {
    blob,
    dataUrl: webpDataUrl,
    fileName: toWebPFileName(file.name),
    width,
    height,
  };
}
