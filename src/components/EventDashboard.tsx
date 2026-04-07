import { useState } from "react";
import { Plus, CalendarDays, MapPin, Users, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { EventData } from "@/hooks/useEventStore";

interface EventDashboardProps {
  events: EventData[];
  onCreateEvent: (name: string, date: string, location: string) => void;
  onDeleteEvent: (eventId: string) => void;
  onSelectEvent: (eventId: string) => void;
}

export function EventDashboard({ events, onCreateEvent, onDeleteEvent, onSelectEvent }: EventDashboardProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState<Date>();
  const [location, setLocation] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !date || !location.trim()) return;
    onCreateEvent(name.trim(), date.toISOString(), location.trim());
    setName("");
    setDate(undefined);
    setLocation("");
    setShowCreate(false);
  };

  const isActive = (event: EventData) => new Date(event.date) >= new Date(new Date().toDateString());

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">ONE</h1>
            <p className="text-sm text-muted-foreground">Gestión de Eventos</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-2 bg-accent-gold hover:bg-accent-gold/90 text-primary-foreground">
            <Plus className="h-4 w-4" /> Nuevo Evento
          </Button>
        </div>
      </header>

      {/* Events grid */}
      <main className="container mx-auto px-4 py-6">
        {events.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">No hay eventos creados</p>
            <p className="text-sm">Crea tu primer evento para comenzar</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((event) => {
                const active = isActive(event);
                const confirmed = event.guests.filter((g) => g.status === "confirmed").length;
                return (
                  <Card
                    key={event.id}
                    className="cursor-pointer transition-shadow hover:shadow-md"
                    onClick={() => onSelectEvent(event.id)}
                  >
                    <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{event.name}</CardTitle>
                        <Badge variant={active ? "default" : "secondary"} className={active ? "bg-accent-gold text-primary-foreground" : ""}>
                          {active ? "Activo" : "Pasado"}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteEvent(event.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarDays className="h-4 w-4" />
                        {format(new Date(event.date), "d MMM yyyy", { locale: es })}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {event.location}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {confirmed}/{event.guests.length} confirmados
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        )}
      </main>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Evento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="event-name">Nombre del evento</Label>
              <Input id="event-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Gala Anual 2026" required />
            </div>
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP", { locale: es }) : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={setDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-location">Lugar</Label>
              <Input id="event-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ej: Hotel W, CDMX" required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <Button type="submit">Crear Evento</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
