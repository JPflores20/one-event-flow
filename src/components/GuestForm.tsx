import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
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
  const [tags, setTags] = useState<string[]>(initial?.tags || []);
  const [customTag, setCustomTag] = useState("");

  const PREDEFINED_TAGS = ["Familia", "Amigos", "VIP", "Trabajo", "Proveedor", "Vegano", "Vegetariano", "Gluten-Free"];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      phone: phone.trim(),
      status,
      companions: parseInt(companions) || 0,
      tableId: initial?.tableId ?? null,
      tags: tags,
    });
    setName("");
    setPhone("");
    setStatus("pending");
    setCompanions("0");
    setTags([]);
    onClose();
  };

  const toggleTag = (tag: string) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const addCustomTag = () => {
    if (customTag.trim() && !tags.includes(customTag.trim())) {
      setTags(prev => [...prev, customTag.trim()]);
      setCustomTag("");
    }
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
          <div className="space-y-3">
            <Label>Categorías / Etiquetas</Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map(tag => (
                <Badge key={tag} className="gap-1 bg-amber-400 text-black hover:bg-amber-300">
                  {tag}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => toggleTag(tag)} />
                </Badge>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {PREDEFINED_TAGS.filter(t => !tags.includes(t)).map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className="text-[10px] py-1 px-2 rounded-md border border-border bg-card hover:bg-muted text-muted-foreground transition-all"
                >
                  {tag}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input 
                placeholder="Otra etiqueta..." 
                value={customTag} 
                onChange={(e) => setCustomTag(e.target.value)}
                className="h-8 text-xs"
                onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); addCustomTag(); } }}
              />
              <Button type="button" size="sm" variant="outline" className="h-8 px-2" onClick={addCustomTag}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
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
