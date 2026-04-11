import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { LogOut } from "lucide-react";
import SurebetCalculator from "@/components/SurebetCalculator";
import { History } from "@/components/History";
import { supabase } from "../supabaseClient";
import { Login } from "../components/Login";

const Index = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<"calc" | "history">("calc");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!session) {
    return <Login onLoginSuccess={() => undefined} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 md:px-6">
          <h1 className="text-sm font-semibold tracking-wide text-foreground md:text-base">Surebet Calc</h1>
          <button
            onClick={() => supabase.auth.signOut()}
            className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/25"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </button>
        </div>
      </div>

      <div className="flex justify-center gap-3 px-4 pb-2 pt-4 md:pt-6">
        <button
          onClick={() => setActiveTab("calc")}
          className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
            activeTab === "calc"
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          Calculadora
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
            activeTab === "history"
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          Dashboard e Historico
        </button>
      </div>

      {activeTab === "calc" ? <SurebetCalculator /> : <History />}
    </div>
  );
};

export default Index;