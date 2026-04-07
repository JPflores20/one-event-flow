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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva Mesa</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="table-name">Nombre de la mesa</Label>
            <Input id="table-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Mesa VIP, Mesa 1" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="table-capacity">Capacidad máxima</Label>
            <Input id="table-capacity" type="number" min="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Crear Mesa</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
