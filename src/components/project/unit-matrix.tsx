'use client';
import { useState } from 'react';

interface Unit {
  slug: string;
  titleAr: string;
  bedrooms: number | null;
  area: string | null;
  askingPrice: string;
  floor: number | null;
  status: string;
}

interface UnitMatrixProps {
  units: Unit[];
  onSelectUnit: (unit: Unit) => void;
}

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE:
    'bg-green-100 border-green-400 text-green-800 hover:bg-green-200 cursor-pointer',
  RESERVED:
    'bg-amber-100 border-amber-400 text-amber-800 cursor-not-allowed opacity-70',
  SOLD: 'bg-red-100 border-red-400 text-red-800 cursor-not-allowed opacity-60',
  RENTED:
    'bg-gray-100 border-gray-400 text-gray-600 cursor-not-allowed opacity-60',
};

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'متاح',
  RESERVED: 'محجوز',
  SOLD: 'مباع',
  RENTED: 'مؤجر',
};

export function UnitMatrix({ units, onSelectUnit }: UnitMatrixProps) {
  const [selectedBeds, setSelectedBeds] = useState<number | null>(null);

  // Group by floor
  const byFloor = new Map<number, Unit[]>();
  for (const unit of units) {
    const floor = unit.floor ?? 0;
    if (!byFloor.has(floor)) byFloor.set(floor, []);
    byFloor.get(floor)!.push(unit);
  }

  const floors = [...byFloor.keys()].sort((a, b) => b - a); // top floor first
  const allBedTypes = [
    ...new Set(
      units.map((u) => u.bedrooms).filter((b): b is number => b !== null),
    ),
  ].sort();

  const availableCount = units.filter((u) => u.status === 'AVAILABLE').length;

  return (
    <div dir="rtl">
      {/* Filter by bedrooms */}
      {allBedTypes.length > 1 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setSelectedBeds(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-cairo transition ${
              selectedBeds === null
                ? 'bg-primary-700 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            الكل ({availableCount} متاح)
          </button>
          {allBedTypes.map((b) => (
            <button
              key={b}
              onClick={() => setSelectedBeds(b)}
              className={`px-3 py-1.5 rounded-lg text-xs font-cairo transition ${
                selectedBeds === b
                  ? 'bg-primary-700 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {b} غرف
            </button>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-3 mb-4 text-xs font-cairo flex-wrap">
        {Object.entries(STATUS_LABELS).map(([status, label]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div
              className={`w-3 h-3 rounded-sm border ${STATUS_COLORS[status]?.split(' ').slice(0, 2).join(' ') ?? ''}`}
            />
            <span className="text-gray-500">{label}</span>
          </div>
        ))}
      </div>

      {/* Floor grid */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {floors.map((floor) => {
          const floorUnits = (byFloor.get(floor) ?? []).filter(
            (u) => selectedBeds === null || u.bedrooms === selectedBeds,
          );
          if (floorUnits.length === 0) return null;

          return (
            <div key={floor} className="flex items-start gap-3">
              <div className="text-xs text-gray-400 font-cairo w-16 text-left pt-1.5 shrink-0">
                {floor === 0 ? 'الأرضي' : `الطابق ${floor}`}
              </div>
              <div className="flex gap-1.5 flex-wrap flex-1">
                {floorUnits.map((unit) => (
                  <button
                    key={unit.slug}
                    onClick={() =>
                      unit.status === 'AVAILABLE' && onSelectUnit(unit)
                    }
                    className={`border rounded-lg p-2 text-xs transition min-w-[80px] text-center ${
                      STATUS_COLORS[unit.status] ?? STATUS_COLORS['AVAILABLE']
                    }`}
                    disabled={unit.status !== 'AVAILABLE'}
                    title={`${unit.titleAr} — ${Number(unit.askingPrice).toLocaleString('ar-EG')} ج.م`}
                  >
                    <div className="font-semibold">
                      {unit.bedrooms
                        ? `${unit.bedrooms} غرف`
                        : unit.titleAr.slice(0, 8)}
                    </div>
                    {unit.area && (
                      <div className="text-gray-500">
                        {Number(unit.area).toFixed(0)} م²
                      </div>
                    )}
                    <div className="font-bold mt-0.5">
                      {STATUS_LABELS[unit.status] ?? unit.status}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
