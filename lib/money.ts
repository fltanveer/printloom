import type { Currency } from './types';

export const DEFAULT_USD_RATE = 120; // BDT per USD, one constant for every conversion

/** Round a BDT amount to the nearest 5 taka. Used only on final unit prices. */
export function roundTo5(bdt: number): number {
  return Math.round(bdt / 5) * 5;
}

/** Round to 2 decimals to avoid floating point noise (splits, commission). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function toCurrency(bdt: number, currency: Currency, usdRate = DEFAULT_USD_RATE): number {
  return currency === 'USD' ? bdt / usdRate : bdt;
}

export function formatMoney(
  bdt: number,
  currency: Currency = 'BDT',
  usdRate = DEFAULT_USD_RATE,
  opts: { decimals?: boolean; sign?: boolean } = {},
): string {
  const negative = bdt < 0;
  const abs = Math.abs(bdt);
  let body: string;
  if (currency === 'USD') {
    const usd = Math.round((abs / usdRate) * 20) / 20; // nearest $0.05
    body = '$' + usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else {
    const hasFraction = Math.abs(abs - Math.round(abs)) > 0.001;
    const showDecimals = opts.decimals ?? hasFraction;
    body =
      '৳' +
      abs.toLocaleString('en-US', {
        minimumFractionDigits: showDecimals ? 2 : 0,
        maximumFractionDigits: showDecimals ? 2 : 0,
      });
  }
  if (negative) return '-' + body;
  if (opts.sign && bdt > 0) return '+' + body;
  return body;
}
