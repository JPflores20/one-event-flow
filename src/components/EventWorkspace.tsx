import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  CalendarDays,
  Users,
  LogIn,
  PieChart,
  Sofa,
  Sparkles,
  Moon,
  Sun,
  CalendarPlus,
  Edit2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GuestManager } from "./GuestManager";
import { EventTimeline } from "./EventTimeline";
import { SeatingPlan } from "./SeatingPlan";
import { AccountingManager } from "./AccountingManager";
import { AttendanceReport } from "./AttendanceReport";
import type {
  EventData,
  Guest,
  EventTable,
  EventElement,
  TimelineItem,
  FinancialTransaction,
  TableShape,
  ElementShape,
  CroquisBackground,
} from "@/hooks/useEventStore";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getGoogleCalendarUrl, cn, calculateAttendanceStats } from "@/lib/utils";

interface EventWorkspaceProps {
  event: EventData;
  onBack: () => void;
  onUpdateEvent: (updates: Partial<Pick<EventData, "name" | "date" | "location" | "budget" | "croquisBackground">>) => void;
  onAddGuest: (guest: Omit<Guest, "id">) => void;
  onUpdateGuest: (guestId: string, updates: Partial<Guest>) => void;
  onBulkUpdateGuests: (guestIds: string[], updates: Partial<Guest>) => void;
  onBulkDeleteGuests: (guestIds: string[]) => void;
  onDeleteGuest: (guestId: string) => void;
  onAddTable: (name: string, capacity: number, shape?: TableShape) => void;
  onDuplicateTable: (tableId: string) => void;
  onDeleteTable: (tableId: string) => void;
  onUpdateTableProps: (tableId: string, updates: Partial<EventTable>) => void;
  onAssignGuest: (guestId: string, tableId: string | null) => void;
  onImportGuests: (guests: Omit<Guest, "id">[]) => void;
  onAddElement: (name: string, shape: ElementShape) => void;
  onDuplicateElement: (elementId: string) => void;
  onDeleteElement: (elementId: string) => void;
  onUpdateElementProps: (elementId: string, updates: Partial<EventElement>) => void;
  onUploadCroquisBackground: (file: File) => Promise<CroquisBackground>;
  onUpdateCroquisBackground: (bg: CroquisBackground | null) => Promise<void>;
  onUpdateTimeline: (eventId: string, timeline: TimelineItem[]) => void;
  onAddTransaction: (transaction: Omit<FinancialTransaction, "id">) => void;
  onUpdateTransaction: (id: string, updates: Partial<FinancialTransaction>) => void;
  onDeleteTransaction: (id: string) => void;
  onAddCategory: (category: string) => void;
}

export function EventWorkspace({
  event,
  onBack,
  onUpdateEvent,
  onAddGuest,
  onUpdateGuest,
  onBulkUpdateGuests,
  onBulkDeleteGuests,
  onDeleteGuest,
  onAddTable,
  onDuplicateTable,
  onDeleteTable,
  onUpdateTableProps,
  onAssignGuest,
  onImportGuests,
  onAddElement,
  onDuplicateElement,
  onDeleteElement,
  onUpdateElementProps,
  onUploadCroquisBackground,
  onUpdateCroquisBackground,
  onUpdateTimeline,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onAddCategory,
}: EventWorkspaceProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "guests";
  const setActiveTab = (tab: string) => {
    setSearchParams({ tab }, { replace: true });
  };
  const [highlightedTableId, setHighlightedTableId] = useState<string | null>(null);
  const [showEditEvent, setShowEditEvent] = useState(false);
  const [editName, setEditName] = useState(event.name);
  const [editDate, setEditDate] = useState(event.date.slice(0, 10));
  const [editLocation, setEditLocation] = useState(event.location);

  const handleFocusTable = (tableId: string) => {
    setActiveTab("seating");
    setHighlightedTableId(tableId);
    setTimeout(() => setHighlightedTableId(null), 5000);
  };

  const { role, permissions } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const formattedDate = format(new Date(event.date), "d 'de' MMMM, yyyy", { locale: es });

  const stats = useMemo(() => {
    const attendance = calculateAttendanceStats(event.guests);
    const totalSeats = event.tables.reduce((sum, t) => sum + t.capacity, 0);
    const availableSeats = Math.max(0, totalSeats - attendance.assignedSeats);

    return {
      totalGuests: attendance.activeGuestsCount,
      totalExpected: attendance.totalExpected,
      totalArrived: attendance.totalArrived,
      totalSeats,
      availableSeats,
      checkInPct: attendance.checkInPct,
    };
  }, [event.guests, event.tables]);

  const canSeeAccounting = role === "admin" || permissions?.canViewAccounting;

  const handleOpenEditModal = () => {
    setEditName(event.name);
    setEditDate(event.date.slice(0, 10));
    setEditLocation(event.location);
    setShowEditEvent(true);
  };

  const handleSaveEventDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editDate || !editLocation.trim()) return;
    onUpdateEvent({
      name: editName.trim(),
      date: new Date(editDate + "T12:00:00").toISOString(),
      location: editLocation.trim(),
    });
    setShowEditEvent(false);
  };

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
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-foreground truncate leading-tight">{event.name}</h1>
              {role === "admin" && (
                <button
                  onClick={handleOpenEditModal}
                  className="text-muted-foreground hover:text-amber-500 transition-colors p-1 rounded-md"
                  title="Editar datos del evento"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 flex-wrap">
                <CalendarDays className="h-3 w-3" /> {formattedDate}
                <Badge className="bg-amber-400 text-black font-mono font-bold px-1.5 py-0 h-4 text-[9px] border-none uppercase shadow-sm">
                  #{event.code}
                </Badge>
              </span>
              <span className="flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3" />
                {event.location}
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
              className="p-2 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              aria-label="Cambiar tema"
              title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* Metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="flex items-center gap-2 text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-2">
              <Users className="h-3.5 w-3.5 text-muted-foreground" /> Esperados
            </div>
            <div className="text-4xl font-black text-foreground tracking-tighter">{stats.totalExpected}</div>
            <div className="text-[10px] text-muted-foreground mt-1 font-medium bg-muted w-fit px-2 py-0.5 rounded-full">
              {stats.totalGuests} invitaciones
            </div>
          </div>

          <div className="rounded-2xl border border-green-500/20 dark:border-emerald-500/30 bg-gradient-to-br from-green-50/50 to-white dark:from-emerald-500/15 dark:to-card p-5 shadow-sm hover:shadow-md transition-all duration-300 border-l-4 border-l-green-500">
            <div className="flex items-center gap-2 text-green-600 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-wider mb-2">
              <LogIn className="h-3.5 w-3.5" /> Check-in
            </div>
            <div className="text-4xl font-black text-green-600 dark:text-emerald-400 tracking-tighter">
              {stats.totalArrived}
            </div>
            <div className="text-[10px] text-green-600/70 dark:text-emerald-400/80 mt-1 font-bold">
              {stats.checkInPct}% completado
            </div>
          </div>

          <div className="rounded-2xl border border-blue-500/20 dark:border-blue-500/30 bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-500/15 dark:to-card p-5 shadow-sm hover:shadow-md transition-all duration-300 border-l-4 border-l-blue-500">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-[10px] uppercase tracking-wider mb-2">
              <PieChart className="h-3.5 w-3.5" /> Capacidad
            </div>
            <div className="text-4xl font-black text-blue-600 dark:text-blue-400 tracking-tighter">
              {stats.totalSeats}
            </div>
            <div className="text-[10px] text-blue-600/70 dark:text-blue-400/80 mt-1 font-bold">
              {event.tables.length} mesas
            </div>
          </div>

          <div className="rounded-2xl border border-amber-500/20 dark:border-amber-500/30 bg-gradient-to-br from-amber-50/50 to-white dark:from-amber-500/15 dark:to-card p-5 shadow-sm hover:shadow-md transition-all duration-300 border-l-4 border-l-amber-500">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-[10px] uppercase tracking-wider mb-2">
              <Sofa className="h-3.5 w-3.5" /> Libres
            </div>
            <div className="text-4xl font-black text-amber-600 dark:text-amber-400 tracking-tighter">
              {stats.availableSeats}
            </div>
            <div className="text-[10px] text-amber-600/70 dark:text-amber-400/80 mt-1 font-bold">
              Asientos disponibles
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {stats.totalExpected > 0 && (
          <div className="rounded-2xl border border-border bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/90 dark:to-card p-5 shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                Progreso de Check-in en vivo
              </span>
              <span className="text-xs font-black text-foreground">
                <span className="text-green-600 dark:text-emerald-400">{stats.totalArrived}</span>
                <span className="opacity-30 mx-1">/</span>
                {stats.totalExpected}
              </span>
            </div>
            <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-sm">
              <div
                className="h-full bg-gradient-to-r from-green-600 to-emerald-400 rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                style={{ width: `${stats.checkInPct}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="bg-slate-200/50 dark:bg-slate-900/80 p-1.5 rounded-2xl border border-border shadow-sm">
            <TabsList
              className={cn(
                "w-full grid bg-transparent border-none h-11 p-0 gap-1.5",
                canSeeAccounting ? "grid-cols-5" : "grid-cols-4"
              )}
            >
              <TabsTrigger
                value="guests"
                className="text-muted-foreground data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400 data-[state=active]:shadow-lg rounded-xl transition-all font-bold text-xs uppercase tracking-tight"
              >
                Invitados
              </TabsTrigger>
              <TabsTrigger
                value="seating"
                className="text-muted-foreground data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400 data-[state=active]:shadow-lg rounded-xl transition-all font-bold text-xs uppercase tracking-tight"
              >
                Mesas / Plano
              </TabsTrigger>
              <TabsTrigger
                value="timeline"
                className="text-muted-foreground data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400 data-[state=active]:shadow-lg rounded-xl transition-all font-bold text-xs uppercase tracking-tight"
              >
                Cronograma
              </TabsTrigger>
              {canSeeAccounting && (
                <TabsTrigger
                  value="accounting"
                  className="text-muted-foreground data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400 data-[state=active]:shadow-lg rounded-xl transition-all font-bold text-xs uppercase tracking-tight"
                >
                  Contabilidad
                </TabsTrigger>
              )}
              <TabsTrigger
                value="reports"
                className="text-muted-foreground data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400 data-[state=active]:shadow-lg rounded-xl transition-all font-bold text-xs uppercase tracking-tight"
              >
                Reportes
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="guests">
            <GuestManager
              event={event}
              onAddGuest={onAddGuest}
              onUpdateGuest={onUpdateGuest}
              onBulkUpdateGuests={onBulkUpdateGuests}
              onBulkDeleteGuests={onBulkDeleteGuests}
              onDeleteGuest={onDeleteGuest}
              onImportGuests={onImportGuests}
              onFocusTable={handleFocusTable}
            />
          </TabsContent>
          <TabsContent value="seating">
            <SeatingPlan
              event={event}
              onAddTable={onAddTable}
              onDuplicateTable={onDuplicateTable}
              onDeleteTable={onDeleteTable}
              onUpdateTableProps={onUpdateTableProps}
              onAssignGuest={onAssignGuest}
              onAddElement={onAddElement}
              onDuplicateElement={onDuplicateElement}
              onDeleteElement={onDeleteElement}
              onUpdateElementProps={onUpdateElementProps}
              onUploadCroquisBackground={onUploadCroquisBackground}
              onUpdateCroquisBackground={onUpdateCroquisBackground}
              highlightedTableId={highlightedTableId}
            />
          </TabsContent>
          <TabsContent value="timeline">
            <EventTimeline event={event} onUpdateTimeline={onUpdateTimeline} />
          </TabsContent>
          {canSeeAccounting && (
            <TabsContent value="accounting">
              <AccountingManager
                event={event}
                onUpdateBudget={(budget) => onUpdateEvent({ budget })}
                onAddTransaction={(t) => onAddTransaction(t)}
                onUpdateTransaction={(id, u) => onUpdateTransaction(id, u)}
                onDeleteTransaction={(id) => onDeleteTransaction(id)}
                onAddCategory={(c) => onAddCategory(c)}
              />
            </TabsContent>
          )}
          <TabsContent value="reports">
            <AttendanceReport event={event} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit Event Dialog */}
      <Dialog open={showEditEvent} onOpenChange={setShowEditEvent}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>Editar Detalles del Evento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEventDetails} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ws-event-name">Nombre del evento</Label>
              <Input
                id="ws-event-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ws-event-date">Fecha</Label>
              <Input
                id="ws-event-date"
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ws-event-location">Ubicación</Label>
              <Input
                id="ws-event-location"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditEvent(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-amber-400 hover:bg-amber-300 text-black font-semibold">
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
