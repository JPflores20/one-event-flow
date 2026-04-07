import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TableFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, capacity: number) => void;
}

export function TableForm({ open, onClose, onSubmit }: TableFormProps) {
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("8");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim(), parseInt(capacity) || 8);
    setName("");
    setCapacity("8");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-foreground">Nueva Mesa</DialogTitle>
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
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="border-border text-foreground hover:bg-muted">
              Cancelar
            </Button>
            <Button type="submit" className="bg-amber-400 hover:bg-amber-300 text-black font-semibold">
              Crear Mesa
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
