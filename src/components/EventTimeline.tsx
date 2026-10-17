import { useState, useMemo } from "react";
import {
  Clock,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  CalendarDays,
  Pencil,
  UserCheck,
  StickyNote,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { EventData, TimelineItem } from "@/hooks/useEventStore";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface EventTimelineProps {
  event: EventData;
  onUpdateTimeline: (eventId: string, timeline: TimelineItem[]) => void;
}

const RESPONSIBLE_PRESETS = ["Coordinación", "Catering", "DJ / Audio", "Iluminación", "Fotografía", "Anfitriones"];

export function EventTimeline({ event, onUpdateTimeline }: EventTimelineProps) {
  const { role, permissions } = useAuth();
  const canEdit = role === "admin" || permissions?.canEditTimeline;
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [time, setTime] = useState("");
  const [activity, setActivity] = useState("");
  const [responsible, setResponsible] = useState("");
  const [notes, setNotes] = useState("");

  const timeline = useMemo(
    () => [...(event.timeline || [])].sort((a, b) => a.time.localeCompare(b.time)),
    [event.timeline]
  );

  const nextPendingId = useMemo(() => {
    return timeline.find((item) => !item.completed)?.id ?? null;
  }, [timeline]);

  const completedCount = useMemo(() => timeline.filter((i) => i.completed).length, [timeline]);
  const completionPct = timeline.length > 0 ? Math.round((completedCount / timeline.length) * 100) : 0;

  const handleOpenCreate = () => {
    setEditingId(null);
    setTime("");
    setActivity("");
    setResponsible("");
    setNotes("");
    setShowModal(true);
  };

  const handleOpenEdit = (item: TimelineItem) => {
    setEditingId(item.id);
    setTime(item.time);
    setActivity(item.activity);
    setResponsible(item.responsible || "");
    setNotes(item.notes || "");
    setShowModal(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !time || !activity.trim()) return;

    let newTimeline: TimelineItem[];
    if (editingId) {
      newTimeline = (event.timeline || []).map((item) =>
        item.id === editingId
          ? {
              ...item,
              time,
              activity: activity.trim(),
              responsible: responsible.trim() || undefined,
              notes: notes.trim() || undefined,
            }
          : item
      );
    } else {
      const newItem: TimelineItem = {
        id: crypto.randomUUID(),
        time,
        activity: activity.trim(),
        completed: false,
        responsible: responsible.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      newTimeline = [...(event.timeline || []), newItem];
    }

    newTimeline.sort((a, b) => a.time.localeCompare(b.time));
    onUpdateTimeline(event.id, newTimeline);
    setShowModal(false);
    setEditingId(null);
  };

  const handleDeleteItem = (id: string) => {
    if (!canEdit) return;
    const newTimeline = (event.timeline || []).filter((item) => item.id !== id);
    onUpdateTimeline(event.id, newTimeline);
  };

  const toggleComplete = (id: string) => {
    if (!canEdit) return;
    const newTimeline = (event.timeline || []).map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    onUpdateTimeline(event.id, newTimeline);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Cronograma del Evento</h2>
          <p className="text-sm text-muted-foreground">
            Define los momentos clave, responsables y notas operativas del minuto a minuto.
          </p>
        </div>
        {canEdit && (
          <Button
            onClick={handleOpenCreate}
            className="bg-amber-400 hover:bg-amber-300 text-black font-semibold gap-2"
          >
            <Plus className="h-4 w-4" /> Agregar Actividad
          </Button>
        )}
      </div>

      {timeline.length > 0 && (
        <div className="p-4 rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold mb-2">
            <span className="uppercase tracking-wider text-muted-foreground">Avance del Cronograma</span>
            <span className="text-foreground">
              {completedCount} / {timeline.length} completadas ({completionPct}%)
            </span>
          </div>
          <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-green-500 transition-all duration-500"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>
      )}

      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-[17px] top-2 bottom-2 w-0.5 bg-border hidden sm:block" />

        <div className="space-y-6">
          {timeline.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-border rounded-3xl">
              <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold text-foreground">No hay actividades</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                Comienza agregando los horarios principales del evento.
              </p>
            </div>
          ) : (
            timeline.map((item) => {
              const isNext = item.id === nextPendingId;
              return (
                <div key={item.id} className="relative flex items-start gap-4 sm:gap-8 group">
                  <div className="flex items-center justify-center p-1 bg-background z-10">
                    <button
                      onClick={() => toggleComplete(item.id)}
                      disabled={!canEdit}
                      className={cn(
                        "rounded-full transition-all duration-300",
                        item.completed
                          ? "text-green-500 scale-110"
                          : isNext
                            ? "text-amber-500 scale-105"
                            : "text-muted-foreground/30 hover:text-amber-500"
                      )}
                      aria-label={item.completed ? "Marcar como pendiente" : "Marcar como completada"}
                    >
                      {item.completed ? <CheckCircle2 className="h-9 w-9" /> : <Circle className="h-9 w-9" />}
                    </button>
                  </div>

                  <div
                    className={cn(
                      "flex-1 p-5 rounded-2xl border transition-all duration-300",
                      item.completed
                        ? "bg-muted/50 border-transparent opacity-60"
                        : isNext
                          ? "bg-card border-amber-400/70 ring-2 ring-amber-400/20 shadow-md"
                          : "bg-card border-border shadow-sm group-hover:border-amber-400/40"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Clock className="h-4 w-4 text-amber-500" />
                        <span className="text-lg font-bold text-foreground">{item.time}</span>
                        {isNext && (
                          <Badge className="bg-amber-400 text-black font-black text-[9px] uppercase gap-1 border-none">
                            <Sparkles className="h-2.5 w-2.5" /> Siguiente hito
                          </Badge>
                        )}
                        {item.responsible && (
                          <Badge variant="outline" className="text-[10px] font-semibold gap-1">
                            <UserCheck className="h-3 w-3 text-amber-500" />
                            {item.responsible}
                          </Badge>
                        )}
                      </div>
                      {canEdit && (
                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="text-muted-foreground/60 hover:text-amber-500 p-1.5 rounded-lg hover:bg-muted"
                            aria-label="Editar actividad"
                            title="Editar actividad"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-muted-foreground/60 hover:text-red-500 p-1.5 rounded-lg hover:bg-muted"
                            aria-label="Eliminar actividad"
                            title="Eliminar actividad"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <h4 className={cn("font-semibold text-base", item.completed && "line-through")}>
                      {item.activity}
                    </h4>
                    {item.notes && (
                      <p className="mt-2 text-xs text-muted-foreground flex items-start gap-1.5 bg-muted/40 p-2.5 rounded-xl">
                        <StickyNote className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <span>{item.notes}</span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingId ? "Editar Actividad" : "Nueva Actividad"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveItem} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="time">Hora</Label>
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="bg-background border-border"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="responsible">Responsable</Label>
                <Input
                  id="responsible"
                  placeholder="Ej: DJ, Catering..."
                  value={responsible}
                  onChange={(e) => setResponsible(e.target.value)}
                  className="bg-background border-border"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {RESPONSIBLE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setResponsible(preset)}
                  className={cn(
                    "text-[10px] px-2 py-1 rounded-md border transition-colors",
                    responsible === preset
                      ? "bg-amber-400 text-black border-amber-500 font-bold"
                      : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="activity">Descripción de la actividad</Label>
              <Input
                id="activity"
                placeholder="Ej: Recepción de invitados, Vals, Cena..."
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
                className="bg-background border-border"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeline-notes">Notas operativas (opcional)</Label>
              <Textarea
                id="timeline-notes"
                placeholder="Indicaciones especiales de audio, iluminación o logística..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[60px] text-xs bg-background border-border"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-amber-400 hover:bg-amber-300 text-black font-semibold">
                {editingId ? "Guardar Cambios" : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
