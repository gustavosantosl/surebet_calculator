import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, LogIn, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../supabaseClient";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export const Login = ({ onLoginSuccess }: { onLoginSuccess: () => void }) => {
  const MAX_LOGIN_ATTEMPTS = 5;
  const LOGIN_COOLDOWN_MS = 30_000;

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [failedLoginAttempts, setFailedLoginAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!lockUntil) return;

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [lockUntil]);

  useEffect(() => {
    if (lockUntil && Date.now() >= lockUntil) {
      setLockUntil(null);
      setFailedLoginAttempts(0);
    }
  }, [lockUntil, now]);

  const remainingSeconds = lockUntil ? Math.max(0, Math.ceil((lockUntil - now) / 1000)) : 0;
  const isLoginLocked = remainingSeconds > 0;

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isLoginLocked) {
      toast.error(`Muitas tentativas. Tente novamente em ${remainingSeconds}s.`);
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || password.length < 6) {
      toast.error("Informe email valido e senha com pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });

    if (error) {
      toast.error(error.message);
      setFailedLoginAttempts((prev) => {
        const next = prev + 1;
        if (next >= MAX_LOGIN_ATTEMPTS) {
          setLockUntil(Date.now() + LOGIN_COOLDOWN_MS);
          toast.error("Muitas tentativas seguidas. Aguarde 30 segundos para tentar novamente.");
          return 0;
        }
        return next;
      });
    } else {
      setFailedLoginAttempts(0);
      setLockUntil(null);
      toast.success("Bem-vindo de volta!");
      onLoginSuccess();
    }
    setLoading(false);
  };

  const handleSignUp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas nao conferem.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      toast.error("Informe um email valido.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({ email: normalizedEmail, password });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Conta criada! Agora faca login para entrar.");
      setMode("login");
      setPassword("");
      setConfirmPassword("");
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
          <CardDescription>
            {mode === "login"
              ? "Entre para salvar e acompanhar suas operacoes de dutching."
              : "Crie sua conta para acessar o painel e historico das operacoes."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {mode === "login" ? (
            <>
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

                <Button type="submit" disabled={loading || isLoginLocked} className="w-full gap-2">
                  <LogIn className="h-4 w-4" />
                  {loading ? "Carregando..." : isLoginLocked ? `Tente em ${remainingSeconds}s` : "Entrar"}
                </Button>
              </form>

              <Button
                onClick={() => {
                  setMode("signup");
                  setShowPassword(false);
                }}
                disabled={loading}
                variant="outline"
                className="mt-4 w-full border-primary/50 text-primary hover:bg-primary/10"
              >
                Ir para Cadastro
              </Button>
            </>
          ) : (
            <>
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-foreground">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="border-border bg-secondary/70 text-foreground placeholder:text-muted-foreground"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-foreground">Senha</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Crie uma senha"
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

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password" className="text-foreground">Confirmar senha</Label>
                  <div className="relative">
                    <Input
                      id="signup-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita sua senha"
                      className="border-border bg-secondary/70 pr-11 text-foreground placeholder:text-muted-foreground"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
                      aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full gap-2">
                  {loading ? "Criando conta..." : "Criar Conta"}
                </Button>
              </form>

              <Button
                onClick={() => {
                  setMode("login");
                  setConfirmPassword("");
                  setShowConfirmPassword(false);
                }}
                disabled={loading}
                variant="outline"
                className="mt-4 w-full border-border text-foreground hover:bg-secondary"
              >
                Voltar para Login
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};