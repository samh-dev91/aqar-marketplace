import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const lng = searchParams.get('lng');
  const lat = searchParams.get('lat');
  const minutes = searchParams.get('minutes') ?? '30';
  const profile = searchParams.get('profile') ?? 'driving'; // driving | walking | cycling

  if (!lng || !lat) {
    return NextResponse.json({ error: 'lng and lat required' }, { status: 400 });
  }

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'Mapbox token not configured' }, { status: 503 });
  }

  const contoursMinutes = Math.min(60, Math.max(5, parseInt(minutes)));
  const url = `https://api.mapbox.com/isochrone/v1/mapbox/${profile}/${lng},${lat}?contours_minutes=${contoursMinutes}&polygons=true&access_token=${token}`;

  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) {
      return NextResponse.json({ error: 'Isochrone API error' }, { status: res.status });
    }
    const data = await res.json() as unknown;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Commute route error:', error);
    return NextResponse.json({ error: 'Failed to fetch isochrone' }, { status: 500 });
  }
}
