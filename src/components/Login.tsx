import { useState, type FormEvent } from "react";
import { Eye, EyeOff, LogIn, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../supabaseClient";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export const Login = ({ onLoginSuccess }: { onLoginSuccess: () => void }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Bem-vindo de volta!");
      onLoginSuccess();
    }
    setLoading(false);
  };

  const handleSignUp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Conta criada! Você já pode fazer login.");
    }
    setLoading(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-16 top-10 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -right-20 bottom-8 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <Card className="relative w-full max-w-md border-border/80 bg-card/95 shadow-2xl backdrop-blur">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-xl border border-primary/40 bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="font-mono text-3xl tracking-tight">Calculadora Surebet</CardTitle>
          <CardDescription>Entre para salvar e acompanhar suas operações de dutching.</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                className="border-border bg-secondary/70 text-foreground placeholder:text-muted-foreground"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="border-border bg-secondary/70 pr-11 text-foreground placeholder:text-muted-foreground"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full gap-2">
              <LogIn className="h-4 w-4" />
              {loading ? "Carregando..." : "Entrar"}
            </Button>
          </form>

          <Button
            onClick={handleSignUp}
            disabled={loading}
            variant="outline"
            className="mt-4 w-full border-primary/50 text-primary hover:bg-primary/10"
          >
            Criar Nova Conta
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};