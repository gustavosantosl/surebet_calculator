import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, CheckCircle2, Clock, RefreshCw, TrendingUp, Wallet, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../supabaseClient";

interface BetOperation {
  id: string;
  event_name: string;
  event_date: string;
  market: string;
  total_investment: number;
  expected_profit: number;
  status: string;
  created_at: string;
}

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatPercent = (value: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

export const History = () => {
  const [bets, setBets] = useState<BetOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setBets([]);
        return;
      }

      const { data, error } = await supabase
        .from("bet_operations")
        .select(
          "id,event_name,event_date,market,total_investment,expected_profit,status,created_at",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setBets((data as BetOperation[]) || []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Falha desconhecida";
      toast.error(`Erro ao carregar historico: ${message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const updateBetStatus = useCallback(async (betId: string, status: "won" | "lost") => {
    try {
      setUpdatingId(betId);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Voce precisa estar logado para atualizar a aposta.");
        return;
      }

      const { error } = await supabase
        .from("bet_operations")
        .update({ status })
        .eq("id", betId)
        .eq("user_id", user.id);

      if (error) throw error;

      setBets((prev) => prev.map((bet) => (bet.id === betId ? { ...bet, status } : bet)));
      toast.success(status === "won" ? "Aposta marcada como Green." : "Aposta marcada como Red.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Falha desconhecida";
      toast.error(`Erro ao atualizar status: ${message}`);
    } finally {
      setUpdatingId(null);
    }
  }, []);

  const { totalProfit, totalVolume, avgRoi } = useMemo(() => {
    const profit = bets.reduce((acc, bet) => acc + Number(bet.expected_profit || 0), 0);
    const volume = bets.reduce((acc, bet) => acc + Number(bet.total_investment || 0), 0);
    const roi = volume > 0 ? (profit / volume) * 100 : 0;
    return { totalProfit: profit, totalVolume: volume, avgRoi: roi };
  }, [bets]);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-2 flex items-center gap-3 text-muted-foreground">
            <Wallet size={18} />
            <span className="text-sm font-medium">Lucro Total Acumulado</span>
          </div>
          <div className={`text-2xl font-bold ${totalProfit >= 0 ? "text-profit" : "text-loss"}`}>
            {formatBRL(totalProfit)}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-2 flex items-center gap-3 text-muted-foreground">
            <TrendingUp size={18} />
            <span className="text-sm font-medium">ROI Medio (Amostra)</span>
          </div>
          <div className={`text-2xl font-bold ${avgRoi >= 0 ? "text-primary" : "text-loss"}`}>
            {formatPercent(avgRoi)}%
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-2 flex items-center gap-3 text-muted-foreground">
            <Calendar size={18} />
            <span className="text-sm font-medium">Volume Transacionado</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{formatBRL(totalVolume)}</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="font-semibold text-foreground">Ultimas 10 Operacoes</h3>
          <button
            onClick={fetchHistory}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:opacity-80"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Atualizar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary text-muted-foreground uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-3">Evento / Mercado</th>
                <th className="px-6 py-3">Data</th>
                <th className="px-6 py-3 text-right">Investimento</th>
                <th className="px-6 py-3 text-right">Lucro Esperado</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-center">Acao</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted-foreground">
                    Carregando dados...
                  </td>
                </tr>
              ) : bets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted-foreground">
                    Nenhuma aposta registrada.
                  </td>
                </tr>
              ) : (
                bets.map((bet) => {
                  const isPending = bet.status === "pending";
                  const isWon = bet.status === "won" || bet.status === "green";
                  const isUpdatingRow = updatingId === bet.id;

                  return (
                    <tr key={bet.id} className="transition-colors hover:bg-secondary/50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{bet.event_name || "Sem nome"}</div>
                        <div className="text-xs text-muted-foreground">{bet.market || "Nao informado"}</div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {new Date(bet.event_date).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-6 py-4 text-right text-foreground">
                        {formatBRL(Number(bet.total_investment || 0))}
                      </td>
                      <td
                        className={`px-6 py-4 text-right font-semibold ${
                          Number(bet.expected_profit || 0) >= 0 ? "text-profit" : "text-loss"
                        }`}
                      >
                        {formatBRL(Number(bet.expected_profit || 0))}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          {isPending ? (
                            <span className="flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-500">
                              <Clock size={12} /> Pendente
                            </span>
                          ) : isWon ? (
                            <span className="flex items-center gap-1 rounded-full border border-profit/20 bg-profit/10 px-2 py-1 text-[10px] text-profit">
                              <CheckCircle2 size={12} /> Green
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 rounded-full border border-loss/20 bg-loss/10 px-2 py-1 text-[10px] text-loss">
                              <XCircle size={12} /> Red
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isPending ? (
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => updateBetStatus(bet.id, "won")}
                              disabled={isUpdatingRow}
                              className="rounded-md border border-profit/30 bg-profit/10 px-2.5 py-1 text-[11px] font-semibold text-profit transition-colors hover:bg-profit/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Green
                            </button>
                            <button
                              onClick={() => updateBetStatus(bet.id, "lost")}
                              disabled={isUpdatingRow}
                              className="rounded-md border border-loss/30 bg-loss/10 px-2.5 py-1 text-[11px] font-semibold text-loss transition-colors hover:bg-loss/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Red
                            </button>
                          </div>
                        ) : (
                          <div className="text-center text-[11px] text-muted-foreground">Concluida</div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
