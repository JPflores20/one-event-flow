import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Guest } from "@/hooks/useEventStore";

interface GuestFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (guest: Omit<Guest, "id">) => void;
  initial?: Guest;
}

export function GuestForm({ open, onClose, onSubmit, initial }: GuestFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [status, setStatus] = useState<Guest["status"]>(initial?.status ?? "pending");
  const [companions, setCompanions] = useState(initial?.companions?.toString() ?? "0");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      phone: phone.trim(),
      status,
      companions: parseInt(companions) || 0,
      tableId: initial?.tableId ?? null,
    });
    setName("");
    setPhone("");
    setStatus("pending");
    setCompanions("0");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar Invitado" : "Nuevo Invitado"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="guest-name">Nombre completo</Label>
            <Input id="guest-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del invitado" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guest-phone">Teléfono</Label>
            <Input id="guest-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+52 555 123 4567" />
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as Guest["status"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="guest-companions">Acompañantes</Label>
            <Input id="guest-companions" type="number" min="0" value={companions} onChange={(e) => setCompanions(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Guardar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
