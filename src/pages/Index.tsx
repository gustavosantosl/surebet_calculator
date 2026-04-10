import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import SurebetCalculator from "@/components/SurebetCalculator";
import { supabase } from "../supabaseClient";
import { Login } from "../components/Login";

const Index = () => {
  const [session, setSession] = useState<Session | null>(null);

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
    <div>
      <div className="w-full bg-white p-4 shadow-sm flex justify-end">
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-sm text-red-600 font-semibold hover:text-red-800"
        >
          Sair da Conta
        </button>
      </div>

      <SurebetCalculator />
    </div>
  );
};

export default Index;