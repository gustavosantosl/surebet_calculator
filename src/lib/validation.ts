import { z } from "zod";

const trimmedText = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, `${label} deve ter pelo menos ${min} caracteres.`)
    .max(max, `${label} deve ter no maximo ${max} caracteres.`);

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const operationDetailsSchema = z.object({
  gameName: trimmedText("Nome do jogo", 3, 120),
  gameDate: z.string().regex(dateRegex, "Data do jogo invalida."),
  gameTime: z.string().regex(timeRegex, "Hora do jogo invalida."),
  market: trimmedText("Mercado", 2, 80),
});

export const saveOperationSchema = operationDetailsSchema.extend({
  bookie1: trimmedText("Casa 1", 2, 60),
  bookie2: trimmedText("Casa 2", 2, 60),
  totalInvestment: z.number().positive("Investimento total deve ser maior que zero."),
  odd1: z.number().gt(1, "Odd 1 deve ser maior que 1."),
  odd2: z.number().gt(1, "Odd 2 deve ser maior que 1."),
  stake1: z.number().positive("Montante da selecao 1 deve ser maior que zero."),
  stake2: z.number().positive("Montante da selecao 2 deve ser maior que zero."),
  expectedProfit: z.number().finite("Lucro esperado invalido."),
});

export const editOperationSchema = z.object({
  event_name: trimmedText("Evento", 3, 120),
  event_date: z.string().regex(dateRegex, "Data do evento invalida."),
  market: trimmedText("Mercado", 2, 80),
  bookie_1: z.string().trim().max(60, "Casa 1 deve ter no maximo 60 caracteres.").optional(),
  bookie_2: z.string().trim().max(60, "Casa 2 deve ter no maximo 60 caracteres.").optional(),
  total_investment: z.number().positive("Investimento total deve ser maior que zero."),
  expected_profit: z.number().finite("Lucro esperado invalido."),
});
