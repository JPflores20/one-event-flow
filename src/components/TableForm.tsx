import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TableFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, capacity: number, shape?: "rect" | "square" | "circle" | "oval" | "diamond" | "triangle" | "hexagon" | "l-shape" | "l-shape-tl" | "l-shape-tr" | "l-shape-br") => void;
  initialData?: { name?: string, capacity?: number, shape?: string } | null;
}

export function TableForm({ open, onClose, onSubmit, initialData }: TableFormProps) {
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("8");
  const [shape, setShape] = useState<any>("rect");

  useEffect(() => {
    if (open) {
      if (initialData) {
        setName(initialData.name || "");
        setCapacity(initialData.capacity?.toString() || "8");
        setShape(initialData.shape || "rect");
      } else {
        setName("");
        setCapacity("8");
        setShape("rect");
      }
    }
  }, [open, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim(), parseInt(capacity) || 8, shape);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-foreground">{initialData ? "Editar Mesa" : "Nueva Mesa"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="table-name" className="text-foreground">Nombre / Número de mesa</Label>
            <Input 
              id="table-name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Ej: Mesa VIP, Mesa 1" 
              className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-amber-400"
              required 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="table-capacity" className="text-foreground">Capacidad máxima</Label>
            <Input 
              id="table-capacity" 
              type="number" 
              min="1" 
              value={capacity} 
              onChange={(e) => setCapacity(e.target.value)} 
              className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-amber-400"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="table-shape" className="text-foreground">Forma de la mesa</Label>
            <Select value={shape} onValueChange={(val: any) => setShape(val)}>
              <SelectTrigger className="bg-background border-border focus:border-amber-400">
                <SelectValue placeholder="Selecciona una forma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rect">Rectángulo</SelectItem>
                <SelectItem value="square">Cuadrado</SelectItem>
                <SelectItem value="circle">Círculo</SelectItem>
                <SelectItem value="oval">Óvalo</SelectItem>
                <SelectItem value="diamond">Diamante</SelectItem>
                <SelectItem value="triangle">Triángulo</SelectItem>
                <SelectItem value="hexagon">Hexágono</SelectItem>
                <SelectItem value="l-shape">Forma en L (Abajo Izquierda)</SelectItem>
                <SelectItem value="l-shape-br">Forma en L (Abajo Derecha)</SelectItem>
                <SelectItem value="l-shape-tl">Forma en L (Arriba Izquierda)</SelectItem>
                <SelectItem value="l-shape-tr">Forma en L (Arriba Derecha)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="border-border text-foreground hover:bg-muted">
              Cancelar
            </Button>
            <Button type="submit" className="bg-amber-400 hover:bg-amber-300 text-black font-semibold">
              {initialData ? "Guardar Cambios" : "Crear Mesa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
