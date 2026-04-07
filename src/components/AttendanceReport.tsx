import { useMemo } from "react";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Legend, 
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";
import { Users, LogIn, Clock, XCircle, TrendingUp, Presentation } from "lucide-react";
import type { EventData } from "@/hooks/useEventStore";
import { cn } from "@/lib/utils";

interface AttendanceReportProps {
  event: EventData;
}

export function AttendanceReport({ event }: AttendanceReportProps) {
  const stats = useMemo(() => {
    const activeGuests = event.guests.filter(g => g.status !== "cancelled");
    const arrivedCount = activeGuests.filter(g => g.status === "arrived").length;
    const confirmedCount = activeGuests.filter(g => g.status === "confirmed").length;
    const pendingCount = activeGuests.filter(g => g.status === "pending").length;
    const cancelledCount = event.guests.filter(g => g.status === "cancelled").length;

    const arrivedGuestsTotal = activeGuests
      .filter(g => g.status === "arrived")
      .reduce((sum, g) => sum + 1 + g.companions, 0);
    
    const totalExpected = activeGuests.reduce((sum, g) => sum + 1 + g.companions, 0);

    const pieData = [
      { name: "Ingresaron", value: arrivedCount, color: "#10b981" },
      { name: "Confirmados", value: confirmedCount, color: "#3b82f6" },
      { name: "Pendientes", value: pendingCount, color: "#94a3b8" },
    ].filter(d => d.value > 0);

    const checkInPct = totalExpected > 0 ? Math.round((arrivedGuestsTotal / totalExpected) * 100) : 0;

    return {
      arrivedCount,
      confirmedCount,
      pendingCount,
      cancelledCount,
      arrivedGuestsTotal,
      totalExpected,
      pieData,
      checkInPct
    };
  }, [event.guests]);

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
              <LogIn className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-muted-foreground">Check-in Real</h3>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-foreground">{stats.arrivedGuestsTotal}</span>
            <span className="text-sm text-muted-foreground">/ {stats.totalExpected} pers.</span>
          </div>
          <div className="mt-4 h-2 w-full bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-1000" 
              style={{ width: `${stats.checkInPct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">{stats.checkInPct}% de asistencia total</p>
        </div>

        <div className="p-6 rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-muted-foreground">Estado de Invitaciones</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" /> Confirmados
              </span>
              <span className="font-bold">{stats.confirmedCount}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-zinc-400" /> Pendientes
              </span>
              <span className="font-bold">{stats.pendingCount}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-400" /> Cancelados
              </span>
              <span className="font-bold">{stats.cancelledCount}</span>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-border bg-card shadow-sm flex flex-col justify-center items-center text-center">
          <TrendingUp className="h-10 w-10 text-amber-500 mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-foreground">Eficiencia del Evento</h3>
          <p className="text-sm text-muted-foreground mt-1 px-4">
            {stats.checkInPct > 80 
              ? "¡Excelente convocatoria! El evento está siendo un éxito masivo."
              : "La asistencia progresa de acuerdo a los tiempos establecidos."}
          </p>
        </div>
      </div>

      {/* Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl border border-border bg-card shadow-sm">
          <h3 className="text-base font-bold text-foreground mb-6 flex items-center gap-2">
            <Presentation className="h-4 w-4 text-amber-500" />
            Distribución de Invitados
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label
                >
                  {stats.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-border bg-card shadow-sm flex flex-col">
          <h3 className="text-base font-bold text-foreground mb-6 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-500" />
            Metas de Asistencia
          </h3>
          <div className="flex-1 flex flex-col justify-center space-y-8 px-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <span>Asistencia Mínima (60%)</span>
                <span>{stats.checkInPct >= 60 ? "LOGRADO" : "PENDIENTE"}</span>
              </div>
              <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-1000",
                    stats.checkInPct >= 60 ? "bg-amber-400" : "bg-muted-foreground/20"
                  )}
                  style={{ width: `${Math.min(100, (stats.checkInPct / 60) * 100)}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <span>Éxito de Convocatoria (85%)</span>
                <span>{stats.checkInPct >= 85 ? "LOGRADO" : "PENDIENTE"}</span>
              </div>
              <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-1000",
                    stats.checkInPct >= 85 ? "bg-amber-400" : "bg-muted-foreground/20"
                  )}
                  style={{ width: `${Math.min(100, (stats.checkInPct / 85) * 100)}%` }}
                />
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground italic text-center pt-4">
              * Datos calculados en tiempo real basados en los registros de check-in.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
