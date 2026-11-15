/**
 * Reads a money amount as people type it on a phone: "100", "100,50", "1.250,00", "R$ 80".
 * Returns null for empty or unreadable input (the budget is optional).
 */
export function parseAmount(text: string): number | null {
  const cleaned = text.replace(/[^\d.,]/g, '');
  if (!cleaned) return null;
  const lastSeparator = Math.max(cleaned.lastIndexOf(','), cleaned.lastIndexOf('.'));
  // A separator followed by 1 or 2 digits is the decimal one; any other is for thousands.
  const hasDecimals = lastSeparator >= 0 && cleaned.length - lastSeparator - 1 <= 2;
  const integerPart = (hasDecimals ? cleaned.slice(0, lastSeparator) : cleaned).replace(/[.,]/g, '');
  const decimalPart = hasDecimals ? cleaned.slice(lastSeparator + 1) : '';
  const value = Number(`${integerPart || '0'}.${decimalPart || '0'}`);
  if (!Number.isFinite(value) || value <= 0 || value >= 100_000_000) return null;
  return Math.round(value * 100) / 100;
}

/** The stored amount back into the field ("100" or "100,50" in pt-BR). */
export function amountToInput(value: number | null, locale: string): string {
  if (value === null) return '';
  return new Intl.NumberFormat(locale, {maximumFractionDigits: 2, useGrouping: false}).format(value);
}
