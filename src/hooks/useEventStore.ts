import { useState, useCallback, useEffect } from "react";

export interface Guest {
  id: string;
  name: string;
  phone: string;
  status: "pending" | "confirmed" | "cancelled";
  companions: number;
  tableId: string | null;
}

export interface EventTable {
  id: string;
  name: string;
  capacity: number;
}

export interface EventData {
  id: string;
  name: string;
  date: string;
  location: string;
  guests: Guest[];
  tables: EventTable[];
  createdAt: string;
}

const STORAGE_KEY = "one-events";

function loadEvents(): EventData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEvents(events: EventData[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export function useEventStore() {
  const [events, setEvents] = useState<EventData[]>(loadEvents);

  useEffect(() => {
    saveEvents(events);
  }, [events]);

  const createEvent = useCallback((name: string, date: string, location: string) => {
    const newEvent: EventData = {
      id: crypto.randomUUID(),
      name,
      date,
      location,
      guests: [],
      tables: [],
      createdAt: new Date().toISOString(),
    };
    setEvents((prev) => [...prev, newEvent]);
    return newEvent.id;
  }, []);

  const deleteEvent = useCallback((eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  }, []);

  const addGuest = useCallback((eventId: string, guest: Omit<Guest, "id">) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? { ...e, guests: [...e.guests, { ...guest, id: crypto.randomUUID() }] }
          : e
      )
    );
  }, []);

  const updateGuest = useCallback((eventId: string, guestId: string, updates: Partial<Guest>) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? { ...e, guests: e.guests.map((g) => (g.id === guestId ? { ...g, ...updates } : g)) }
          : e
      )
    );
  }, []);

  const deleteGuest = useCallback((eventId: string, guestId: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? { ...e, guests: e.guests.filter((g) => g.id !== guestId) }
          : e
      )
    );
  }, []);

  const addTable = useCallback((eventId: string, name: string, capacity: number) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? { ...e, tables: [...e.tables, { id: crypto.randomUUID(), name, capacity }] }
          : e
      )
    );
  }, []);

  const deleteTable = useCallback((eventId: string, tableId: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? {
              ...e,
              tables: e.tables.filter((t) => t.id !== tableId),
              guests: e.guests.map((g) => (g.tableId === tableId ? { ...g, tableId: null } : g)),
            }
          : e
      )
    );
  }, []);

  const assignGuestToTable = useCallback((eventId: string, guestId: string, tableId: string | null) => {
    updateGuest(eventId, guestId, { tableId });
  }, [updateGuest]);

  return {
    events,
    createEvent,
    deleteEvent,
    addGuest,
    updateGuest,
    deleteGuest,
    addTable,
    deleteTable,
    assignGuestToTable,
  };
}
