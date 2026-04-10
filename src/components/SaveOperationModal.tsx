import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

interface SaveOperationModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (details: { gameName: string; gameDate: string; gameTime: string; market: string }) => void;
}

const inputClass =
  "w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

export default function SaveOperationModal({ open, onClose, onSave }: SaveOperationModalProps) {
  const [gameName, setGameName] = useState("");
  const [gameDate, setGameDate] = useState("");
  const [gameTime, setGameTime] = useState("");
  const [market, setMarket] = useState("");

  const handleSubmit = () => {
    onSave({ gameName, gameDate, gameTime, market });
    setGameName("");
    setGameDate("");
    setGameTime("");
    setMarket("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Detalhes do Evento</DialogTitle>
          <DialogDescription>Preencha as informações do evento para registrar a operação.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Nome do Jogo</label>
            <input
              type="text"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              placeholder="Ex: Time A x Time B"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Data do Jogo</label>
              <input
                type="date"
                value={gameDate}
                onChange={(e) => setGameDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Hora do Jogo</label>
              <input
                type="time"
                value={gameTime}
                onChange={(e) => setGameTime(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Mercado</label>
            <input
              type="text"
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              placeholder="Ex: Resultado Final, Ambas Marcam"
              className={inputClass}
            />
          </div>
        </div>

        <DialogFooter>
          <button
            onClick={handleSubmit}
            className="w-full rounded-lg bg-primary py-2.5 text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Confirmar e Registrar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
