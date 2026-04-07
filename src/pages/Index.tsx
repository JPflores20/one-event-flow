import { useState } from "react";
import { useEventStore } from "@/hooks/useEventStore";
import { EventDashboard } from "@/components/EventDashboard";
import { EventWorkspace } from "@/components/EventWorkspace";

const Index = () => {
  const store = useEventStore();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const selectedEvent = store.events.find((e) => e.id === selectedEventId);

  if (selectedEvent) {
    return (
      <EventWorkspace
        event={selectedEvent}
        onBack={() => setSelectedEventId(null)}
        onAddGuest={(guest) => store.addGuest(selectedEvent.id, guest)}
        onUpdateGuest={(guestId, updates) => store.updateGuest(selectedEvent.id, guestId, updates)}
        onDeleteGuest={(guestId) => store.deleteGuest(selectedEvent.id, guestId)}
        onAddTable={(name, capacity) => store.addTable(selectedEvent.id, name, capacity)}
        onDeleteTable={(tableId) => store.deleteTable(selectedEvent.id, tableId)}
        onUpdateTableProps={(tableId, updates) => store.updateTableProps(selectedEvent.id, tableId, updates)}
        onAssignGuest={(guestId, tableId) => store.assignGuestToTable(selectedEvent.id, guestId, tableId)}
        onImportGuests={(guests) => store.importGuests(selectedEvent.id, guests)}
        onAddElement={(name, shape) => store.addElement(selectedEvent.id, name, shape)}
        onDeleteElement={(elementId) => store.deleteElement(selectedEvent.id, elementId)}
        onUpdateElementProps={(elementId, updates) => store.updateElementProps(selectedEvent.id, elementId, updates)}
        onUpdateTimeline={(eventId, timeline) => store.updateTimeline(eventId, timeline)}
      />
    );
  }

  return (
    <EventDashboard
      events={store.events}
      loading={store.loading}
      onCreateEvent={store.createEvent}
      onDeleteEvent={store.deleteEvent}
      onSelectEvent={setSelectedEventId}
    />
  );
};

export default Index;
