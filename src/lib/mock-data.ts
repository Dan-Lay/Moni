/**
 * Mock data for Moni — realistic Brazilian financial data
 * Used when PocketBase is unreachable (e.g., HTTPS→HTTP PNA block)
 */
import {
  Transaction, FinancialConfig, DesapegoItem, PlannedEntry,
  toISODate, toBRL, toMiles,
  TransactionSource, TransactionCategory, SpouseProfile, RecurrenceType,
} from "./types";

const today = new Date();
const y = today.getFullYear();
const m = today.getMonth(); // 0-indexed

function d(day: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function prevMonth(day: number): string {
  const pm = m === 0 ? 11 : m - 1;
  const py = m === 0 ? y - 1 : y;
  return `${py}-${String(pm + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

let txId = 100;
function tx(
  day: string, desc: string, amount: number, source: TransactionSource,
  category: TransactionCategory, establishment: string,
  opts: { miles?: number; profile?: SpouseProfile; intl?: boolean; additional?: boolean } = {}
): Transaction {
  const isIntl = opts.intl ?? false;
  const iof = isIntl ? Math.abs(amount) * 0.0438 : 0;
  return {
    id: `mock_tx_${txId++}`,
    date: toISODate(day),
    description: desc,
    amount: toBRL(amount),
    source,
    category,
    milesGenerated: toMiles(opts.miles ?? Math.abs(amount) * (source === "santander" ? 3 : 1)),
    isInefficient: source !== "santander" && Math.abs(amount) > 50,
    isInternational: isIntl,
    iofAmount: toBRL(iof),
    establishment,
    spouseProfile: opts.profile ?? "marido",
    isAdditionalCard: opts.additional ?? false,
    cardNetwork: "other",
    isConfirmed: false,
    reconciliationStatus: "pendente",
  };
}

export const MOCK_TRANSACTIONS: Transaction[] = [
  // Current month
  tx(d(2), "Assaí Atacadista", -487.32, "santander", "supermercado", "ASSAI ATACADISTA", { miles: 1462 }),
  tx(d(3), "Uber Trip", -28.90, "nubank", "transporte", "UBER *TRIP"),
  tx(d(4), "Amazon Prime", -14.90, "bradesco", "compras", "AMAZON PRIME", { profile: "esposa", additional: true }),
  tx(d(5), "Farmácia Drogasil", -67.50, "santander", "saude", "DROGASIL"),
  tx(d(6), "Restaurante Outback", -189.00, "santander", "lazer", "OUTBACK STEAKHOUSE", { profile: "familia" }),
  tx(d(7), "Posto Shell", -220.00, "santander", "transporte", "SHELL"),
  tx(d(8), "Pix Ajuda Mãe", -800.00, "nubank", "ajuda_mae", "PIX MAE"),
  tx(d(9), "Netflix", -55.90, "bradesco", "lazer", "NETFLIX.COM", { profile: "esposa", additional: true }),
  tx(d(10), "Mercado Livre", -159.90, "santander", "compras", "MERCADOLIVRE"),
  tx(d(11), "iFood", -45.80, "nubank", "alimentacao", "IFOOD"),
  tx(d(12), "Carrefour", -312.45, "santander", "supermercado", "CARREFOUR", { miles: 937 }),
  tx(d(13), "Spotify Family", -34.90, "bradesco", "lazer", "SPOTIFY", { profile: "familia" }),
  tx(d(14), "Condomínio", -950.00, "nubank", "fixas", "CONDOMINIO"),
  tx(d(15), "Disney+ Bundle", -33.90, "santander", "lazer", "DISNEY PLUS", { intl: true }),
  tx(d(15), "Salário", 12000.00, "santander", "outros", "SALARIO"),
  tx(d(16), "Aporte Investimento", -1800.00, "santander", "investimentos", "CLEAR CORRETORA"),
  tx(d(17), "Padaria Real", -23.50, "santander", "alimentacao", "PADARIA REAL"),
  tx(d(18), "Uber Eats", -62.00, "nubank", "alimentacao", "UBER EATS"),
  // Previous month (for cash flow history)
  tx(prevMonth(5), "Assaí", -520.00, "santander", "supermercado", "ASSAI ATACADISTA", { miles: 1560 }),
  tx(prevMonth(10), "Salário", 12000.00, "santander", "outros", "SALARIO"),
  tx(prevMonth(12), "Condomínio", -950.00, "nubank", "fixas", "CONDOMINIO"),
  tx(prevMonth(15), "Aporte", -1800.00, "santander", "investimentos", "CLEAR CORRETORA"),
  tx(prevMonth(20), "Restaurante Madero", -210.00, "santander", "lazer", "MADERO", { profile: "familia" }),
  tx(prevMonth(22), "Carrefour", -290.00, "santander", "supermercado", "CARREFOUR"),
  tx(prevMonth(25), "Farmácia Raia", -89.00, "santander", "saude", "DROGA RAIA"),
];

export const MOCK_CONFIG: FinancialConfig & Record<string, any> = {
  salarioLiquido: 12000,
  milhasAtuais: 142500,
  metaDisney: 600000,
  cotacaoDolar: 5.85,
  reservaUSD: 2400,
  metaUSD: 8000,
  cotacaoEuro: 6.10,
  reservaEUR: 800,
  metaEUR: 6000,
  cotacaoMediaDCA: 5.42,
  cotacaoMediaDCAEUR: 5.80,
  maxJantaresMes: 2,
  maxGastoJantar: 250,
  aportePercentual: 15,
  iofInternacional: 4.38,
  limiteSeguranca: 2000,
  maxCinemasMes: 2,
  maxGastoCinema: 60,
  customCategories: [],
  // Miguel 2027 meta
  metaMiguelEUR: 3000,
  reservaBRLParaMiguel: 5000,
  // Investment breakdown
  investPrevidencia: 300,
  investEmergencia: 400,
  investRendaFixa: 350,
  investFIIs: 300,
  investAcoes: 250,
  investBitcoin: 200,
  milhasConversaoMastercardBRL: 2.0,
  milhasConversaoMastercardUSD: 3.0,
  milhasConversaoVisaBRL: 2.6,
  milhasConversaoVisaUSD: 3.6,
};

export const MOCK_PLANNED_ENTRIES: PlannedEntry[] = [
  {
    id: "mock_pe_1", name: "Condomínio", amount: -950, category: "fixas",
    dueDate: toISODate(d(14)), recurrence: "mensal" as RecurrenceType,
    spouseProfile: "familia", conciliado: true, realAmount: -950,
    createdAt: toISODate(prevMonth(1)),
  },
  {
    id: "mock_pe_2", name: "Internet Vivo Fibra", amount: -149.90, category: "fixas",
    dueDate: toISODate(d(20)), recurrence: "mensal" as RecurrenceType,
    spouseProfile: "familia", conciliado: false,
    createdAt: toISODate(prevMonth(1)),
  },
  {
    id: "mock_pe_3", name: "Seguro Auto", amount: -380, category: "transporte",
    dueDate: toISODate(d(25)), recurrence: "mensal" as RecurrenceType,
    spouseProfile: "marido", conciliado: false,
    createdAt: toISODate(prevMonth(1)),
  },
  {
    id: "mock_pe_4", name: "Aporte Renda Fixa", amount: -1800, category: "investimentos",
    dueDate: toISODate(d(16)), recurrence: "mensal" as RecurrenceType,
    spouseProfile: "marido", conciliado: true, realAmount: -1800,
    createdAt: toISODate(prevMonth(1)),
  },
];

export const MOCK_DESAPEGO_ITEMS: DesapegoItem[] = [
  { id: 1, name: "iPhone 13 Mini", value: 1800, sold: true },
  { id: 2, name: "Monitor LG 27\"", value: 900, sold: false },
  { id: 3, name: "Kindle Paperwhite", value: 350, sold: true },
  { id: 4, name: "Bicicleta Caloi", value: 600, sold: false },
  { id: 5, name: "PlayStation 4 Pro", value: 1200, sold: false },
];

export const MOCK_USER = {
  id: "mock_user_001",
  name: "Dan",
  email: "contato.dan@gmail.com",
  avatarUrl: "",
  defaultProfile: "todos" as const,
  mfaEnabled: false,
  isAdmin: true,
  familyId: null as string | null,
};

export const MOCK_JANTARES_USADOS = 1;
export const MOCK_CINEMAS_USADOS = 0;
