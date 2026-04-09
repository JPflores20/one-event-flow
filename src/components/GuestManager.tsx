import { useState, useMemo, useRef } from "react";
import {
  Search, UserPlus, Trash2, CheckCircle, Clock, XCircle, LogIn,
  Upload, Download, ChevronDown, CheckCheck, Map, Tag, Pencil
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, normalizeString } from "@/lib/utils";
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

import { useAuth } from "@/hooks/useAuth";

interface GuestManagerProps {
  event: EventData;
  onAddGuest: (guest: Omit<Guest, "id">) => void;
  onUpdateGuest: (guestId: string, updates: Partial<Guest>) => void;
  onDeleteGuest: (guestId: string) => void;
  onImportGuests: (guests: Omit<Guest, "id">[]) => void;
  onFocusTable?: (tableId: string) => void;
}

export function GuestManager({ event, onAddGuest, onUpdateGuest, onDeleteGuest, onImportGuests, onFocusTable }: GuestManagerProps) {
  const { role, permissions } = useAuth();
  const canManage = role === "admin" || permissions?.canManageGuests;
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<Guest["status"] | "all">("all");
  const [filterTag, setFilterTag] = useState<string | "all">("all");
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    event.guests.forEach(g => g.tags?.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [event.guests]);

  const filtered = useMemo(() => {
    let list = event.guests;
    if (filterStatus !== "all") list = list.filter(g => g.status === filterStatus);
    if (filterTag !== "all") list = list.filter(g => g.tags?.includes(filterTag));
    if (search.trim()) {
      const q = normalizeString(search);
      list = list.filter(g => 
        normalizeString(g.name).includes(q) || 
        normalizeString(g.phone || "").includes(q) ||
        normalizeString(getTableName(g.tableId) || "").includes(q) ||
        g.tags?.some(t => normalizeString(t).includes(q))
      );
    }
    return list;
  }, [event.guests, search, filterStatus, filterTag]);

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
      <div className="bg-white/50 dark:bg-slate-900/50 p-6 rounded-3xl border border-border shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
            <Input
              placeholder="Buscar por nombre, teléfono o mesa…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 h-12 bg-background border-slate-200 dark:border-slate-800 text-foreground placeholder:text-slate-400 focus:border-amber-400 focus:ring-amber-400/20 rounded-2xl transition-all shadow-sm"
            />
          </div>
          {canManage && (
            <div className="flex gap-2 shrink-0">
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" ref={fileInputRef} onChange={handleImport} />
              <Button
                variant="outline"
                className="h-12 px-5 gap-2 border-slate-200 dark:border-slate-800 bg-background text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-foreground rounded-2xl transition-all font-bold text-xs uppercase tracking-tight shadow-sm"
                onClick={() => fileInputRef.current?.click()}
                title="Importar desde CSV o Excel"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden lg:inline">Importar</span>
              </Button>
              <Button
                variant="outline"
                className="h-12 px-5 gap-2 border-slate-200 dark:border-slate-800 bg-background text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-foreground rounded-2xl transition-all font-bold text-xs uppercase tracking-tight shadow-sm"
                onClick={handleExport}
                title="Exportar a Excel"
              >
                <Download className="h-4 w-4" />
                <span className="hidden lg:inline">Exportar</span>
              </Button>
              <Button
                variant="outline"
                className={cn(
                  "h-12 px-5 gap-2 border-slate-200 dark:border-slate-800 bg-background text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-foreground rounded-2xl transition-all font-bold text-xs uppercase tracking-tight shadow-sm",
                  filterTag !== "all" && "border-amber-400 text-amber-600 bg-amber-400/5 ring-1 ring-amber-400/20"
                )}
                title="Filtrar por etiqueta"
              >
                <Select value={filterTag} onValueChange={setFilterTag}>
                  <SelectTrigger className="border-none bg-transparent h-auto p-0 focus:ring-0 shadow-none">
                    <Tag className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline max-w-[80px] truncate">{filterTag === "all" ? "Etiqueta" : filterTag}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las etiquetas</SelectItem>
                    {allTags.map(tag => (
                      <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Button>
              <Button
                onClick={() => setShowForm(true)}
                className="h-12 px-6 bg-amber-400 hover:bg-amber-300 text-black font-black gap-2 rounded-2xl transition-all shadow-md active:scale-95 text-xs uppercase tracking-tight"
              >
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Agregar</span>
              </Button>
            </div>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={cn(
                "shrink-0 px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest font-black transition-all duration-200 border shadow-sm",
                filterStatus === tab.key
                  ? "bg-amber-400 text-black border-amber-500 shadow-amber-400/20"
                  : "bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-800 hover:border-amber-400/50 hover:text-slate-600 dark:hover:text-slate-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground bg-card">
            <Search className="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{search || filterStatus !== "all" ? "Sin resultados" : "No hay invitados aún"}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((guest, index) => {
              const isArrived = guest.status === "arrived";

              return (
                <div
                  key={guest.id}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 transition-all duration-300 group relative",
                    index % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/50 dark:bg-slate-800/30",
                    "hover:bg-amber-50/50 dark:hover:bg-amber-400/5 hover:z-10"
                  )}
                >
                  {isArrived && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]" />
                  )}
                  
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-base font-black border-2 transition-all duration-300 group-hover:rotate-3 group-hover:scale-110 shadow-sm",
                      isArrived
                        ? "bg-green-500 border-green-400 text-white shadow-green-500/20"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"
                    )}>
                      {guest.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-black text-slate-900 dark:text-slate-100 text-lg leading-tight tracking-tight truncate group-hover:text-amber-600 transition-colors">
                          {guest.name}
                        </p>
                        {guest.tableId && (
                          <Badge variant="outline" className="bg-amber-100 dark:bg-amber-400/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-400/30 text-[9px] font-black uppercase tracking-tighter h-5 px-2">
                            {getTableName(guest.tableId)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1.5 items-center">
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500">{guest.phone || "Sin teléfono"}</p>
                        {guest.tags?.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-[8px] uppercase tracking-[0.1em] font-black py-0 h-4 bg-slate-200/70 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-none rounded-md px-1.5">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 px-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                    {guest.tableId && onFocusTable && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-xl"
                        onClick={(e) => {
                          e.stopPropagation();
                          onFocusTable(guest.tableId!);
                        }}
                        title="Ver en croquis"
                      >
                        <Map className="h-5 w-5" />
                      </Button>
                    )}
                    {!isArrived ? (
                      <Button
                        size="sm"
                        onClick={() => onUpdateGuest(guest.id, { status: "arrived" })}
                        className="h-10 px-4 bg-green-600 hover:bg-green-500 text-white font-black rounded-xl text-xs uppercase tracking-tight gap-2 shadow-md active:scale-95"
                      >
                        <LogIn className="h-4 w-4" />
                        <span>Ingresar</span>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onUpdateGuest(guest.id, { status: "confirmed" })}
                        className="h-10 px-4 text-xs font-bold uppercase tracking-tight gap-2 border-slate-200 dark:border-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground rounded-xl transition-all"
                      >
                        <ChevronDown className="h-4 w-4" />
                        <span>Deshacer</span>
                      </Button>
                    )}
                    {canManage && (
                      <>
                        <button
                          onClick={() => setEditingGuest(guest)}
                          className="h-10 w-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all"
                          title="Editar invitado"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDeleteGuest(guest.id)}
                          className="h-10 w-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                          title="Eliminar invitado"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {event.guests.length > 0 && (
        <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
          <span>Mostrando {filtered.length} de {event.guests.length} invitados</span>
          <span className="text-green-600 dark:text-green-400 font-medium">{counts.arrived} ingresaron</span>
        </div>
      )}

      <GuestForm 
        key={editingGuest?.id || "new"}
        open={showForm || !!editingGuest} 
        onClose={() => {
          setShowForm(false);
          setEditingGuest(null);
        }} 
        onSubmit={(data) => {
          if (editingGuest) {
            onUpdateGuest(editingGuest.id, data);
          } else {
            onAddGuest(data);
          }
        }} 
        initial={editingGuest || undefined}
      />
    </div>
  );
}
