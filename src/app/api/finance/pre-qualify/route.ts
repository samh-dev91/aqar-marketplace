import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Decimal from 'decimal.js';
import { redis } from '@/lib/redis';

const schema = z.object({
  monthlyIncome: z.number().positive(),
  employmentType: z.enum(['employed', 'self_employed', 'business']),
  nationality: z.string().min(1),
});

const BANK_SUGGESTIONS = [
  'البنك الأهلي المصري',
  'بنك CIB',
  'بنك مصر',
  'بنك التعمير والإسكان',
];

/** Standard amortization monthly payment estimate (not using Decimal for Math.pow — display only). */
function estimateMonthlyPayment(loanAmount: Decimal, annualRate: number, years: number): Decimal {
  const monthlyRate = annualRate / 12;
  const n = years * 12;
  // payment = loan * (r * (1+r)^n) / ((1+r)^n - 1)
  const factor = Math.pow(1 + monthlyRate, n);
  const payment = loanAmount.toNumber() * (monthlyRate * factor) / (factor - 1);
  return new Decimal(payment).toDecimalPlaces(2);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Rate limit: 20 per IP per hour
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown';
  const rateLimitKey = `prequalify_rate:${ip}`;
  try {
    const count = await redis.incr(rateLimitKey);
    if (count === 1) await redis.expire(rateLimitKey, 3600);
    if (count > 20) {
      return NextResponse.json(
        { success: false, message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }
  } catch {
    // Redis unavailable — allow the request
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { monthlyIncome, employmentType, nationality } = parsed.data;

  // LTV factor by employment type
  const ltvMap: Record<string, number> = {
    employed: 0.80,
    self_employed: 0.70,
    business: 0.75,
  };
  let ltv = ltvMap[employmentType] ?? 0.70;

  // Nationality adjustment
  const isEgyptian =
    nationality.toLowerCase().includes('egypt') ||
    nationality.toLowerCase().includes('مصر');
  if (!isEgyptian) {
    ltv = ltv * 0.85;
  }

  const ltvDecimal = new Decimal(ltv).toDecimalPlaces(4);
  const income = new Decimal(monthlyIncome);

  // Max loan = monthlyIncome × 7 × 12 × ltv
  const factor = new Decimal(7).times(12).times(ltvDecimal);
  const maxLoanAmount = income.times(factor).toDecimalPlaces(2);

  // Monthly payment estimate at 14% annual for 20 years
  const monthlyPaymentEstimate = estimateMonthlyPayment(maxLoanAmount, 0.14, 20);

  return NextResponse.json({
    success: true,
    maxLoanAmount: maxLoanAmount.toString(),
    monthlyPaymentEstimate: monthlyPaymentEstimate.toString(),
    ltv: ltvDecimal.toString(),
    breakdown: {
      monthlyIncome,
      factor: factor.toNumber(),
    },
    bankSuggestions: BANK_SUGGESTIONS,
  });
}
