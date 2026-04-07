import { ArrowLeft, MapPin, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GuestManager } from "./GuestManager";
import { SeatingPlan } from "./SeatingPlan";
import type { EventData, Guest } from "@/hooks/useEventStore";

interface EventWorkspaceProps {
  event: EventData;
  onBack: () => void;
  onAddGuest: (guest: Omit<Guest, "id">) => void;
  onUpdateGuest: (guestId: string, updates: Partial<Guest>) => void;
  onDeleteGuest: (guestId: string) => void;
  onAddTable: (name: string, capacity: number) => void;
  onDeleteTable: (tableId: string) => void;
  onAssignGuest: (guestId: string, tableId: string | null) => void;
}

export function EventWorkspace({
  event,
  onBack,
  onAddGuest,
  onUpdateGuest,
  onDeleteGuest,
  onAddTable,
  onDeleteTable,
  onAssignGuest,
}: EventWorkspaceProps) {
  const formattedDate = new Date(event.date).toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">{event.name}</h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{formattedDate}</span>
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{event.location}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-4">
        <Tabs defaultValue="guests">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="guests">Invitados</TabsTrigger>
            <TabsTrigger value="seating">Mesas</TabsTrigger>
          </TabsList>
          <TabsContent value="guests">
            <GuestManager
              event={event}
              onAddGuest={onAddGuest}
              onUpdateGuest={onUpdateGuest}
              onDeleteGuest={onDeleteGuest}
            />
          </TabsContent>
          <TabsContent value="seating">
            <SeatingPlan
              event={event}
              onAddTable={onAddTable}
              onDeleteTable={onDeleteTable}
              onAssignGuest={onAssignGuest}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
