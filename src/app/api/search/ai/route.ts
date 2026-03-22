import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { redis } from '@/lib/redis';
import { recordPopularQuery } from '@/app/api/autocomplete/route';

export const dynamic = 'force-dynamic';

// Valid enum values mirroring the Prisma schema
const VALID_PROPERTY_TYPES = [
  'APARTMENT', 'VILLA', 'TOWNHOUSE', 'DUPLEX', 'PENTHOUSE',
  'OFFICE', 'SHOP', 'LAND', 'WAREHOUSE', 'BUILDING', 'OTHER',
] as const;
const VALID_TRANSACTION_TYPES = ['SALE', 'RENT'] as const;
const VALID_VERIFICATION_TIERS = ['LISTED', 'VERIFIED', 'GOLD'] as const;

type PropertyType = typeof VALID_PROPERTY_TYPES[number];
type TransactionType = typeof VALID_TRANSACTION_TYPES[number];
type VerificationTier = typeof VALID_VERIFICATION_TIERS[number];

interface ParsedFilters {
  city?: string;
  district?: string;
  propertyType?: PropertyType;
  transactionType?: TransactionType;
  bedrooms?: number;
  maxPrice?: number;
  minPrice?: number;
  monthlyBudget?: number;
  hasFinancing?: boolean;
  verificationTier?: VerificationTier;
}

/**
 * Type guard: validates and sanitises the raw JSON Claude returned.
 * Any field that doesn't match the expected type/enum is silently dropped.
 */
function sanitiseFilters(raw: unknown): ParsedFilters {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

  const obj = raw as Record<string, unknown>;
  const out: ParsedFilters = {};

  if (typeof obj.city === 'string' && obj.city.trim()) {
    out.city = obj.city.trim();
  }
  if (typeof obj.district === 'string' && obj.district.trim()) {
    out.district = obj.district.trim();
  }
  if (
    typeof obj.propertyType === 'string' &&
    (VALID_PROPERTY_TYPES as readonly string[]).includes(obj.propertyType)
  ) {
    out.propertyType = obj.propertyType as PropertyType;
  }
  if (
    typeof obj.transactionType === 'string' &&
    (VALID_TRANSACTION_TYPES as readonly string[]).includes(obj.transactionType)
  ) {
    out.transactionType = obj.transactionType as TransactionType;
  }
  if (typeof obj.bedrooms === 'number' && Number.isFinite(obj.bedrooms) && obj.bedrooms > 0) {
    out.bedrooms = Math.floor(obj.bedrooms);
  }
  if (typeof obj.maxPrice === 'number' && Number.isFinite(obj.maxPrice) && obj.maxPrice > 0) {
    out.maxPrice = obj.maxPrice;
  }
  if (typeof obj.minPrice === 'number' && Number.isFinite(obj.minPrice) && obj.minPrice > 0) {
    out.minPrice = obj.minPrice;
  }
  if (
    typeof obj.monthlyBudget === 'number' &&
    Number.isFinite(obj.monthlyBudget) &&
    obj.monthlyBudget > 0
  ) {
    out.monthlyBudget = obj.monthlyBudget;
  }
  if (typeof obj.hasFinancing === 'boolean') {
    out.hasFinancing = obj.hasFinancing;
  }
  if (
    typeof obj.verificationTier === 'string' &&
    (VALID_VERIFICATION_TIERS as readonly string[]).includes(obj.verificationTier)
  ) {
    out.verificationTier = obj.verificationTier as VerificationTier;
  }

  return out;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Parse and validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'invalid_json', filters: {} },
      { status: 400 },
    );
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json(
      { success: false, error: 'invalid_body', filters: {} },
      { status: 400 },
    );
  }

  const { query } = body as Record<string, unknown>;

  if (typeof query !== 'string' || query.trim().length < 3 || query.trim().length > 500) {
    return NextResponse.json(
      {
        success: false,
        error: 'query must be between 3 and 500 characters',
        filters: {},
      },
      { status: 400 },
    );
  }

  const q = query.trim();

  // 2. Rate limit: 10 NL searches per IP per hour (sliding window via incr/expire)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  try {
    const rateLimitKey = `ratelimit:ai-search:${ip}`;
    const count = await redis.incr(rateLimitKey);
    if (count === 1) await redis.expire(rateLimitKey, 3600); // 1-hour window
    if (count > 10) {
      return NextResponse.json(
        { success: false, error: 'rate_limit_exceeded', filters: {} },
        { status: 429 },
      );
    }
  } catch { /* Redis unavailable — allow request */ }

  // 3. Cache check
  const cacheKey = `ai-search:${Buffer.from(q).toString('base64').slice(0, 32)}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as ParsedFilters;
      const res = NextResponse.json({ success: true, filters: parsed, query: q, cached: true });
      res.headers.set('X-Cache', 'HIT');
      return res;
    }
  } catch { /* Redis unavailable */ }

  // 4. Call Claude to parse the Arabic query
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: `You are a real estate search parameter extractor for Egyptian property listings.
Extract search parameters from the Arabic query and return ONLY valid JSON.
Valid propertyType values: APARTMENT, VILLA, TOWNHOUSE, DUPLEX, PENTHOUSE, OFFICE, SHOP, LAND, WAREHOUSE, BUILDING, OTHER
Valid transactionType values: SALE, RENT
Valid verificationTier values: LISTED, VERIFIED, GOLD
Return JSON with only these optional fields:
{ city?, district?, propertyType?, transactionType?, bedrooms?, maxPrice?, minPrice?, monthlyBudget?, hasFinancing?, verificationTier? }
If a value cannot be determined, omit the field. Numbers should be numeric (not strings).
Egyptian price abbreviations: م = million (multiply by 1,000,000), ألف = thousand (multiply by 1,000)
Common districts: المعادي (Maadi), الزمالك (Zamalek), مدينة نصر (Nasr City), التجمع (New Cairo), 6 أكتوبر (6th October), الشيخ زايد (Sheikh Zayed)`,
      messages: [{ role: 'user', content: q }],
    });

    // Extract text from the first content block
    const firstBlock = message.content[0];
    if (!firstBlock || firstBlock.type !== 'text') {
      throw new Error('Unexpected response structure from Claude');
    }

    // Strip markdown code fences if Claude wrapped the JSON
    const rawText = firstBlock.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      parsedJson = {};
    }

    const filters = sanitiseFilters(parsedJson);

    // 5. Cache result for 1 hour
    try {
      await redis.setex(cacheKey, 3600, JSON.stringify(filters));
    } catch { /* Redis unavailable */ }

    // Record in popular queries sorted set (fire-and-forget)
    void recordPopularQuery(q);

    const res = NextResponse.json({ success: true, filters, query: q, cached: false });
    res.headers.set('X-Cache', 'MISS');
    return res;
  } catch {
    // Fallback: Claude API unavailable or any unexpected error
    return NextResponse.json({ success: false, error: 'fallback', filters: {} });
  }
}
