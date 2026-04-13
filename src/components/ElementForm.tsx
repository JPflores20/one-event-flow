import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shapes } from "lucide-react";

interface ElementFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, shape: "rect" | "square" | "circle" | "line-h" | "line-v") => void;
}

export function ElementForm({ open, onClose, onSubmit }: ElementFormProps) {
  const [name, setName] = useState("");
  const [shape, setShape] = useState<"rect" | "square" | "circle" | "line-h" | "line-v">("rect");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim(), shape);
    setName("");
    setShape("rect");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shapes className="h-5 w-5 text-amber-500" />
            Nuevo Elemento Estructural
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="element-name">Nombre del elemento (ej. Pista de Baile)</Label>
            <Input
              id="element-name"
              placeholder="Nombre..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="element-shape">Figura principal</Label>
            <Select value={shape} onValueChange={(val: any) => setShape(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una figura" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rect">Rectángulo</SelectItem>
                <SelectItem value="square">Cuadrado</SelectItem>
                <SelectItem value="circle">Círculo</SelectItem>
                <SelectItem value="line-h">Línea Horizontal</SelectItem>
                <SelectItem value="line-v">Línea Vertical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!name.trim()} className="bg-amber-400 text-black hover:bg-amber-500">
              Crear Elemento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
