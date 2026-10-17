import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  Search,
  UserPlus,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  LogIn,
  Upload,
  Download,
  ChevronDown,
  Map,
  Tag,
  Pencil,
  Users,
  MessageCircle,
  QrCode,
  ScanLine,
  FileSpreadsheet,
  StickyNote,
  CheckSquare,
  Square as SquareIcon,
  Minus,
  Plus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn, normalizeString, buildWhatsAppUrl, getGuestPassCode } from "@/lib/utils";
import { GuestForm } from "./GuestForm";
import type { EventData, Guest } from "@/hooks/useEventStore";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const statusConfig: Record<
  Guest["status"],
  { label: string; light: string; dark: string; icon: React.ElementType }
> = {
  pending: {
    label: "Pendiente",
    light: "text-zinc-500 bg-zinc-100 border-zinc-200",
    dark: "dark:text-slate-300 dark:bg-slate-800/80 dark:border-slate-700",
    icon: Clock,
  },
  confirmed: {
    label: "Confirmado",
    light: "text-blue-600 bg-blue-50 border-blue-200",
    dark: "dark:text-blue-400 dark:bg-blue-500/15 dark:border-blue-500/30",
    icon: CheckCircle,
  },
  arrived: {
    label: "Ingresó",
    light: "text-green-600 bg-green-50 border-green-200",
    dark: "dark:text-emerald-400 dark:bg-emerald-500/15 dark:border-emerald-500/30",
    icon: LogIn,
  },
  cancelled: {
    label: "Cancelado",
    light: "text-red-500 bg-red-50 border-red-200",
    dark: "dark:text-red-400 dark:bg-red-500/15 dark:border-red-500/30",
    icon: XCircle,
  },
};

interface GuestManagerProps {
  event: EventData;
  onAddGuest: (guest: Omit<Guest, "id">) => void;
  onUpdateGuest: (guestId: string, updates: Partial<Guest>) => void;
  onBulkUpdateGuests?: (guestIds: string[], updates: Partial<Guest>) => void;
  onBulkDeleteGuests?: (guestIds: string[]) => void;
  onDeleteGuest: (guestId: string) => void;
  onImportGuests: (guests: Omit<Guest, "id">[]) => void;
  onFocusTable?: (tableId: string) => void;
}

export function GuestManager({
  event,
  onAddGuest,
  onUpdateGuest,
  onBulkUpdateGuests,
  onBulkDeleteGuests,
  onDeleteGuest,
  onImportGuests,
  onFocusTable,
}: GuestManagerProps) {
  const { role, permissions } = useAuth();
  const { toast } = useToast();
  const canManage = role === "admin" || permissions?.canManageGuests;
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<Guest["status"] | "all">("all");
  const [filterTag, setFilterTag] = useState<string | "all">("all");
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [qrPassGuest, setQrPassGuest] = useState<Guest | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [showScanner, setShowScanner] = useState(false);
  const [scanCodeInput, setScanCodeInput] = useState("");
  const [cameraActive, setCameraActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    event.guests.forEach((g) => g.tags?.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [event.guests]);

  const getTableName = useCallback(
    (tableId: string | null) => {
      if (!tableId) return null;
      return event.tables.find((t) => t.id === tableId)?.name ?? null;
    },
    [event.tables]
  );

  // Generate QR code when qrPassGuest is opened
  useEffect(() => {
    if (!qrPassGuest) {
      setQrDataUrl("");
      return;
    }
    let mounted = true;
    const passCode = getGuestPassCode(event.code, qrPassGuest.id);
    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(
        passCode,
        {
          width: 320,
          margin: 2,
          color: { dark: "#0f172a", light: "#ffffff" },
        },
        (err, url) => {
          if (!err && mounted) {
            setQrDataUrl(url);
          }
        }
      );
    });
    return () => {
      mounted = false;
    };
  }, [qrPassGuest, event.code]);

  // Camera QR Scanner via BarcodeDetector when available
  useEffect(() => {
    if (!showScanner || !cameraActive) return;
    let stream: MediaStream | null = null;
    let intervalId: number | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        if ("BarcodeDetector" in window) {
          const DetectorClass = (
            window as unknown as {
              BarcodeDetector: new (opts: { formats: string[] }) => {
                detect: (video: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
              };
            }
          ).BarcodeDetector;
          const detector = new DetectorClass({ formats: ["qr_code"] });
          intervalId = window.setInterval(async () => {
            if (!videoRef.current) return;
            try {
              const codes = await detector.detect(videoRef.current);
              if (codes.length > 0 && codes[0].rawValue) {
                setScanCodeInput(codes[0].rawValue.trim());
                setCameraActive(false);
              }
            } catch {
              // ignore frame errors
            }
          }, 400);
        }
      } catch {
        toast({
          title: "Cámara no disponible",
          description: "Puedes ingresar o escanear el código manualmente en el buscador.",
          variant: "destructive",
        });
        setCameraActive(false);
      }
    };

    startCamera();

    return () => {
      if (intervalId) window.clearInterval(intervalId);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [showScanner, cameraActive, toast]);

  const filtered = useMemo(() => {
    let list = event.guests;
    if (filterStatus !== "all") list = list.filter((g) => g.status === filterStatus);
    if (filterTag !== "all") list = list.filter((g) => g.tags?.includes(filterTag));
    if (search.trim()) {
      const q = normalizeString(search);
      list = list.filter(
        (g) =>
          normalizeString(g.name).includes(q) ||
          normalizeString(g.phone || "").includes(q) ||
          normalizeString(getTableName(g.tableId) || "").includes(q) ||
          normalizeString(getGuestPassCode(event.code, g.id)).includes(q) ||
          normalizeString(g.notes || "").includes(q) ||
          g.tags?.some((t) => normalizeString(t).includes(q))
      );
    }
    return list;
  }, [event.guests, event.code, search, filterStatus, filterTag, getTableName]);

  const counts = useMemo(
    () => ({
      all: event.guests.length,
      pending: event.guests.filter((g) => g.status === "pending").length,
      confirmed: event.guests.filter((g) => g.status === "confirmed").length,
      arrived: event.guests.filter((g) => g.status === "arrived").length,
      cancelled: event.guests.filter((g) => g.status === "cancelled").length,
    }),
    [event.guests]
  );

  const parseStatusFromRow = (rawStatus: unknown): Guest["status"] => {
    const val = normalizeString(String(rawStatus || ""));
    if (val.includes("confirm")) return "confirmed";
    if (val.includes("ingres") || val.includes("arriv") || val.includes("lleg")) return "arrived";
    if (val.includes("cancel") || val.includes("declin")) return "cancelled";
    return "pending";
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const processData = (data: Record<string, unknown>[]) => {
      const newGuests: Omit<Guest, "id">[] = data
        .filter((row) => row.Nombre || row.Name || row.nombre)
        .map((row) => {
          const rawTable = String(row.Mesa || row.Table || row.mesa || "").trim();
          const matchedTable = rawTable
            ? event.tables.find((t) => normalizeString(t.name) === normalizeString(rawTable))
            : undefined;
          const rawTags = String(row.Etiquetas || row.Tags || row.etiquetas || "").trim();
          const parsedTags = rawTags
            ? rawTags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
            : [];
          const notes = String(row.Notas || row.Notes || row.notas || "").trim();

          return {
            name: String(row.Nombre || row.Name || row.nombre || "Sin nombre").trim(),
            phone: String(row.Telefono || row.Phone || row.telefono || "").trim(),
            companions: parseInt(String(row.Acompanantes || row.Companions || row.acompanantes || "0"), 10) || 0,
            status: parseStatusFromRow(row.Estado || row.Status || row.estado),
            tableId: matchedTable ? matchedTable.id : null,
            tags: parsedTags,
            ...(notes ? { notes } : {}),
          };
        });
      onImportGuests(newGuests);
      toast({
        title: "Invitados importados",
        description: `Se agregaron ${newGuests.length} registros a la lista.`,
      });
    };

    if (file.name.endsWith(".csv")) {
      const Papa = (await import("papaparse")).default;
      Papa.parse<Record<string, unknown>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (r) => processData(r.data),
      });
    } else if (file.name.match(/\.(xlsx|xls)$/)) {
      const XLSX = await import("xlsx");
      const reader = new FileReader();
      reader.onload = (evt) => {
        const wb = XLSX.read(evt.target?.result, { type: "binary" });
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]]);
        processData(rows);
      };
      reader.readAsBinaryString(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleExport = async () => {
    const XLSX = await import("xlsx");
    const data = event.guests.map((g) => ({
      CodigoPase: getGuestPassCode(event.code, g.id),
      Nombre: g.name,
      Telefono: g.phone,
      Estado: statusConfig[g.status].label,
      Acompanantes: g.companions,
      AcompanantesIngresados: g.status === "arrived" ? (g.arrivedCompanions ?? g.companions) : 0,
      Mesa: getTableName(g.tableId) ?? "—",
      Etiquetas: g.tags?.join(", ") || "",
      Notas: g.notes || "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invitados");
    XLSX.writeFile(
      wb,
      `${event.name}_Invitados_${new Date().toLocaleDateString("es-MX").replace(/\//g, "-")}.xlsx`
    );
  };

  const handleDownloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const templateRows = [
      {
        Nombre: "Juan Pérez",
        Telefono: "+52 555 123 4567",
        Acompanantes: 2,
        Estado: "Confirmado",
        Mesa: event.tables[0]?.name || "Mesa 1",
        Etiquetas: "Familia, VIP",
        Notas: "Sin restricciones",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(templateRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla_Invitados");
    XLSX.writeFile(wb, `Plantilla_Invitados_ONE.xlsx`);
  };

  const handleSendWhatsApp = (guest: Guest) => {
    if (!guest.phone) {
      toast({
        title: "Sin número telefónico",
        description: "Edita al invitado para agregar su número de WhatsApp.",
        variant: "destructive",
      });
      return;
    }
    const formattedDate = format(new Date(event.date), "d 'de' MMMM, yyyy", { locale: es });
    const tableName = getTableName(guest.tableId);
    const passCode = getGuestPassCode(event.code, guest.id);
    const totalSeats = 1 + guest.companions;

    const message =
      guest.status === "pending"
        ? `¡Hola *${guest.name}*! ✨\n\nTe invitamos cordialmente a *${event.name}*.\n📅 Fecha: ${formattedDate}\n📍 Lugar: ${event.location}\n🎟️ Lugares reservados: ${totalSeats}\n🔑 Código de acceso: *${passCode}*\n\n¿Podrías confirmarnos tu asistencia por este medio? ¡Gracias!`
        : `¡Hola *${guest.name}*! ✨\n\nTe compartimos los detalles de tu acceso para *${event.name}*:\n📅 Fecha: ${formattedDate}\n📍 Lugar: ${event.location}\n🎟️ Lugares: ${totalSeats}${tableName ? `\n🪑 Mesa asignada: *${tableName}*` : ""}\n🔑 Pase Digital: *${passCode}*\n\n¡Te esperamos!`;

    const url = buildWhatsAppUrl(guest.phone, message);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleDownloadPassWebP = async () => {
    if (!qrPassGuest || !qrDataUrl) return;
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 840;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background card
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Gold accent header bar
    ctx.fillStyle = "#fbbf24";
    ctx.fillRect(0, 0, canvas.width, 14);

    // Event Header
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ONE EVENT FLOW • PASE DE ACCESO", canvas.width / 2, 65);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 34px sans-serif";
    ctx.fillText(event.name.slice(0, 28), canvas.width / 2, 115);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "18px sans-serif";
    const formattedDate = format(new Date(event.date), "d 'de' MMMM, yyyy", { locale: es });
    ctx.fillText(`${formattedDate} • ${event.location.slice(0, 32)}`, canvas.width / 2, 150);

    // White QR box
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(160, 190, 320, 320);

    const qrImg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = qrDataUrl;
    });
    ctx.drawImage(qrImg, 170, 200, 300, 300);

    // Guest Info
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 30px sans-serif";
    ctx.fillText(qrPassGuest.name.slice(0, 26), canvas.width / 2, 575);

    const tableName = getTableName(qrPassGuest.tableId) || "Por asignar";
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText(
      `Mesa: ${tableName}  |  Lugares: ${1 + qrPassGuest.companions}`,
      canvas.width / 2,
      620
    );

    // Pass code
    const passCode = getGuestPassCode(event.code, qrPassGuest.id);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 24px monospace";
    ctx.fillText(passCode, canvas.width / 2, 680);

    if (qrPassGuest.notes) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "italic 16px sans-serif";
      ctx.fillText(`Nota: ${qrPassGuest.notes.slice(0, 42)}`, canvas.width / 2, 730);
    }

    const webpUrl = canvas.toDataURL("image/webp", 0.9);
    const link = document.createElement("a");
    link.download = `Pase_${qrPassGuest.name.replace(/\s+/g, "_")}.webp`;
    link.href = webpUrl;
    link.click();
  };

  const toggleSelectGuest = (guestId: string) => {
    setSelectedIds((prev) =>
      prev.includes(guestId) ? prev.filter((id) => id !== guestId) : [...prev, guestId]
    );
  };

  const toggleSelectAllFiltered = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((g) => g.id));
    }
  };

  const scannerMatches = useMemo(() => {
    const q = normalizeString(scanCodeInput);
    if (!q) return [];
    return event.guests
      .filter((g) => {
        const passCode = normalizeString(getGuestPassCode(event.code, g.id));
        return (
          passCode.includes(q) ||
          normalizeString(g.name).includes(q) ||
          normalizeString(g.phone || "").includes(q)
        );
      })
      .slice(0, 5);
  }, [event.guests, event.code, scanCodeInput]);

  const filterTabs: { key: Guest["status"] | "all"; label: string }[] = [
    { key: "all", label: `Todos (${counts.all})` },
    { key: "arrived", label: `Ingresaron (${counts.arrived})` },
    { key: "confirmed", label: `Confirmados (${counts.confirmed})` },
    { key: "pending", label: `Pendientes (${counts.pending})` },
    { key: "cancelled", label: `Cancelados (${counts.cancelled})` },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-card/85 dark:bg-card/90 backdrop-blur-sm p-6 rounded-3xl border border-border shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-amber-500 transition-colors" />
            <Input
              placeholder="Buscar por nombre, teléfono, mesa, código de pase o nota…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 h-12 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-amber-400 focus:ring-amber-400/20 rounded-2xl transition-all shadow-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={() => setShowScanner(true)}
              className="h-12 px-4 gap-2 border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 rounded-2xl font-bold text-xs uppercase tracking-tight shadow-sm"
              title="Escáner QR y Check-in Rápido en Puerta"
            >
              <ScanLine className="h-4 w-4" />
              <span className="hidden md:inline">Check-in QR</span>
            </Button>

            {canManage && (
              <>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImport}
                />
                <Button
                  variant="outline"
                  className="h-12 px-4 gap-2 border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground rounded-2xl transition-all font-bold text-xs uppercase tracking-tight shadow-sm"
                  onClick={handleDownloadTemplate}
                  title="Descargar plantilla Excel de ejemplo"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span className="hidden xl:inline">Plantilla</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-12 px-4 gap-2 border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground rounded-2xl transition-all font-bold text-xs uppercase tracking-tight shadow-sm"
                  onClick={() => fileInputRef.current?.click()}
                  title="Importar desde CSV o Excel"
                >
                  <Upload className="h-4 w-4" />
                  <span className="hidden lg:inline">Importar</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-12 px-4 gap-2 border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground rounded-2xl transition-all font-bold text-xs uppercase tracking-tight shadow-sm"
                  onClick={handleExport}
                  title="Exportar a Excel"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden lg:inline">Exportar</span>
                </Button>
                <div
                  className={cn(
                    "flex items-center justify-center h-12 px-4 gap-2 border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground rounded-2xl transition-all font-bold text-xs uppercase tracking-tight shadow-sm",
                    filterTag !== "all" && "border-amber-400 text-amber-600 dark:text-amber-400 bg-amber-400/10 ring-1 ring-amber-400/20"
                  )}
                  title="Filtrar por etiqueta"
                >
                  <Select value={filterTag} onValueChange={setFilterTag}>
                    <SelectTrigger className="border-none bg-transparent h-auto p-0 focus:ring-0 shadow-none hover:bg-transparent">
                      <Tag className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline max-w-[80px] truncate">
                        {filterTag === "all" ? "Etiqueta" : filterTag}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las etiquetas</SelectItem>
                      {allTags.map((tag) => (
                        <SelectItem key={tag} value={tag}>
                          {tag}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => setShowForm(true)}
                  className="h-12 px-6 bg-amber-400 hover:bg-amber-300 text-black font-black gap-2 rounded-2xl transition-all shadow-md active:scale-95 text-xs uppercase tracking-tight"
                >
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Agregar</span>
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterStatus(tab.key)}
                className={cn(
                  "shrink-0 px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest font-black transition-all duration-200 border shadow-sm",
                  filterStatus === tab.key
                    ? "bg-amber-400 text-black border-amber-500 shadow-amber-400/20"
                    : "bg-background text-muted-foreground border-border hover:border-amber-400/50 hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {canManage && filtered.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSelectAllFiltered}
              className="text-xs font-bold text-muted-foreground hover:text-foreground gap-1.5 h-8"
            >
              {selectedIds.length === filtered.length ? (
                <CheckSquare className="h-4 w-4 text-amber-500" />
              ) : (
                <SquareIcon className="h-4 w-4" />
              )}
              <span>
                {selectedIds.length === filtered.length ? "Deseleccionar todos" : "Seleccionar visibles"}
              </span>
            </Button>
          )}
        </div>

        {/* Bulk Actions Bar */}
        {canManage && selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-amber-400/10 border border-amber-400/30 animate-in fade-in duration-200">
            <span className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 px-2">
              {selectedIds.length} invitado{selectedIds.length > 1 ? "s" : ""} seleccionado
              {selectedIds.length > 1 ? "s" : ""}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {onBulkUpdateGuests && (
                <>
                  <Select
                    onValueChange={(status) => {
                      onBulkUpdateGuests(selectedIds, { status: status as Guest["status"] });
                      setSelectedIds([]);
                      toast({ title: "Estado actualizado en lote" });
                    }}
                  >
                    <SelectTrigger className="h-8 w-[140px] text-xs bg-background">
                      <SelectValue placeholder="Cambiar estado..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confirmed">Confirmado</SelectItem>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="arrived">Ingresó</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>

                  {event.tables.length > 0 && (
                    <Select
                      onValueChange={(tId) => {
                        onBulkUpdateGuests(selectedIds, { tableId: tId === "none" ? null : tId });
                        setSelectedIds([]);
                        toast({ title: "Mesa asignada en lote" });
                      }}
                    >
                      <SelectTrigger className="h-8 w-[140px] text-xs bg-background">
                        <SelectValue placeholder="Asignar mesa..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Quitar mesa</SelectItem>
                        {event.tables.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </>
              )}

              {onBulkDeleteGuests && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8 text-xs font-bold gap-1"
                  onClick={() => {
                    onBulkDeleteGuests(selectedIds);
                    setSelectedIds([]);
                    toast({ title: "Invitados eliminados" });
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Eliminar ({selectedIds.length})
                </Button>
              )}

              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setSelectedIds([])}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground bg-card">
            <Search className="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {search || filterStatus !== "all" ? "Sin resultados" : "No hay invitados aún"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((guest, index) => {
              const isArrived = guest.status === "arrived";
              const statusMeta = statusConfig[guest.status];
              const StatusIcon = statusMeta.icon;
              const isSelected = selectedIds.includes(guest.id);
              const arrivedComp =
                guest.arrivedCompanions !== undefined ? guest.arrivedCompanions : guest.companions;

              return (
                <div
                  key={guest.id}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 transition-all duration-300 group relative",
                    index % 2 === 0 ? "bg-card" : "bg-muted/30 dark:bg-slate-900/40",
                    isSelected && "bg-amber-50/80 dark:bg-amber-500/10",
                    "hover:bg-amber-50/50 dark:hover:bg-amber-400/[0.06] hover:z-10"
                  )}
                >
                  {isArrived && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]" />
                  )}

                  <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => toggleSelectGuest(guest.id)}
                        className="text-muted-foreground hover:text-amber-500 transition-colors shrink-0"
                        aria-label="Seleccionar invitado"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-amber-500" />
                        ) : (
                          <SquareIcon className="h-4 w-4" />
                        )}
                      </button>
                    )}

                    <div
                      className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-base font-black border-2 transition-all duration-300 group-hover:rotate-3 group-hover:scale-110 shadow-sm",
                        isArrived
                          ? "bg-green-500 border-green-400 text-white shadow-green-500/20"
                          : "bg-background border-border text-muted-foreground"
                      )}
                    >
                      {guest.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-black text-foreground text-lg leading-tight tracking-tight truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {guest.name}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] font-bold uppercase tracking-tighter h-5 px-2 gap-1",
                            statusMeta.light,
                            statusMeta.dark
                          )}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {statusMeta.label}
                        </Badge>
                        {guest.companions > 0 && (
                          <div className="inline-flex items-center gap-1">
                            <Badge
                              variant="outline"
                              className="text-[9px] font-bold h-5 px-2 gap-1 bg-muted text-muted-foreground border-border"
                            >
                              <Users className="h-3 w-3" />
                              {isArrived ? `+${arrivedComp}/${guest.companions}` : `+${guest.companions}`}
                            </Badge>
                            {isArrived && (
                              <div className="inline-flex items-center gap-0.5 bg-muted rounded-md p-0.5">
                                <button
                                  type="button"
                                  className="h-4 w-4 rounded flex items-center justify-center hover:bg-background text-xs"
                                  disabled={arrivedComp <= 0}
                                  onClick={() =>
                                    onUpdateGuest(guest.id, {
                                      arrivedCompanions: Math.max(0, arrivedComp - 1),
                                    })
                                  }
                                  title="Restar acompañante ingresado"
                                >
                                  <Minus className="h-2.5 w-2.5" />
                                </button>
                                <button
                                  type="button"
                                  className="h-4 w-4 rounded flex items-center justify-center hover:bg-background text-xs"
                                  disabled={arrivedComp >= guest.companions}
                                  onClick={() =>
                                    onUpdateGuest(guest.id, {
                                      arrivedCompanions: Math.min(guest.companions, arrivedComp + 1),
                                    })
                                  }
                                  title="Sumar acompañante ingresado"
                                >
                                  <Plus className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        {guest.tableId && (
                          <Badge
                            variant="outline"
                            className="bg-amber-100 dark:bg-amber-400/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-400/30 text-[9px] font-black uppercase tracking-tighter h-5 px-2"
                          >
                            {getTableName(guest.tableId)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1.5 items-center">
                        <p className="text-xs font-bold text-muted-foreground">
                          {guest.phone || "Sin teléfono"}
                        </p>
                        <span className="text-[10px] font-mono text-muted-foreground/75">
                          {getGuestPassCode(event.code, guest.id)}
                        </span>
                        {guest.tags?.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-[8px] uppercase tracking-[0.1em] font-black py-0 h-4 bg-muted text-muted-foreground border-none rounded-md px-1.5"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {guest.notes && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-300 bg-amber-500/10 dark:bg-amber-500/15 px-2 py-0.5 rounded-md font-medium">
                            <StickyNote className="h-2.5 w-2.5" />
                            {guest.notes}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-1.5 px-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 transform sm:translate-x-2 sm:group-hover:translate-x-0">
                    {/* Quick Table Selector */}
                    {canManage && event.tables.length > 0 && (
                      <Select
                        value={guest.tableId ?? "none"}
                        onValueChange={(val) =>
                          onUpdateGuest(guest.id, { tableId: val === "none" ? null : val })
                        }
                      >
                        <SelectTrigger className="h-9 w-[110px] text-[10px] font-bold rounded-xl bg-background border-border">
                          <SelectValue placeholder="Mesa..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin mesa</SelectItem>
                          {event.tables.map((t) => (
                            <SelectItem key={t.id} value={t.id} className="text-xs">
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {/* WhatsApp Direct Button */}
                    {guest.phone && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-xl"
                        onClick={() => handleSendWhatsApp(guest)}
                        title="Enviar invitación/recordatorio por WhatsApp"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Digital QR Pass Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl"
                      onClick={() => setQrPassGuest(guest)}
                      title="Ver Pase Digital QR"
                    >
                      <QrCode className="h-4 w-4" />
                    </Button>

                    {guest.tableId && onFocusTable && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-amber-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-xl"
                        onClick={(e) => {
                          e.stopPropagation();
                          onFocusTable(guest.tableId!);
                        }}
                        title="Ver en croquis"
                      >
                        <Map className="h-4 w-4" />
                      </Button>
                    )}

                    {!isArrived ? (
                      <Button
                        size="sm"
                        onClick={() =>
                          onUpdateGuest(guest.id, {
                            status: "arrived",
                            previousStatus: guest.status !== "arrived" ? guest.status : "confirmed",
                            arrivedCompanions: guest.companions,
                          })
                        }
                        className="h-9 px-3.5 bg-green-600 hover:bg-green-500 text-white font-black rounded-xl text-xs uppercase tracking-tight gap-1.5 shadow-md active:scale-95"
                      >
                        <LogIn className="h-3.5 w-3.5" />
                        <span>Ingresar</span>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          onUpdateGuest(guest.id, {
                            status: guest.previousStatus || "confirmed",
                          })
                        }
                        className="h-9 px-3.5 text-xs font-bold uppercase tracking-tight gap-1.5 border-border text-muted-foreground hover:bg-muted hover:text-foreground rounded-xl transition-all"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                        <span>Deshacer</span>
                      </Button>
                    )}
                    {canManage && (
                      <>
                        <button
                          onClick={() => setEditingGuest(guest)}
                          className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground/80 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all"
                          title="Editar invitado"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDeleteGuest(guest.id)}
                          className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground/80 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
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
          <span>
            Mostrando {filtered.length} de {event.guests.length} invitados
          </span>
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
        tables={event.tables}
      />

      {/* Digital QR Pass Dialog */}
      <Dialog open={!!qrPassGuest} onOpenChange={(open) => !open && setQrPassGuest(null)}>
        <DialogContent className="sm:max-w-sm bg-slate-950 text-white border-slate-800">
          {qrPassGuest && (
            <>
              <DialogHeader className="text-center">
                <Badge className="mx-auto mb-2 bg-amber-400 text-black font-black uppercase text-[10px]">
                  Pase Digital de Acceso
                </Badge>
                <DialogTitle className="text-xl font-black text-center text-white">{event.name}</DialogTitle>
                <DialogDescription className="text-center text-slate-400 text-xs">
                  {format(new Date(event.date), "d 'de' MMMM, yyyy", { locale: es })} • {event.location}
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col items-center py-4 space-y-4">
                <div className="p-3 bg-white rounded-2xl shadow-xl">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="QR Pase" className="w-52 h-52" />
                  ) : (
                    <div className="w-52 h-52 flex items-center justify-center text-slate-400 text-xs">
                      Generando QR…
                    </div>
                  )}
                </div>

                <div className="text-center space-y-1">
                  <p className="text-lg font-black text-white">{qrPassGuest.name}</p>
                  <p className="text-xs font-bold text-amber-400">
                    Mesa: {getTableName(qrPassGuest.tableId) ?? "Por asignar"} • {1 + qrPassGuest.companions}{" "}
                    lugar{1 + qrPassGuest.companions > 1 ? "es" : ""}
                  </p>
                  <p className="text-xs font-mono text-slate-400 pt-1">
                    {getGuestPassCode(event.code, qrPassGuest.id)}
                  </p>
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                {qrPassGuest.phone && (
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 gap-2"
                    onClick={() => handleSendWhatsApp(qrPassGuest)}
                  >
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={handleDownloadPassWebP}
                  className="flex-1 bg-amber-400 hover:bg-amber-300 text-black font-bold gap-2"
                >
                  <Download className="h-4 w-4" /> Descargar (.webp)
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Door Check-in QR Scanner / Quick Code Dialog */}
      <Dialog
        open={showScanner}
        onOpenChange={(open) => {
          setShowScanner(open);
          if (!open) {
            setCameraActive(false);
            setScanCodeInput("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-emerald-500" />
              Check-in Rápido / Escáner QR
            </DialogTitle>
            <DialogDescription>
              Escanea el código QR del invitado con la cámara o escribe los últimos caracteres de su pase.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Ej: ONE-123456-A1B2 o nombre del invitado..."
                value={scanCodeInput}
                onChange={(e) => setScanCodeInput(e.target.value)}
                autoFocus
              />
              <Button
                type="button"
                variant={cameraActive ? "destructive" : "outline"}
                onClick={() => setCameraActive(!cameraActive)}
                className="shrink-0"
              >
                {cameraActive ? "Detener" : "Usar Cámara"}
              </Button>
            </div>

            {cameraActive && (
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-border">
                <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                <div className="absolute inset-0 border-2 border-emerald-400/60 m-8 rounded-xl pointer-events-none" />
              </div>
            )}

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {scanCodeInput.trim() && scannerMatches.length === 0 && (
                <p className="text-xs text-center text-muted-foreground py-6">
                  No se encontró ningún invitado con ese código o nombre.
                </p>
              )}
              {scannerMatches.map((g) => {
                const isArrived = g.status === "arrived";
                return (
                  <div
                    key={g.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-sm truncate">{g.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {getGuestPassCode(event.code, g.id)} • Mesa: {getTableName(g.tableId) ?? "Sin asignar"}{" "}
                        • {1 + g.companions} pers.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      disabled={isArrived}
                      className={cn(
                        "font-bold text-xs",
                        isArrived ? "bg-muted text-muted-foreground" : "bg-green-600 hover:bg-green-500 text-white"
                      )}
                      onClick={() => {
                        onUpdateGuest(g.id, {
                          status: "arrived",
                          previousStatus: g.status !== "arrived" ? g.status : "confirmed",
                          arrivedCompanions: g.companions,
                        });
                        toast({
                          title: `¡Bienvenido, ${g.name}!`,
                          description: `Check-in registrado (${1 + g.companions} personas).`,
                        });
                        setScanCodeInput("");
                      }}
                    >
                      {isArrived ? "Ya ingresó" : "Confirmar Ingreso"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
