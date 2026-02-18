import { buildTransaction } from "./categorizer";
import { Transaction } from "./types";

// ── OFX Parser (browser-side) ──
export function parseOFX(content: string, fileSourceHint?: string): Transaction[] {
  const transactions: Transaction[] = [];

  // Extract STMTTRN blocks
  const txRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match;

  while ((match = txRegex.exec(content)) !== null) {
    const block = match[1];

    const dateMatch = block.match(/<DTPOSTED>(\d{8})/);
    const amountMatch = block.match(/<TRNAMT>([-\d.,]+)/);
    const nameMatch = block.match(/<NAME>(.+?)(?:\r?\n|<)/);
    const memoMatch = block.match(/<MEMO>(.+?)(?:\r?\n|<)/);

    if (dateMatch && amountMatch) {
      const rawDate = dateMatch[1];
      const date = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
      const amount = parseFloat(amountMatch[1].replace(",", "."));
      const description = (nameMatch?.[1] || memoMatch?.[1] || "Sem descrição").trim();

      // Try to detect bank from OFX org tag
      const orgMatch = content.match(/<ORG>(.+?)(?:\r?\n|<)/i);
      const hint = fileSourceHint || orgMatch?.[1] || "";

      transactions.push(buildTransaction(date, description, amount, hint));
    }
  }

  return transactions;
}

// ── CSV Parser ──
export function parseCSV(content: string, fileSourceHint?: string): Transaction[] {
  const transactions: Transaction[] = [];
  const lines = content.split(/\r?\n/).filter((l) => l.trim());

  if (lines.length < 2) return transactions;

  // Detect header
  const header = lines[0].toLowerCase();
  const separator = header.includes(";") ? ";" : ",";
  const cols = header.split(separator).map((c) => c.trim().replace(/"/g, ""));

  // Find column indices
  const dateIdx = cols.findIndex((c) => /data|date/.test(c));
  const amountIdx = cols.findIndex((c) => /valor|amount|value/.test(c));
  const descIdx = cols.findIndex((c) => /descri|description|historico|memo|name/.test(c));

  if (dateIdx === -1 || amountIdx === -1) {
    // Fallback: assume columns 0=date, 1=description, 2=amount
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(separator).map((p) => p.trim().replace(/"/g, ""));
      if (parts.length < 3) continue;

      const date = normalizeDate(parts[0]);
      const description = parts[1] || "Sem descrição";
      const amount = parseAmount(parts[2]);

      if (date && !isNaN(amount)) {
        transactions.push(buildTransaction(date, description, amount, fileSourceHint));
      }
    }
    return transactions;
  }

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(separator).map((p) => p.trim().replace(/"/g, ""));
    if (parts.length <= Math.max(dateIdx, amountIdx)) continue;

    const date = normalizeDate(parts[dateIdx]);
    const description = parts[descIdx] || parts[descIdx + 1] || "Sem descrição";
    const amount = parseAmount(parts[amountIdx]);

    if (date && !isNaN(amount)) {
      transactions.push(buildTransaction(date, description, amount, fileSourceHint));
    }
  }

  return transactions;
}

function normalizeDate(raw: string): string {
  // Handle dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd
  const dmy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;

  const ymd = raw.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymd) return `${ymd[1]}-${ymd[2].padStart(2, "0")}-${ymd[3].padStart(2, "0")}`;

  return raw;
}

function parseAmount(raw: string): number {
  // Handle "1.234,56" (BR format) and "1234.56"
  let cleaned = raw.replace(/\s/g, "");
  if (/\d\.\d{3},/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (/,\d{2}$/.test(cleaned)) {
    cleaned = cleaned.replace(",", ".");
  }
  return parseFloat(cleaned);
}
