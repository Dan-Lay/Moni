import { Transaction, TransactionCategory, TransactionSource } from "./types";

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
    if (rule.keywords.test(desc)) {
      return rule.category;
    }
  }
  return "outros";
}

// ── Source detection from description or file context ──
export function detectSource(description: string, fileHint?: string): TransactionSource {
  const d = (description + " " + (fileHint || "")).toLowerCase();
  if (/santander/.test(d)) return "santander";
  if (/bradesco/.test(d)) return "bradesco";
  if (/nubank|nu\b/.test(d)) return "nubank";
  return "unknown";
}

// ── Miles calculation: (BRL / cotacao) * 2 — only for Santander ──
const DOLLAR_RATE = 5.0;

export function calculateMiles(amount: number, source: TransactionSource): number {
  if (source !== "santander" || amount >= 0) return 0;
  return Math.round((Math.abs(amount) / DOLLAR_RATE) * 2);
}

// ── Check if spending is "inefficient" (not generating AA miles) ──
export function isInefficient(source: TransactionSource): boolean {
  return source === "bradesco" || source === "nubank";
}

// ── Build a Transaction object from raw parsed data ──
let counter = 0;
export function buildTransaction(
  date: string,
  description: string,
  amount: number,
  fileSourceHint?: string
): Transaction {
  const source = detectSource(description, fileSourceHint);
  const category = categorizeTransaction(description);
  const miles = calculateMiles(amount, source);

  return {
    id: `tx_${Date.now()}_${counter++}`,
    date,
    description,
    amount,
    source,
    category,
    milesGenerated: miles,
    isInefficient: isInefficient(source),
    establishment: extractEstablishment(description),
  };
}

function extractEstablishment(desc: string): string {
  // Clean common OFX prefixes
  return desc
    .replace(/^(COMPRA|PGTO|PAG|DEB|TRANSF|PIX)\s*/i, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .substring(0, 50);
}

// ── Determine if a transaction is a "dinner" (restaurant) ──
export function isDinnerTransaction(t: Transaction): boolean {
  return t.category === "alimentacao" || /restaurante|jantar|dinner/i.test(t.description);
}
