import { useState, useMemo } from "react";
import { Search, UserPlus, Trash2, Users, CheckCircle, Clock, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GuestForm } from "./GuestForm";
import type { EventData, Guest } from "@/hooks/useEventStore";

const statusConfig = {
  pending: { label: "Pendiente", variant: "secondary" as const, icon: Clock },
  confirmed: { label: "Confirmado", variant: "default" as const, icon: CheckCircle },
  cancelled: { label: "Cancelado", variant: "destructive" as const, icon: XCircle },
};

interface GuestManagerProps {
  event: EventData;
  onAddGuest: (guest: Omit<Guest, "id">) => void;
  onUpdateGuest: (guestId: string, updates: Partial<Guest>) => void;
  onDeleteGuest: (guestId: string) => void;
}

export function GuestManager({ event, onAddGuest, onUpdateGuest, onDeleteGuest }: GuestManagerProps) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return event.guests;
    const q = search.toLowerCase();
    return event.guests.filter((g) => g.name.toLowerCase().includes(q));
  }, [event.guests, search]);

  const counts = useMemo(() => {
    const total = event.guests.length;
    const confirmed = event.guests.filter((g) => g.status === "confirmed").length;
    const pending = event.guests.filter((g) => g.status === "pending").length;
    const cancelled = event.guests.filter((g) => g.status === "cancelled").length;
    const totalPeople = event.guests.reduce((sum, g) => sum + 1 + g.companions, 0);
    return { total, confirmed, pending, cancelled, totalPeople };
  }, [event.guests]);

  const getTableName = (tableId: string | null) => {
    if (!tableId) return "—";
    return event.tables.find((t) => t.id === tableId)?.name ?? "—";
  };

  const cycleStatus = (guest: Guest) => {
    const order: Guest["status"][] = ["pending", "confirmed", "cancelled"];
    const next = order[(order.indexOf(guest.status) + 1) % 3];
    onUpdateGuest(guest.id, { status: next });
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border bg-card p-3 text-center">
          <div className="text-2xl font-bold">{counts.totalPeople}</div>
          <div className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Users className="h-3 w-3" /> Personas total</div>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{counts.confirmed}</div>
          <div className="text-xs text-muted-foreground">Confirmados</div>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <div className="text-2xl font-bold text-yellow-600">{counts.pending}</div>
          <div className="text-xs text-muted-foreground">Pendientes</div>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{counts.cancelled}</div>
          <div className="text-xs text-muted-foreground">Cancelados</div>
        </div>
      </div>

      {/* Search + Add */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar invitado por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-12 text-base"
          />
        </div>
        <Button onClick={() => setShowForm(true)} className="h-12 gap-2 bg-accent-gold hover:bg-accent-gold/90 text-primary-foreground">
          <UserPlus className="h-4 w-4" /> <span className="hidden sm:inline">Agregar</span>
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="hidden sm:table-cell">Teléfono</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="hidden md:table-cell">Acomp.</TableHead>
              <TableHead className="hidden md:table-cell">Mesa</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  {search ? "Sin resultados" : "No hay invitados aún"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((guest) => {
                const cfg = statusConfig[guest.status];
                return (
                  <TableRow key={guest.id}>
                    <TableCell className="font-medium">{guest.name}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{guest.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={cfg.variant}
                        className="cursor-pointer select-none"
                        onClick={() => cycleStatus(guest)}
                      >
                        {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{guest.companions}</TableCell>
                    <TableCell className="hidden md:table-cell">{getTableName(guest.tableId)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => onDeleteGuest(guest.id)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <GuestForm open={showForm} onClose={() => setShowForm(false)} onSubmit={onAddGuest} />
    </div>
  );
}
