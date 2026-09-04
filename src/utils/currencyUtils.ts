/**
 * Utility functions for currency formatting across Sappy POS
 */

export function formatCurrency(amount: number | undefined | null, currencySymbol: string = 'ETB'): string {
  const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  const formatted = safeAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const symbol = (currencySymbol || 'ETB').trim();
  
  // If currency code is alphanumeric (e.g. ETB, USD, EUR), format with space: "ETB 150.00"
  if (/^[A-Za-z]+$/.test(symbol)) {
    return `${symbol} ${formatted}`;
  }
  // Otherwise format directly: "$150.00" or "€150.00"
  return `${symbol}${formatted}`;
}

export const DEFAULT_CURRENCY = 'ETB';
