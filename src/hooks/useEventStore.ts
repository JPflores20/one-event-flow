import { useState, useEffect, useCallback, useMemo } from "react";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  runTransaction,
  writeBatch,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, firebaseConfig } from "../lib/firebase";
import { generateNumericCode, convertImageToWebP } from "../lib/utils";

export type TableShape =
  | "rect"
  | "square"
  | "circle"
  | "oval"
  | "diamond"
  | "triangle"
  | "hexagon"
  | "l-shape"
  | "l-shape-tl"
  | "l-shape-tr"
  | "l-shape-br"
  | "arc-tl"
  | "arc-tr"
  | "arc-bl"
  | "arc-br";

export type ElementShape = "rect" | "square" | "circle" | "line-h" | "line-v";

export interface Guest {
  id: string;
  name: string;
  phone: string;
  status: "pending" | "confirmed" | "cancelled" | "arrived";
  previousStatus?: "pending" | "confirmed" | "cancelled";
  companions: number;
  arrivedCompanions?: number;
  tableId: string | null;
  tags?: string[];
  notes?: string;
}

export interface TimelineItem {
  id: string;
  time: string;
  activity: string;
  completed?: boolean;
  responsible?: string;
  notes?: string;
  category?: string;
}

export interface EventTable {
  id: string;
  name: string;
  capacity: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  shape?: TableShape;
  color?: string;
  rotation?: number;
}

export interface EventElement {
  id: string;
  name: string;
  shape: ElementShape;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  color?: string;
  rotation?: number;
}

export interface FinancialTransaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string;
  date: string;
  status?: "paid" | "pending";
}

export interface CroquisBackground {
  url: string;
  name: string;
  type: "webp" | "pdf";
  opacity?: number;
  scale?: number;
  lightBacking?: boolean;
  invertInDark?: boolean;
  updatedAt: string;
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
  financials: FinancialTransaction[];
  customCategories?: string[];
  budget?: number;
  croquisBackground?: CroquisBackground | null;
  code: string;
  createdAt: string;
}

export function useEventStore(activeEventId?: string | null, canViewAccounting = false) {
  const [rawEvents, setRawEvents] = useState<EventData[]>([]);
  const [subcollectionFinancials, setSubcollectionFinancials] = useState<Record<string, FinancialTransaction[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: EventData[] = [];
        snapshot.forEach((docSnap) => {
          const docData = docSnap.data() as EventData;
          data.push({
            ...docData,
            id: docData.id || docSnap.id,
            guests: docData.guests || [],
            tables: docData.tables || [],
            elements: docData.elements || [],
            timeline: docData.timeline || [],
            financials: canViewAccounting ? (docData.financials || []) : [],
            customCategories: docData.customCategories || [],
            croquisBackground: docData.croquisBackground || null,
            code: docData.code || "000000",
          });
        });
        setRawEvents(data);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error("Error subscribing to events:", err);
        setError(err.message || "Error al conectar con Firestore.");
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [canViewAccounting]);

  // Subscribe to financials subcollection for the active event when user has accounting permission
  useEffect(() => {
    if (!activeEventId || !canViewAccounting) return;

    const financialsRef = collection(db, "events", activeEventId, "financials");
    const unsubscribe = onSnapshot(
      financialsRef,
      (snapshot) => {
        const txs: FinancialTransaction[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as FinancialTransaction;
          txs.push({ ...data, id: data.id || docSnap.id });
        });
        setSubcollectionFinancials((prev) => ({
          ...prev,
          [activeEventId]: txs,
        }));
      },
      (err) => {
        console.warn("Could not subscribe to financials subcollection:", err);
      }
    );

    return () => unsubscribe();
  }, [activeEventId, canViewAccounting]);

  // Auto-migrate legacy embedded financials to the subcollection when an authorized user opens the event
  useEffect(() => {
    if (!activeEventId || !canViewAccounting) return;
    const activeEvent = rawEvents.find((e) => e.id === activeEventId);
    if (!activeEvent || !activeEvent.financials || activeEvent.financials.length === 0) return;

    const migrateLegacyFinancials = async () => {
      try {
        const batch = writeBatch(db);
        for (const tx of activeEvent.financials) {
          const txRef = doc(db, "events", activeEventId, "financials", tx.id);
          batch.set(txRef, tx, { merge: true });
        }
        const eventRef = doc(db, "events", activeEventId);
        batch.update(eventRef, { financials: [] });
        await batch.commit();
      } catch (err) {
        console.warn("Legacy financials migration skipped:", err);
      }
    };

    migrateLegacyFinancials();
  }, [activeEventId, canViewAccounting, rawEvents]);

  const events = useMemo(() => {
    return rawEvents.map((ev) => {
      if (!canViewAccounting) {
        return { ...ev, financials: [] };
      }
      const subTxs = subcollectionFinancials[ev.id] || [];
      const legacyTxs = ev.financials || [];
      const mergedMap = new Map<string, FinancialTransaction>();
      for (const tx of legacyTxs) mergedMap.set(tx.id, tx);
      for (const tx of subTxs) mergedMap.set(tx.id, tx);
      return {
        ...ev,
        financials: Array.from(mergedMap.values()),
      };
    });
  }, [rawEvents, subcollectionFinancials, canViewAccounting]);

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
      financials: [],
      customCategories: [],
      croquisBackground: null,
      code: generateNumericCode(),
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, "events", newId), newEvent);
    return newId;
  }, []);

  const updateEvent = useCallback(
    async (
      eventId: string,
      updates: Partial<Pick<EventData, "name" | "date" | "location" | "budget" | "croquisBackground">>
    ) => {
      const eventRef = doc(db, "events", eventId);
      await updateDoc(eventRef, updates);
    },
    []
  );

  const duplicateEvent = useCallback(
    async (sourceEventId: string, customName?: string) => {
      const source = rawEvents.find((e) => e.id === sourceEventId);
      if (!source) throw new Error("Evento origen no encontrado");

      const newId = crypto.randomUUID();
      const clonedTables: EventTable[] = (source.tables || []).map((t) => ({
        ...t,
        id: crypto.randomUUID(),
      }));
      const clonedElements: EventElement[] = (source.elements || []).map((el) => ({
        ...el,
        id: crypto.randomUUID(),
      }));
      const clonedTimeline: TimelineItem[] = (source.timeline || []).map((item) => ({
        ...item,
        id: crypto.randomUUID(),
        completed: false,
      }));

      const newEvent: EventData = {
        id: newId,
        name: customName || `${source.name} (Copia)`,
        date: source.date,
        location: source.location,
        guests: [],
        tables: clonedTables,
        elements: clonedElements,
        timeline: clonedTimeline,
        financials: [],
        customCategories: source.customCategories || [],
        budget: source.budget,
        croquisBackground: source.croquisBackground || null,
        code: generateNumericCode(),
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "events", newId), newEvent);
      return newId;
    },
    [rawEvents]
  );

  const deleteEvent = useCallback(async (eventId: string) => {
    await deleteDoc(doc(db, "events", eventId));
  }, []);

  const addGuest = useCallback(async (eventId: string, guest: Omit<Guest, "id">) => {
    const eventRef = doc(db, "events", eventId);
    await runTransaction(db, async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists()) throw new Error("Document does not exist!");
      const data = eventDoc.data() as EventData;
      const newGuest: Guest = {
        ...guest,
        id: crypto.randomUUID(),
        tags: guest.tags || [],
      };
      transaction.update(eventRef, { guests: [...(data.guests || []), newGuest] });
    });
  }, []);

  const updateGuest = useCallback(async (eventId: string, guestId: string, updates: Partial<Guest>) => {
    const eventRef = doc(db, "events", eventId);
    await runTransaction(db, async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists()) throw new Error("Document does not exist!");
      const data = eventDoc.data() as EventData;
      const newGuests = (data.guests || []).map((g) => (g.id === guestId ? { ...g, ...updates } : g));
      transaction.update(eventRef, { guests: newGuests });
    });
  }, []);

  const bulkUpdateGuests = useCallback(
    async (eventId: string, guestIds: string[], updates: Partial<Guest>) => {
      const idSet = new Set(guestIds);
      const eventRef = doc(db, "events", eventId);
      await runTransaction(db, async (transaction) => {
        const eventDoc = await transaction.get(eventRef);
        if (!eventDoc.exists()) throw new Error("Document does not exist!");
        const data = eventDoc.data() as EventData;
        const newGuests = (data.guests || []).map((g) => (idSet.has(g.id) ? { ...g, ...updates } : g));
        transaction.update(eventRef, { guests: newGuests });
      });
    },
    []
  );

  const bulkDeleteGuests = useCallback(async (eventId: string, guestIds: string[]) => {
    const idSet = new Set(guestIds);
    const eventRef = doc(db, "events", eventId);
    await runTransaction(db, async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists()) throw new Error("Document does not exist!");
      const data = eventDoc.data() as EventData;
      const newGuests = (data.guests || []).filter((g) => !idSet.has(g.id));
      transaction.update(eventRef, { guests: newGuests });
    });
  }, []);

  const deleteGuest = useCallback(async (eventId: string, guestId: string) => {
    const eventRef = doc(db, "events", eventId);
    await runTransaction(db, async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists()) throw new Error("Document does not exist!");
      const data = eventDoc.data() as EventData;
      const newGuests = (data.guests || []).filter((g) => g.id !== guestId);
      transaction.update(eventRef, { guests: newGuests });
    });
  }, []);

  const addTable = useCallback(async (eventId: string, name: string, capacity: number, shape?: TableShape) => {
    const eventRef = doc(db, "events", eventId);
    await runTransaction(db, async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists()) throw new Error("Document does not exist!");
      const data = eventDoc.data() as EventData;
      const currentTables = data.tables || [];
      const count = currentTables.length;
      const newTable: EventTable = {
        id: crypto.randomUUID(),
        name,
        capacity,
        x: count * 40,
        y: count * 30,
      };
      if (shape) {
        newTable.shape = shape;
      }
      transaction.update(eventRef, { tables: [...currentTables, newTable] });
    });
  }, []);

  const duplicateTable = useCallback(async (eventId: string, tableId: string) => {
    const eventRef = doc(db, "events", eventId);
    await runTransaction(db, async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists()) throw new Error("Document does not exist!");
      const data = eventDoc.data() as EventData;
      const currentTables = data.tables || [];
      const source = currentTables.find((t) => t.id === tableId);
      if (!source) return;
      const duplicated: EventTable = {
        ...source,
        id: crypto.randomUUID(),
        name: `${source.name} (Copia)`,
        x: (source.x ?? 40) + 35,
        y: (source.y ?? 30) + 35,
      };
      transaction.update(eventRef, { tables: [...currentTables, duplicated] });
    });
  }, []);

  const deleteTable = useCallback(async (eventId: string, tableId: string) => {
    const eventRef = doc(db, "events", eventId);
    await runTransaction(db, async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists()) throw new Error("Document does not exist!");
      const data = eventDoc.data() as EventData;
      const newTables = (data.tables || []).filter((t) => t.id !== tableId);
      const newGuests = (data.guests || []).map((g) => (g.tableId === tableId ? { ...g, tableId: null } : g));
      transaction.update(eventRef, { tables: newTables, guests: newGuests });
    });
  }, []);

  const assignGuestToTable = useCallback(
    async (eventId: string, guestId: string, tableId: string | null) => {
      await updateGuest(eventId, guestId, { tableId });
    },
    [updateGuest]
  );

  const importGuests = useCallback(async (eventId: string, newGuests: Omit<Guest, "id">[]) => {
    const eventRef = doc(db, "events", eventId);
    await runTransaction(db, async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists()) throw new Error("Document does not exist!");
      const data = eventDoc.data() as EventData;
      const guestsToAdd = newGuests.map((g) => ({ ...g, id: crypto.randomUUID() }));
      transaction.update(eventRef, { guests: [...(data.guests || []), ...guestsToAdd] });
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
      const newTables = (data.tables || []).map((t) => (t.id === tableId ? { ...t, ...updates } : t));
      transaction.update(eventRef, { tables: newTables });
    });
  }, []);

  const addElement = useCallback(async (eventId: string, name: string, shape: ElementShape) => {
    const eventRef = doc(db, "events", eventId);
    await runTransaction(db, async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists()) throw new Error("Document does not exist!");
      const data = eventDoc.data() as EventData;
      const newElement: EventElement = { id: crypto.randomUUID(), name, shape };
      const currentElements = data.elements || [];
      transaction.update(eventRef, { elements: [...currentElements, newElement] });
    });
  }, []);

  const duplicateElement = useCallback(async (eventId: string, elementId: string) => {
    const eventRef = doc(db, "events", eventId);
    await runTransaction(db, async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists()) throw new Error("Document does not exist!");
      const data = eventDoc.data() as EventData;
      const currentElements = data.elements || [];
      const source = currentElements.find((e) => e.id === elementId);
      if (!source) return;
      const duplicated: EventElement = {
        ...source,
        id: crypto.randomUUID(),
        name: `${source.name} (Copia)`,
        x: (source.x ?? 0) + 35,
        y: (source.y ?? 0) + 35,
      };
      transaction.update(eventRef, { elements: [...currentElements, duplicated] });
    });
  }, []);

  const deleteElement = useCallback(async (eventId: string, elementId: string) => {
    const eventRef = doc(db, "events", eventId);
    await runTransaction(db, async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists()) throw new Error("Document does not exist!");
      const data = eventDoc.data() as EventData;
      const currentElements = data.elements || [];
      const newElements = currentElements.filter((e) => e.id !== elementId);
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
      const newElements = currentElements.map((e) => (e.id === elementId ? { ...e, ...updates } : e));
      transaction.update(eventRef, { elements: newElements });
    });
  }, []);

  const uploadCroquisBackground = useCallback(async (eventId: string, file: File): Promise<CroquisBackground> => {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isImage = file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(file.name);

    if (!isPdf && !isImage) {
      throw new Error("Formato no soportado. Sube una imagen o un archivo PDF.");
    }

    let uploadBlob: Blob = file;
    let finalFileName = file.name;
    let finalDataUrl = "";
    const fileType: "webp" | "pdf" = isPdf ? "pdf" : "webp";

    if (isImage) {
      // Convert any uploaded image to .webp automatically
      const converted = await convertImageToWebP(file, {
        maxWidth: 1800,
        maxHeight: 1800,
        quality: 0.82,
      });
      uploadBlob = converted.blob;
      finalFileName = converted.fileName;
      finalDataUrl = converted.dataUrl;
    } else {
      // Read PDF as Data URL for fallback / inline display
      finalDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("No se pudo leer el archivo PDF."));
        reader.readAsDataURL(file);
      });
    }

    let finalUrl = finalDataUrl;

    // Try uploading to Firebase Storage if a real bucket is configured
    if (firebaseConfig.storageBucket && firebaseConfig.storageBucket !== "mock-bucket") {
      try {
        const storagePath = `events/${eventId}/croquis_${Date.now()}_${finalFileName}`;
        const storageRef = ref(storage, storagePath);
        const uploadTaskPromise = uploadBytes(storageRef, uploadBlob, {
          contentType: isPdf ? "application/pdf" : "image/webp",
        }).then(() => getDownloadURL(storageRef));

        const timeoutPromise = new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error("Storage timeout")), 4000)
        );

        finalUrl = await Promise.race([uploadTaskPromise, timeoutPromise]);
      } catch (storageErr) {
        console.warn("Firebase Storage fallback to Firestore Data URL:", storageErr);
        if (isPdf && finalDataUrl.length > 900_000) {
          throw new Error(
            "El archivo PDF supera el límite de almacenamiento directo (~650 KB). Sube un PDF más ligero o una imagen del plano."
          );
        }
        finalUrl = finalDataUrl;
      }
    }

    const bgMeta: CroquisBackground = {
      url: finalUrl,
      name: finalFileName,
      type: fileType,
      opacity: 0.45,
      scale: 100,
      updatedAt: new Date().toISOString(),
    };

    const eventRef = doc(db, "events", eventId);
    await updateDoc(eventRef, { croquisBackground: bgMeta });
    return bgMeta;
  }, []);

  const updateCroquisBackground = useCallback(
    async (eventId: string, bg: CroquisBackground | null) => {
      const eventRef = doc(db, "events", eventId);
      await updateDoc(eventRef, { croquisBackground: bg });
    },
    []
  );

  const updateTimeline = useCallback(async (eventId: string, timeline: TimelineItem[]) => {
    const eventRef = doc(db, "events", eventId);
    await runTransaction(db, async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists()) return;
      transaction.update(eventRef, { timeline });
    });
  }, []);

  const addTransaction = useCallback(async (eventId: string, transactionData: Omit<FinancialTransaction, "id">) => {
    const newId = crypto.randomUUID();
    const newTransaction: FinancialTransaction = {
      status: "paid",
      ...transactionData,
      id: newId,
    };
    const txRef = doc(db, "events", eventId, "financials", newId);
    await setDoc(txRef, newTransaction);
  }, []);

  const updateTransaction = useCallback(
    async (eventId: string, transactionId: string, updates: Partial<FinancialTransaction>) => {
      const txRef = doc(db, "events", eventId, "financials", transactionId);
      await updateDoc(txRef, updates);
    },
    []
  );

  const deleteTransaction = useCallback(async (eventId: string, transactionId: string) => {
    const txRef = doc(db, "events", eventId, "financials", transactionId);
    await deleteDoc(txRef);
  }, []);

  const addCustomCategory = useCallback(async (eventId: string, category: string) => {
    const eventRef = doc(db, "events", eventId);
    await runTransaction(db, async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists()) throw new Error("Document does not exist!");
      const data = eventDoc.data() as EventData;
      const customCategories = data.customCategories || [];
      if (!customCategories.includes(category)) {
        transaction.update(eventRef, { customCategories: [...customCategories, category] });
      }
    });
  }, []);

  return {
    events,
    loading,
    error,
    createEvent,
    updateEvent,
    duplicateEvent,
    deleteEvent,
    addGuest,
    updateGuest,
    bulkUpdateGuests,
    bulkDeleteGuests,
    deleteGuest,
    addTable,
    duplicateTable,
    deleteTable,
    updateTableProps,
    assignGuestToTable,
    importGuests,
    replaceGuests,
    addElement,
    duplicateElement,
    deleteElement,
    updateElementProps,
    uploadCroquisBackground,
    updateCroquisBackground,
    updateTimeline,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addCustomCategory,
  };
}
