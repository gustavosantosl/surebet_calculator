import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Calendar, CheckCircle2, Clock, Pencil, RefreshCw, Trash2, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { editOperationSchema } from "@/lib/validation";
import { supabase } from "../supabaseClient";

interface BetOperation {
  id: string;
  event_name: string;
  event_date: string;
  market: string;
  bookie_1: string | null;
  bookie_2: string | null;
  total_investment: number;
  expected_profit: number;
  status: string;
  created_at: string;
}

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatPercent = (value: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

const toDateInput = (value: string) => {
  if (!value) return "";

  const directMatch = value.match(/^\d{4}-\d{2}-\d{2}/);
  if (directMatch) return directMatch[0];

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatEventDateBR = (value: string) => {
  const normalized = toDateInput(value);
  if (!normalized) return "Data invalida";

  const [year, month, day] = normalized.split("-");
  return `${day}/${month}/${year}`;
};

export const History = () => {
  type EditField = "event_name" | "market" | "event_date" | "total_investment" | "expected_profit";

  const [bets, setBets] = useState<BetOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BetOperation | null>(null);
  const [editingBet, setEditingBet] = useState<BetOperation | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editTouched, setEditTouched] = useState<Record<EditField, boolean>>({
    event_name: false,
    market: false,
    event_date: false,
    total_investment: false,
    expected_profit: false,
  });

  const inputClass =
    "w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

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
          "id,event_name,event_date,market,bookie_1,bookie_2,total_investment,expected_profit,status,created_at",
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

  const updateBetStatus = useCallback(async (betId: string) => {
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
        .update({ status: "completed" })
        .eq("id", betId)
        .eq("user_id", user.id);

      if (error) throw error;

      setBets((prev) => prev.map((bet) => (bet.id === betId ? { ...bet, status: "completed" } : bet)));
      toast.success("Operacao marcada como concluida.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Falha desconhecida";
      toast.error(`Erro ao atualizar status: ${message}`);
    } finally {
      setUpdatingId(null);
    }
  }, []);

  const handleDelete = useCallback(
    async (betId: string) => {
      try {
        setDeletingId(betId);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          toast.error("Voce precisa estar logado para apagar a operacao.");
          return;
        }

        const { error } = await supabase
          .from("bet_operations")
          .delete()
          .eq("id", betId)
          .eq("user_id", user.id);

        if (error) throw error;

        toast.success("Operacao apagada com sucesso.");
        setDeleteTarget(null);
        await fetchHistory();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Falha desconhecida";
        toast.error(`Erro ao apagar operacao: ${message}`);
      } finally {
        setDeletingId(null);
      }
    },
    [fetchHistory],
  );

  const handleSaveEdit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!editingBet) return;

      const parsed = editOperationSchema.safeParse({
        event_name: editingBet.event_name,
        event_date: editingBet.event_date,
        market: editingBet.market,
        total_investment: Number(editingBet.total_investment || 0),
        expected_profit: Number(editingBet.expected_profit || 0),
      });

      if (!parsed.success) {
        const firstError = parsed.error.issues[0]?.message ?? "Dados invalidos. Revise os campos.";
        toast.error(firstError);
        return;
      }

      try {
        setSavingEdit(true);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          toast.error("Voce precisa estar logado para editar a operacao.");
          return;
        }

        const { error } = await supabase
          .from("bet_operations")
          .update({
            event_name: parsed.data.event_name,
            event_date: parsed.data.event_date,
            market: parsed.data.market,
            total_investment: parsed.data.total_investment,
            expected_profit: parsed.data.expected_profit,
          })
          .eq("id", editingBet.id)
          .eq("user_id", user.id);

        if (error) throw error;

        toast.success("Operacao atualizada com sucesso.");
        setEditingBet(null);
        await fetchHistory();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Falha desconhecida";
        toast.error(`Erro ao editar operacao: ${message}`);
      } finally {
        setSavingEdit(false);
      }
    },
    [editingBet, fetchHistory],
  );

  const { totalProfit, capitalPreso, avgRoi, pendingCount } = useMemo(() => {
    const profit = bets.reduce((acc, bet) => acc + Number(bet.expected_profit || 0), 0);
    const pendingBets = bets.filter((bet) => bet.status === "pending");
    const volume = bets.reduce((acc, bet) => acc + Number(bet.total_investment || 0), 0);
    const capitalEmAberto = pendingBets.reduce((acc, bet) => acc + Number(bet.total_investment || 0), 0);
    const roi = volume > 0 ? (profit / volume) * 100 : 0;
    return { totalProfit: profit, capitalPreso: capitalEmAberto, avgRoi: roi, pendingCount: pendingBets.length };
  }, [bets]);

  const editValidation = useMemo(() => {
    if (!editingBet) return null;

    return editOperationSchema.safeParse({
      event_name: editingBet.event_name,
      event_date: editingBet.event_date,
      market: editingBet.market,
      total_investment: Number(editingBet.total_investment || 0),
      expected_profit: Number(editingBet.expected_profit || 0),
    });
  }, [editingBet]);

  const editFieldErrors = useMemo(() => {
    if (!editValidation || editValidation.success) {
      return {} as Partial<Record<EditField, string[]>>;
    }

    return editValidation.error.flatten().fieldErrors as Partial<Record<EditField, string[]>>;
  }, [editValidation]);

  const getEditError = (field: EditField) => (editTouched[field] ? editFieldErrors[field]?.[0] : undefined);

  const markEditTouched = (field: EditField) => {
    setEditTouched((prev) => ({ ...prev, [field]: true }));
  };

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
            <span className="text-sm font-medium">Capital Preso (Em Aberto)</span>
          </div>
          <div className="text-2xl font-bold text-amber-400">{formatBRL(capitalPreso)}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {pendingCount} {pendingCount === 1 ? "operacao pendente" : "operacoes pendentes"}
          </div>
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
                  const isUpdatingRow = updatingId === bet.id;
                  const isDeletingRow = deletingId === bet.id;

                  return (
                    <tr key={bet.id} className="transition-colors hover:bg-secondary/50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{bet.event_name || "Sem nome"}</div>
                        <div className="text-xs text-muted-foreground">{bet.market || "Nao informado"}</div>
                        <div className="text-xs text-muted-foreground/80">
                          {bet.bookie_1 || "Casa 1"} x {bet.bookie_2 || "Casa 2"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {formatEventDateBR(bet.event_date)}
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
                          ) : (
                            <span className="flex items-center gap-1 rounded-full border border-profit/20 bg-profit/10 px-2 py-1 text-[10px] text-profit">
                              <CheckCircle2 size={12} /> Concluida
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-3">
                          {isPending ? (
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => updateBetStatus(bet.id)}
                                disabled={isUpdatingRow || isDeletingRow}
                                className="rounded-md border border-profit/30 bg-profit/10 px-2.5 py-1 text-[11px] font-semibold text-profit transition-colors hover:bg-profit/20 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Concluir
                              </button>
                            </div>
                          ) : (
                            <div className="text-center text-[11px] text-muted-foreground">Concluida</div>
                          )}

                          <button
                            onClick={() => {
                              setEditingBet({ ...bet });
                              setEditTouched({
                                event_name: false,
                                market: false,
                                event_date: false,
                                total_investment: false,
                                expected_profit: false,
                              });
                            }}
                            disabled={isDeletingRow || isUpdatingRow}
                            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                            title="Editar operacao"
                            aria-label="Editar operacao"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            onClick={() => setDeleteTarget(bet)}
                            disabled={isDeletingRow || isUpdatingRow}
                            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-loss/10 hover:text-loss disabled:cursor-not-allowed disabled:opacity-60"
                            title="Apagar operacao"
                            aria-label="Apagar operacao"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (deletingId) return;
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar operacao?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita.
              {deleteTarget?.event_name ? ` Operacao: ${deleteTarget.event_name}.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(deletingId)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={Boolean(deletingId) || !deleteTarget}
              onClick={async () => {
                if (!deleteTarget) return;
                await handleDelete(deleteTarget.id);
              }}
              className="bg-loss text-loss-foreground hover:bg-loss/90"
            >
              {deletingId ? "Apagando..." : "Apagar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={Boolean(editingBet)}
        onOpenChange={(open) => {
          if (savingEdit) return;
          if (!open) {
            setEditingBet(null);
            setEditTouched({
              event_name: false,
              market: false,
              event_date: false,
              total_investment: false,
              expected_profit: false,
            });
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar operacao</DialogTitle>
            <DialogDescription>Atualize os dados da operacao e salve as alteracoes.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Evento</label>
              <input
                type="text"
                value={editingBet?.event_name ?? ""}
                onChange={(e) =>
                  setEditingBet((prev) => (prev ? { ...prev, event_name: e.target.value } : prev))
                }
                onBlur={() => markEditTouched("event_name")}
                className={inputClass}
                required
              />
              {getEditError("event_name") ? (
                <p className="text-[11px] text-loss">{getEditError("event_name")}</p>
              ) : null}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Mercado</label>
              <input
                type="text"
                value={editingBet?.market ?? ""}
                onChange={(e) => setEditingBet((prev) => (prev ? { ...prev, market: e.target.value } : prev))}
                onBlur={() => markEditTouched("market")}
                className={inputClass}
                required
              />
              {getEditError("market") ? (
                <p className="text-[11px] text-loss">{getEditError("market")}</p>
              ) : null}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Data do Evento</label>
              <input
                type="date"
                value={toDateInput(editingBet?.event_date ?? "")}
                onChange={(e) =>
                  setEditingBet((prev) => (prev ? { ...prev, event_date: e.target.value } : prev))
                }
                onBlur={() => markEditTouched("event_date")}
                className={inputClass}
                required
              />
              {getEditError("event_date") ? (
                <p className="text-[11px] text-loss">{getEditError("event_date")}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Investimento Total</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingBet?.total_investment ?? 0}
                  onChange={(e) =>
                    setEditingBet((prev) =>
                      prev ? { ...prev, total_investment: Number(e.target.value || 0) } : prev,
                    )
                  }
                  onBlur={() => markEditTouched("total_investment")}
                  className={inputClass}
                  required
                />
                {getEditError("total_investment") ? (
                  <p className="text-[11px] text-loss">{getEditError("total_investment")}</p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Lucro Esperado</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingBet?.expected_profit ?? 0}
                  onChange={(e) =>
                    setEditingBet((prev) =>
                      prev ? { ...prev, expected_profit: Number(e.target.value || 0) } : prev,
                    )
                  }
                  onBlur={() => markEditTouched("expected_profit")}
                  className={inputClass}
                  required
                />
                {getEditError("expected_profit") ? (
                  <p className="text-[11px] text-loss">{getEditError("expected_profit")}</p>
                ) : null}
              </div>
            </div>

            <DialogFooter>
              <button
                type="button"
                onClick={() => {
                  setEditingBet(null);
                  setEditTouched({
                    event_name: false,
                    market: false,
                    event_date: false,
                    total_investment: false,
                    expected_profit: false,
                  });
                }}
                disabled={savingEdit}
                className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingEdit || !editValidation?.success}
                className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {savingEdit ? "Salvando..." : "Salvar"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
