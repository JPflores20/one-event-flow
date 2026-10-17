import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import type { Guest, EventTable } from "@/hooks/useEventStore";

interface GuestFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (guest: Omit<Guest, "id">) => void;
  initial?: Guest;
  tables?: EventTable[];
}

export function GuestForm({ open, onClose, onSubmit, initial, tables = [] }: GuestFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [status, setStatus] = useState<Guest["status"]>(initial?.status ?? "pending");
  const [companions, setCompanions] = useState(initial?.companions?.toString() ?? "0");
  const [arrivedCompanions, setArrivedCompanions] = useState(
    initial?.arrivedCompanions !== undefined
      ? initial.arrivedCompanions.toString()
      : (initial?.companions?.toString() ?? "0")
  );
  const [tableId, setTableId] = useState<string>(initial?.tableId ?? "none");
  const [tags, setTags] = useState<string[]>(initial?.tags || []);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [customTag, setCustomTag] = useState("");

  const PREDEFINED_TAGS = [
    "Familia",
    "Amigos",
    "VIP",
    "Trabajo",
    "Proveedor",
    "Vegano",
    "Vegetariano",
    "Gluten-Free",
  ];

  const totalCompanionsNum = Math.max(0, parseInt(companions, 10) || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const parsedArrivedComp =
      status === "arrived"
        ? Math.min(Math.max(0, parseInt(arrivedCompanions, 10) || 0), totalCompanionsNum)
        : undefined;

    onSubmit({
      name: name.trim(),
      phone: phone.trim(),
      status,
      companions: totalCompanionsNum,
      ...(parsedArrivedComp !== undefined ? { arrivedCompanions: parsedArrivedComp } : {}),
      tableId: tableId === "none" ? null : tableId,
      tags,
      notes: notes.trim() || undefined,
    });
    setName("");
    setPhone("");
    setStatus("pending");
    setCompanions("0");
    setArrivedCompanions("0");
    setTableId("none");
    setTags([]);
    setNotes("");
    onClose();
  };

  const toggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const addCustomTag = () => {
    if (customTag.trim() && !tags.includes(customTag.trim())) {
      setTags((prev) => [...prev, customTag.trim()]);
      setCustomTag("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar Invitado" : "Nuevo Invitado"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="guest-name">Nombre completo</Label>
            <Input
              id="guest-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del invitado"
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="guest-phone">Teléfono (WhatsApp)</Label>
              <Input
                id="guest-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+52 555 123 4567"
              />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={status}
                onValueChange={(v) => {
                  const next = v as Guest["status"];
                  setStatus(next);
                  if (next === "arrived" && initial?.arrivedCompanions === undefined) {
                    setArrivedCompanions(companions);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="arrived">Ingresó</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="guest-companions">Acompañantes registrados</Label>
              <Input
                id="guest-companions"
                type="number"
                min="0"
                value={companions}
                onChange={(e) => {
                  setCompanions(e.target.value);
                  setArrivedCompanions(e.target.value);
                }}
              />
            </div>
            {tables.length > 0 && (
              <div className="space-y-2">
                <Label>Mesa asignada</Label>
                <Select value={tableId} onValueChange={setTableId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin mesa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin asignar</SelectItem>
                    {tables.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} (Cap. {t.capacity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {status === "arrived" && totalCompanionsNum > 0 && (
            <div className="space-y-2 p-3 rounded-xl bg-green-500/5 border border-green-500/20">
              <Label htmlFor="guest-arrived-companions" className="text-xs font-bold text-green-600 dark:text-green-400">
                Acompañantes que ya ingresaron (de {totalCompanionsNum})
              </Label>
              <Input
                id="guest-arrived-companions"
                type="number"
                min="0"
                max={totalCompanionsNum}
                value={arrivedCompanions}
                onChange={(e) => setArrivedCompanions(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="guest-notes">Notas / Alergias / Requerimientos</Label>
            <Textarea
              id="guest-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Alérgico a nueces, silla para bebé, invitado VIP..."
              className="min-h-[60px] text-xs"
            />
          </div>

          <div className="space-y-3">
            <Label>Categorías / Etiquetas</Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((tag) => (
                <Badge key={tag} className="gap-1 bg-amber-400 text-black hover:bg-amber-300">
                  {tag}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => toggleTag(tag)} />
                </Badge>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {PREDEFINED_TAGS.filter((t) => !tags.includes(t)).map((tag) => (
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
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomTag();
                  }
                }}
              />
              <Button type="button" size="sm" variant="outline" className="h-8 px-2" onClick={addCustomTag}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-amber-400 hover:bg-amber-300 text-black font-semibold">
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
