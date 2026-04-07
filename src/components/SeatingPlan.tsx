import { useState, useMemo } from "react";
import { Rnd } from "react-rnd";
import { Plus, Trash2, X, Users, GripVertical, Sofa, LayoutGrid, Map, Maximize2, Minimize2, Circle, Square, RectangleHorizontal, Settings2, Info } from "lucide-react";
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
}

export function SeatingPlan({ 
  event, onAddTable, onDeleteTable, onUpdateTableProps, onAssignGuest,
  onAddElement, onDeleteElement, onUpdateElementProps
}: SeatingPlanProps) {
  const [showTableForm, setShowTableForm] = useState(false);
  const [showElementForm, setShowElementForm] = useState(false);
  const [view, setView] = useState<"list" | "croquis">("list");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [expandedTableId, setExpandedTableId] = useState<string | null>(null);

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

  const handleChangeShape = (tableId: string, shape: "rect" | "square" | "circle") => {
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

  const handleElementChangeShape = (elementId: string, shape: "rect" | "square" | "circle") => {
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
            variant="secondary" 
            size="icon" 
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="shadow-md bg-background/80 backdrop-blur"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>

        {/* Dock Inferior en Fullscreen */}
        {isFullscreen && (
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
          <div className="min-w-[2000px] min-h-[1500px] relative p-4">
            {/* RENDER MESAS */}
            {event.tables.map((table, index) => {
              const occupied = getOccupied(table.id);
              const isFull = occupied >= table.capacity;
              const isOverflown = occupied > table.capacity;
              
              const defaultWidth = 180;
              const defaultHeight = 120;
              
              const isCircle = table.shape === "circle";
              const isSquare = table.shape === "square";
              const forceAspect = isCircle || isSquare;

              const tableColor = COLOR_PALETTE.find(c => c.class === table.color) || COLOR_PALETTE[0];

              // Fallback staggered position if both x and y are missing/zero
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
                  onDragStop={(e, d) => handleDragStop(table.id, d)}
                  onResizeStop={(e, direction, ref, delta, position) => handleResizeStop(table.id, ref, position)}
                  className={cn(
                    "bg-card border-2 shadow-sm hover:shadow-md transition-shadow duration-200 z-10 flex flex-col group overflow-visible",
                    isCircle ? "rounded-full" : "rounded-xl"
                  )}
                  style={{
                    borderColor: isFull 
                      ? (isOverflown ? "#ef4444" : "#10b981") 
                      : (table.color ? tableColor.hex + "80" : undefined)
                  }}
                >
                  <div className={cn(
                    "flex-1 flex flex-col items-center justify-center relative p-3 w-full h-full",
                     isCircle && "px-6"
                  )}>
                    <div className="drag-handle absolute top-0 left-0 right-0 p-2 flex items-center justify-between cursor-grab active:cursor-grabbing opacity-80 hover:opacity-100">
                       <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
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
                    </div>
                    <div className="text-center mt-2 pointer-events-none select-none">
                       <h5 
                        className="font-bold text-sm truncate max-w-[90%] mx-auto leading-tight mb-1"
                        style={{ color: !isFull && table.color ? tableColor.hex : undefined }}
                       >
                        {table.name}
                       </h5>
                       <div className="flex items-end justify-center gap-1">
                          <span 
                            className="text-2xl font-bold leading-none"
                            style={{ color: isFull ? (isOverflown ? "#ef4444" : "#10b981") : (table.color ? tableColor.hex : undefined) }}
                          >
                            {occupied}
                          </span>
                          <span className="text-xs text-muted-foreground font-medium pb-[2px]"> / {table.capacity}</span>
                       </div>
                       
                       {/* BOTÓN PARA ABRIR MODAL DE INVITADOS */}
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
                </Rnd>
              );
            })}

            {/* RENDER ELEMENTOS ESTRUCTURALES */}
            {event.elements && event.elements.map((element) => {
              const defaultWidth = 300;
              const defaultHeight = 200;
              const isCircle = element.shape === "circle";
              const isSquare = element.shape === "square";
              const forceAspect = isCircle || isSquare;
              
              const elementColor = COLOR_PALETTE.find(c => c.class === element.color) || COLOR_PALETTE[0];

              return (
                <Rnd
                  key={element.id}
                  default={{
                    x: element.x || 0,
                    y: element.y || 0,
                    width: element.width || defaultWidth,
                    height: element.height || (isCircle || isSquare ? defaultWidth : defaultHeight),
                  }}
                  minWidth={100}
                  minHeight={isCircle || isSquare ? 100 : 60}
                  lockAspectRatio={forceAspect}
                  bounds="parent"
                  dragHandleClassName="drag-handle"
                  onDragStop={(e, d) => handleElementDragStop(element.id, d)}
                  onResizeStop={(e, direction, ref, delta, position) => handleElementResizeStop(element.id, ref, position)}
                  className={cn(
                    "flex items-center justify-center border-2 border-dashed bg-background/40 hover:bg-background/60 transition-colors duration-200 z-0",
                    isCircle ? "rounded-full" : "rounded-md"
                  )}
                  style={{
                    borderColor: element.color ? elementColor.hex + "80" : undefined,
                    color: element.color ? elementColor.hex : undefined
                  }}
                >
                  <div className="absolute inset-0 drag-handle cursor-grab active:cursor-grabbing" />
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

                  <h3 className="font-bold text-center text-lg md:text-xl pointer-events-none lowercase tracking-widest px-4 break-words opacity-60">
                    {element.name}
                  </h3>
                </Rnd>
              );
            })}
          </div>
        </div>
        
        {!isFullscreen && (
          <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-xs bg-background/90 backdrop-blur border border-border rounded-lg p-3 shadow-sm text-xs text-muted-foreground pointer-events-none">
            Clica el engrane para cambiar la figura/color. Arrastra las esquinas para cambiar el tamaño.
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
            <Button 
              onClick={() => setShowElementForm(true)} 
              variant="outline"
              className="gap-2 font-semibold shadow-sm border-dashed"
            >
              <Plus className="h-4 w-4" /> 
              <span className="hidden sm:inline">Añadir Elemento</span>
              <span className="sm:hidden">Elem</span>
            </Button>
            <Button 
              onClick={() => setShowTableForm(true)} 
              className="gap-2 bg-amber-400 hover:bg-amber-300 text-black font-semibold shadow-sm"
            >
              <Plus className="h-4 w-4" /> 
              <span className="hidden sm:inline">Nueva Mesa</span>
              <span className="sm:hidden">Mesa</span>
            </Button>
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
                    <Select onValueChange={(tableId) => onAssignGuest(g.id, tableId)}>
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
              /* VISTA DE LISTA (Grilla de Mesas) */
              <div className="grid gap-4 sm:grid-cols-2">
                {event.tables.map((table) => {
                  const occupied = getOccupied(table.id);
                  const guestsInTable = getTableGuests(table.id);
                  const pct = Math.min((occupied / table.capacity) * 100, 100);
                  const isFull = occupied >= table.capacity;
                  const isOverflown = occupied > table.capacity;

                  return (
                    <div key={table.id} className="relative rounded-2xl bg-card border border-border overflow-hidden transition-all hover:shadow-md hover:border-border/80">
                      <div className={cn("h-1.5 w-full", isFull ? (isOverflown ? "bg-red-500" : "bg-emerald-500") : "bg-blue-500")} />
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className="font-bold text-foreground truncate max-w-[200px]" title={table.name}>{table.name}</h4>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                              <Users className="h-3.5 w-3.5" />
                              <span className={cn("font-medium", isFull ? (isOverflown ? "text-red-500" : "text-emerald-500") : "text-foreground")}>
                                {occupied}
                              </span> 
                              / {table.capacity} lugares
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10" onClick={() => onDeleteTable(table.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden mb-5">
                          <div 
                            className={cn("h-full rounded-full transition-all duration-500", isOverflown ? "bg-red-500" : (isFull ? "bg-emerald-500" : "bg-blue-500"))} 
                            style={{ width: `${pct}%` }} 
                          />
                        </div>

                        <div className="space-y-1.5 min-h-[60px] max-h-[150px] overflow-y-auto pr-1">
                          {guestsInTable.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-4 italic">Mesa vacía</p>
                          ) : (
                            guestsInTable.map((g) => (
                              <div key={g.id} className="flex items-center justify-between group rounded-lg p-1.5 -mx-1.5 hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-2 min-w-0 pr-2">
                                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{g.name}</p>
                                    <p className="text-[10px] text-muted-foreground leading-none mt-0.5 max-w-[150px] truncate">
                                       {g.companions > 0 ? `+${g.companions} acomp.` : 'Solo'}
                                    </p>
                                  </div>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0" 
                                  onClick={() => onAssignGuest(g.id, null)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
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
