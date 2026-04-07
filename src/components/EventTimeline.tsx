import { useState } from "react";
import { Clock, Plus, Trash2, CheckCircle2, Circle, GripVertical, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { EventData, TimelineItem } from "@/hooks/useEventStore";
import { cn } from "@/lib/utils";

interface EventTimelineProps {
  event: EventData;
  onUpdateTimeline: (eventId: string, timeline: TimelineItem[]) => void;
}

export function EventTimeline({ event, onUpdateTimeline }: EventTimelineProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [time, setTime] = useState("");
  const [activity, setActivity] = useState("");

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!time || !activity) return;
    
    const newItem: TimelineItem = {
      id: crypto.randomUUID(),
      time,
      activity,
      completed: false
    };
    
    const newTimeline = [...(event.timeline || []), newItem].sort((a, b) => a.time.localeCompare(b.time));
    onUpdateTimeline(event.id, newTimeline);
    setTime("");
    setActivity("");
    setShowAdd(false);
  };

  const handleDeleteItem = (id: string) => {
    const newTimeline = event.timeline.filter(item => item.id !== id);
    onUpdateTimeline(event.id, newTimeline);
  };

  const toggleComplete = (id: string) => {
    const newTimeline = event.timeline.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    onUpdateTimeline(event.id, newTimeline);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Cronograma del Evento</h2>
          <p className="text-sm text-muted-foreground">Define los momentos clave de la logística.</p>
        </div>
        <Button 
          onClick={() => setShowAdd(true)}
          className="bg-amber-400 hover:bg-amber-300 text-black font-semibold gap-2"
        >
          <Plus className="h-4 w-4" /> Agregar Actividad
        </Button>
      </div>

      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-[17px] top-2 bottom-2 w-0.5 bg-border hidden sm:block" />

        <div className="space-y-6">
          {(!event.timeline || event.timeline.length === 0) ? (
            <div className="py-20 text-center border-2 border-dashed border-border rounded-3xl">
              <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold text-foreground">No hay actividades</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                Comienza agregando los horarios principales del evento.
              </p>
            </div>
          ) : (
            event.timeline.map((item, index) => (
              <div key={item.id} className="relative flex items-start gap-4 sm:gap-8 group">
                <div className="hidden sm:flex items-center justify-center p-1 bg-background z-10">
                  <button 
                    onClick={() => toggleComplete(item.id)}
                    className={cn(
                      "rounded-full transition-all duration-300",
                      item.completed 
                        ? "text-green-500 scale-110" 
                        : "text-muted-foreground/30 hover:text-amber-500"
                    )}
                  >
                    {item.completed ? <CheckCircle2 className="h-9 w-9" /> : <Circle className="h-9 w-9" />}
                  </button>
                </div>

                <div className={cn(
                  "flex-1 p-5 rounded-2xl border transition-all duration-300",
                  item.completed 
                    ? "bg-muted/50 border-transparent opacity-60" 
                    : "bg-card border-border shadow-sm group-hover:border-amber-400/40"
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-500" />
                      <span className="text-lg font-bold text-foreground">{item.time}</span>
                    </div>
                    <button 
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-muted-foreground/40 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <h4 className={cn(
                    "font-semibold text-base",
                    item.completed && "line-through"
                  )}>
                    {item.activity}
                  </h4>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Nueva Actividad</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddItem} className="space-y-4">
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
              <Label htmlFor="activity">Actividad / Momento</Label>
              <Input
                id="activity"
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
                placeholder="Ej: Recepción de Invitados"
                className="bg-background border-border"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-amber-400 hover:bg-amber-300 text-black font-semibold">
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
