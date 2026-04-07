import { useMemo, useState } from "react";
import { ArrowLeft, MapPin, CalendarDays, Users, LogIn, PieChart, Sofa, Sparkles, Moon, Sun, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GuestManager } from "./GuestManager";
import { SeatingPlan } from "./SeatingPlan";
import { AttendanceReport } from "./AttendanceReport";
import { EventTimeline } from "./EventTimeline";
import type { EventData, Guest, EventTable, EventElement, TimelineItem } from "@/hooks/useEventStore";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getGoogleCalendarUrl } from "@/lib/utils";

interface EventWorkspaceProps {
  event: EventData;
  onBack: () => void;
  onAddGuest: (guest: Omit<Guest, "id">) => void;
  onUpdateGuest: (guestId: string, updates: Partial<Guest>) => void;
  onDeleteGuest: (guestId: string) => void;
  onAddTable: (name: string, capacity: number) => void;
  onDeleteTable: (tableId: string) => void;
  onUpdateTableProps: (tableId: string, updates: Partial<EventTable>) => void;
  onAssignGuest: (guestId: string, tableId: string | null) => void;
  onImportGuests: (guests: Omit<Guest, "id">[]) => void;
  onAddElement: (name: string, shape: "rect" | "square" | "circle") => void;
  onDeleteElement: (elementId: string) => void;
  onUpdateElementProps: (elementId: string, updates: Partial<EventElement>) => void;
  onUpdateTimeline: (eventId: string, timeline: TimelineItem[]) => void;
}

export function EventWorkspace({
  event, onBack, onAddGuest, onUpdateGuest, onDeleteGuest,
  onAddTable, onDeleteTable, onUpdateTableProps, onAssignGuest, onImportGuests,
  onAddElement, onDeleteElement, onUpdateElementProps, onUpdateTimeline
}: EventWorkspaceProps) {
  const [activeTab, setActiveTab] = useState("guests");
  const [highlightedTableId, setHighlightedTableId] = useState<string | null>(null);
  
  const handleFocusTable = (tableId: string) => {
    setActiveTab("seating");
    setHighlightedTableId(tableId);
    // Clear highlight after a few seconds
    setTimeout(() => setHighlightedTableId(null), 5000);
  };

  const { role } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const formattedDate = format(new Date(event.date), "d 'de' MMMM, yyyy", { locale: es });

  const stats = useMemo(() => {
    const activeGuests = event.guests.filter(g => g.status !== "cancelled");
    const totalGuests = activeGuests.length;
    const totalExpected = activeGuests.reduce((sum, g) => sum + 1 + g.companions, 0);
    const totalArrived = event.guests.filter(g => g.status === "arrived").reduce((sum, g) => sum + 1 + g.companions, 0);
    const totalSeats = event.tables.reduce((sum, t) => sum + t.capacity, 0);
    
    // Calculate occupied seats directly from assigned guests
    const assignedSeats = activeGuests
      .filter(g => g.tableId !== null)
      .reduce((sum, g) => sum + 1 + g.companions, 0);
      
    const availableSeats = Math.max(0, totalSeats - assignedSeats);
    const checkInPct = totalExpected > 0 ? Math.round((totalArrived / totalExpected) * 100) : 0;
    
    return { totalGuests, totalExpected, totalArrived, totalSeats, availableSeats, checkInPct };
  }, [event.guests, event.tables]);

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-black" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-foreground truncate leading-tight">{event.name}</h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 flex-wrap">
                <CalendarDays className="h-3 w-3" /> {formattedDate}
                <Badge className="bg-amber-400 text-black font-mono font-bold px-1.5 py-0 h-4 text-[9px] border-none uppercase shadow-sm">#{event.code}</Badge>
              </span>
              <span className="flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3" />{event.location}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={getGoogleCalendarUrl(event)}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-2 h-9 px-4 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-semibold text-xs transition-all shadow-sm"
              title="Añadir a Google Calendar"
            >
              <CalendarPlus className="h-4 w-4" />
              <span>Mi Calendario</span>
            </a>
            <a
              href={getGoogleCalendarUrl(event)}
              target="_blank"
              rel="noopener noreferrer"
              className="sm:hidden p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              title="Añadir a Google Calendar"
            >
              <CalendarPlus className="h-4 w-4" />
            </a>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              aria-label="Cambiar tema"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* Metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
              <Users className="h-3.5 w-3.5" /> Esperados
            </div>
            <div className="text-3xl font-bold text-foreground">{stats.totalExpected}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{stats.totalGuests} invitaciones</div>
          </div>

          <div className="rounded-2xl border border-green-200 dark:border-green-500/20 bg-green-50 dark:bg-green-500/5 p-4">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400/80 text-xs mb-2">
              <LogIn className="h-3.5 w-3.5" /> Check-in
            </div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.totalArrived}</div>
            <div className="text-xs text-green-600/60 dark:text-green-500/60 mt-0.5">{stats.checkInPct}% completado</div>
          </div>

          <div className="rounded-2xl border border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/5 p-4">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400/80 text-xs mb-2">
              <PieChart className="h-3.5 w-3.5" /> Capacidad
            </div>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.totalSeats}</div>
            <div className="text-xs text-blue-600/60 dark:text-blue-500/60 mt-0.5">{event.tables.length} mesas</div>
          </div>

          <div className="rounded-2xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/5 p-4">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400/80 text-xs mb-2">
              <Sofa className="h-3.5 w-3.5" /> Asientos libres
            </div>
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{stats.availableSeats}</div>
            <div className="text-xs text-amber-600/60 dark:text-amber-500/60 mt-0.5">disponibles</div>
          </div>
        </div>

        {/* Progress bar */}
        {stats.totalExpected > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">Progreso de Check-in en vivo</span>
              <span className="text-xs font-bold text-foreground">{stats.totalArrived} / {stats.totalExpected}</span>
            </div>
            <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-700"
                style={{ width: `${stats.checkInPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="w-full grid grid-cols-4 bg-muted border border-border h-11 p-1">
            <TabsTrigger
              value="guests"
              className="text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md transition-all font-medium text-xs"
            >
              Invitados
            </TabsTrigger>
            <TabsTrigger
              value="seating"
              className="text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md transition-all font-medium text-xs"
            >
              Mesas / Plano
            </TabsTrigger>
            <TabsTrigger
              value="timeline"
              className="text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md transition-all font-medium text-xs"
            >
              Cronograma
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md transition-all font-medium text-xs"
            >
              Reportes
            </TabsTrigger>
          </TabsList>
          <TabsContent value="guests">
            <GuestManager
              event={event}
              onAddGuest={onAddGuest}
              onUpdateGuest={onUpdateGuest}
              onDeleteGuest={onDeleteGuest}
              onImportGuests={onImportGuests}
              onFocusTable={handleFocusTable}
            />
          </TabsContent>
          <TabsContent value="seating">
            <SeatingPlan
              event={event}
              onAddTable={onAddTable}
              onDeleteTable={onDeleteTable}
              onUpdateTableProps={onUpdateTableProps}
              onAssignGuest={onAssignGuest}
              onAddElement={onAddElement}
              onDeleteElement={onDeleteElement}
              onUpdateElementProps={onUpdateElementProps}
              highlightedTableId={highlightedTableId}
            />
          </TabsContent>
          <TabsContent value="timeline">
            <EventTimeline 
              event={event} 
              onUpdateTimeline={onUpdateTimeline} 
            />
          </TabsContent>
          <TabsContent value="reports">
            <AttendanceReport event={event} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
