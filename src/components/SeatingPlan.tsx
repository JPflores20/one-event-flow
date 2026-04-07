import { useState, useMemo } from "react";
import { Plus, Trash2, X, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableForm } from "./TableForm";
import type { EventData, Guest } from "@/hooks/useEventStore";

interface SeatingPlanProps {
  event: EventData;
  onAddTable: (name: string, capacity: number) => void;
  onDeleteTable: (tableId: string) => void;
  onAssignGuest: (guestId: string, tableId: string | null) => void;
}

export function SeatingPlan({ event, onAddTable, onDeleteTable, onAssignGuest }: SeatingPlanProps) {
  const [showForm, setShowForm] = useState(false);

  const unassigned = useMemo(
    () => event.guests.filter((g) => !g.tableId),
    [event.guests]
  );

  const getTableGuests = (tableId: string) =>
    event.guests.filter((g) => g.tableId === tableId);

  const getOccupied = (tableId: string) =>
    getTableGuests(tableId).reduce((sum, g) => sum + 1 + g.companions, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Mesas ({event.tables.length})</h3>
        <Button onClick={() => setShowForm(true)} className="gap-2 bg-accent-gold hover:bg-accent-gold/90 text-primary-foreground">
          <Plus className="h-4 w-4" /> Nueva Mesa
        </Button>
      </div>

      {/* Unassigned guests */}
      {unassigned.length > 0 && (
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sin asignar ({unassigned.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {unassigned.map((g) => (
              <Badge key={g.id} variant="outline" className="text-xs">
                {g.name} {g.companions > 0 && `+${g.companions}`}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tables grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {event.tables.map((table) => {
          const occupied = getOccupied(table.id);
          const guests = getTableGuests(table.id);
          const pct = Math.min((occupied / table.capacity) * 100, 100);
          const full = occupied >= table.capacity;

          return (
            <Card key={table.id}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">{table.name}</CardTitle>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Users className="h-3 w-3" />
                    {occupied}/{table.capacity} asientos
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => onDeleteTable(table.id)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={pct} className={`h-2 ${full ? "[&>div]:bg-destructive" : "[&>div]:bg-accent-gold"}`} />

                {/* Assigned guests */}
                <div className="space-y-1">
                  {guests.map((g) => (
                    <div key={g.id} className="flex items-center justify-between text-sm">
                      <span>{g.name} {g.companions > 0 && <span className="text-muted-foreground">+{g.companions}</span>}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onAssignGuest(g.id, null)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Assign dropdown */}
                {!full && unassigned.length > 0 && (
                  <Select onValueChange={(guestId) => onAssignGuest(guestId, table.id)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Asignar invitado..." />
                    </SelectTrigger>
                    <SelectContent>
                      {unassigned.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name} {g.companions > 0 && `+${g.companions}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {event.tables.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No hay mesas creadas. Crea una para comenzar a asignar invitados.
        </div>
      )}

      <TableForm open={showForm} onClose={() => setShowForm(false)} onSubmit={onAddTable} />
    </div>
  );
}
