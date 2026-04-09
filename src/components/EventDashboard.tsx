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
  CalendarPlus, 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  Loader2, 
  Check, 
  Settings, 
  Trash, 
  AlertCircle, 
  BarChart3, 
  Calendar as CalendarIcon, 
  Layout, 
  DollarSign 
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { doc, setDoc, collection, getDocs, updateDoc, deleteDoc } from "firebase/firestore";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { db, firebaseConfig } from "@/lib/firebase";
import { useAuth, DEFAULT_ADMIN_PERMISSIONS, DEFAULT_STAFF_PERMISSIONS, type UserPermissions } from "@/hooks/useAuth";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect } from "react";
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
  
  // User Management State
  const [showUserMgmt, setShowUserMgmt] = useState(false);
  const [authorizedUsers, setAuthorizedUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [newRole, setNewRole] = useState<"admin" | "staff">("staff");
  
  const { theme, toggleTheme } = useTheme();
  const { user, role, logout } = useAuth();

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const querySnapshot = await getDocs(collection(db, "authorized_emails"));
      const users = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAuthorizedUsers(users);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (showUserMgmt) {
      fetchUsers();
    }
  }, [showUserMgmt]);

  const handleUpdateUser = async (email: string, updates: any) => {
    try {
      const userRef = doc(db, "authorized_emails", email);
      await updateDoc(userRef, updates);
      
      // Also try to update the 'users' collection if the user has already logged in
      // Note: We don't have the UID here easily, but we can search by email or wait for next login
      // For now, updating authorized_emails is the source of truth for the next fetch/login.
      
      await fetchUsers();
      setEditingUserId(null);
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Error al actualizar el usuario.");
    }
  };

  const handleDeleteUser = async (email: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el acceso a ${email}?`)) return;
    try {
      await deleteDoc(doc(db, "authorized_emails", email));
      await fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Error al eliminar el acceso.");
    }
  };

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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white/50 dark:bg-slate-900/50 p-6 rounded-3xl border border-border shadow-sm">
              <div>
                <h2 className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">
                  Listado de Eventos
                </h2>
                <p className="text-2xl font-black text-foreground tracking-tight">
                  {selectedDashboardDate 
                    ? `Filtrado por: ${format(selectedDashboardDate, 'd MMM', { locale: es })}` 
                    : (searchTerm ? `Búsqueda: "${searchTerm}"` : `Todos los eventos`)}
                </p>
              </div>

              <div className="relative w-full md:w-80 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                <Input
                  placeholder="Buscar por nombre, lugar o código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11 bg-background border-slate-200 dark:border-slate-800 h-12 text-sm focus:border-amber-400 focus:ring-amber-400/20 rounded-2xl transition-all shadow-sm"
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
                              "group relative rounded-3xl border overflow-hidden cursor-pointer transition-all duration-300",
                              "bg-card border-border hover:border-amber-400/40",
                              "shadow-sm hover:shadow-2xl hover:-translate-y-1.5"
                            )}
                            onClick={() => onSelectEvent(event.id)}
                          >
                            {/* Status label floating */}
                            <div className="absolute top-4 left-4 z-10">
                               <Badge
                                  className={cn(
                                    "text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 h-5 rounded-full border-none shadow-sm",
                                    active
                                      ? "bg-green-500 text-white animate-pulse"
                                      : "bg-slate-200 text-slate-500 dark:bg-slate-800"
                                  )}
                                >
                                  {active ? "Activo" : "Pasado"}
                                </Badge>
                            </div>
                            {/* Accent bar */}
                            <div className={cn(
                              "h-1.5 w-full",
                              active ? "bg-gradient-to-r from-amber-400 to-amber-500" : "bg-slate-200 dark:bg-slate-800"
                            )} />
                            <div className="p-6 pt-8">
                                <div className="flex items-start justify-between mb-4">
                                  <div className="flex-1 min-w-0 pr-2">
                                    <div className="space-y-1">
                                      <h3 className="font-black text-foreground text-xl leading-tight tracking-tight group-hover:text-amber-600 transition-colors">{event.name}</h3>
                                      <Badge className="w-fit bg-amber-400 text-black font-black px-2 py-0.5 text-[10px] shadow-sm border-none uppercase tracking-tighter">
                                        #{event.code}
                                      </Badge>
                                    </div>
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

                                <div className="flex items-center justify-between pt-5 border-t border-border mt-2">
                                  <div className="flex items-center gap-4">
                                    <div className="flex flex-col">
                                      <span className="text-[10px] uppercase font-black text-slate-400 truncate">Invitados</span>
                                      <span className="text-sm font-black text-foreground">{event.guests.length}</span>
                                    </div>
                                    <div className="h-8 w-px bg-slate-100 dark:bg-slate-800" />
                                    <div className="flex flex-col">
                                      <span className="text-[10px] uppercase font-black text-green-600/60 dark:text-green-400/60 truncate">Check-in</span>
                                      <span className="text-sm font-black text-green-600 dark:text-green-400">{arrived}</span>
                                    </div>
                                  </div>
                                  <div className="w-9 h-9 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-amber-400 transition-all shadow-inner">
                                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-black transition-colors" />
                                  </div>
                                </div>

                                {/* Progress Bar */}
                                {event.guests.length > 0 && (
                                  <div className="mt-5">
                                    <div className="flex items-center justify-between mb-1.5 px-0.5">
                                       <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Logística de ingreso</span>
                                       <span className="text-[9px] font-black text-green-600">{progress}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                                      <div
                                        className="h-full bg-gradient-to-r from-green-600 to-emerald-400 rounded-full transition-all duration-700 ease-out relative"
                                        style={{ width: `${progress}%` }}
                                      >
                                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                      </div>
                                    </div>
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
          <div className="w-full lg:w-96 space-y-6">
            <div className="p-6 rounded-3xl border border-border bg-white/70 dark:bg-slate-950/40 backdrop-blur-md shadow-xl sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-amber-500" />
                  Agenda Mensual
                </h3>
                {selectedDashboardDate && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedDashboardDate(undefined)}
                    className="h-6 text-[10px] font-bold text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-500/10 px-2 rounded-full border border-amber-200 dark:border-amber-700transition-all"
                  >
                    Ver Todo
                  </Button>
                )}
              </div>
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
        <DialogContent className="sm:max-w-2xl bg-card border-border max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="flex items-center gap-2 text-xl font-black">
               <ShieldCheck className="h-6 w-6 text-amber-500" />
               Panel de Accesos
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="list" className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6">
              <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-xl">
                <TabsTrigger value="list" className="rounded-lg font-bold text-xs uppercase tracking-tight">Ver Miembros</TabsTrigger>
                <TabsTrigger value="add" className="rounded-lg font-bold text-xs uppercase tracking-tight">Agregar Nuevo</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="list" className="flex-1 overflow-hidden mt-4">
              <ScrollArea className="h-full px-6">
                <div className="space-y-4 pb-8">
                  {isLoadingUsers ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                      <p className="text-xs font-bold text-muted-foreground uppercase">Cargando usuarios...</p>
                    </div>
                  ) : authorizedUsers.length === 0 ? (
                    <div className="text-center py-20 opacity-40">
                      <p className="text-sm font-bold uppercase">No hay usuarios registrados</p>
                    </div>
                  ) : (
                    authorizedUsers.map((u) => {
                      const isEditing = editingUserId === u.id;
                      const userPerms = u.permissions || (u.role === "admin" ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_STAFF_PERMISSIONS);
                      
                      return (
                        <div 
                          key={u.id} 
                          className={cn(
                            "rounded-2xl border transition-all duration-300 overflow-hidden",
                            isEditing ? "border-amber-400 bg-amber-400/5 shadow-lg" : "border-border bg-card/50 hover:border-slate-300 dark:hover:border-slate-700"
                          )}
                        >
                          <div className="p-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm",
                                u.role === "admin" ? "bg-black text-white" : "bg-amber-100 text-amber-700"
                              )}>
                                {u.id.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold truncate">{u.id}</p>
                                <Badge variant="outline" className={cn(
                                  "text-[9px] uppercase font-black px-1.5 h-4 border-none",
                                  u.role === "admin" ? "bg-black/10 text-black dark:bg-white/10 dark:text-white" : "bg-amber-100 text-amber-700"
                                )}>
                                  {u.role === "admin" ? "Administrador" : "Staff"}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {u.id !== "pepe.jlfc.16@gmail.com" && (
                                <>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className={cn("h-9 w-9 rounded-xl", isEditing && "text-amber-600 bg-amber-100")}
                                    onClick={() => setEditingUserId(isEditing ? null : u.id)}
                                  >
                                    <Settings className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-9 w-9 rounded-xl text-red-400 hover:text-red-500 hover:bg-red-50"
                                    onClick={() => handleDeleteUser(u.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>

                          {isEditing && (
                            <div className="px-4 pb-5 pt-2 border-t border-amber-400/20 space-y-5 animate-in slide-in-from-top-2 duration-300">
                              <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase text-amber-700 tracking-widest">Rol del Usuario</Label>
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm"
                                    variant={u.role === "staff" ? "default" : "outline"}
                                    onClick={() => handleUpdateUser(u.id, { 
                                      role: "staff", 
                                      permissions: DEFAULT_STAFF_PERMISSIONS 
                                    })}
                                    className={cn("flex-1 h-8 text-[10px] font-bold uppercase", u.role === "staff" && "bg-amber-400 text-black hover:bg-amber-300")}
                                  >
                                    Asignar Staff
                                  </Button>
                                  <Button 
                                    size="sm"
                                    variant={u.role === "admin" ? "default" : "outline"}
                                    onClick={() => handleUpdateUser(u.id, { 
                                      role: "admin", 
                                      permissions: DEFAULT_ADMIN_PERMISSIONS 
                                    })}
                                    className={cn("flex-1 h-8 text-[10px] font-bold uppercase", u.role === "admin" && "bg-black text-white hover:bg-zinc-800")}
                                  >
                                    Asignar Admin
                                  </Button>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase text-amber-700 tracking-widest">Permisos Individuales</Label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/50">
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                                        <DollarSign className="h-4 w-4" />
                                      </div>
                                      <div className="space-y-0.5">
                                        <p className="text-[11px] font-bold">Contabilidad</p>
                                        <p className="text-[9px] text-muted-foreground leading-none">Ver finanzas</p>
                                      </div>
                                    </div>
                                    <Switch 
                                      disabled={u.role === "admin"}
                                      checked={userPerms.canViewAccounting}
                                      onCheckedChange={(checked) => handleUpdateUser(u.id, {
                                        permissions: { ...userPerms, canViewAccounting: checked }
                                      })}
                                    />
                                  </div>

                                  <div className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/50">
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                        <Layout className="h-4 w-4" />
                                      </div>
                                      <div className="space-y-0.5">
                                        <p className="text-[11px] font-bold">Mesas</p>
                                        <p className="text-[9px] text-muted-foreground leading-none">Editar croquis</p>
                                      </div>
                                    </div>
                                    <Switch 
                                      disabled={u.role === "admin"}
                                      checked={userPerms.canEditCroquis}
                                      onCheckedChange={(checked) => handleUpdateUser(u.id, {
                                        permissions: { ...userPerms, canEditCroquis: checked }
                                      })}
                                    />
                                  </div>

                                  <div className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/50">
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                                        <Users className="h-4 w-4" />
                                      </div>
                                      <div className="space-y-0.5">
                                        <p className="text-[11px] font-bold">Invitados</p>
                                        <p className="text-[9px] text-muted-foreground leading-none">Eliminar/Editar</p>
                                      </div>
                                    </div>
                                    <Switch 
                                      disabled={u.role === "admin"}
                                      checked={userPerms.canManageGuests}
                                      onCheckedChange={(checked) => handleUpdateUser(u.id, {
                                        permissions: { ...userPerms, canManageGuests: checked }
                                      })}
                                    />
                                  </div>

                                  <div className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/50">
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
                                        <BarChart3 className="h-4 w-4" />
                                      </div>
                                      <div className="space-y-0.5">
                                        <p className="text-[11px] font-bold">Cronograma</p>
                                        <p className="text-[9px] text-muted-foreground leading-none">Editar tiempos</p>
                                      </div>
                                    </div>
                                    <Switch 
                                      disabled={u.role === "admin"}
                                      checked={userPerms.canEditTimeline}
                                      onCheckedChange={(checked) => handleUpdateUser(u.id, {
                                        permissions: { ...userPerms, canEditTimeline: checked }
                                      })}
                                    />
                                  </div>
                                </div>
                                {u.role === "admin" && (
                                  <p className="text-[9px] text-muted-foreground italic text-center">
                                    * Los administradores tienen todos los permisos habilitados por defecto.
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="add" className="p-6 pt-2">
              <div className="space-y-4">
                <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-2xl flex gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-amber-500 uppercase tracking-tight">Nueva Cuenta Personalizada</p>
                    <p className="text-[11px] text-muted-foreground leading-tight mt-1">Crea una cuenta para tu equipo y asígnale permisos específicos inmediatamente.</p>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="user-email" className="text-[11px] font-black uppercase text-muted-foreground">Correo de Acceso</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="user-email"
                        type="email"
                        placeholder="ejemplo@one.com"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="bg-background border-border h-11 pl-10 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="user-pass" className="text-[11px] font-black uppercase text-muted-foreground">Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="user-pass"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="bg-background border-border h-11 pl-10 pr-10 rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-black uppercase text-muted-foreground">Nivel de Acceso</Label>
                    <div className="flex gap-2">
                      <Button 
                        type="button"
                        variant={newRole === "staff" ? "default" : "outline"}
                        onClick={() => setNewRole("staff")}
                        className={cn("flex-1 h-11 rounded-xl transition-all", newRole === "staff" && "bg-amber-400 text-black hover:bg-amber-300 shadow-md scale-[1.02]")}
                      >
                        Rol Staff
                      </Button>
                      <Button 
                        type="button"
                        variant={newRole === "admin" ? "default" : "outline"}
                        onClick={() => setNewRole("admin")}
                        className={cn("flex-1 h-11 rounded-xl transition-all", newRole === "admin" && "bg-black text-white hover:bg-zinc-800 shadow-md scale-[1.02]")}
                      >
                        Rol Admin
                      </Button>
                    </div>
                  </div>

                  <Button 
                    className="w-full bg-amber-400 hover:bg-amber-300 text-black font-black h-12 mt-4 rounded-2xl shadow-lg transition-transform active:scale-95"
                    disabled={isRegistering}
                    onClick={async () => {
                      const email = newEmail.toLowerCase().trim();
                      const password = newPassword;
                      
                      if (!email || !password) {
                        alert("Por favor completa todos los campos.");
                        return;
                      }
                      if (password.length < 6) {
                        alert("La contraseña debe tener al menos 6 caracteres.");
                        return;
                      }

                      setIsRegistering(true);
                      let tempApp;
                      try {
                        tempApp = initializeApp(firebaseConfig, "temp-registration");
                        const tempAuth = getAuth(tempApp);
                        await createUserWithEmailAndPassword(tempAuth, email, password);
                        
                        const authRef = doc(db, "authorized_emails", email);
                        await setDoc(authRef, {
                          role: newRole,
                          permissions: newRole === "admin" ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_STAFF_PERMISSIONS,
                          invitedBy: user?.email,
                          createdAt: new Date().toISOString()
                        });

                        alert(`¡Éxito! Cuenta creada para ${email}.`);
                        setNewEmail("");
                        setNewPassword("");
                        fetchUsers();
                      } catch (e: any) {
                        console.error(e);
                        let message = "Error al crear el usuario.";
                        if (e.code === "auth/email-already-in-use") message = "Este correo ya está registrado.";
                        alert(message);
                      } finally {
                        if (tempApp) await deleteApp(tempApp);
                        setIsRegistering(false);
                      }
                    }}
                  >
                    {isRegistering ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4 mr-2" />
                    )}
                    {isRegistering ? "Creando cuenta..." : "Generar Acceso de Equipo"}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="p-4 bg-muted/30 border-t border-border mt-auto">
            <p className="text-[10px] text-muted-foreground text-center italic">
              Los cambios en permisos se aplican automáticamente el próximo login del usuario.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
