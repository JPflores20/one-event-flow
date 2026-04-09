import { useState, useMemo, useEffect } from "react";
import { 
  Plus, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Trash2, 
  Edit2, 
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Tag,
  Calendar,
  Printer,
  FileText
} from "lucide-react";
import { 
  Card, 
  CardContent 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { EventData, FinancialTransaction } from "@/hooks/useEventStore";

interface AccountingManagerProps {
  event: EventData;
  onAddTransaction: (transaction: Omit<FinancialTransaction, "id">) => void;
  onUpdateTransaction: (id: string, updates: Partial<FinancialTransaction>) => void;
  onDeleteTransaction: (id: string) => void;
  onAddCategory: (category: string) => void;
}

const DEFAULT_CATEGORIES = [
  "Catering",
  "Salón/Sede",
  "Música/DJ",
  "Staff",
  "Marketing/Publicidad",
  "Decoración",
  "Mobiliario",
  "Transporte",
  "Seguridad",
  "Anticipo Cliente",
  "Pago Total Cliente",
  "Otros"
];

export function AccountingManager({ 
  event, 
  onAddTransaction, 
  onUpdateTransaction, 
  onDeleteTransaction,
  onAddCategory
}: AccountingManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const { toast } = useToast();
  
  // Form state
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  
  // Category management
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const allCategories = useMemo(() => {
    const custom = event.customCategories || [];
    return Array.from(new Set([...DEFAULT_CATEGORIES, ...custom]));
  }, [event.customCategories]);

  const stats = useMemo(() => {
    const income = (event.financials || [])
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = (event.financials || [])
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      income,
      expenses,
      balance: income - expenses
    };
  }, [event.financials]);

  const filteredTransactions = (event.financials || [])
    .filter(t => {
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           t.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "all" || t.type === typeFilter;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleOpenCreate = () => {
    setEditingId(null);
    setDescription("");
    setAmount("");
    setType("expense");
    setCategory(DEFAULT_CATEGORIES[0]);
    setDate(format(new Date(), "yyyy-MM-dd"));
    setShowForm(true);
  };

  const handleEdit = (t: FinancialTransaction) => {
    setEditingId(t.id);
    setDescription(t.description);
    setAmount(t.amount.toString());
    setType(t.type);
    setCategory(t.category);
    setDate(t.date);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const transactionData = {
      description,
      amount: parseFloat(amount),
      type,
      category,
      date
    };

    try {
      if (editingId) {
        await onUpdateTransaction(editingId, transactionData);
        toast({
          title: "Transacción actualizada",
          description: "Los cambios se guardaron en Firebase correctamente.",
        });
      } else {
        await onAddTransaction(transactionData);
        toast({
          title: "Transacción guardada",
          description: "La información se sincronizó con Firebase.",
        });
      }
      setShowForm(false);
    } catch (error) {
      toast({
        title: "Error al guardar",
        description: "No se pudo sincronizar con la base de datos.",
        variant: "destructive",
      });
    }
  };

  const handleAddCategory = async () => {
    if (newCategoryName.trim()) {
      try {
        await onAddCategory(newCategoryName.trim());
        setCategory(newCategoryName.trim());
        setNewCategoryName("");
        setShowAddCategory(false);
        toast({
          title: "Categoría añadida",
          description: "La nueva categoría se guardó en Firebase.",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudo guardar la categoría.",
          variant: "destructive",
        });
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="print:hidden space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-l-4 border-l-green-500 transition-all hover:shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-green-600 dark:text-green-400">Total Ingresos</span>
              <div className="p-2 bg-green-500/10 rounded-lg">
                <ArrowUpRight className="h-4 w-4 text-green-600" />
              </div>
            </div>
            <div className="text-3xl font-black text-green-600 dark:text-green-400 tracking-tighter">
              ${stats.income.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-red-500/10 to-rose-500/5 border-l-4 border-l-red-500 transition-all hover:shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">Total Egresos</span>
              <div className="p-2 bg-red-500/10 rounded-lg">
                <ArrowDownLeft className="h-4 w-4 text-red-600" />
              </div>
            </div>
            <div className="text-3xl font-black text-red-600 dark:text-red-400 tracking-tighter">
              ${stats.expenses.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "border-none shadow-sm border-l-4 transition-all hover:shadow-md",
          stats.balance >= 0 
            ? "bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-l-amber-500" 
            : "bg-gradient-to-br from-red-600/10 to-red-700/5 border-l-red-600"
        )}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest",
                stats.balance >= 0 ? "text-amber-600 dark:text-amber-400" : "text-red-600"
              )}>Balance Final</span>
              <div className={cn(
                "p-2 rounded-lg",
                stats.balance >= 0 ? "bg-amber-500/10" : "bg-red-500/10"
              )}>
                <Wallet className={cn(
                  "h-4 w-4",
                  stats.balance >= 0 ? "text-amber-600" : "text-red-600"
                )} />
              </div>
            </div>
            <div className={cn(
              "text-3xl font-black tracking-tighter",
              stats.balance >= 0 ? "text-amber-600 dark:text-amber-400" : "text-red-600"
            )}>
              ${stats.balance.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-2xl border border-border shadow-sm">
        <div className="flex flex-1 items-center gap-4 w-full">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar transacción..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-background border-border"
            />
          </div>
          <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
            <SelectTrigger className="w-40 bg-background border-border">
              <SelectValue placeholder="Filtrar tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="income">Ingresos</SelectItem>
              <SelectItem value="expense">Egresos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={handlePrint}
            className="border-border text-muted-foreground hover:text-foreground h-10 px-4 rounded-xl shadow-sm transition-all"
          >
            <Printer className="h-4 w-4 mr-2" /> Imprimir Reporte
          </Button>
          <Button 
            onClick={handleOpenCreate}
            className="bg-amber-400 hover:bg-amber-300 text-black font-bold h-10 px-6 rounded-xl shadow-sm transition-all active:scale-95"
          >
            <Plus className="h-4 w-4 mr-2" /> Nueva Transacción
          </Button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="border-border">
              <TableHead className="font-bold text-[10px] uppercase tracking-widest">Fecha</TableHead>
              <TableHead className="font-bold text-[10px] uppercase tracking-widest">Descripción</TableHead>
              <TableHead className="font-bold text-[10px] uppercase tracking-widest">Categoría</TableHead>
              <TableHead className="font-bold text-[10px] uppercase tracking-widest text-right">Monto</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                  No se encontraron transacciones.
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions.map((t) => (
                <TableRow key={t.id} className="border-border hover:bg-muted/30 transition-colors">
                  <TableCell className="text-xs font-medium py-4">
                    {format(new Date(t.date + "T00:00:00"), "d MMM, yyyy", { locale: es })}
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-foreground">{t.description}</span>
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-tighter w-fit",
                        t.type === "income" ? "text-green-600" : "text-red-500"
                      )}>
                        {t.type === "income" ? "Ingreso" : "Egreso"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge variant="outline" className="text-[10px] bg-slate-100 dark:bg-slate-800 border-none font-bold text-slate-600 dark:text-slate-400">
                      {t.category}
                    </Badge>
                  </TableCell>
                  <TableCell className={cn(
                    "text-right font-black py-4",
                    t.type === "income" ? "text-green-600" : "text-red-500"
                  )}>
                    {t.type === "income" ? "+" : "-"}${t.amount.toLocaleString()}
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-amber-500" onClick={() => handleEdit(t)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={async () => {
                        try {
                          await onDeleteTransaction(t.id);
                          toast({ title: "Transacción eliminada" });
                        } catch (e) {
                          toast({ title: "Error al eliminar", variant: "destructive" });
                        }
                      }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>

    {/* Print Report Layout (Hidden except when printing) */}
    <div className="hidden print:block p-8 bg-white text-black min-h-screen">
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900 mb-1">Reporte Financiero</h1>
          <p className="text-xl font-bold text-slate-600">{event.name}</p>
          <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 font-medium">
            <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {format(new Date(event.date), "PPP", { locale: es })}</span>
            <span className="flex items-center gap-1"><FileText className="h-4 w-4" /> ID: {event.code}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="w-12 h-12 rounded-xl bg-amber-400 flex items-center justify-center mb-2 ml-auto">
            <DollarSign className="h-6 w-6 text-black" />
          </div>
          <p className="text-[10px] font-black uppercase text-slate-400 mt-1">Generado por ONE Event Flow</p>
          <p className="text-[10px] text-slate-400">{format(new Date(), "PPpp", { locale: es })}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8 mb-10">
        <div className="p-4 rounded-xl border-2 border-green-100 bg-green-50/30">
          <p className="text-[10px] font-black uppercase tracking-widest text-green-700 mb-1">Total Ingresos</p>
          <p className="text-2xl font-black text-green-700">${stats.income.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-xl border-2 border-red-100 bg-red-50/30">
          <p className="text-[10px] font-black uppercase tracking-widest text-red-700 mb-1">Total Egresos</p>
          <p className="text-2xl font-black text-red-700">${stats.expenses.toLocaleString()}</p>
        </div>
        <div className={cn(
          "p-4 rounded-xl border-2",
          stats.balance >= 0 ? "border-amber-100 bg-amber-50/30" : "border-red-100 bg-red-50/30"
        )}>
          <p className={cn(
            "text-[10px] font-black uppercase tracking-widest mb-1",
            stats.balance >= 0 ? "text-amber-700" : "text-red-700"
          )}>Balance Final</p>
          <p className={cn(
            "text-2xl font-black",
            stats.balance >= 0 ? "text-amber-700" : "text-red-700"
          )}>${stats.balance.toLocaleString()}</p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 border-b border-slate-200 pb-2">Desglose de Transacciones</h2>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 border-y border-slate-200">
              <th className="py-3 px-2 font-black uppercase tracking-tighter w-[15%]">Fecha</th>
              <th className="py-3 px-2 font-black uppercase tracking-tighter w-[40%]">Descripción</th>
              <th className="py-3 px-2 font-black uppercase tracking-tighter w-[20%]">Categoría</th>
              <th className="py-3 px-2 font-black uppercase tracking-tighter text-right w-[25%]">Monto</th>
            </tr>
          </thead>
          <tbody>
            {(event.financials || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((t) => (
              <tr key={t.id} className="border-b border-slate-100">
                <td className="py-3 px-2 text-slate-500">{format(new Date(t.date + "T00:00:00"), "dd/MM/yyyy")}</td>
                <td className="py-3 px-2">
                   <div className="font-bold text-slate-900">{t.description}</div>
                   <div className={cn("text-[9px] font-black uppercase", t.type === 'income' ? 'text-green-600' : 'text-red-500')}>
                     {t.type === 'income' ? 'Ingreso' : 'Egreso'}
                   </div>
                </td>
                <td className="py-3 px-2 capitalize text-slate-600 font-medium">{t.category}</td>
                <td className={cn(
                  "py-3 px-2 text-right font-black",
                  t.type === 'income' ? 'text-green-700' : 'text-red-700'
                )}>
                  {t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-20 grid grid-cols-2 gap-20">
        <div className="border-t border-slate-400 pt-4 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Firma Administrador</p>
        </div>
        <div className="border-t border-slate-400 pt-4 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sello de Validación</p>
        </div>
      </div>
    </div>

      {/* Transaction Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingId ? <Edit2 className="h-5 w-5 text-amber-500" /> : <Plus className="h-5 w-5 text-amber-500" />}
              {editingId ? "Editar Transacción" : "Nueva Transacción"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant={type === "income" ? "default" : "outline"}
                    className={cn("flex-1", type === "income" && "bg-green-600 hover:bg-green-700")}
                    onClick={() => setType("income")}
                  >
                    Ingreso
                  </Button>
                  <Button 
                    type="button" 
                    variant={type === "expense" ? "default" : "outline"}
                    className={cn("flex-1", type === "expense" && "bg-red-600 hover:bg-red-700")}
                    onClick={() => setType("expense")}
                  >
                    Egreso
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Fecha</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="pl-9 bg-background border-border"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Input 
                id="description"
                placeholder="Ej: Pago de catering, Anticipo..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-background border-border"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Monto ($)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-9 bg-background border-border text-lg font-bold"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                   <Label htmlFor="category">Categoría</Label>
                   <Button 
                     type="button" 
                     variant="ghost" 
                     className="h-auto p-0 text-[10px] font-bold text-amber-600 hover:text-amber-700"
                     onClick={() => setShowAddCategory(true)}
                   >
                     + Nueva
                   </Button>
                </div>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category" className="bg-background border-border">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border mt-6">
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-amber-400 hover:bg-amber-300 text-black font-bold px-8">
                {editingId ? "Guardar Cambios" : "Agregar Transacción"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
        <DialogContent className="sm:max-w-[300px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm italic">
              <Tag className="h-4 w-4 text-amber-500" />
              Nueva Categoría
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input 
              placeholder="Nombre de la categoría..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="bg-background border-border"
              autoFocus
            />
            <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowAddCategory(false)}>Cancelar</Button>
                <Button size="sm" className="bg-amber-400 text-black font-bold" onClick={handleAddCategory}>Agregar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
