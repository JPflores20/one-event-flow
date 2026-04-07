import { useState, useMemo, useRef } from "react";
import {
  Search, UserPlus, Trash2, CheckCircle, Clock, XCircle, LogIn,
  Upload, Download, ChevronDown, CheckCheck
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { GuestForm } from "./GuestForm";
import type { EventData, Guest } from "@/hooks/useEventStore";

const statusConfig: Record<Guest["status"], { label: string; light: string; dark: string; icon: React.ElementType }> = {
  pending:   { label: "Pendiente",  light: "text-zinc-500 bg-zinc-100 border-zinc-200",         dark: "dark:text-zinc-400 dark:bg-zinc-800 dark:border-zinc-700",           icon: Clock },
  confirmed: { label: "Confirmado", light: "text-blue-600 bg-blue-50 border-blue-200",          dark: "dark:text-blue-400 dark:bg-blue-500/10 dark:border-blue-500/20",     icon: CheckCircle },
  arrived:   { label: "Ingresó",    light: "text-green-600 bg-green-50 border-green-200",       dark: "dark:text-green-400 dark:bg-green-500/10 dark:border-green-500/20",  icon: LogIn },
  cancelled: { label: "Cancelado",  light: "text-red-500 bg-red-50 border-red-200",             dark: "dark:text-red-400 dark:bg-red-500/10 dark:border-red-500/20",        icon: XCircle },
};

interface GuestManagerProps {
  event: EventData;
  onAddGuest: (guest: Omit<Guest, "id">) => void;
  onUpdateGuest: (guestId: string, updates: Partial<Guest>) => void;
  onDeleteGuest: (guestId: string) => void;
  onImportGuests: (guests: Omit<Guest, "id">[]) => void;
}

export function GuestManager({ event, onAddGuest, onUpdateGuest, onDeleteGuest, onImportGuests }: GuestManagerProps) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<Guest["status"] | "all">("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    let list = event.guests;
    if (filterStatus !== "all") list = list.filter(g => g.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(g => g.name.toLowerCase().includes(q) || g.phone?.includes(q));
    }
    return list;
  }, [event.guests, search, filterStatus]);

  const counts = useMemo(() => ({
    all:       event.guests.length,
    pending:   event.guests.filter(g => g.status === "pending").length,
    confirmed: event.guests.filter(g => g.status === "confirmed").length,
    arrived:   event.guests.filter(g => g.status === "arrived").length,
    cancelled: event.guests.filter(g => g.status === "cancelled").length,
  }), [event.guests]);

  const getTableName = (tableId: string | null) => {
    if (!tableId) return null;
    return event.tables.find(t => t.id === tableId)?.name ?? null;
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const processData = (data: any[]) => {
      const newGuests: Omit<Guest, "id">[] = data
        .filter(row => row.Nombre || row.Name || row.nombre)
        .map(row => ({
          name: row.Nombre || row.Name || row.nombre || "Sin nombre",
          phone: row.Telefono || row.Phone || row.telefono || "",
          companions: parseInt(row.Acompanantes || row.Companions || row.acompanantes) || 0,
          status: "pending" as const,
          tableId: null,
        }));
      onImportGuests(newGuests);
    };

    if (file.name.endsWith(".csv")) {
      Papa.parse(file, { header: true, skipEmptyLines: true, complete: (r) => processData(r.data) });
    } else if (file.name.match(/\.(xlsx|xls)$/)) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const wb = XLSX.read(evt.target?.result, { type: "binary" });
        processData(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]));
      };
      reader.readAsBinaryString(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleExport = () => {
    const data = event.guests.map(g => ({
      Nombre: g.name,
      Telefono: g.phone,
      Estado: statusConfig[g.status].label,
      Acompanantes: g.companions,
      Mesa: getTableName(g.tableId) ?? "—",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invitados");
    XLSX.writeFile(wb, `${event.name}_Invitados_${new Date().toLocaleDateString("es-MX").replace(/\//g, "-")}.xlsx`);
  };

  const filterTabs: { key: Guest["status"] | "all"; label: string }[] = [
    { key: "all",       label: `Todos (${counts.all})` },
    { key: "arrived",   label: `Ingresaron (${counts.arrived})` },
    { key: "confirmed", label: `Confirmados (${counts.confirmed})` },
    { key: "pending",   label: `Pendientes (${counts.pending})` },
    { key: "cancelled", label: `Cancelados (${counts.cancelled})` },
  ];

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o teléfono…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-amber-400"
          />
        </div>
        <div className="flex gap-2 shrink-0">
          <input type="file" accept=".csv,.xlsx,.xls" className="hidden" ref={fileInputRef} onChange={handleImport} />
          <Button
            variant="outline"
            className="h-11 gap-2 border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => fileInputRef.current?.click()}
            title="Importar desde CSV o Excel"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Importar</span>
          </Button>
          <Button
            variant="outline"
            className="h-11 gap-2 border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={handleExport}
            title="Exportar a Excel"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
          <Button
            onClick={() => setShowForm(true)}
            className="h-11 bg-amber-400 hover:bg-amber-300 text-black font-semibold gap-2"
          >
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Agregar</span>
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 border",
              filterStatus === tab.key
                ? "bg-amber-50 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-400/30"
                : "bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Guest list */}
      <div className="rounded-xl border border-border overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground bg-card">
            <Search className="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{search || filterStatus !== "all" ? "Sin resultados" : "No hay invitados aún"}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((guest) => {
              const cfg = statusConfig[guest.status];
              const Icon = cfg.icon;
              const tableName = getTableName(guest.tableId);
              const isArrived = guest.status === "arrived";

              return (
                <div
                  key={guest.id}
                  className="flex items-center gap-3 p-3.5 bg-card hover:bg-muted/50 transition-colors group"
                >
                  {/* Avatar */}
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold border",
                    isArrived
                      ? "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20 text-green-600 dark:text-green-400"
                      : "bg-muted border-border text-muted-foreground"
                  )}>
                    {guest.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-semibold text-sm truncate",
                        isArrived ? "text-green-600 dark:text-green-400" : "text-foreground"
                      )}>
                        {guest.name}
                      </span>
                      {isArrived && <CheckCheck className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      {guest.companions > 0 && <span>+{guest.companions} acomp.</span>}
                      {tableName && <span className="font-medium text-foreground/70">Mesa {tableName}</span>}
                      {guest.phone && <span className="hidden sm:inline">{guest.phone}</span>}
                    </div>
                  </div>

                  {/* Status badge (desktop) */}
                  <div className="hidden md:block shrink-0">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                      cfg.light, cfg.dark
                    )}>
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!isArrived ? (
                      <Button
                        size="sm"
                        onClick={() => onUpdateGuest(guest.id, { status: "arrived" })}
                        className="h-8 px-3 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold gap-1.5"
                      >
                        <LogIn className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Ingresar</span>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onUpdateGuest(guest.id, { status: "confirmed" })}
                        className="h-8 px-3 text-xs gap-1.5 border-border text-muted-foreground hover:bg-muted"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Deshacer</span>
                      </Button>
                    )}
                    <button
                      onClick={() => onDeleteGuest(guest.id)}
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer summary */}
      {event.guests.length > 0 && (
        <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
          <span>Mostrando {filtered.length} de {event.guests.length} invitados</span>
          <span className="text-green-600 dark:text-green-400 font-medium">{counts.arrived} ingresaron</span>
        </div>
      )}

      <GuestForm open={showForm} onClose={() => setShowForm(false)} onSubmit={onAddGuest} />
    </div>
  );
}
