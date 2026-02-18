// ── Branded types for strict monetary and date handling ──

/** ISO 8601 date string (YYYY-MM-DD) */
export type ISODateString = string & { readonly __brand: "ISODateString" };

/** Monetary value in BRL cents to avoid floating point issues */
export type BRLAmount = number & { readonly __brand: "BRLAmount" };

/** Miles count (always integer) */
export type MilesCount = number & { readonly __brand: "MilesCount" };

/** Percentage value (0-100) */
export type Percentage = number & { readonly __brand: "Percentage" };

// ── Helper constructors ──
export const toISODate = (s: string): ISODateString => s as ISODateString;
export const toBRL = (n: number): BRLAmount => n as BRLAmount;
export const toMiles = (n: number): MilesCount => Math.round(n) as MilesCount;
export const toPercent = (n: number): Percentage => n as Percentage;

// ── Formatting helpers ──
export const formatBRL = (amount: number): string =>
  `R$ ${Math.abs(amount).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatBRLShort = (amount: number): string =>
  `R$ ${Math.abs(amount).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export const formatMiles = (miles: number): string =>
  miles.toLocaleString("pt-BR");

// ── Enums ──
export type TransactionSource = "santander" | "bradesco" | "nubank" | "unknown";

export type TransactionCategory =
  | "supermercado"
  | "ajuda_mae"
  | "lazer"
  | "fixas"
  | "investimentos"
  | "transporte"
  | "saude"
  | "alimentacao"
  | "compras"
  | "outros";

export const CATEGORY_LABELS: Record<TransactionCategory, string> = {
  supermercado: "Supermercado",
  alimentacao: "Alimentação",
  transporte: "Transporte",
  ajuda_mae: "Ajuda Mãe",
  saude: "Saúde",
  lazer: "Lazer",
  investimentos: "Investimentos",
  fixas: "Fixas",
  compras: "Compras",
  outros: "Outros",
};

export const SOURCE_LABELS: Record<TransactionSource, string> = {
  santander: "Santander",
  bradesco: "Bradesco",
  nubank: "Nubank",
  unknown: "Outros",
};

// ── Core interfaces ──
export interface Transaction {
  readonly id: string;
  readonly date: ISODateString;
  readonly description: string;
  readonly amount: BRLAmount; // positive = credit, negative = debit
  readonly source: TransactionSource;
  readonly category: TransactionCategory;
  readonly milesGenerated: MilesCount;
  readonly isInefficient: boolean;
  readonly isInternational: boolean;
  readonly iofAmount: BRLAmount; // IOF charged (4.38% for international)
  readonly establishment: string;
}

export interface FinancialConfig {
  readonly salarioLiquido: number;
  readonly milhasAtuais: number;
  readonly metaDisney: number;
  readonly cotacaoDolar: number;
  readonly reservaUSD: number;
  readonly metaUSD: number;
  readonly cotacaoMediaDCA: number;
  readonly maxJantaresMes: number;
  readonly maxGastoJantar: number;
  readonly aportePercentual: number;
  readonly iofInternacional: number; // 4.38% for 2026
}

export interface DesapegoItem {
  readonly id: number;
  readonly name: string;
  readonly value: number;
  readonly sold: boolean;
}

export interface AppData {
  readonly transactions: Transaction[];
  readonly config: FinancialConfig;
  readonly desapegoItems: DesapegoItem[];
  readonly jantaresUsados: number;
  readonly updatedAt: ISODateString;
}

// ── Computed stat interfaces ──
export interface EfficiencyStats {
  readonly totalSpent: number;
  readonly santanderSpent: number;
  readonly efficiency: Percentage;
  readonly lostMiles: MilesCount;
  readonly internationalSpent: number;
  readonly totalIOF: number;
  readonly milesAfterIOF: MilesCount; // real miles considering IOF cost
}

export interface MonthSummary {
  readonly totalIncome: number;
  readonly totalExpenses: number;
  readonly balance: number;
  readonly milesGenerated: MilesCount;
  readonly aporteRealizado: number;
  readonly aportePercent: Percentage;
  readonly transactionCount: number;
}

export interface CashFlowPoint {
  readonly dia: string;
  readonly saldo: number;
}

export interface CategoryBreakdown {
  readonly category: TransactionCategory;
  readonly label: string;
  readonly amount: number;
  readonly percentage: Percentage;
  readonly color: string;
}

export interface EstablishmentRank {
  readonly name: string;
  readonly amount: number;
  readonly transactionCount: number;
}
