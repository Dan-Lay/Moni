import { Transaction, TransactionCategory, TransactionSource, SpouseProfile, toISODate, toBRL, toMiles } from "./types";

// ── IOF rate for international purchases (2026) ──
const IOF_INTERNACIONAL = 0.0438; // 4.38%

// ── International detection ──
const INTERNATIONAL_KEYWORDS = /USD|EUR|GBP|CHF|JPY|INTERNACIONAL|INTL|FOREIGN|EXTERIOR|COMPRA\s*INTER|EUROPE|AMAZON\.COM(?!\.BR)|BOOKING|AIRBNB|UBER\s+TRIP|PAYPAL/i;

export function isInternationalTransaction(description: string): boolean {
  return INTERNATIONAL_KEYWORDS.test(description);
}

// ── Additional card (Esposa) detection ──
// Santander marks additional card transactions in the statement
const ADDITIONAL_CARD_KEYWORDS = /CART(?:AO)?\s*ADICIONAL|ADICIONAL|ADC\s*\d|TITULAR\s*2|ESPOSA|CONJUGE|SEGUNDA\s*VIA/i;

export function isAdditionalCard(description: string, fileHint?: string): boolean {
  const combined = `${description} ${fileHint || ""}`;
  return ADDITIONAL_CARD_KEYWORDS.test(combined);
}

export function detectSpouseProfile(
  description: string,
  fileHint?: string,
  source?: TransactionSource
): SpouseProfile {
  if (isAdditionalCard(description, fileHint)) return "esposa";
  // Non-Santander card uploaded separately → mark as familia (shared)
  if (source && source !== "santander" && source !== "unknown") return "familia";
  return "marido";
}

// ── Category rules via regex keywords ──
const CATEGORY_RULES: { category: TransactionCategory; keywords: RegExp }[] = [
  { category: "supermercado", keywords: /assai|atacadao|carrefour|extra|pao de acucar|supermercado|mercado|hiper|sams|costco|big\b/i },
  { category: "alimentacao", keywords: /ifood|rappi|uber\s?eats|mcdonald|burger|pizza|restaurante|lanchonete|padaria|starbucks|subway|outback|habib/i },
  { category: "transporte", keywords: /shell|ipiranga|posto|combustivel|gasolina|uber(?!\s?eat)|99\s?taxi|estacionamento|pedagio|sem\s?parar/i },
  { category: "ajuda_mae", keywords: /pix\s.*mae|transf.*mae|mae\b/i },
  { category: "saude", keywords: /drogaria|farmacia|droga\s?raia|drogasil|hospital|medic|clinic|laborat|unimed|amil|sulamerica/i },
  { category: "lazer", keywords: /netflix|spotify|disney\+|hbo|prime\s?video|cinema|ingresso|teatro|show|parque|game|playstation|xbox|steam/i },
  { category: "investimentos", keywords: /xp\s?invest|rico|clear|nuinvest|btg|tesouro\s?direto|cdb|lci|lca|invest/i },
  { category: "fixas", keywords: /aluguel|condominio|energia|enel|cpfl|agua|sabesp|internet|claro|vivo|tim|oi\b|seguro|iptu|ipva/i },
  { category: "compras", keywords: /amazon|mercado\s?livre|shopee|shein|magalu|americanas|casas\s?bahia|magazine/i },
];

export function categorizeTransaction(description: string): TransactionCategory {
  const desc = description.toUpperCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.test(desc)) return rule.category;
  }
  return "outros";
}

export function detectSource(description: string, fileHint?: string): TransactionSource {
  const d = (description + " " + (fileHint || "")).toLowerCase();
  if (/santander/.test(d)) return "santander";
  if (/bradesco/.test(d)) return "bradesco";
  if (/nubank|nu\b/.test(d)) return "nubank";
  return "unknown";
}

// ── Miles: Real AAdvantage formula: (BRL / cotação_dolar) * 2 ──
export function calculateMiles(
  amount: number,
  source: TransactionSource,
  isIntl: boolean,
  cotacaoDolar = 5.0
): { miles: number; iof: number } {
  if (source !== "santander" || amount >= 0) return { miles: 0, iof: 0 };

  const absAmount = Math.abs(amount);
  const iof = isIntl ? absAmount * IOF_INTERNACIONAL : 0;
  // Total charged includes IOF; AA formula applies to gross amount
  const totalCharged = absAmount + iof;
  const miles = Math.round((totalCharged / cotacaoDolar) * 2);

  return { miles, iof };
}

export function isInefficient(source: TransactionSource): boolean {
  return source === "bradesco" || source === "nubank";
}

let counter = 0;
export function buildTransaction(
  date: string,
  description: string,
  amount: number,
  fileSourceHint?: string,
  cotacaoDolar = 5.0
): Transaction {
  const source = detectSource(description, fileSourceHint);
  const category = categorizeTransaction(description);
  const isIntl = isInternationalTransaction(description);
  const additional = isAdditionalCard(description, fileSourceHint);
  const spouseProfile = detectSpouseProfile(description, fileSourceHint, source);
  const { miles, iof } = calculateMiles(amount, source, isIntl, cotacaoDolar);

  return {
    id: `tx_${Date.now()}_${counter++}`,
    date: toISODate(date),
    description,
    amount: toBRL(amount),
    source,
    category,
    milesGenerated: toMiles(miles),
    isInefficient: isInefficient(source),
    isInternational: isIntl,
    iofAmount: toBRL(iof),
    establishment: extractEstablishment(description),
    spouseProfile,
    isAdditionalCard: additional,
  };
}

function extractEstablishment(desc: string): string {
  return desc
    .replace(/^(COMPRA|PGTO|PAG|DEB|TRANSF|PIX)\s*/i, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .substring(0, 50);
}

export function isDinnerTransaction(t: Transaction): boolean {
  return t.category === "alimentacao" || /restaurante|jantar|dinner/i.test(t.description);
}
