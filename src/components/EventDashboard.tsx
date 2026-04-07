import { 
  Plus, 
  CalendarDays, 
  MapPin, 
  Users, 
  ChevronRight, 
  Sparkles, 
  Moon, 
  Sun, 
  LogOut,
  Trash2,
  Search,
  UserPlus,
  ShieldCheck,
  User,
  CalendarPlus
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { cn, normalizeString, getGoogleCalendarUrl } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import type { EventData } from "@/hooks/useEventStore";

interface EventDashboardProps {
  events: EventData[];
  loading?: boolean;
  onCreateEvent: (name: string, date: string, location: string) => void;
  onDeleteEvent: (eventId: string) => void;
  onSelectEvent: (eventId: string) => void;
}

export function EventDashboard({ events, loading, onCreateEvent, onDeleteEvent, onSelectEvent }: EventDashboardProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState<Date>();
  const [location, setLocation] = useState("");
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [selectedDashboardDate, setSelectedDashboardDate] = useState<Date | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [showUserMgmt, setShowUserMgmt] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "staff">("staff");
  const { theme, toggleTheme } = useTheme();
  const { user, role, logout } = useAuth();

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

  const eventDates = events.map(e => new Date(new Date(e.date).toDateString()));
  const isEventDay = (day: Date) => eventDates.some(d => d.getTime() === day.getTime());

  const filteredEvents = events.filter(e => {
    const matchesDate = selectedDashboardDate 
      ? new Date(e.date).toDateString() === selectedDashboardDate.toDateString()
      : true;
    const q = normalizeString(searchTerm);
    const matchesSearch = q
      ? normalizeString(e.name).includes(q) || 
        normalizeString(e.location).includes(q) ||
        normalizeString(e.code).includes(q)
      : true;
    return matchesDate && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-2 border-t-amber-400 border-border animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">Conectando con Firebase…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-sm">
              <Sparkles className="h-4 w-4 text-black" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground tracking-tight leading-none">ONE</h1>
              <p className="text-xs text-muted-foreground leading-none mt-0.5">Event Flow</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Dark mode toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              aria-label="Cambiar tema"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {role === "admin" && (
              <Button
                onClick={() => setShowCreate(true)}
                className="gap-2 bg-amber-400 hover:bg-amber-300 text-black font-semibold shadow-sm transition-all"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nuevo Evento</span>
                <span className="sm:hidden">Nuevo</span>
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full border border-border bg-card">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.photoURL || ""} alt={user?.email || ""} />
                    <AvatarFallback className="bg-amber-100 text-amber-700 font-bold uppercase text-[10px]">
                      {user?.email?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal font-sans">
                  <div className="flex flex-col space-y-1">
                    <p className="text-xs font-medium leading-none text-muted-foreground uppercase tracking-wider mb-1">Usuario Activo</p>
                    <p className="text-sm font-bold leading-none text-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {role === "admin" && (
                  <>
                    <DropdownMenuItem 
                      className="cursor-pointer"
                      onClick={() => setShowUserMgmt(true)}
                    >
                      <UserPlus className="mr-2 h-4 w-4 text-amber-500" />
                      <span>Gestionar Usuarios</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}

                <DropdownMenuItem 
                  className="text-red-500 focus:text-red-500 focus:bg-red-50 dark:focus:bg-red-500/10 cursor-pointer"
                  onClick={() => logout()}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar Sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content with Sidebar */}
      <main className="container mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main List */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {selectedDashboardDate 
                  ? `Eventos el ${format(selectedDashboardDate, 'd MMM', { locale: es })}` 
                  : (searchTerm ? `Resultados: "${searchTerm}"` : `Todos los eventos (${events.length})`)}
              </h2>

              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar evento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-card border-border h-9 text-xs focus:border-amber-400"
                />
              </div>
            </div>

            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="w-20 h-20 rounded-2xl bg-muted border border-border flex items-center justify-center mb-6">
                  <CalendarDays className="h-9 w-9 text-muted-foreground/40" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">Sin eventos aún</h2>
                <p className="text-muted-foreground text-sm mb-8 max-w-xs">
                  Crea tu primer evento para comenzar a gestionar invitados y mesas.
                </p>
                {role === "admin" && (
                  <Button
                    onClick={() => setShowCreate(true)}
                    className="gap-2 bg-amber-400 hover:bg-amber-300 text-black font-semibold"
                  >
                    <Plus className="h-4 w-4" /> Crear primer evento
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {selectedDashboardDate && (
                  <div className="flex items-center justify-end mb-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedDashboardDate(undefined)}
                      className="text-xs text-muted-foreground underline h-auto p-0"
                    >
                      Ver todos los días
                    </Button>
                  </div>
                )}
                
                {filteredEvents.length === 0 ? (
                   <div className="py-12 text-center border-2 border-dashed border-muted rounded-2xl bg-muted/30">
                      <p className="text-muted-foreground text-sm">No se encontraron eventos.</p>
                   </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
                    {filteredEvents
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((event) => {
                        const active = isActive(event);
                        const arrived = event.guests.filter(g => g.status === "arrived").length;
                        const progress = event.guests.length > 0 ? Math.round((arrived / event.guests.length) * 100) : 0;

                        return (
                          <div
                            key={event.id}
                            className={cn(
                              "group relative rounded-2xl border overflow-hidden cursor-pointer transition-all duration-200",
                              "bg-card border-border hover:border-amber-400/40",
                              "hover:shadow-lg hover:-translate-y-0.5"
                            )}
                            onClick={() => onSelectEvent(event.id)}
                          >
                            {/* Accent bar */}
                            <div className={cn(
                              "h-1 w-full",
                              active ? "bg-gradient-to-r from-amber-400 to-amber-500" : "bg-muted"
                            )} />

                            <div className="p-5">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1 min-w-0 pr-2">
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                    <h3 className="font-bold text-foreground text-lg leading-tight truncate">{event.name}</h3>
                                    <Badge className="w-fit bg-amber-400/90 hover:bg-amber-400 text-black font-mono font-bold px-2 py-0.5 text-[11px] shadow-sm border-none uppercase">
                                      #{event.code}
                                    </Badge>
                                  </div>
                                  <Badge
                                    className={cn(
                                      "mt-2 text-xs font-medium px-2 py-0.5",
                                      active
                                        ? "bg-amber-50 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-400/20"
                                        : "bg-muted text-muted-foreground border-border"
                                    )}
                                    variant="outline"
                                  >
                                    {active ? "● Activo" : "Pasado"}
                                  </Badge>
                                </div>
                                  <div className="flex items-center gap-1">
                                    <a
                                      href={getGoogleCalendarUrl(event)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="h-8 w-8 rounded-lg border border-transparent flex items-center justify-center text-muted-foreground/60 hover:text-amber-500 hover:bg-amber-500/10 transition-all"
                                      onClick={(e) => e.stopPropagation()}
                                      title="Añadir a Google Calendar"
                                    >
                                      <CalendarPlus className="h-4 w-4" />
                                    </a>
                                    {role === "admin" && (
                                      <button
                                        className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                                        onClick={(e) => { 
                                          e.stopPropagation(); 
                                          setEventToDelete(event.id); 
                                        }}
                                        title="Eliminar evento"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                              </div>

                              <div className="space-y-1.5 mb-4">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                                  {format(new Date(event.date), "d 'de' MMMM, yyyy", { locale: es })}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">{event.location}</span>
                                </div>
                              </div>

                              {/* Stats */}
                              <div className="flex items-center justify-between pt-3 border-t border-border">
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {event.guests.length} inv.
                                  </span>
                                  <span className="text-green-600 dark:text-green-400 font-medium">{arrived} ingresaron</span>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-amber-500 transition-colors" />
                              </div>

                              {/* Progress */}
                              {event.guests.length > 0 && (
                                <div className="mt-3">
                                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500"
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                  <p className="text-xs text-muted-foreground/60 mt-1">{progress}% check-in</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar with Calendar */}
          <div className="w-full lg:w-80 space-y-6">
            <div className="p-4 rounded-2xl border border-border bg-card shadow-sm sticky top-24">
              <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-amber-500" />
                Vista Rápida
              </h3>
              <Calendar 
                mode="single"
                selected={selectedDashboardDate}
                onSelect={setSelectedDashboardDate}
                className="p-3 border rounded-xl bg-background pointer-events-auto"
                modifiers={{
                  hasEvent: (date) => events.some(e => new Date(e.date).toDateString() === date.toDateString())
                }}
                modifiersStyles={{
                  hasEvent: { 
                    fontWeight: 'bold',
                    textDecoration: 'underline',
                    textDecorationColor: '#ef4444',
                    textDecorationThickness: '3px'
                  }
                }}
                components={{
                  DayContent: ({ date, ...props }) => {
                    const hasEvent = events.some(e => new Date(e.date).toDateString() === date.toDateString());
                    return (
                      <div className="relative w-full h-full flex items-center justify-center">
                        {date.getDate()}
                        {hasEvent && (
                          <div className="absolute bottom-1 h-1 w-1 bg-red-500 rounded-full" />
                        )}
                      </div>
                    );
                  }
                }}
              />
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="h-2 w-2 bg-red-500 rounded-full" />
                  Días con eventos programados
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Nuevo Evento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="event-name" className="text-foreground">Nombre del evento</Label>
              <Input
                id="event-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Gala Anual 2026"
                className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-amber-400"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Fecha</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-background border-border hover:bg-muted",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP", { locale: es }) : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                  <Calendar mode="single" selected={date} onSelect={setDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-location" className="text-foreground">Lugar</Label>
              <Input
                id="event-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ej: Hotel W, CDMX"
                className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-amber-400"
                required
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-amber-400 hover:bg-amber-300 text-black font-semibold">
                Crear Evento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!eventToDelete} onOpenChange={(open) => !open && setEventToDelete(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground italic">¿Eliminar este evento?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Esta acción eliminará permanentemente el evento, incluyendo la lista de invitados, mesas y elementos del croquis. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="bg-muted text-foreground border-border hover:bg-muted/80">
              No, mantener evento
            </AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-500 hover:bg-red-600 text-white font-bold"
              onClick={() => {
                if (eventToDelete) {
                  onDeleteEvent(eventToDelete);
                  setEventToDelete(null);
                }
              }}
            >
              Sí, eliminar definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User Management Dialog */}
      <Dialog open={showUserMgmt} onOpenChange={setShowUserMgmt}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
               <ShieldCheck className="h-5 w-5 text-amber-500" />
               Gestión de Accesos
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 pt-4">
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Agregar Miembro</h4>
              <div className="flex flex-col gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="user-email">Correo Electrónico</Label>
                  <Input 
                    id="user-email"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Rol del Usuario</Label>
                  <div className="flex gap-2">
                    <Button 
                      type="button"
                      variant={newRole === "staff" ? "default" : "outline"}
                      onClick={() => setNewRole("staff")}
                      className={cn("flex-1 h-9", newRole === "staff" && "bg-amber-400 text-black hover:bg-amber-300")}
                    >
                      Staff
                    </Button>
                    <Button 
                      type="button"
                      variant={newRole === "admin" ? "default" : "outline"}
                      onClick={() => setNewRole("admin")}
                      className={cn("flex-1 h-9", newRole === "admin" && "bg-black text-white hover:bg-zinc-800")}
                    >
                      Admin
                    </Button>
                  </div>
                </div>
                <Button 
                  className="w-full bg-amber-400 hover:bg-amber-300 text-black font-bold h-10 mt-2"
                  onClick={async () => {
                    if (!newEmail.trim()) return;
                    try {
                      // Normalizing the email as an ID for authorization
                      const authRef = doc(db, "authorized_emails", newEmail.toLowerCase().trim());
                      await setDoc(authRef, {
                        role: newRole,
                        invitedBy: user?.email,
                        createdAt: new Date().toISOString()
                      });
                      alert(`¡Éxito! ${newEmail} ahora tiene acceso como ${newRole}.`);
                      setNewEmail("");
                    } catch (e) {
                      console.error(e);
                      alert("Error al autorizar usuario. Verifica los permisos.");
                    }
                  }}
                >
                  <UserPlus className="h-4 w-4 mr-2" /> Autorizar Acceso
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                 * Los usuarios administradores pueden ver todos los eventos y editarlos. El Staff solo puede ver y realizar check-in de invitados.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
