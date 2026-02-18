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

export interface Transaction {
  id: string;
  date: string; // ISO string
  description: string;
  amount: number; // positive = credit, negative = debit
  source: TransactionSource;
  category: TransactionCategory;
  milesGenerated: number;
  isInefficient: boolean; // true if spent on non-Santander card
  establishment: string;
}

export interface FinancialConfig {
  salario: number;
  milhasAcumuladas: number;
  metaMilhas: number;
  cotacaoDolar: number;
  reservaUSD: number;
  metaUSD: number;
  cotacaoMediaDCA: number;
  maxJantaresMes: number;
  maxGastoJantar: number;
  aportePercentual: number;
}

export interface DesapegoItem {
  id: number;
  name: string;
  value: number;
  sold: boolean;
}

export interface AppData {
  transactions: Transaction[];
  config: FinancialConfig;
  desapegoItems: DesapegoItem[];
  jantaresUsados: number;
  updatedAt: string;
}
