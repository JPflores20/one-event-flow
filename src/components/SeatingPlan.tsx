import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Rnd } from "react-rnd";
import {
  Plus,
  Trash2,
  X,
  Users,
  GripVertical,
  Sofa,
  LayoutGrid,
  Map,
  Maximize2,
  Minimize2,
  Circle,
  Square,
  RectangleHorizontal,
  Settings2,
  Info,
  Download,
  Diamond,
  Triangle,
  Hexagon,
  Minus,
  Edit2,
  Copy,
  Undo2,
  Redo2,
  Upload,
  FileText,
  Image as ImageIcon,
  Radio,
  ExternalLink,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TableForm } from "./TableForm";
import { ElementForm } from "./ElementForm";
import type {
  EventData,
  EventTable,
  EventElement,
  TableShape,
  ElementShape,
  CroquisBackground,
} from "@/hooks/useEventStore";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const COLOR_PALETTE = [
  { name: "Default", class: "slate", hex: "#64748b" },
  { name: "Red", class: "red", hex: "#ef4444" },
  { name: "Orange", class: "orange", hex: "#f97316" },
  { name: "Amber", class: "amber", hex: "#f59e0b" },
  { name: "Emerald", class: "emerald", hex: "#10b981" },
  { name: "Blue", class: "blue", hex: "#3b82f6" },
  { name: "Indigo", class: "indigo", hex: "#6366f1" },
  { name: "Violet", class: "violet", hex: "#8b5cf6" },
  { name: "Pink", class: "pink", hex: "#ec4899" },
];

interface HistoryAction {
  kind: "table" | "element";
  id: string;
  before: Partial<EventTable & EventElement>;
  after: Partial<EventTable & EventElement>;
}

interface SeatingPlanProps {
  event: EventData;
  onAddTable: (name: string, capacity: number, shape?: TableShape) => void;
  onDuplicateTable?: (tableId: string) => void;
  onDeleteTable: (tableId: string) => void;
  onUpdateTableProps: (tableId: string, updates: Partial<EventTable>) => void;
  onAssignGuest: (guestId: string, tableId: string | null) => void;
  onAddElement: (name: string, shape: ElementShape) => void;
  onDuplicateElement?: (elementId: string) => void;
  onDeleteElement: (elementId: string) => void;
  onUpdateElementProps: (elementId: string, updates: Partial<EventElement>) => void;
  onUploadCroquisBackground?: (file: File) => Promise<CroquisBackground>;
  onUpdateCroquisBackground?: (bg: CroquisBackground | null) => Promise<void>;
  highlightedTableId?: string | null;
}

export function SeatingPlan({
  event,
  onAddTable,
  onDuplicateTable,
  onDeleteTable,
  onUpdateTableProps,
  onAssignGuest,
  onAddElement,
  onDuplicateElement,
  onDeleteElement,
  onUpdateElementProps,
  onUploadCroquisBackground,
  onUpdateCroquisBackground,
  highlightedTableId,
}: SeatingPlanProps) {
  const { role, permissions } = useAuth();
  const { toast } = useToast();
  const canEdit = role === "admin" || permissions?.canEditCroquis;
  const canManageGuests = role === "admin" || permissions?.canManageGuests;
  const [showTableForm, setShowTableForm] = useState(false);
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [showElementForm, setShowElementForm] = useState(false);
  const [view, setView] = useState<"list" | "croquis">("list");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [expandedTableId, setExpandedTableId] = useState<string | null>(null);
  const [liveCheckInMode, setLiveCheckInMode] = useState(false);
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // Undo / Redo stacks
  const [undoStack, setUndoStack] = useState<HistoryAction[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryAction[]>([]);

  const croquisRef = useRef<HTMLDivElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  // Automatically switch to croquis view and fullscreen when a table is highlighted
  useEffect(() => {
    if (highlightedTableId) {
      setView("croquis");
      setIsFullscreen(true);
    }
  }, [highlightedTableId]);

  const recordTableChange = useCallback(
    (tableId: string, updates: Partial<EventTable>) => {
      const current = event.tables.find((t) => t.id === tableId);
      if (current) {
        const before: Partial<EventTable> = {};
        for (const k of Object.keys(updates) as (keyof EventTable)[]) {
          before[k] = current[k] as never;
        }
        setUndoStack((prev) => [...prev.slice(-29), { kind: "table", id: tableId, before, after: updates }]);
        setRedoStack([]);
      }
      onUpdateTableProps(tableId, updates);
    },
    [event.tables, onUpdateTableProps]
  );

  const recordElementChange = useCallback(
    (elementId: string, updates: Partial<EventElement>) => {
      const current = event.elements?.find((e) => e.id === elementId);
      if (current) {
        const before: Partial<EventElement> = {};
        for (const k of Object.keys(updates) as (keyof EventElement)[]) {
          before[k] = current[k] as never;
        }
        setUndoStack((prev) => [...prev.slice(-29), { kind: "element", id: elementId, before, after: updates }]);
        setRedoStack([]);
      }
      onUpdateElementProps(elementId, updates);
    },
    [event.elements, onUpdateElementProps]
  );

  const handleUndo = useCallback(() => {
    if (!canEdit || undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, last]);
    if (last.kind === "table") {
      onUpdateTableProps(last.id, last.before);
    } else {
      onUpdateElementProps(last.id, last.before as Partial<EventElement>);
    }
  }, [canEdit, undoStack, onUpdateTableProps, onUpdateElementProps]);

  const handleRedo = useCallback(() => {
    if (!canEdit || redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, next]);
    if (next.kind === "table") {
      onUpdateTableProps(next.id, next.after);
    } else {
      onUpdateElementProps(next.id, next.after as Partial<EventElement>);
    }
  }, [canEdit, redoStack, onUpdateTableProps, onUpdateElementProps]);

  useEffect(() => {
    if (view !== "croquis" || !canEdit) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [view, canEdit, handleUndo, handleRedo]);

  const processBackgroundFile = async (file: File) => {
    if (!onUploadCroquisBackground) return;
    setIsUploadingBg(true);
    try {
      const bg = await onUploadCroquisBackground(file);
      toast({
        title: bg.type === "webp" ? "Imagen convertida a .webp y cargada" : "Plano PDF cargado en el croquis",
        description: `Archivo activo: ${bg.name}`,
      });
      setView("croquis");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al subir el plano del croquis.";
      toast({
        title: "No se pudo subir el plano",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsUploadingBg(false);
      if (bgFileInputRef.current) bgFileInputRef.current.value = "";
    }
  };

  const handleBackgroundFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processBackgroundFile(file);
  };

  const handleCroquisDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!canEdit || !e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingFile) setIsDraggingFile(true);
  };

  const handleCroquisDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!canEdit) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  };

  const handleCroquisDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    if (!canEdit) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processBackgroundFile(file);
    }
  };

  const handleBgOpacityChange = async (opacity: number) => {
    if (!event.croquisBackground || !onUpdateCroquisBackground) return;
    await onUpdateCroquisBackground({
      ...event.croquisBackground,
      opacity,
    });
  };

  const handleBgScaleChange = async (scale: number) => {
    if (!event.croquisBackground || !onUpdateCroquisBackground) return;
    await onUpdateCroquisBackground({
      ...event.croquisBackground,
      scale,
    });
  };

  const handleRemoveBg = async () => {
    if (!onUpdateCroquisBackground) return;
    await onUpdateCroquisBackground(null);
    toast({
      title: "Plano de fondo eliminado",
    });
  };

  const handleExportImage = async () => {
    if (!croquisRef.current) return;
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(croquisRef.current, {
        backgroundColor: "#ffffff",
        quality: 1,
        width: croquisRef.current.scrollWidth,
        height: croquisRef.current.scrollHeight,
      });
      const link = document.createElement("a");
      link.download = `Plano_${event.name}_${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Error al exportar imagen:", err);
    }
  };

  const handleExportPDF = async () => {
    if (!croquisRef.current) return;
    try {
      const [{ toPng }, { jsPDF }, { default: autoTable }] = await Promise.all([
        import("html-to-image"),
        import("jspdf"),
        import("jspdf-autotable"),
      ]);

      // 1. Capture Croquis Image (Full content)
      const dataUrl = await toPng(croquisRef.current, {
        backgroundColor: "#ffffff",
        quality: 1,
        pixelRatio: 2,
        width: croquisRef.current.scrollWidth,
        height: croquisRef.current.scrollHeight,
      });

      const doc = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;

      // 2. Header
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("ONE Event Flow", margin, 20);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text("Logística y Distribución de Invitados", margin, 25);

      doc.setDrawColor(200);
      doc.line(margin, 28, pageWidth - margin, 28);

      // 3. Event Details
      doc.setTextColor(0);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(event.name, margin, 38);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Fecha: ${new Date(event.date).toLocaleDateString("es-MX", { dateStyle: "long" })}`, margin, 44);
      doc.text(`Código: #${event.code}`, margin, 49);
      doc.text(`Ubicación: ${event.location}`, margin, 54);

      // 4. Croquis Image
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Mapa de Distribución (Croquis)", margin, 65);

      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (croquisRef.current.offsetHeight * imgWidth) / croquisRef.current.offsetWidth;

      doc.addImage(dataUrl, "PNG", margin, 70, imgWidth, imgHeight);

      // 5. Detailed Seating List
      doc.addPage();
      doc.setFontSize(16);
      doc.text("Lista Detallada por Mesas", margin, 20);

      const tableData: (string | { content: string; colSpan?: number; styles?: Record<string, unknown> })[][] = [];
      event.tables.forEach((table) => {
        const guests = getTableGuests(table.id);
        const occupied = getOccupied(table.id);

        tableData.push([
          {
            content: `MESA: ${table.name}`,
            colSpan: 3,
            styles: { fillColor: [245, 158, 11], textColor: [0, 0, 0], fontStyle: "bold" },
          },
        ]);
        tableData.push([
          {
            content: `Capacidad: ${table.capacity} | Ocupado: ${occupied}`,
            colSpan: 3,
            styles: { fillColor: [250, 250, 250], fontStyle: "italic" },
          },
        ]);

        if (guests.length === 0) {
          tableData.push([
            {
              content: "Sin invitados asignados",
              colSpan: 3,
              styles: { halign: "center", textColor: [150, 150, 150] },
            },
          ]);
        } else {
          guests.forEach((g) => {
            tableData.push([
              g.name,
              g.companions > 0 ? `+${g.companions} acompañantes` : "Individual",
              g.tags?.join(", ") || "-",
            ]);
          });
        }
        tableData.push([{ content: "", colSpan: 3, styles: { cellPadding: 2, border: 0 } }]);
      });

      autoTable(doc, {
        startY: 25,
        head: [["Invitado", "Grupo", "Etiquetas"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59] },
        styles: { fontSize: 9 },
        margin: { top: 25 },
      });

      // 6. Footer on all pages
      const pageCount = (doc.internal as { getNumberOfPages: () => number }).getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Página ${i} de ${pageCount} | Generado por ONE Event Flow`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      }

      doc.save(`Reporte_Logistica_${event.name.replace(/\s+/g, "_")}_${event.code}.pdf`);
    } catch (err) {
      console.error("Error al generar PDF:", err);
    }
  };

  const unassigned = useMemo(() => {
    return event.guests.filter((g) => !g.tableId && g.status !== "cancelled");
  }, [event.guests]);

  const getTableGuests = (tableId: string) =>
    event.guests.filter((g) => g.tableId === tableId && g.status !== "cancelled");

  const getOccupied = (tableId: string) =>
    getTableGuests(tableId).reduce((sum, g) => sum + 1 + g.companions, 0);

  const getArrivedAtTable = (tableId: string) =>
    getTableGuests(tableId)
      .filter((g) => g.status === "arrived")
      .reduce((sum, g) => {
        const arrivedComp =
          g.arrivedCompanions !== undefined
            ? Math.min(Math.max(0, g.arrivedCompanions), g.companions)
            : g.companions;
        return sum + 1 + arrivedComp;
      }, 0);

  const handleDragStop = (tableId: string, d: { x: number; y: number }) => {
    recordTableChange(tableId, { x: d.x, y: d.y });
  };

  const handleResizeStop = (tableId: string, ref: HTMLElement, position: { x: number; y: number }) => {
    recordTableChange(tableId, {
      width: parseInt(ref.style.width, 10),
      height: parseInt(ref.style.height, 10),
      x: position.x,
      y: position.y,
    });
  };

  const handleChangeShape = (tableId: string, shape: TableShape) => {
    const table = event.tables.find((t) => t.id === tableId);
    if (!table) return;

    const isCircle = shape === "circle";
    const isSquare = shape === "square";
    const isDiamond = shape === "diamond";
    const isTriangle = shape === "triangle";
    const isHexagon = shape === "hexagon";
    const isAnyLShape = shape?.startsWith("l-shape");
    const isArc = shape?.startsWith("arc-");
    const forceAspect = isCircle || isSquare || isDiamond || isTriangle || isHexagon || isAnyLShape || isArc;

    const width = table.width || 180;
    let height = table.height || 120;

    if (forceAspect) {
      height = width;
    }

    recordTableChange(tableId, { shape, width, height });
  };

  const handleChangeColor = (tableId: string, color: string) => {
    recordTableChange(tableId, { color });
  };

  const handleTableFormSubmit = (name: string, capacity: number, shape?: TableShape) => {
    if (editingTableId) {
      recordTableChange(editingTableId, { name, capacity, shape });
      setEditingTableId(null);
    } else {
      onAddTable(name, capacity, shape);
    }
  };

  const handleElementDragStop = (elementId: string, d: { x: number; y: number }) => {
    recordElementChange(elementId, { x: d.x, y: d.y });
  };

  const handleElementResizeStop = (elementId: string, ref: HTMLElement, position: { x: number; y: number }) => {
    recordElementChange(elementId, {
      width: parseInt(ref.style.width, 10),
      height: parseInt(ref.style.height, 10),
      x: position.x,
      y: position.y,
    });
  };

  const handleElementChangeShape = (elementId: string, shape: ElementShape) => {
    const el = event.elements?.find((e) => e.id === elementId);
    if (!el) return;

    let width = el.width || 300;
    let height = el.height || 200;

    if (shape === "line-h") {
      if (width < 60) width = 300;
      height = 8;
    } else if (shape === "line-v") {
      width = 8;
      if (height < 60) height = 200;
    } else if (shape === "circle" || shape === "square") {
      if (width < 100) width = 200;
      height = width;
    } else {
      if (width < 60) width = 300;
      if (height < 60) height = 200;
    }

    recordElementChange(elementId, { shape, width, height });
  };

  const handleElementChangeColor = (elementId: string, color: string) => {
    recordElementChange(elementId, { color });
  };

  const croquisBg = event.croquisBackground;

  // VISTA CROQUIS
  const renderCroquis = () => {
    return (
      <div
        onDragOver={handleCroquisDragOver}
        onDragLeave={handleCroquisDragLeave}
        onDrop={handleCroquisDrop}
        className={cn(
          "relative w-full border border-border bg-slate-100/60 dark:bg-slate-950/85 overflow-hidden transition-all duration-300",
          isFullscreen
            ? "fixed inset-0 z-50 rounded-none bg-background/95 backdrop-blur-sm h-[100vh]"
            : "h-[650px] rounded-2xl shadow-inner",
          isDraggingFile && "ring-4 ring-amber-400 border-amber-400"
        )}
        style={{
          backgroundImage: "radial-gradient(hsl(var(--foreground) / 0.16) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        {/* Overlay al arrastrar imagen o PDF sobre el croquis */}
        {isDraggingFile && canEdit && (
          <div className="absolute inset-4 z-50 rounded-2xl border-2 border-dashed border-amber-400 bg-amber-500/15 backdrop-blur-sm flex flex-col items-center justify-center gap-3 pointer-events-none animate-in fade-in duration-150">
            <div className="w-14 h-14 rounded-2xl bg-amber-400 text-black flex items-center justify-center shadow-lg">
              <Upload className="h-7 w-7" />
            </div>
            <p className="text-base font-bold text-foreground">
              Suelta aquí tu imagen (se convertirá a .webp) o archivo PDF
            </p>
            <p className="text-xs text-muted-foreground">
              Se colocará automáticamente como plano de fondo del croquis
            </p>
          </div>
        )}

        {/* Botones Flotantes Superiores del Croquis */}
        <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
            <Button
              variant={liveCheckInMode ? "default" : "outline"}
              size="sm"
              onClick={() => setLiveCheckInMode(!liveCheckInMode)}
              className={cn(
                "h-8 gap-2 text-xs font-bold",
                liveCheckInMode
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white border-none shadow-md"
                  : "bg-card/95 border-border backdrop-blur-sm"
              )}
              title="Colorear mesas según el progreso de check-in en tiempo real"
            >
              <Radio className={cn("h-3.5 w-3.5", liveCheckInMode && "animate-pulse")} />
              <span>Mapa en Vivo</span>
            </Button>

            {canEdit && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleUndo}
                  disabled={undoStack.length === 0}
                  className="h-8 w-8 bg-card/95 border-border backdrop-blur-sm"
                  title="Deshacer movimiento (Ctrl+Z)"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                  className="h-8 w-8 bg-card/95 border-border backdrop-blur-sm"
                  title="Rehacer movimiento (Ctrl+Y)"
                >
                  <Redo2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}

            {croquisBg && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-2 bg-card/95 border-amber-400/50 text-xs font-semibold backdrop-blur-sm"
                  >
                    {croquisBg.type === "pdf" ? (
                      <FileText className="h-3.5 w-3.5 text-amber-500" />
                    ) : (
                      <ImageIcon className="h-3.5 w-3.5 text-amber-500" />
                    )}
                    <span className="max-w-[130px] truncate">{croquisBg.name}</span>
                    <SlidersHorizontal className="h-3 w-3 opacity-60" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-4 space-y-4 z-50 bg-popover border-border shadow-xl" align="start">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Plano de Fondo ({croquisBg.type.toUpperCase()})
                    </span>
                    <a
                      href={croquisBg.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={croquisBg.name}
                      className="text-xs text-amber-500 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <ExternalLink className="h-3 w-3" /> Abrir
                    </a>
                  </div>

                  {canEdit && (
                    <>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span>Opacidad</span>
                          <span className="font-mono font-bold">
                            {Math.round((croquisBg.opacity ?? 0.45) * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={10}
                          max={100}
                          step={5}
                          value={Math.round((croquisBg.opacity ?? 0.45) * 100)}
                          onChange={(e) => handleBgOpacityChange(Number(e.target.value) / 100)}
                          className="w-full accent-amber-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span>Escala del plano</span>
                          <span className="font-mono font-bold">{croquisBg.scale ?? 100}%</span>
                        </div>
                        <input
                          type="range"
                          min={40}
                          max={160}
                          step={10}
                          value={croquisBg.scale ?? 100}
                          onChange={(e) => handleBgScaleChange(Number(e.target.value))}
                          className="w-full accent-amber-500"
                        />
                      </div>

                      {croquisBg.type === "webp" && onUpdateCroquisBackground && (
                        <div className="flex flex-col gap-1.5 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Contraste en Modo Oscuro
                          </span>
                          <div className="grid grid-cols-2 gap-1.5">
                            <Button
                              type="button"
                              variant={croquisBg.lightBacking ? "default" : "outline"}
                              size="sm"
                              className={cn(
                                "text-[10px] h-7 font-bold",
                                croquisBg.lightBacking && "bg-amber-400 text-black hover:bg-amber-300"
                              )}
                              onClick={() =>
                                onUpdateCroquisBackground({
                                  ...croquisBg,
                                  lightBacking: !croquisBg.lightBacking,
                                })
                              }
                            >
                              Base Clara
                            </Button>
                            <Button
                              type="button"
                              variant={croquisBg.invertInDark ? "default" : "outline"}
                              size="sm"
                              className={cn(
                                "text-[10px] h-7 font-bold",
                                croquisBg.invertInDark && "bg-amber-400 text-black hover:bg-amber-300"
                              )}
                              onClick={() =>
                                onUpdateCroquisBackground({
                                  ...croquisBg,
                                  invertInDark: !croquisBg.invertInDark,
                                })
                              }
                            >
                              Invertir Trazos
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2 border-t border-border">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs h-8"
                          onClick={() => bgFileInputRef.current?.click()}
                        >
                          Reemplazar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="text-xs h-8"
                          onClick={handleRemoveBg}
                        >
                          Quitar
                        </Button>
                      </div>
                    </>
                  )}
                </PopoverContent>
              </Popover>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                disabled={isUploadingBg}
                onClick={() => bgFileInputRef.current?.click()}
                className="h-8 gap-2 bg-amber-400/15 hover:bg-amber-400/25 border-amber-500/40 text-amber-800 dark:text-amber-300 font-semibold backdrop-blur-sm shadow-sm"
                title="Subir imagen (se convierte a .webp) o PDF como plano de fondo"
              >
                {isUploadingBg ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
                ) : (
                  <Upload className="h-3.5 w-3.5 text-amber-500" />
                )}
                <span>{croquisBg ? "Cambiar Plano (.webp / PDF)" : "Subir Plano (.webp / PDF)"}</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              className="h-8 gap-2 bg-card/95 border-border text-foreground hover:bg-muted backdrop-blur-sm"
            >
              <Download className="h-3.5 w-3.5 text-amber-500" /> Exportar PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportImage}
              className="h-8 gap-2 bg-card/95 border-border backdrop-blur-sm"
            >
              <Download className="h-3.5 w-3.5" /> Imagen
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-8 w-8 shadow-md bg-card/90 backdrop-blur"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Dock Inferior en Fullscreen */}
        {isFullscreen && canEdit && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 flex flex-wrap gap-3 p-3 bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-500">
            <Button
              onClick={() => bgFileInputRef.current?.click()}
              disabled={isUploadingBg}
              variant="outline"
              className="gap-2 font-bold border-amber-500/40 bg-amber-400/10 hover:bg-amber-400/20 text-amber-800 dark:text-amber-300 transition-all"
            >
              {isUploadingBg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              <span>{croquisBg ? "Cambiar Plano" : "Subir Plano (.webp / PDF)"}</span>
            </Button>
            <Button
              onClick={() => setShowElementForm(true)}
              variant="outline"
              className="gap-2 font-bold border-dashed hover:border-amber-400 hover:bg-amber-400/5 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Estructura</span>
            </Button>
            <Button
              onClick={() => setShowTableForm(true)}
              className="gap-2 bg-amber-400 hover:bg-amber-300 text-black font-bold shadow-lg transition-transform active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Mesa</span>
            </Button>
          </div>
        )}

        <div className={cn("absolute inset-0 overflow-auto", isFullscreen ? "pt-14" : "pt-12")}>
          <div ref={croquisRef} className="min-w-[2000px] min-h-[1500px] relative p-4">
            {/* PLANO DE FONDO (.WEBP O .PDF) */}
            {croquisBg && (
              <div
                className={cn(
                  "absolute top-0 left-0 pointer-events-none select-none z-0 overflow-hidden rounded-xl transition-all",
                  croquisBg.lightBacking && "bg-white/90 p-2 shadow-sm"
                )}
                style={{
                  opacity: croquisBg.opacity ?? 0.45,
                  width: `${((croquisBg.scale ?? 100) / 100) * 1600}px`,
                  height: `${((croquisBg.scale ?? 100) / 100) * 1100}px`,
                }}
              >
                {croquisBg.type === "webp" ? (
                  <img
                    src={croquisBg.url}
                    alt={croquisBg.name}
                    className={cn(
                      "w-full h-full object-contain object-top-left transition-all",
                      croquisBg.invertInDark && "dark:invert dark:hue-rotate-180"
                    )}
                  />
                ) : (
                  <object
                    data={`${croquisBg.url}#toolbar=0&navpanes=0&scrollbar=0`}
                    type="application/pdf"
                    className="w-full h-full pointer-events-none"
                  >
                    <div className="p-8 border-2 border-dashed border-amber-500/40 rounded-2xl bg-amber-500/5 text-center">
                      <FileText className="h-10 w-10 text-amber-500 mx-auto mb-2" />
                      <p className="text-sm font-bold">Plano PDF cargado: {croquisBg.name}</p>
                    </div>
                  </object>
                )}
              </div>
            )}

            {/* RENDER MESAS */}
            {event.tables.map((table, index) => {
              const occupied = getOccupied(table.id);
              const arrivedPeople = getArrivedAtTable(table.id);
              const isFull = occupied >= table.capacity;
              const isOverflown = occupied > table.capacity;
              const colorObj = COLOR_PALETTE.find((c) => c.class === table.color) || COLOR_PALETTE[0];
              const guests = getTableGuests(table.id);
              const pending = guests.filter((g) => g.status === "pending").length;
              const arrived = guests.filter((g) => g.status === "arrived").length;

              // Live check-in color override when Mapa en Vivo is active
              const liveStrokeHex =
                occupied === 0
                  ? "#94a3b8"
                  : arrivedPeople >= occupied
                    ? "#10b981"
                    : arrivedPeople > 0
                      ? "#f59e0b"
                      : "#64748b";

              const activeStrokeHex = liveCheckInMode
                ? liveStrokeHex
                : highlightedTableId === table.id
                  ? colorObj.hex
                  : isFull
                    ? isOverflown
                      ? "#ef4444"
                      : "#10b981"
                    : table.color
                      ? colorObj.hex + "80"
                      : undefined;

              const defaultWidth = 180;
              const defaultHeight = 120;

              const isCircle = table.shape === "circle";
              const isSquare = table.shape === "square";
              const isOval = table.shape === "oval";
              const isDiamond = table.shape === "diamond";
              const isTriangle = table.shape === "triangle";
              const isHexagon = table.shape === "hexagon";
              const isLShape = table.shape === "l-shape";
              const isLShapeTL = table.shape === "l-shape-tl";
              const isLShapeTR = table.shape === "l-shape-tr";
              const isLShapeBR = table.shape === "l-shape-br";
              const isAnyLShape = isLShape || isLShapeTL || isLShapeTR || isLShapeBR;
              const isArcTL = table.shape === "arc-tl";
              const isArcTR = table.shape === "arc-tr";
              const isArcBL = table.shape === "arc-bl";
              const isArcBR = table.shape === "arc-br";
              const isArc = isArcTL || isArcTR || isArcBL || isArcBR;
              const isPolygonal = isDiamond || isTriangle || isHexagon || isAnyLShape;
              const forceAspect = isCircle || isSquare || isPolygonal || isArc;

              const initialX = table.x !== undefined ? table.x : index * 40;
              const initialY = table.y !== undefined ? table.y : index * 30;

              return (
                <Rnd
                  key={table.id}
                  position={{
                    x: initialX,
                    y: initialY,
                  }}
                  size={{
                    width: table.width || defaultWidth,
                    height: forceAspect ? table.width || defaultWidth : table.height || defaultHeight,
                  }}
                  minWidth={120}
                  minHeight={isCircle || isSquare ? 120 : 80}
                  lockAspectRatio={forceAspect ? 1 : false}
                  bounds="parent"
                  dragHandleClassName="drag-handle"
                  disableDragging={!canEdit}
                  enableResizing={canEdit}
                  onDragStop={(e, d) => handleDragStop(table.id, d)}
                  onResizeStop={(e, direction, ref, delta, position) => handleResizeStop(table.id, ref, position)}
                  className={cn(
                    "transition-shadow duration-300 z-10 flex flex-col group overflow-visible relative",
                    !isPolygonal && !isArc && "shadow-sm hover:shadow-md dark:shadow-lg dark:shadow-black/40 bg-card/95 backdrop-blur-sm border-2",
                    isCircle ? "rounded-full" : isOval ? "rounded-[999px]" : !isPolygonal && !isArc ? "rounded-xl" : "",
                    highlightedTableId === table.id && "z-50",
                    highlightedTableId === table.id && !isPolygonal && !isArc && "ring-8 ring-offset-4 ring-offset-background"
                  )}
                  style={{
                    borderColor: !isPolygonal && !isArc ? activeStrokeHex : undefined,
                    boxShadow:
                      highlightedTableId === table.id && !isPolygonal && !isArc
                        ? `0 0 40px ${colorObj.hex}`
                        : undefined,
                    transition:
                      "box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                >
                  {(isPolygonal || isArc) && (
                    <svg
                      className="absolute inset-0 pointer-events-none z-0"
                      width="100%"
                      height="100%"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      style={{
                        filter: highlightedTableId === table.id ? `drop-shadow(0 0 20px ${colorObj.hex})` : undefined,
                      }}
                    >
                      {isArc ? (
                        <path
                          d={
                            isArcTL
                              ? "M 98,2 A 96,96 0 0,0 2,98 L 32,98 A 66,66 0 0,1 98,32 Z"
                              : isArcTR
                                ? "M 2,2 A 96,96 0 0,1 98,98 L 68,98 A 66,66 0 0,0 2,32 Z"
                                : isArcBL
                                  ? "M 98,98 A 96,96 0 0,1 2,2 L 32,2 A 66,66 0 0,0 98,68 Z"
                                  : "M 2,98 A 96,96 0 0,0 98,2 L 68,2 A 66,66 0 0,1 2,68 Z"
                          }
                          style={{
                            fill: "hsl(var(--card))",
                            stroke: activeStrokeHex || "hsl(var(--border))",
                            strokeWidth: 2,
                            vectorEffect: "non-scaling-stroke",
                          }}
                        />
                      ) : (
                        <polygon
                          points={
                            isDiamond
                              ? "50,2 98,50 50,98 2,50"
                              : isTriangle
                                ? "50,2 98,98 2,98"
                                : isLShape
                                  ? "2,2 45,2 45,55 98,55 98,98 2,98"
                                  : isLShapeTL
                                    ? "2,2 98,2 98,45 45,45 45,98 2,98"
                                    : isLShapeTR
                                      ? "2,2 98,2 98,98 55,98 55,45 2,45"
                                      : isLShapeBR
                                        ? "98,2 98,98 2,98 2,55 55,55 55,2"
                                        : "25,2 75,2 98,50 75,98 25,98 2,50"
                          }
                          style={{
                            fill: "hsl(var(--card))",
                            stroke: activeStrokeHex || "hsl(var(--border))",
                            strokeWidth: 2,
                            vectorEffect: "non-scaling-stroke",
                          }}
                        />
                      )}
                    </svg>
                  )}

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "flex-1 flex flex-col items-center justify-center relative p-3 w-full h-full",
                            isCircle && "px-6"
                          )}
                        >
                          <div
                            className={cn(
                              "drag-handle absolute p-2 flex items-center cursor-grab active:cursor-grabbing opacity-80 hover:opacity-100",
                              isLShapeTR || isLShapeBR ? "top-0 right-0 w-[45%] justify-between" : "top-0 left-0",
                              isLShape || isLShapeTL
                                ? "w-[45%] justify-between"
                                : !isLShapeTR && !isLShapeBR && isPolygonal
                                  ? "right-0 justify-center gap-6"
                                  : !isLShapeTR && !isLShapeBR
                                    ? "right-0 justify-between"
                                    : ""
                            )}
                          >
                            <GripVertical
                              className={cn("h-4 w-4 text-muted-foreground/40 shrink-0", !canEdit && "hidden")}
                            />
                          </div>
                          <div
                            className={cn(
                              "absolute z-30 pointer-events-auto",
                              isLShape ? "top-2 left-8" : isLShapeBR ? "bottom-2 right-2" : "top-2 right-2"
                            )}
                          >
                            {canEdit && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 rounded-full text-muted-foreground hover:bg-muted shrink-0 z-50 relative pointer-events-auto"
                                  >
                                    <Settings2 className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 z-[100] max-h-[300px] overflow-y-auto">
                                  <DropdownMenuLabel className="text-xs">Forma</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => handleChangeShape(table.id, "rect")}>
                                    <RectangleHorizontal className="mr-2 h-4 w-4" /> Rectangular
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleChangeShape(table.id, "square")}>
                                    <Square className="mr-2 h-4 w-4" /> Cuadrada
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleChangeShape(table.id, "circle")}>
                                    <Circle className="mr-2 h-4 w-4" /> Circular
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleChangeShape(table.id, "oval")}>
                                    <RectangleHorizontal className="mr-2 h-4 w-4 rounded-full" /> Óvalo
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleChangeShape(table.id, "diamond")}>
                                    <Diamond className="mr-2 h-4 w-4" /> Diamante
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleChangeShape(table.id, "triangle")}>
                                    <Triangle className="mr-2 h-4 w-4" /> Triángulo
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleChangeShape(table.id, "hexagon")}>
                                    <Hexagon className="mr-2 h-4 w-4" /> Hexágono
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleChangeShape(table.id, "l-shape")}>
                                    <svg
                                      className="mr-2 h-4 w-4"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <polyline points="7 3 7 21 21 21" />
                                    </svg>{" "}
                                    Forma de L (Abajo Izq)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleChangeShape(table.id, "l-shape-br")}>
                                    <svg
                                      className="mr-2 h-4 w-4"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <polyline points="21 3 21 21 7 21" />
                                    </svg>{" "}
                                    Forma de L (Abajo Der)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleChangeShape(table.id, "l-shape-tl")}>
                                    <svg
                                      className="mr-2 h-4 w-4"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <polyline points="17 21 17 3 3 3" />
                                    </svg>{" "}
                                    Forma de L (Arriba Izq)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleChangeShape(table.id, "l-shape-tr")}>
                                    <svg
                                      className="mr-2 h-4 w-4"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <polyline points="7 21 7 3 21 3" />
                                    </svg>{" "}
                                    Forma de L (Arriba Der)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleChangeShape(table.id, "arc-tl")}>
                                    <svg
                                      className="mr-2 h-4 w-4"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M21,3 A18,18 0 0,0 3,21" />
                                    </svg>{" "}
                                    Semicircular (Arriba Izq)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleChangeShape(table.id, "arc-tr")}>
                                    <svg
                                      className="mr-2 h-4 w-4"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M3,3 A18,18 0 0,1 21,21" />
                                    </svg>{" "}
                                    Semicircular (Arriba Der)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleChangeShape(table.id, "arc-bl")}>
                                    <svg
                                      className="mr-2 h-4 w-4"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M21,21 A18,18 0 0,1 3,3" />
                                    </svg>{" "}
                                    Semicircular (Abajo Izq)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleChangeShape(table.id, "arc-br")}>
                                    <svg
                                      className="mr-2 h-4 w-4"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M3,21 A18,18 0 0,0 21,3" />
                                    </svg>{" "}
                                    Semicircular (Abajo Der)
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                    Color
                                  </DropdownMenuLabel>
                                  <div className="grid grid-cols-5 gap-1.5 p-2">
                                    {COLOR_PALETTE.map((c) => (
                                      <button
                                        key={c.class}
                                        onClick={() => handleChangeColor(table.id, c.class)}
                                        className={cn(
                                          "h-6 w-6 rounded-full border border-black/10 transition-transform hover:scale-110",
                                          table.color === c.class && "ring-2 ring-offset-1 ring-primary shadow-sm"
                                        )}
                                        style={{ backgroundColor: c.hex }}
                                        title={c.name}
                                      />
                                    ))}
                                  </div>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => setEditingTableId(table.id)}>
                                    <Edit2 className="mr-2 h-4 w-4" /> Editar Propiedades
                                  </DropdownMenuItem>
                                  {onDuplicateTable && (
                                    <DropdownMenuItem onClick={() => onDuplicateTable(table.id)}>
                                      <Copy className="mr-2 h-4 w-4" /> Duplicar Mesa
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => onDeleteTable(table.id)}
                                    className="text-red-500 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-950/50"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar Mesa
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                          <div
                            className={cn(
                              "text-center pointer-events-none select-none",
                              isAnyLShape
                                ? "absolute w-[40%] flex flex-col items-center justify-center p-1"
                                : "mt-2",
                              isLShape && "bottom-3 left-3",
                              isLShapeTL && "top-3 left-3",
                              isLShapeTR && "top-3 right-3",
                              isLShapeBR && "bottom-3 right-3"
                            )}
                          >
                            <h5
                              className={cn(
                                "font-bold text-sm truncate w-full px-1 mx-auto leading-tight mb-1",
                                isAnyLShape && "text-[10px]"
                              )}
                              style={{ color: !isFull && table.color ? colorObj.hex : undefined }}
                            >
                              {table.name}
                            </h5>
                            {liveCheckInMode ? (
                              <div className="flex flex-col items-center">
                                <span
                                  className="text-xl font-black leading-none"
                                  style={{ color: liveStrokeHex }}
                                >
                                  {arrivedPeople} / {occupied}
                                </span>
                                <span className="text-[9px] uppercase font-bold text-muted-foreground mt-0.5">
                                  en salón
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-end justify-center gap-1">
                                <span
                                  className="text-2xl font-bold leading-none"
                                  style={{
                                    color: isFull
                                      ? isOverflown
                                        ? "#ef4444"
                                        : "#10b981"
                                      : table.color
                                        ? colorObj.hex
                                        : undefined,
                                  }}
                                >
                                  {occupied}
                                </span>
                                <span className="text-xs text-muted-foreground font-medium pb-[2px]">
                                  {" "}
                                  / {table.capacity}
                                </span>
                              </div>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "mt-2 h-7 gap-1 text-[10px] uppercase font-bold pointer-events-auto hover:bg-muted",
                                isAnyLShape && "text-[8px] px-1 h-6 w-[110%] ml-[-5%] overflow-hidden"
                              )}
                              onClick={() => setExpandedTableId(table.id)}
                            >
                              <Users className={cn("h-3 w-3", isAnyLShape && "shrink-0 ml-1")} />
                              <span className={cn(isAnyLShape && "truncate pr-1", "whitespace-nowrap")}>
                                {isAnyLShape ? "Invitados" : "Ver Invitados"}
                              </span>
                            </Button>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="p-3 w-56 flex flex-col gap-2 bg-card border-border shadow-xl">
                        <div className="flex items-center justify-between border-b border-border pb-2">
                          <span className="font-bold text-sm uppercase">Mesa {table.name}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {occupied} / {table.capacity}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Confirmados:</span>
                            <span className="font-semibold text-blue-500">
                              {arrived + guests.filter((g) => g.status === "confirmed").length}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground text-[10px] translate-x-3">
                              • Personas en salón:
                            </span>
                            <span className="font-bold text-green-500">
                              {arrivedPeople} / {occupied}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Pendientes:</span>
                            <span className="font-semibold text-amber-500">{pending}</span>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Rnd>
              );
            })}

            {/* RENDER ELEMENTOS ESTRUCTURALES */}
            {event.elements &&
              event.elements.map((element) => {
                const defaultWidth = 300;
                const defaultHeight = 200;
                const isCircle = element.shape === "circle";
                const isSquare = element.shape === "square";
                const isLineH = element.shape === "line-h";
                const isLineV = element.shape === "line-v";
                const forceAspect = isCircle || isSquare;

                const elementColor = COLOR_PALETTE.find((c) => c.class === element.color) || COLOR_PALETTE[0];
                const elWidth = element.width || (isLineV ? 8 : defaultWidth);
                const elHeight = forceAspect ? elWidth : element.height || (isLineH ? 8 : defaultHeight);

                return (
                  <Rnd
                    key={element.id}
                    position={{
                      x: element.x ?? 0,
                      y: element.y ?? 0,
                    }}
                    size={{
                      width: elWidth,
                      height: elHeight,
                    }}
                    minWidth={isLineV ? 4 : isCircle || isSquare ? 100 : 60}
                    minHeight={isLineH ? 4 : isCircle || isSquare ? 100 : 60}
                    lockAspectRatio={forceAspect}
                    bounds="parent"
                    dragHandleClassName="drag-handle"
                    disableDragging={!canEdit}
                    enableResizing={
                      canEdit
                        ? isLineH
                          ? {
                              left: true,
                              right: true,
                              top: false,
                              bottom: false,
                              topRight: false,
                              bottomRight: false,
                              bottomLeft: false,
                              topLeft: false,
                            }
                          : isLineV
                            ? {
                                top: true,
                                bottom: true,
                                left: false,
                                right: false,
                                topRight: false,
                                bottomRight: false,
                                bottomLeft: false,
                                topLeft: false,
                              }
                            : true
                        : false
                    }
                    onDragStop={(e, d) => handleElementDragStop(element.id, d)}
                    onResizeStop={(e, direction, ref, delta, position) =>
                      handleElementResizeStop(element.id, ref, position)
                    }
                    className={cn(
                      "group flex items-center justify-center transition-colors duration-200 z-0",
                      isLineH || isLineV
                        ? "border-none"
                        : "border-2 border-dashed bg-background/50 dark:bg-slate-900/60 hover:bg-background/70 dark:hover:bg-slate-800/70",
                      isCircle ? "rounded-full" : "rounded-md"
                    )}
                    style={{
                      borderColor: element.color && !isLineH && !isLineV ? elementColor.hex + "80" : undefined,
                      backgroundColor: isLineH || isLineV ? elementColor.hex : undefined,
                      color: element.color ? elementColor.hex : undefined,
                    }}
                  >
                    <div
                      className={cn(
                        "absolute inset-0 drag-handle",
                        canEdit ? "cursor-grab active:cursor-grabbing" : "cursor-default"
                      )}
                    />
                    {canEdit && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 bg-card border border-border shadow-sm z-50 pointer-events-auto"
                          >
                            <Settings2 className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 z-[100] max-h-[300px] overflow-y-auto">
                          <DropdownMenuLabel className="text-xs">Forma</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleElementChangeShape(element.id, "rect")}>
                            <RectangleHorizontal className="mr-2 h-4 w-4" /> Rectángulo
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleElementChangeShape(element.id, "square")}>
                            <Square className="mr-2 h-4 w-4" /> Cuadrado
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleElementChangeShape(element.id, "circle")}>
                            <Circle className="mr-2 h-4 w-4" /> Círculo
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleElementChangeShape(element.id, "line-h")}>
                            <Minus className="mr-2 h-4 w-4" /> Línea (H)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleElementChangeShape(element.id, "line-v")}>
                            <Minus className="mr-2 h-4 w-4 rotate-90" /> Línea (V)
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Color
                          </DropdownMenuLabel>
                          <div className="grid grid-cols-5 gap-1.5 p-2">
                            {COLOR_PALETTE.map((c) => (
                              <button
                                key={c.class}
                                onClick={() => handleElementChangeColor(element.id, c.class)}
                                className={cn(
                                  "h-6 w-6 rounded-full border border-black/10 transition-transform hover:scale-110",
                                  element.color === c.class && "ring-2 ring-offset-1 ring-primary shadow-sm"
                                )}
                                style={{ backgroundColor: c.hex }}
                                title={c.name}
                              />
                            ))}
                          </div>
                          <DropdownMenuSeparator />
                          {onDuplicateElement && (
                            <DropdownMenuItem onClick={() => onDuplicateElement(element.id)}>
                              <Copy className="mr-2 h-4 w-4" /> Duplicar Elemento
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => onDeleteElement(element.id)} className="text-red-500">
                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar Elemento
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                    {!isLineH && !isLineV && (
                      <h3 className="font-bold text-center text-lg md:text-xl pointer-events-none lowercase tracking-widest px-4 break-words opacity-70">
                        {element.name}
                      </h3>
                    )}
                  </Rnd>
                );
              })}
          </div>
        </div>

        {!isFullscreen && (
          <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-sm bg-card/95 backdrop-blur border border-border rounded-xl p-3 shadow-md text-xs text-muted-foreground flex items-center justify-between gap-3 z-20">
            <span>
              {canEdit
                ? "Puedes arrastrar una imagen (.webp) o PDF al lienzo, o cargarlo desde tu equipo."
                : "La distribución física del croquis está en modo solo lectura para el staff."}
            </span>
            {canEdit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploadingBg}
                onClick={() => bgFileInputRef.current?.click()}
                className="shrink-0 h-8 gap-1.5 border-amber-500/40 bg-amber-400/15 hover:bg-amber-400/25 text-amber-800 dark:text-amber-300 font-bold text-xs"
              >
                {isUploadingBg ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
                ) : (
                  <Upload className="h-3.5 w-3.5 text-amber-500" />
                )}
                <span>Cargar PDF / Imagen</span>
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("space-y-6", isFullscreen && "static")}>
      {/* Hidden File Input for Croquis Background (.webp / PDF) */}
      <input
        ref={bgFileInputRef}
        type="file"
        accept="image/*,application/pdf,.pdf"
        className="hidden"
        onChange={handleBackgroundFileSelect}
      />

      {/* Top Banner & View Toggle (Solo visible si no es fullscreen) */}
      {!isFullscreen && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground">Distribución de Mesas</h3>
            <p className="text-sm text-muted-foreground">
              {event.tables.length} mesas creadas • {unassigned.reduce((s, g) => s + 1 + g.companions, 0)} lugares sin
              asignar
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Tabs value={view} onValueChange={(v) => setView(v as "list" | "croquis")} className="w-[200px]">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="list" className="text-xs gap-2">
                  <LayoutGrid className="h-3.5 w-3.5" /> Lista
                </TabsTrigger>
                <TabsTrigger value="croquis" className="text-xs gap-2">
                  <Map className="h-3.5 w-3.5" /> Croquis
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {canEdit && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={isUploadingBg}
                  onClick={() => bgFileInputRef.current?.click()}
                  className="h-9 border-amber-500/40 bg-amber-400/15 hover:bg-amber-400/25 text-amber-800 dark:text-amber-300 font-semibold gap-2 shadow-sm"
                  title="Subir una imagen (se convertirá a .webp) o un PDF para el croquis"
                >
                  {isUploadingBg ? (
                    <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                  ) : (
                    <Upload className="h-4 w-4 text-amber-500" />
                  )}
                  <span>{croquisBg ? "Cambiar Plano (.webp / PDF)" : "Subir Plano (.webp / PDF)"}</span>
                </Button>
                <Button
                  onClick={() => setShowTableForm(true)}
                  className="bg-amber-400 hover:bg-amber-300 text-black font-semibold h-9"
                >
                  <Plus className="h-4 w-4 mr-2" /> Agregar Mesa
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowElementForm(true)}
                  className="h-9 border-border bg-card text-foreground"
                >
                  <Plus className="h-4 w-4 mr-2" /> Agregar Elemento
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {event.tables.length === 0 && !croquisBg && view === "list" ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-2xl text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Sofa className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <h4 className="text-base font-semibold text-foreground mb-1">Sin mesas aún</h4>
          <p className="text-sm text-muted-foreground max-w-[320px] mb-5">
            Crea tu primera mesa o sube una imagen/PDF de tu plano para comenzar a acomodar a tus invitados.
          </p>
          {canEdit && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="outline"
                disabled={isUploadingBg}
                onClick={() => bgFileInputRef.current?.click()}
                className="gap-2 border-amber-500/40 bg-amber-400/15 hover:bg-amber-400/25 text-amber-800 dark:text-amber-300 font-semibold"
              >
                {isUploadingBg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                <span>Subir Plano (.webp / PDF)</span>
              </Button>
              <Button
                onClick={() => setShowTableForm(true)}
                className="bg-amber-400 hover:bg-amber-300 text-black font-semibold"
              >
                <Plus className="h-4 w-4 mr-2" /> Agregar Mesa
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div
          className={cn(
            "grid gap-4 items-start",
            !isFullscreen ? "md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"
          )}
        >
          {/* Zona de no asignados */}
          {unassigned.length > 0 && !isFullscreen && (
            <div className="bg-card border border-amber-500/30 rounded-2xl p-4 shadow-sm xl:sticky xl:top-[120px] order-last xl:order-none col-span-full xl:col-span-1">
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <h4 className="font-semibold text-foreground text-sm flex-1">Fila de espera</h4>
                <Badge
                  variant="outline"
                  className="bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
                >
                  {unassigned.length} grupos
                </Badge>
              </div>

              <div className="space-y-2 max-h-[60vh] xl:max-h-[calc(100vh-280px)] overflow-y-auto pr-2 scrollbar-hide">
                {unassigned.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="text-sm font-medium text-foreground truncate">{g.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Total: {1 + g.companions} lugar{1 + g.companions > 1 ? "es" : ""}
                      </p>
                    </div>
                    <Select onValueChange={(tableId) => onAssignGuest(g.id, tableId)} disabled={!canManageGuests}>
                      <SelectTrigger className="h-8 w-[100px] text-xs bg-card">
                        <SelectValue placeholder="Asignar..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {event.tables.map((t) => {
                          const occ = getOccupied(t.id);
                          const space = t.capacity - occ;
                          const needed = 1 + g.companions;
                          const fits = space >= needed;

                          return (
                            <SelectItem key={t.id} value={t.id} disabled={!fits} className="text-xs">
                              {t.name} {fits ? `(${space} lib)` : ""}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Area Principal */}
          <div
            className={cn(
              "items-start w-full",
              unassigned.length > 0 && !isFullscreen ? "col-span-full xl:col-span-2" : "col-span-full"
            )}
          >
            {view === "list" && !isFullscreen ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {event.tables.map((table) => {
                  const occupied = getOccupied(table.id);
                  const guestsInTable = getTableGuests(table.id);
                  const pct = Math.min((occupied / table.capacity) * 100, 100);
                  const isFull = occupied >= table.capacity;
                  const isOverflown = occupied > table.capacity;
                  const colorObj = COLOR_PALETTE.find((c) => c.class === table.color) || COLOR_PALETTE[0];

                  return (
                    <div
                      key={table.id}
                      className="group relative rounded-3xl bg-card border border-border overflow-hidden transition-all duration-300 hover:border-amber-400/40 hover:shadow-2xl dark:hover:shadow-amber-500/5 hover:-translate-y-1.5"
                    >
                      <div
                        className={cn("h-2.5 w-full", isOverflown ? "bg-red-500" : isFull ? "bg-emerald-500" : "")}
                        style={{ backgroundColor: !isFull ? colorObj.hex : undefined }}
                      />
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-5">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-black text-foreground text-xl truncate tracking-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                              {table.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 px-0.5">
                              <Badge
                                className={cn(
                                  "text-[10px] font-black uppercase tracking-tighter px-2 h-5 border-none shadow-sm",
                                  isOverflown
                                    ? "bg-red-500 text-white animate-pulse"
                                    : isFull
                                      ? "bg-emerald-500 text-white"
                                      : "bg-muted text-muted-foreground"
                                )}
                              >
                                {occupied} / {table.capacity} OCUPADOS
                              </Badge>
                            </div>
                          </div>
                          {canEdit && (
                            <div className="flex items-center gap-1">
                              {onDuplicateTable && (
                                <button
                                  className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground/70 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDuplicateTable(table.id);
                                  }}
                                  title="Duplicar mesa"
                                >
                                  <Copy className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground/70 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTableId(table.id);
                                }}
                                title="Editar mesa"
                              >
                                <Edit2 className="h-4.5 w-4.5" />
                              </button>
                              <button
                                className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground/70 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteTable(table.id);
                                }}
                                title="Eliminar mesa"
                              >
                                <Trash2 className="h-4.5 w-4.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden mb-6 shadow-inner">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-700 ease-out relative",
                              isOverflown ? "bg-red-500" : isFull ? "bg-emerald-500" : "bg-amber-400"
                            )}
                            style={{
                              width: `${pct}%`,
                              backgroundColor: !isFull && !isOverflown ? colorObj.hex : undefined,
                            }}
                          >
                            <div className="absolute inset-0 bg-white/20 animate-pulse" />
                          </div>
                        </div>

                        <div className="space-y-2 min-h-[80px] max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
                          <div className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-3 ml-1">
                            Invitados Asignados
                          </div>
                          {guestsInTable.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 opacity-40">
                              <Users className="h-6 w-6 mb-2" />
                              <p className="text-[10px] font-bold uppercase">Mesa vacía</p>
                            </div>
                          ) : (
                            guestsInTable.map((g) => (
                              <div
                                key={g.id}
                                className="flex items-center justify-between group/guest rounded-2xl p-3 bg-muted/40 dark:bg-slate-800/40 border border-border/40 hover:border-amber-400/40 hover:bg-background dark:hover:bg-slate-800/80 transition-all shadow-sm"
                              >
                                <div className="flex items-center gap-3 min-w-0 pr-2">
                                  <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-xs font-black text-muted-foreground">
                                    {g.name.charAt(0)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold text-foreground truncate">{g.name}</p>
                                    <p className="text-[10px] font-black text-amber-600/80 dark:text-amber-400/90 uppercase tracking-tighter leading-none mt-0.5">
                                      {g.companions > 0 ? `+${g.companions} acompañantes` : "Sin acompañantes"}
                                    </p>
                                  </div>
                                </div>
                                {canManageGuests && (
                                  <button
                                    className="h-8 w-8 rounded-lg text-muted-foreground/70 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all shrink-0 flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover/guest:opacity-100"
                                    onClick={() => onAssignGuest(g.id, null)}
                                    title="Quitar de mesa"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* VISTA DE CROQUIS */
              renderCroquis()
            )}
          </div>
        </div>
      )}

      <TableForm
        open={showTableForm || !!editingTableId}
        onClose={() => {
          setShowTableForm(false);
          setEditingTableId(null);
        }}
        onSubmit={handleTableFormSubmit}
        initialData={editingTableId ? event.tables.find((t) => t.id === editingTableId) : null}
      />
      <ElementForm open={showElementForm} onClose={() => setShowElementForm(false)} onSubmit={onAddElement} />

      {/* MODAL DE INVITADOS PARA EL CROQUIS */}
      <Dialog open={!!expandedTableId} onOpenChange={(open) => !open && setExpandedTableId(null)}>
        <DialogContent className="sm:max-w-[425px]">
          {(() => {
            const table = event.tables.find((t) => t.id === expandedTableId);
            if (!table) return null;
            const tableGuests = getTableGuests(table.id);
            const occupied = getOccupied(table.id);
            const tableColor = COLOR_PALETTE.find((c) => c.class === table.color) || COLOR_PALETTE[0];
            const isFull = occupied >= table.capacity;

            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: tableColor.hex }} />
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-semibold">
                      Mesa
                    </Badge>
                  </div>
                  <DialogTitle className="text-2xl font-bold flex items-center justify-between">
                    {table.name}
                    <span className={cn("text-lg font-mono", isFull ? "text-emerald-500" : "text-muted-foreground")}>
                      {occupied} / {table.capacity}
                    </span>
                  </DialogTitle>
                  <DialogDescription>Distribución de invitados asignados.</DialogDescription>
                </DialogHeader>

                <div className="py-6">
                  <ScrollArea className="h-[300px] pr-4 -mr-4">
                    {tableGuests.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4 py-12">
                        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                          <Users className="h-8 w-8 opacity-20" />
                        </div>
                        <p className="text-sm font-medium italic">Esta mesa aún no tiene invitados</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {tableGuests.map((guest) => (
                          <div
                            key={guest.id}
                            className="flex flex-col p-4 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-foreground text-lg">{guest.name}</span>
                              <Badge variant="secondary" className="bg-muted/50 text-[10px] font-bold">
                                {guest.companions > 0 ? `+${guest.companions} acomp.` : "Solo"}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between mt-3">
                              <div className="flex items-center gap-2">
                                <Users className="h-3 w-3 text-muted-foreground" />
                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                                  {guest.companions + 1} lugares ocupados
                                </span>
                              </div>
                              {canManageGuests && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-[10px] font-bold text-red-500 hover:text-white hover:bg-red-500 rounded-full px-3 transition-colors"
                                  onClick={() => onAssignGuest(guest.id, null)}
                                >
                                  Quitar de mesa
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-4 border-t pt-6">
                  <div className="flex-1 flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                    <Info className="h-3.5 w-3.5 text-amber-500" />
                    Cambia la posición en el mapa para ajustar la logística
                  </div>
                  <Button className="w-full sm:w-auto font-bold rounded-xl" onClick={() => setExpandedTableId(null)}>
                    Aceptar
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
