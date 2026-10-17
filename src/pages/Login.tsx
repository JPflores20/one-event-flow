import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Moon, Sun, Sparkles, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    try {
      setLoading(true);
      setError("");
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al iniciar sesión.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 transition-colors duration-300">
      {/* Theme toggle top-right */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 p-2.5 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-all shadow-sm"
        aria-label="Cambiar tema"
        title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      >
        {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
      </button>

      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
            <Sparkles className="h-6 w-6 text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">ONE Event Flow</h1>
            <p className="text-sm text-muted-foreground mt-1">Inicia sesión como administrador</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card/90 backdrop-blur-sm border border-border rounded-2xl p-6 shadow-lg dark:shadow-black/40 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <Input
                type="email"
                placeholder="correo@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-amber-400 focus:ring-amber-400/20"
                required
              />
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-amber-400 focus:ring-amber-400/20 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-amber-400 hover:bg-amber-300 text-black font-semibold shadow-sm shadow-amber-400/20 transition-all"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-black/20 border-t-black animate-spin" />
                  Ingresando…
                </span>
              ) : "Ingresar"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          ONE Agency — Sistema de gestión de eventos
        </p>
      </div>
    </div>
  );
}
