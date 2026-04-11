import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Calculator,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Save,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import SaveOperationModal from "./SaveOperationModal";
import { supabase } from '../supabaseClient';
import { saveOperationSchema } from "@/lib/validation";

type PivotMode = "total" | "stake1" | "stake2";

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatPercent = (value: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

/** Parse user input that may use comma as decimal separator */
const parseLocaleNumber = (raw: string): number => {
  const cleaned = raw.replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
};

const inputBaseClass =
  "w-full rounded-md border border-border bg-secondary px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

export default function SurebetCalculator() {
  const [pivotMode, setPivotMode] = useState<PivotMode>("total");
  const [totalInvestment, setTotalInvestment] = useState(1000);
  const [odd1, setOdd1] = useState(2.0);
  const [odd2, setOdd2] = useState(2.0);
  const [stake1, setStake1] = useState(0);
  const [stake2, setStake2] = useState(0);
  const [bookie1, setBookie1] = useState("Casa 1");
  const [bookie2, setBookie2] = useState("Casa 2");
  const [showModal, setShowModal] = useState(false);

  // Raw string inputs for comma support
  const [rawOdd1, setRawOdd1] = useState("2.00");
  const [rawOdd2, setRawOdd2] = useState("2.00");
  const [rawTotal, setRawTotal] = useState("1000");
  const [rawStake1, setRawStake1] = useState("0");
  const [rawStake2, setRawStake2] = useState("0");

  useEffect(() => {
    if (odd1 <= 1 || odd2 <= 1) {
      setStake1(0);
      setStake2(0);
      setRawStake1("0");
      setRawStake2("0");
      return;
    }

    if (pivotMode === "total") {
      const s1 = totalInvestment / (1 + odd1 / odd2);
      const s2 = totalInvestment - s1;
      setStake1(s1);
      setStake2(s2);
      setRawStake1(s1.toFixed(2));
      setRawStake2(s2.toFixed(2));
    } else if (pivotMode === "stake1") {
      const s2 = (stake1 * odd1) / odd2;
      setStake2(s2);
      setRawStake2(s2.toFixed(2));
      setTotalInvestment(stake1 + s2);
      setRawTotal((stake1 + s2).toFixed(2));
    } else {
      const s1 = (stake2 * odd2) / odd1;
      setStake1(s1);
      setRawStake1(s1.toFixed(2));
      setTotalInvestment(s1 + stake2);
      setRawTotal((s1 + stake2).toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pivotMode, totalInvestment, odd1, odd2, pivotMode === "stake1" ? stake1 : null, pivotMode === "stake2" ? stake2 : null]);

  const impliedProb = odd1 > 1 && odd2 > 1 ? 1 / odd1 + 1 / odd2 : 2;
  const isProfitable = impliedProb < 1;
  const totalReturn = stake1 * odd1;
  const netProfit = totalReturn - totalInvestment;
  const roi = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;

  const pivotOptions: { value: PivotMode; label: string }[] = [
    { value: "total", label: "Aposta Total" },
    { value: "stake1", label: "Montante 1ª Seleção" },
    { value: "stake2", label: "Montante 2ª Seleção" },
  ];

  const isStakeLocked = (which: "stake1" | "stake2") => {
    if (pivotMode === "total") return true;
    if (pivotMode === "stake1" && which === "stake2") return true;
    if (pivotMode === "stake2" && which === "stake1") return true;
    return false;
  };

  const rows = [
    { idx: 1, label: "Seleção 1", bookie: bookie1, setBookie: setBookie1, odd: odd1, rawOdd: rawOdd1, setRawOdd: setRawOdd1, setOdd: setOdd1, stake: stake1, rawStake: rawStake1, setRawStake: setRawStake1, setStake: setStake1, locked: isStakeLocked("stake1") },
    { idx: 2, label: "Seleção 2", bookie: bookie2, setBookie: setBookie2, odd: odd2, rawOdd: rawOdd2, setRawOdd: setRawOdd2, setOdd: setOdd2, stake: stake2, rawStake: rawStake2, setRawStake: setRawStake2, setStake: setStake2, locked: isStakeLocked("stake2") },
  ];

const handleSave = async (details: { gameName: string; gameDate: string; gameTime: string; market: string }) => {
    const parsed = saveOperationSchema.safeParse({
      gameName: details.gameName,
      gameDate: details.gameDate,
      gameTime: details.gameTime,
      market: details.market,
      bookie1,
      bookie2,
      totalInvestment,
      odd1,
      odd2,
      stake1,
      stake2,
      expectedProfit: netProfit,
    });

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Dados invalidos. Revise os campos.";
      toast.error(firstError);
      return;
    }

    const payload = {
      ...parsed.data,
      pivotMode,
      impliedProbability: impliedProb,
      isProfitable,
      roi,
    };

    // 2. Aqui começa a nossa integração com o banco
    try {
      // 1. Pega o usuário autenticado no momento do salvamento
      const { data: userData, error: authError } = await supabase.auth.getUser();

      if (authError || !userData?.user) {
        toast.error("Você precisa estar logado para salvar.");
        return;
      }

      // 2. Salva usando o ID real do usuário logado
      const { error } = await supabase
        .from("bet_operations")
        .insert([
          {
            user_id: userData.user.id,
            event_name: payload.gameName,
            event_date: payload.gameDate,
            event_time: payload.gameTime,
            market: payload.market,
            pivot_mode: payload.pivotMode,
            total_investment: payload.totalInvestment,
            bookie_1: payload.bookie1,
            odd_1: payload.odd1,
            stake_1: payload.stake1,
            bookie_2: payload.bookie2,
            odd_2: payload.odd2,
            stake_2: payload.stake2,
            expected_profit: payload.expectedProfit,
            status: "pending",
          },
        ]);

      if (error) {
        toast.error("Erro ao salvar no banco. Tente novamente.");
        return;
      }

      toast.success("Golaço! Operação salva com sucesso nas nuvens!");
      setShowModal(false); // Fecha o modal como no original

    } catch (err) {
      toast.error("Erro crítico ao tentar salvar a operação.");
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
          <div className="inline-flex items-center gap-3">
            <Calculator className="h-8 w-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold font-mono text-foreground tracking-tight">
              Calculadora de Surebet
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">Otimize suas entradas com Dutching dinâmico</p>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card p-5 md:p-6 space-y-5"
        >
          {/* Pivot Selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Tipo de Cálculo:
            </label>
            <div className="flex rounded-lg bg-secondary p-1 gap-1">
              {pivotOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPivotMode(opt.value)}
                  className={`flex-1 py-2 px-2 rounded-md text-xs md:text-sm font-medium transition-all duration-200 ${
                    pivotMode === opt.value
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Total Investment Input */}
          {pivotMode === "total" && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="h-3.5 w-3.5" />
                Investimento Total (R$)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={rawTotal}
                onChange={(e) => {
                  setRawTotal(e.target.value);
                  setTotalInvestment(parseLocaleNumber(e.target.value));
                }}
                className={inputBaseClass + " text-lg"}
              />
            </div>
          )}

          {/* Table Header */}
          <div className="hidden md:grid grid-cols-[1fr_0.7fr_0.9fr_0.8fr] gap-3 text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
            <span>Casa de Aposta</span>
            <span>Odd</span>
            <span>Montante R$</span>
            <span>Retorno</span>
          </div>

          {/* Rows */}
          {rows.map((row) => (
            <div key={row.idx} className="space-y-2 md:space-y-0">
              <span className="md:hidden text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {row.label}
              </span>
              <div className="grid grid-cols-2 md:grid-cols-[1fr_0.7fr_0.9fr_0.8fr] gap-3 items-center">
                {/* Bookie */}
                <div className="col-span-2 md:col-span-1">
                  <input
                    type="text"
                    value={row.bookie}
                    onChange={(e) => row.setBookie(e.target.value)}
                    placeholder="Casa de Aposta"
                    className={inputBaseClass}
                  />
                </div>

                {/* Odd */}
                <div>
                  <label className="md:hidden text-[10px] text-muted-foreground mb-0.5 block">Odd</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={row.rawOdd}
                    onChange={(e) => {
                      row.setRawOdd(e.target.value);
                      row.setOdd(parseLocaleNumber(e.target.value));
                    }}
                    placeholder="2,00"
                    className={inputBaseClass}
                  />
                </div>

                {/* Stake */}
                <div className="relative">
                  <label className="md:hidden text-[10px] text-muted-foreground mb-0.5 flex items-center gap-1">
                    Montante R$
                    {row.locked ? <Lock className="h-2.5 w-2.5" /> : <Unlock className="h-2.5 w-2.5 text-primary" />}
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={row.locked ? row.stake.toFixed(2) : row.rawStake}
                    onChange={(e) => {
                      if (!row.locked) {
                        row.setRawStake(e.target.value);
                        row.setStake(parseLocaleNumber(e.target.value));
                      }
                    }}
                    disabled={row.locked}
                    placeholder="0,00"
                    className={`${inputBaseClass} ${
                      row.locked ? "opacity-60 cursor-not-allowed bg-locked" : "border-primary/30"
                    }`}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 md:top-2.5 md:translate-y-0">
                    {row.locked ? (
                      <Lock className="h-3 w-3 text-muted-foreground hidden md:block" />
                    ) : (
                      <Unlock className="h-3 w-3 text-primary hidden md:block" />
                    )}
                  </span>
                </div>

                {/* Return */}
                <div className="col-span-2 md:col-span-1 rounded-md bg-secondary/50 px-3 py-2 text-center md:text-left">
                  <span className="md:hidden text-[10px] text-muted-foreground mr-1">Retorno:</span>
                  <span className="font-mono text-sm font-semibold text-primary">
                    {formatBRL(row.stake * row.odd)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`rounded-xl border-2 p-5 space-y-4 transition-colors ${
            isProfitable ? "border-profit/40 bg-profit/5" : "border-loss/40 bg-loss/5"
          }`}
        >
          <div className="flex items-center gap-3">
            {isProfitable ? (
              <CheckCircle2 className="h-5 w-5 text-profit" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-loss" />
            )}
            <h2 className={`text-base font-bold ${isProfitable ? "text-profit" : "text-loss"}`}>
              {isProfitable ? "Operação Lucrativa" : "Surebet Inválida (Prejuízo)"}
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Investimento Total", value: formatBRL(totalInvestment) },
              { label: "Retorno Total", value: formatBRL(totalReturn) },
              { label: "Lucro Líquido", value: formatBRL(netProfit), highlight: true },
              { label: "ROI (%)", value: `${formatPercent(roi)}%`, highlight: true },
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <p
                  className={`font-mono text-base font-bold ${
                    item.highlight ? (isProfitable ? "text-profit" : "text-loss") : "text-foreground"
                  }`}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div className="text-xs text-muted-foreground">
            Probabilidade Implícita: {formatPercent(impliedProb * 100)}%
          </div>
        </motion.div>

        {/* Save Button */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowModal(true)}
          className="w-full rounded-xl bg-primary py-4 text-primary-foreground font-semibold text-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Save className="h-5 w-5" />
          Salvar Operação
        </motion.button>
      </div>

      <SaveOperationModal open={showModal} onClose={() => setShowModal(false)} onSave={handleSave} />
    </div>
  );
}
