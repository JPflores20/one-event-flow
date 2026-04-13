import { useState, useMemo, useRef, useEffect } from "react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "@/hooks/useAuth";
import { Rnd } from "react-rnd";
import { Plus, Trash2, X, Users, GripVertical, Sofa, LayoutGrid, Map, Maximize2, Minimize2, Circle, Square, RectangleHorizontal, Settings2, Info, Download, Diamond, Triangle, Hexagon, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { TableForm } from "./TableForm";
import { ElementForm } from "./ElementForm";
import type { EventData, EventTable, EventElement } from "@/hooks/useEventStore";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

interface SeatingPlanProps {
  event: EventData;
  onAddTable: (name: string, capacity: number) => void;
  onDeleteTable: (tableId: string) => void;
  onUpdateTableProps: (tableId: string, updates: Partial<EventTable>) => void;
  onAssignGuest: (guestId: string, tableId: string | null) => void;
  onAddElement: (name: string, shape: "rect" | "square" | "circle") => void;
  onDeleteElement: (elementId: string) => void;
  onUpdateElementProps: (elementId: string, updates: Partial<EventElement>) => void;
  highlightedTableId?: string | null;
}

export function SeatingPlan({ 
  event, onAddTable, onDeleteTable, onUpdateTableProps, onAssignGuest,
  onAddElement, onDeleteElement, onUpdateElementProps,
  highlightedTableId
}: SeatingPlanProps) {
  const { role, permissions } = useAuth();
  const canEdit = role === "admin" || permissions?.canEditCroquis;
  const canManageGuests = role === "admin" || permissions?.canManageGuests;
  const [showTableForm, setShowTableForm] = useState(false);
  const [showElementForm, setShowElementForm] = useState(false);
  const [view, setView] = useState<"list" | "croquis">("list");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [expandedTableId, setExpandedTableId] = useState<string | null>(null);
  const croquisRef = useRef<HTMLDivElement>(null);

  // Automatically switch to croquis view and fullscreen when a table is highlighted
  useEffect(() => {
    if (highlightedTableId) {
      setView("croquis");
      setIsFullscreen(true);
    }
  }, [highlightedTableId]);

  const handleExportImage = async () => {
    if (!croquisRef.current) return;
    try {
      const dataUrl = await toPng(croquisRef.current, { 
        backgroundColor: '#ffffff', 
        quality: 1,
        width: croquisRef.current.scrollWidth,
        height: croquisRef.current.scrollHeight
      });
      const link = document.createElement('a');
      link.download = `Plano_${event.name}_${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('oops, something went wrong!', err);
    }
  };

  const handleExportPDF = async () => {
    if (!croquisRef.current) return;
    try {
      // 1. Capture Croquis Image (Full content)
      const dataUrl = await toPng(croquisRef.current, { 
        backgroundColor: '#ffffff', 
        quality: 1,
        pixelRatio: 2,
        width: croquisRef.current.scrollWidth,
        height: croquisRef.current.scrollHeight
      });

      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
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
      doc.text(`Fecha: ${new Date(event.date).toLocaleDateString('es-MX', { dateStyle: 'long' })}`, margin, 44);
      doc.text(`Código: #${event.code}`, margin, 49);
      doc.text(`Ubicación: ${event.location}`, margin, 54);

      // 4. Croquis Image
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Mapa de Distribución (Croquis)", margin, 65);
      
      const imgWidth = pageWidth - (margin * 2);
      const imgHeight = (croquisRef.current.offsetHeight * imgWidth) / croquisRef.current.offsetWidth;
      
      doc.addImage(dataUrl, 'PNG', margin, 70, imgWidth, imgHeight);

      // 5. Detailed Seating List
      doc.addPage();
      doc.setFontSize(16);
      doc.text("Lista Detallada por Mesas", margin, 20);

      const tableData: any[] = [];
      event.tables.forEach(table => {
        const guests = getTableGuests(table.id);
        const occupied = getOccupied(table.id);
        
        // Header for the table
        tableData.push([
          { content: `MESA: ${table.name}`, colSpan: 3, styles: { fillColor: [245, 158, 11], textColor: [0, 0, 0], fontStyle: 'bold' } }
        ]);
        tableData.push([
          { content: `Capacidad: ${table.capacity} | Ocupado: ${occupied}`, colSpan: 3, styles: { fillColor: [250, 250, 250], fontStyle: 'italic' } }
        ]);
        
        if (guests.length === 0) {
          tableData.push([{ content: "Sin invitados asignados", colSpan: 3, styles: { halign: 'center', textColor: [150, 150, 150] } }]);
        } else {
          guests.forEach(g => {
            tableData.push([
              g.name,
              g.companions > 0 ? `+${g.companions} acompañantes` : "Individual",
              g.tags?.join(", ") || "-"
            ]);
          });
        }
        // Spacer row
        tableData.push([{ content: "", colSpan: 3, styles: { cellPadding: 2, border: 0 } }]);
      });

      autoTable(doc, {
        startY: 25,
        head: [['Invitado', 'Grupo', 'Etiquetas']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59] },
        styles: { fontSize: 9 },
        margin: { top: 25 }
      });

      // 6. Footer on all pages
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${i} de ${pageCount} | Generado por ONE Event Flow`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
      }

      doc.save(`Reporte_Logistica_${event.name.replace(/\s+/g, '_')}_${event.code}.pdf`);
    } catch (err) {
      console.error('Error al generar PDF:', err);
    }
  };

  const unassigned = useMemo(() => {
    return event.guests.filter((g) => !g.tableId && g.status !== "cancelled");
  }, [event.guests]);

  const getTableGuests = (tableId: string) =>
    event.guests.filter((g) => g.tableId === tableId && g.status !== "cancelled");

  const getOccupied = (tableId: string) =>
    getTableGuests(tableId).reduce((sum, g) => sum + 1 + g.companions, 0);

  const handleDragStop = (tableId: string, d: { x: number, y: number }) => {
    onUpdateTableProps(tableId, { x: d.x, y: d.y });
  };

  const handleResizeStop = (tableId: string, ref: HTMLElement, position: { x: number, y: number }) => {
    onUpdateTableProps(tableId, {
      width: parseInt(ref.style.width, 10),
      height: parseInt(ref.style.height, 10),
      x: position.x,
      y: position.y
    });
  };

  const handleChangeShape = (tableId: string, shape: "rect" | "square" | "circle" | "oval" | "diamond" | "triangle" | "hexagon") => {
    onUpdateTableProps(tableId, { shape });
  };

  const handleChangeColor = (tableId: string, color: string) => {
    onUpdateTableProps(tableId, { color });
  };

  const handleElementDragStop = (elementId: string, d: { x: number, y: number }) => {
    onUpdateElementProps(elementId, { x: d.x, y: d.y });
  };

  const handleElementResizeStop = (elementId: string, ref: HTMLElement, position: { x: number, y: number }) => {
    onUpdateElementProps(elementId, {
      width: parseInt(ref.style.width, 10),
      height: parseInt(ref.style.height, 10),
      x: position.x,
      y: position.y
    });
  };

  const handleElementChangeShape = (elementId: string, shape: "rect" | "square" | "circle" | "line-h" | "line-v") => {
    onUpdateElementProps(elementId, { shape });
  };

  const handleElementChangeColor = (elementId: string, color: string) => {
    onUpdateElementProps(elementId, { color });
  };

  // VISTA CROQUIS
  const renderCroquis = () => {
    return (
      <div 
        className={cn(
          "relative w-full border border-border bg-muted/40 overflow-hidden transition-all duration-300",
          isFullscreen 
            ? "fixed inset-0 z-50 rounded-none bg-background/95 backdrop-blur-sm h-[100vh]" 
            : "h-[600px] rounded-2xl"
        )} 
        style={{
          backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
      >
        {/* Botones Flotantes del Croquis */}
        <div className="absolute top-4 right-4 z-20 flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportPDF}
            className="h-8 gap-2 bg-background border-border text-foreground hover:bg-muted"
          >
            <Download className="h-3.5 w-3.5 text-amber-500" /> Exportar PDF
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportImage}
            className="h-8 gap-2 bg-background border-border"
          >
            <Download className="h-3.5 w-3.5" /> Imagen
          </Button>
          <Button 
            variant="secondary" 
            size="icon" 
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="shadow-md bg-background/80 backdrop-blur"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>

        {/* Dock Inferior en Fullscreen (Solo Admin o con Permisos) */}
        {isFullscreen && canEdit && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 flex gap-3 p-3 bg-background/90 backdrop-blur-md border border-border rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-500">
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

        <div className={cn("absolute inset-0 overflow-auto", isFullscreen && "pt-12")}>
          <div ref={croquisRef} className="min-w-[2000px] min-h-[1500px] relative p-4">
            {/* RENDER MESAS */}
            {event.tables.map((table, index) => {
              const occupied = getOccupied(table.id);
              const isFull = occupied >= table.capacity;
              const isOverflown = occupied > table.capacity;
              const colorObj = COLOR_PALETTE.find(c => c.class === table.color) || COLOR_PALETTE[0];
              const guests = getTableGuests(table.id);
              const pending = guests.filter(g => g.status === "pending").length;
              const arrived = guests.filter(g => g.status === "arrived").length;
              
              const defaultWidth = 180;
              const defaultHeight = 120;
              
              const isCircle = table.shape === "circle";
              const isSquare = table.shape === "square";
              const isOval = table.shape === "oval";
              const isDiamond = table.shape === "diamond";
              const isTriangle = table.shape === "triangle";
              const isHexagon = table.shape === "hexagon";
              const isPolygonal = isDiamond || isTriangle || isHexagon;
              const forceAspect = isCircle || isSquare || isPolygonal;

              const initialX = table.x !== undefined ? table.x : (index * 40);
              const initialY = table.y !== undefined ? table.y : (index * 30);

              return (
                <Rnd
                  key={table.id}
                  default={{
                    x: initialX,
                    y: initialY,
                    width: table.width || defaultWidth,
                    height: table.height || (isCircle || isSquare ? defaultWidth : defaultHeight),
                  }}
                  minWidth={120}
                  minHeight={isCircle || isSquare ? 120 : 80}
                  lockAspectRatio={forceAspect}
                  bounds="parent"
                  dragHandleClassName="drag-handle"
                  disableDragging={role === "staff"}
                  enableResizing={role === "admin"}
                  onDragStop={(e, d) => handleDragStop(table.id, d)}
                  onResizeStop={(e, direction, ref, delta, position) => handleResizeStop(table.id, ref, position)}
                  className={cn(
                    "shadow-sm hover:shadow-md transition-shadow duration-300 z-10 flex flex-col group overflow-visible relative",
                    isCircle ? "rounded-full" : (isOval ? "rounded-[999px]" : "rounded-xl"),
                    !isPolygonal && "bg-card border-2",
                    highlightedTableId === table.id && "z-50",
                    highlightedTableId === table.id && !isPolygonal && "ring-8 ring-offset-4 ring-offset-background"
                  )}
                  style={{
                    borderColor: (!isPolygonal && highlightedTableId === table.id) 
                      ? colorObj.hex 
                      : (!isPolygonal && isFull 
                          ? (isOverflown ? "#ef4444" : "#10b981") 
                          : (!isPolygonal && table.color ? colorObj.hex + "80" : undefined)),
                    boxShadow: highlightedTableId === table.id && !isPolygonal 
                      ? `0 0 40px ${colorObj.hex}` 
                      : undefined,
                    transition: "box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
                  }}
                >
                  {isPolygonal && (
                    <div className="absolute inset-0 pointer-events-none z-[-1]" style={{ 
                        filter: highlightedTableId === table.id ? `drop-shadow(0 0 20px ${colorObj.hex})` : undefined 
                    }}>
                       <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                          <polygon 
                             points={
                               isDiamond ? "50,2 98,50 50,98 2,50" : 
                               isTriangle ? "50,2 98,98 2,98" : 
                               "25,2 75,2 98,50 75,98 25,98 2,50"
                             }
                             style={{
                               fill: "hsl(var(--card))",
                               stroke: highlightedTableId === table.id 
                                 ? colorObj.hex 
                                 : (isFull 
                                     ? (isOverflown ? "#ef4444" : "#10b981") 
                                     : (table.color ? colorObj.hex + "80" : "hsl(var(--border))")),
                               strokeWidth: 2,
                               vectorEffect: "non-scaling-stroke"
                             }}
                          />
                       </svg>
                    </div>
                  )}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className={cn(
                          "flex-1 flex flex-col items-center justify-center relative p-3 w-full h-full",
                          isCircle && "px-6"
                        )}>
                          <div className="drag-handle absolute top-0 left-0 right-0 p-2 flex items-center justify-between cursor-grab active:cursor-grabbing opacity-80 hover:opacity-100">
                             <GripVertical className={cn("h-4 w-4 text-muted-foreground/40 shrink-0", !canEdit && "hidden")} />
                             {canEdit && (
                               <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full text-muted-foreground hover:bg-muted shrink-0 z-50 relative pointer-events-auto">
                                    <Settings2 className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 z-[100]">
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
                                  <DropdownMenuSeparator />
                                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Color</DropdownMenuLabel>
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
                                  <DropdownMenuItem onClick={() => onDeleteTable(table.id)} className="text-red-500 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-950/50">
                                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar Mesa
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                               </DropdownMenu>
                             )}
                          </div>
                          <div className="text-center mt-2 pointer-events-none select-none">
                             <h5 
                              className="font-bold text-sm truncate max-w-[90%] mx-auto leading-tight mb-1"
                              style={{ color: !isFull && table.color ? colorObj.hex : undefined }}
                             >
                              {table.name}
                             </h5>
                             <div className="flex items-end justify-center gap-1">
                                <span 
                                  className="text-2xl font-bold leading-none"
                                  style={{ color: isFull ? (isOverflown ? "#ef4444" : "#10b981") : (table.color ? colorObj.hex : undefined) }}
                                >
                                  {occupied}
                                </span>
                                <span className="text-xs text-muted-foreground font-medium pb-[2px]"> / {table.capacity}</span>
                             </div>
                             
                             <Button 
                                variant="ghost" 
                                size="sm" 
                                className="mt-2 h-7 gap-1 text-[10px] uppercase font-bold pointer-events-auto hover:bg-muted"
                                onClick={() => setExpandedTableId(table.id)}
                             >
                                <Users className="h-3 w-3" />
                                Ver Invitados
                             </Button>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="p-3 w-56 flex flex-col gap-2 bg-card border-border shadow-xl">
                        <div className="flex items-center justify-between border-b border-border pb-2">
                          <span className="font-bold text-sm uppercase">Mesa {table.name}</span>
                          <Badge variant="outline" className="text-[10px]">{occupied} / {table.capacity}</Badge>
                        </div>
                        <div className="space-y-2">
                           <div className="flex justify-between text-xs">
                             <span className="text-muted-foreground">Confirmados:</span>
                             <span className="font-semibold text-blue-500">{arrived + guests.filter(g => g.status === "confirmed").length}</span>
                           </div>
                           <div className="flex justify-between text-xs">
                             <span className="text-muted-foreground text-[10px] translate-x-3">• Ya ingresaron:</span>
                             <span className="font-bold text-green-500">{arrived}</span>
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
            {event.elements && event.elements.map((element) => {
              const defaultWidth = 300;
              const defaultHeight = 200;
              const isCircle = element.shape === "circle";
              const isSquare = element.shape === "square";
              const isLineH = element.shape === "line-h";
              const isLineV = element.shape === "line-v";
              const forceAspect = isCircle || isSquare;
              
              const elementColor = COLOR_PALETTE.find(c => c.class === element.color) || COLOR_PALETTE[0];

              return (
                <Rnd
                  key={element.id}
                  default={{
                    x: element.x || 0,
                    y: element.y || 0,
                    width: element.width || (isLineV ? 8 : defaultWidth),
                    height: element.height || (isLineH ? 8 : (isCircle || isSquare ? defaultWidth : defaultHeight)),
                  }}
                  minWidth={isLineV ? 4 : (isCircle || isSquare ? 100 : 60)}
                  minHeight={isLineH ? 4 : (isCircle || isSquare ? 100 : 60)}
                  lockAspectRatio={forceAspect}
                  bounds="parent"
                  dragHandleClassName="drag-handle"
                  disableDragging={role === "staff"}
                  enableResizing={
                    role === "admin"
                      ? (isLineH ? { left: true, right: true, top: false, bottom: false, topRight: false, bottomRight: false, bottomLeft: false, topLeft: false } :
                         isLineV ? { top: true, bottom: true, left: false, right: false, topRight: false, bottomRight: false, bottomLeft: false, topLeft: false } :
                         true)
                      : false
                  }
                  onDragStop={(e, d) => handleElementDragStop(element.id, d)}
                  onResizeStop={(e, direction, ref, delta, position) => handleElementResizeStop(element.id, ref, position)}
                  className={cn(
                    "flex items-center justify-center transition-colors duration-200 z-0",
                    isLineH || isLineV ? "border-none" : "border-2 border-dashed bg-background/40 hover:bg-background/60",
                    isCircle ? "rounded-full" : "rounded-md"
                  )}
                  style={{
                    borderColor: element.color && !isLineH && !isLineV ? elementColor.hex + "80" : undefined,
                    backgroundColor: (isLineH || isLineV) && element.color ? elementColor.hex : undefined,
                    color: element.color ? elementColor.hex : undefined
                  }}
                >
                  <div className={cn("absolute inset-0 drag-handle", canEdit ? "cursor-grab active:cursor-grabbing" : "cursor-default")} />
                  {canEdit && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 bg-background shadow-sm z-50 pointer-events-auto">
                          <Settings2 className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 z-[100]">
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
                        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Color</DropdownMenuLabel>
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
                        <DropdownMenuItem onClick={() => onDeleteElement(element.id)} className="text-red-500">
                          <Trash2 className="mr-2 h-4 w-4" /> Eliminar Elemento
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {!isLineH && !isLineV && (
                    <h3 className="font-bold text-center text-lg md:text-xl pointer-events-none lowercase tracking-widest px-4 break-words opacity-60">
                      {element.name}
                    </h3>
                  )}
                </Rnd>
              );
            })}
          </div>
        </div>
        
        {!isFullscreen && (
          <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-xs bg-background/90 backdrop-blur border border-border rounded-lg p-3 shadow-sm text-xs text-muted-foreground pointer-events-none">
            {canEdit 
              ? "Clica el engrane para cambiar la figura/color. Arrastra las esquinas para cambiar el tamaño."
              : "La distribución física del croquis está en modo solo lectura para el staff."}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("space-y-6", isFullscreen && "static")}>
      {/* Top Banner & View Toggle (Solo visible si no es fullscreen) */}
      {!isFullscreen && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground">Distribución de Mesas</h3>
            <p className="text-sm text-muted-foreground">
              {event.tables.length} mesas creadas • {unassigned.reduce((s, g) => s + 1 + g.companions, 0)} lugares sin asignar
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Tabs value={view} onValueChange={(v) => setView(v as "list" | "croquis")} className="w-[200px]">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="list" className="text-xs gap-2"><LayoutGrid className="h-3.5 w-3.5" /> Lista</TabsTrigger>
                <TabsTrigger value="croquis" className="text-xs gap-2"><Map className="h-3.5 w-3.5" /> Croquis</TabsTrigger>
              </TabsList>
            </Tabs>
            {canEdit && (
              <div className="flex flex-wrap gap-2">
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

      {event.tables.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-2xl text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Sofa className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <h4 className="text-base font-semibold text-foreground mb-1">Sin mesas aún</h4>
          <p className="text-sm text-muted-foreground max-w-[250px]">Crea tu primera mesa para comenzar a acomodar a tus invitados.</p>
        </div>
      ) : (
        <div className={cn(
          "grid gap-4 items-start", 
          !isFullscreen ? "md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"
        )}>
          
          {/* Zona de no asignados */}
          {unassigned.length > 0 && !isFullscreen && (
            <div className="bg-card border border-amber-500/30 rounded-2xl p-4 shadow-sm xl:sticky xl:top-[120px] order-last xl:order-none col-span-full xl:col-span-1">
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <h4 className="font-semibold text-foreground text-sm flex-1">Fila de espera</h4>
                <Badge variant="outline" className="bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20">
                  {unassigned.length} grupos
                </Badge>
              </div>
              
              <div className="space-y-2 max-h-[60vh] xl:max-h-[calc(100vh-280px)] overflow-y-auto pr-2 scrollbar-hide">
                {unassigned.map((g) => (
                  <div key={g.id} className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/50 transition-colors">
                    <div className="min-w-0 pr-3">
                      <p className="text-sm font-medium text-foreground truncate">{g.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Total: {1 + g.companions} lugar{1 + g.companions > 1 ? 'es' : ''}
                      </p>
                    </div>
                    <Select onValueChange={(tableId) => onAssignGuest(g.id, tableId)} disabled={!canManageGuests}>
                      <SelectTrigger className="h-8 w-[100px] text-xs bg-card">
                        <SelectValue placeholder="Asignar..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {event.tables.map(t => {
                          const occ = getOccupied(t.id);
                          const space = t.capacity - occ;
                          const needed = 1 + g.companions;
                          const fits = space >= needed;
                          
                          return (
                            <SelectItem key={t.id} value={t.id} disabled={!fits} className="text-xs">
                              {t.name} {fits ? `(${space} lib)` : ''}
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
          <div className={cn("items-start w-full", unassigned.length > 0 && !isFullscreen ? "col-span-full xl:col-span-2" : "col-span-full")}>
            
            {view === "list" && !isFullscreen ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {event.tables.map((table) => {
                  const occupied = getOccupied(table.id);
                  const guestsInTable = getTableGuests(table.id);
                  const pct = Math.min((occupied / table.capacity) * 100, 100);
                  const isFull = occupied >= table.capacity;
                  const isOverflown = occupied > table.capacity;
                  const colorObj = COLOR_PALETTE.find(c => c.class === table.color) || COLOR_PALETTE[0];

                  return (
                    <div 
                      key={table.id} 
                      className="group relative rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1.5"
                    >
                      <div 
                        className={cn("h-2.5 w-full", isOverflown ? "bg-red-500" : (isFull ? "bg-emerald-500" : ""))} 
                        style={{ backgroundColor: !isFull ? colorObj.hex : undefined }}
                      />
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-5">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-black text-foreground text-xl truncate tracking-tight group-hover:text-amber-600 transition-colors">
                              {table.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 px-0.5">
                              <Badge className={cn(
                                "text-[10px] font-black uppercase tracking-tighter px-2 h-5 border-none shadow-sm",
                                isOverflown ? "bg-red-500 text-white animate-pulse" : 
                                (isFull ? "bg-emerald-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500")
                              )}>
                                {occupied} / {table.capacity} OCUPADOS
                              </Badge>
                            </div>
                          </div>
                          {canEdit && (
                            <button 
                              className="h-9 w-9 rounded-xl flex items-center justify-center text-slate-200 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100" 
                              onClick={(e) => { e.stopPropagation(); onDeleteTable(table.id); }}
                              title="Eliminar mesa"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          )}
                        </div>

                        <div className="h-2 w-full bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden mb-6 shadow-inner">
                          <div 
                            className={cn("h-full rounded-full transition-all duration-700 ease-out relative", isOverflown ? "bg-red-500" : (isFull ? "bg-emerald-500" : "bg-amber-400"))} 
                            style={{ 
                              width: `${pct}%`,
                              backgroundColor: (!isFull && !isOverflown) ? colorObj.hex : undefined 
                            }} 
                          >
                            <div className="absolute inset-0 bg-white/20 animate-pulse" />
                          </div>
                        </div>

                        <div className="space-y-2 min-h-[80px] max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
                          <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-3 ml-1">Invitados Asignados</div>
                          {guestsInTable.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 opacity-40">
                               <Users className="h-6 w-6 mb-2" />
                               <p className="text-[10px] font-bold uppercase">Mesa vacía</p>
                            </div>
                          ) : (
                            guestsInTable.map((g) => (
                              <div key={g.id} className="flex items-center justify-between group/guest rounded-2xl p-3 bg-slate-50/50 dark:bg-slate-800/30 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-sm">
                                <div className="flex items-center gap-3 min-w-0 pr-2">
                                  <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-xs font-black text-slate-400">
                                    {g.name.charAt(0)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold text-foreground truncate">{g.name}</p>
                                    <p className="text-[10px] font-black text-amber-600/70 uppercase tracking-tighter leading-none mt-0.5">
                                       {g.companions > 0 ? `+${g.companions} acompañantes` : 'Sin acompañantes'}
                                    </p>
                                  </div>
                                </div>
                                {canManageGuests && (
                                  <button 
                                    className="h-8 w-8 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all shrink-0 flex items-center justify-center opacity-0 group-hover/guest:opacity-100" 
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

      <TableForm open={showTableForm} onClose={() => setShowTableForm(false)} onSubmit={onAddTable} />
      <ElementForm open={showElementForm} onClose={() => setShowElementForm(false)} onSubmit={onAddElement} />

      {/* MODAL DE INVITADOS PARA EL CROQUIS */}
      <Dialog open={!!expandedTableId} onOpenChange={(open) => !open && setExpandedTableId(null)}>
        <DialogContent className="sm:max-w-[425px]">
          {(() => {
            const table = event.tables.find(t => t.id === expandedTableId);
            if (!table) return null;
            const tableGuests = getTableGuests(table.id);
            const occupied = getOccupied(table.id);
            const tableColor = COLOR_PALETTE.find(c => c.class === table.color) || COLOR_PALETTE[0];
            const isFull = occupied >= table.capacity;

            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <div 
                      className="h-3 w-3 rounded-full shadow-sm" 
                      style={{ backgroundColor: tableColor.hex }}
                    />
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-semibold">Mesa</Badge>
                  </div>
                  <DialogTitle className="text-2xl font-bold flex items-center justify-between">
                    {table.name}
                    <span className={cn(
                      "text-lg font-mono",
                      isFull ? "text-emerald-500" : "text-muted-foreground"
                    )}>
                      {occupied} / {table.capacity}
                    </span>
                  </DialogTitle>
                  <DialogDescription>
                    Distribución de invitados asignados.
                  </DialogDescription>
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
                                {guest.companions > 0 ? `+${guest.companions} acomp.` : 'Solo'}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between mt-3">
                              <div className="flex items-center gap-2">
                                <Users className="h-3 w-3 text-muted-foreground" />
                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                                  {guest.companions + 1} lugares ocupados
                                </span>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 text-[10px] font-bold text-red-500 hover:text-white hover:bg-red-500 rounded-full px-3 transition-colors"
                                onClick={() => onAssignGuest(guest.id, null)}
                              >
                                Quitar de mesa
                              </Button>
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
                  <Button 
                    className="w-full sm:w-auto font-bold rounded-xl"
                    onClick={() => setExpandedTableId(null)}
                  >
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
