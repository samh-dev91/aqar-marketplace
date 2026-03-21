import Decimal from 'decimal.js';

export function formatPrice(amount: Decimal | number | string, currency = 'EGP'): string {
  const d = new Decimal(amount);
  const num = d.toNumber();
  if (num >= 1_000_000) {
    return `${new Decimal(num).div(1_000_000).toDecimalPlaces(1).toString()} مليون ${currency}`;
  }
  if (num >= 1_000) {
    return `${new Decimal(num).div(1_000).toDecimalPlaces(0).toString()} ألف ${currency}`;
  }
  return `${d.toFixed(0)} ${currency}`;
}

export function formatPriceShort(amount: Decimal | number | string): string {
  const d = new Decimal(amount);
  const num = d.toNumber();
  if (num >= 1_000_000) return `${new Decimal(num).div(1_000_000).toDecimalPlaces(1)}M`;
  if (num >= 1_000) return `${new Decimal(num).div(1_000).toDecimalPlaces(0)}K`;
  return d.toFixed(0);
}

export function formatArea(area: Decimal | number | string): string {
  return `${new Decimal(area).toFixed(0)} م²`;
}

export function calcMonthlyInstallment(
  price: Decimal | number | string,
  downPayment: Decimal | number | string,
  months: number,
  annualInterestRate = 0
): Decimal {
  const p = new Decimal(price);
  const d = new Decimal(downPayment);
  const principal = p.minus(d);
  if (annualInterestRate === 0) {
    return principal.div(months).toDecimalPlaces(2);
  }
  const r = new Decimal(annualInterestRate).div(100).div(12);
  const factor = r.times(new Decimal(1).plus(r).pow(months))
    .div(new Decimal(1).plus(r).pow(months).minus(1));
  return principal.times(factor).toDecimalPlaces(2);
}

export function hashPhone(phone: string): string {
  // Simple normalized hash for dedup — actual SHA-256 done server-side
  return phone.replace(/\D/g, '').replace(/^0/, '+20');
}
