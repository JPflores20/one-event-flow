import { useNavigate, useParams } from "react-router-dom";
import { useEventStore } from "@/hooks/useEventStore";
import { useAuth } from "@/hooks/useAuth";
import { EventDashboard } from "@/components/EventDashboard";
import { EventWorkspace } from "@/components/EventWorkspace";

const Index = () => {
  const { eventId } = useParams<{ eventId?: string }>();
  const navigate = useNavigate();
  const { role, permissions } = useAuth();
  const canViewAccounting = role === "admin" || Boolean(permissions?.canViewAccounting);

  const store = useEventStore(eventId ?? null, canViewAccounting);
  const selectedEvent = store.events.find((e) => e.id === eventId);

  if (eventId && store.loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-2 border-t-amber-400 border-border animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">Cargando evento…</p>
        </div>
      </div>
    );
  }

  if (selectedEvent) {
    return (
      <EventWorkspace
        event={selectedEvent}
        onBack={() => navigate("/")}
        onUpdateEvent={(updates) => store.updateEvent(selectedEvent.id, updates)}
        onAddGuest={(guest) => store.addGuest(selectedEvent.id, guest)}
        onUpdateGuest={(guestId, updates) => store.updateGuest(selectedEvent.id, guestId, updates)}
        onBulkUpdateGuests={(guestIds, updates) => store.bulkUpdateGuests(selectedEvent.id, guestIds, updates)}
        onBulkDeleteGuests={(guestIds) => store.bulkDeleteGuests(selectedEvent.id, guestIds)}
        onDeleteGuest={(guestId) => store.deleteGuest(selectedEvent.id, guestId)}
        onAddTable={(name, capacity, shape) => store.addTable(selectedEvent.id, name, capacity, shape)}
        onDuplicateTable={(tableId) => store.duplicateTable(selectedEvent.id, tableId)}
        onDeleteTable={(tableId) => store.deleteTable(selectedEvent.id, tableId)}
        onUpdateTableProps={(tableId, updates) => store.updateTableProps(selectedEvent.id, tableId, updates)}
        onAssignGuest={(guestId, tableId) => store.assignGuestToTable(selectedEvent.id, guestId, tableId)}
        onImportGuests={(guests) => store.importGuests(selectedEvent.id, guests)}
        onAddElement={(name, shape) => store.addElement(selectedEvent.id, name, shape)}
        onDuplicateElement={(elementId) => store.duplicateElement(selectedEvent.id, elementId)}
        onDeleteElement={(elementId) => store.deleteElement(selectedEvent.id, elementId)}
        onUpdateElementProps={(elementId, updates) => store.updateElementProps(selectedEvent.id, elementId, updates)}
        onUploadCroquisBackground={(file) => store.uploadCroquisBackground(selectedEvent.id, file)}
        onUpdateCroquisBackground={(bg) => store.updateCroquisBackground(selectedEvent.id, bg)}
        onUpdateTimeline={(id, timeline) => store.updateTimeline(id, timeline)}
        onAddTransaction={(t) => store.addTransaction(selectedEvent.id, t)}
        onUpdateTransaction={(id, u) => store.updateTransaction(selectedEvent.id, id, u)}
        onDeleteTransaction={(id) => store.deleteTransaction(selectedEvent.id, id)}
        onAddCategory={(c) => store.addCustomCategory(selectedEvent.id, c)}
      />
    );
  }

  return (
    <EventDashboard
      events={store.events}
      loading={store.loading}
      error={store.error}
      onCreateEvent={store.createEvent}
      onUpdateEvent={store.updateEvent}
      onDuplicateEvent={store.duplicateEvent}
      onDeleteEvent={store.deleteEvent}
      onSelectEvent={(id) => navigate(`/events/${id}`)}
    />
  );
};

export default Index;
