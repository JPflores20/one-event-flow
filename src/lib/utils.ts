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
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  
  // End date is day after for all-day events
  const nextDate = new Date(date);
  nextDate.setUTCDate(date.getUTCDate() + 1);
  const nextYear = nextDate.getUTCFullYear();
  const nextMonth = String(nextDate.getUTCMonth() + 1).padStart(2, '0');
  const nextDay = String(nextDate.getUTCDate()).padStart(2, '0');
  const nextDateStr = `${nextYear}${nextMonth}${nextDay}`;

  const params = new URLSearchParams({
    text: event.name,
    dates: `${dateStr}/${nextDateStr}`,
    location: event.location,
    details: "Evento gestionado por ONE Event Flow."
  });

  return `${baseUrl}&${params.toString()}`;
}

/**
 * Generates a unique 6-digit numeric code.
 */
export function generateNumericCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
