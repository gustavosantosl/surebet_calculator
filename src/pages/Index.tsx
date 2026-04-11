import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
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
    return <Login onLoginSuccess={() => console.log("Login efetuado")} />;
  }

  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none fixed right-3 top-3 z-20 md:right-6 md:top-6">
        <div className="pointer-events-auto">
          <button
            onClick={() => supabase.auth.signOut()}
            className="rounded-md border border-primary/40 bg-primary/15 px-3 py-2 text-xs font-semibold text-primary shadow-sm backdrop-blur transition-colors hover:bg-primary/25"
          >
            Sair da Conta
          </button>
        </div>
      </div>

      <div className="flex justify-center gap-3 px-4 pb-2 pt-16 md:pt-20">
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