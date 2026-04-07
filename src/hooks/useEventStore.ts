import { useState, useEffect, useCallback } from "react";
import { collection, doc, onSnapshot, setDoc, deleteDoc, query, orderBy, runTransaction } from "firebase/firestore";
import { db } from "../lib/firebase";

export interface Guest {
  id: string;
  name: string;
  phone: string;
  status: "pending" | "confirmed" | "cancelled" | "arrived";
  companions: number;
  tableId: string | null;
  tags?: string[];
}

export interface TimelineItem {
  id: string;
  time: string;
  activity: string;
  completed?: boolean;
}

export interface EventTable {
  id: string;
  name: string;
  capacity: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  shape?: "rect" | "square" | "circle";
  color?: string;
}

export interface EventElement {
  id: string;
  name: string;
  shape: "rect" | "square" | "circle";
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  color?: string;
}

export interface EventData {
  id: string;
  name: string;
  date: string;
  location: string;
  guests: Guest[];
  tables: EventTable[];
  elements: EventElement[];
  timeline: TimelineItem[];
  code: string;
  createdAt: string;
}

export function useEventStore() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: EventData[] = [];
      snapshot.forEach((doc) => {
        const docData = doc.data() as EventData;
        // Migration safeguard: if elements/timeline missing in old events, provide defaults
        data.push({ 
          ...docData, 
          elements: docData.elements || [],
          timeline: docData.timeline || [],
          code: docData.code || "000000" // Default code for old events
        });
      });
      setEvents(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const createEvent = useCallback(async (name: string, date: string, location: string) => {
    const newId = crypto.randomUUID();
    const newEvent: EventData = {
      id: newId,
      name,
      date,
      location,
      guests: [],
      tables: [],
      elements: [],
      timeline: [],
      code: Math.floor(100000 + Math.random() * 900000).toString(),
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, "events", newId), newEvent);
    return newId;
  }, []);

  const deleteEvent = useCallback(async (eventId: string) => {
    await deleteDoc(doc(db, "events", eventId));
  }, []);

  const addGuest = useCallback(async (eventId: string, guest: Omit<Guest, "id">) => {
    const eventRef = doc(db, "events", eventId);
    await runTransaction(db, async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists()) throw "Document does not exist!";
      const data = eventDoc.data() as EventData;
      const newGuest: Guest = { 
        ...guest, 
        id: crypto.randomUUID(), 
        tags: guest.tags || [] 
      };
      transaction.update(eventRef, { guests: [...data.guests, newGuest] });
    });
  }, []);

  const updateGuest = useCallback(async (eventId: string, guestId: string, updates: Partial<Guest>) => {
    const eventRef = doc(db, "events", eventId);
    await runTransaction(db, async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists()) throw "Document does not exist!";
      const data = eventDoc.data() as EventData;
      const newGuests = data.guests.map(g => g.id === guestId ? { ...g, ...updates } : g);
      transaction.update(eventRef, { guests: newGuests });
    });
  }, []);

  const deleteGuest = useCallback(async (eventId: string, guestId: string) => {
    const eventRef = doc(db, "events", eventId);
    await runTransaction(db, async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists()) throw "Document does not exist!";
      const data = eventDoc.data() as EventData;
      const newGuests = data.guests.filter(g => g.id !== guestId);
      transaction.update(eventRef, { guests: newGuests });
    });
  }, []);

  const addTable = useCallback(async (eventId: string, name: string, capacity: number) => {
    const eventRef = doc(db, "events", eventId);
    await runTransaction(db, async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists()) throw "Document does not exist!";
      const data = eventDoc.data() as EventData;
      const count = data.tables.length;
      const newTable: EventTable = { 
        id: crypto.randomUUID(), 
        name, 
        capacity,
        x: count * 40, 
        y: count * 30 
      };
      transaction.update(eventRef, { tables: [...data.tables, newTable] });
    });
  }, []);

  const deleteTable = useCallback(async (eventId: string, tableId: string) => {
    const eventRef = doc(db, "events", eventId);
    await runTransaction(db, async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists()) throw "Document does not exist!";
      const data = eventDoc.data() as EventData;
      const newTables = data.tables.filter(t => t.id !== tableId);
      const newGuests = data.guests.map(g => g.tableId === tableId ? { ...g, tableId: null } : g);
      transaction.update(eventRef, { tables: newTables, guests: newGuests });
    });
  }, []);

  const assignGuestToTable = useCallback(async (eventId: string, guestId: string, tableId: string | null) => {
    await updateGuest(eventId, guestId, { tableId });
  }, [updateGuest]);

  const importGuests = useCallback(async (eventId: string, newGuests: Omit<Guest, "id">[]) => {
    const eventRef = doc(db, "events", eventId);
    await runTransaction(db, async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists()) throw "Document does not exist!";
      const data = eventDoc.data() as EventData;
      const guestsToAdd = newGuests.map(g => ({ ...g, id: crypto.randomUUID() }));
      transaction.update(eventRef, { guests: [...data.guests, ...guestsToAdd] });
    });
  }, []);
  
  const replaceGuests = useCallback(async (eventId: string, allGuests: Guest[]) => {
    const eventRef = doc(db, "events", eventId);
    await runTransaction(db, async (transaction) => {
       const eventDoc = await transaction.get(eventRef);
       if (!eventDoc.exists()) return;
       transaction.update(eventRef, { guests: allGuests });
    });
  }, []);

  const updateTableProps = useCallback(async (eventId: string, tableId: string, updates: Partial<EventTable>) => {
    const eventRef = doc(db, "events", eventId);
    await runTransaction(db, async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists()) return;
      const data = eventDoc.data() as EventData;
      const newTables = data.tables.map(t => t.id === tableId ? { ...t, ...updates } : t);
      transaction.update(eventRef, { tables: newTables });
    });
  }, []);

  const addElement = useCallback(async (eventId: string, name: string, shape: "rect" | "square" | "circle") => {
    const eventRef = doc(db, "events", eventId);
    await runTransaction(db, async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists()) throw "Document does not exist!";
      const data = eventDoc.data() as EventData;
      const newElement: EventElement = { id: crypto.randomUUID(), name, shape };
      const currentElements = data.elements || [];
      transaction.update(eventRef, { elements: [...currentElements, newElement] });
    });
  }, []);

  const deleteElement = useCallback(async (eventId: string, elementId: string) => {
    const eventRef = doc(db, "events", eventId);
    await runTransaction(db, async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists()) throw "Document does not exist!";
      const data = eventDoc.data() as EventData;
      const currentElements = data.elements || [];
      const newElements = currentElements.filter(e => e.id !== elementId);
      transaction.update(eventRef, { elements: newElements });
    });
  }, []);

  const updateElementProps = useCallback(async (eventId: string, elementId: string, updates: Partial<EventElement>) => {
    const eventRef = doc(db, "events", eventId);
    await runTransaction(db, async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists()) return;
      const data = eventDoc.data() as EventData;
      const currentElements = data.elements || [];
      const newElements = currentElements.map(e => e.id === elementId ? { ...e, ...updates } : e);
      transaction.update(eventRef, { elements: newElements });
    });
  }, []);

  return {
    events,
    loading,
    createEvent,
    deleteEvent,
    addGuest,
    updateGuest,
    deleteGuest,
    addTable,
    deleteTable,
    updateTableProps,
    assignGuestToTable,
    importGuests,
    replaceGuests,
    addElement,
    deleteElement,
    updateElementProps,
    updateTimeline: useCallback(async (eventId: string, timeline: TimelineItem[]) => {
      const eventRef = doc(db, "events", eventId);
      await runTransaction(db, async (transaction) => {
        const eventDoc = await transaction.get(eventRef);
        if (!eventDoc.exists()) return;
        transaction.update(eventRef, { timeline });
      });
    }, [])
  };
}
