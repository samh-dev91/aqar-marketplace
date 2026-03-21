'use client';

import React, { useState } from 'react';
import { Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPrice, calcMonthlyInstallment } from '@/lib/format';
import { Button } from '@/components/ui/button';

interface FinancingTerms {
  downPaymentMin: string;
  downPaymentMax?: string;
  installmentMonths: number;
  monthlyMin: string;
  monthlyMax?: string;
  developerName?: string;
}

interface InstallmentCalculatorProps {
  askingPrice: string;
  hasFinancing: boolean;
  financing?: FinancingTerms;
  className?: string;
}

const ANNUAL_RATE = 20; // Egypt market rate %

export function InstallmentCalculator({
  askingPrice,
  hasFinancing,
  financing,
  className,
}: InstallmentCalculatorProps) {
  const [downPaymentPct, setDownPaymentPct] = useState(20);
  const [years, setYears] = useState(10);

  // Compute down payment value and monthly payment
  const priceNum = parseFloat(askingPrice);
  const downAmount = (downPaymentPct / 100) * priceNum;
  const monthly = calcMonthlyInstallment(
    askingPrice,
    downAmount,
    years * 12,
    ANNUAL_RATE
  );

  if (!hasFinancing) {
    return (
      <div
        className={cn(
          'bg-amber-50 border border-amber-200 rounded-xl p-5 text-center',
          className
        )}
      >
        <Calculator size={32} className="mx-auto text-amber-500 mb-3" />
        <p className="font-semibold text-gray-800 mb-1">استفسر عن خيارات التقسيط</p>
        <p className="text-sm text-gray-500 mb-4">
          تواصل مع الشركة لمعرفة إمكانية التقسيط والتمويل البنكي المتاح لهذا العقار.
        </p>
        <Button variant="outline" size="sm" className="w-full">
          اسأل عن التقسيط
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('bg-white border border-gray-200 rounded-xl overflow-hidden', className)}>
      {/* Card header */}
      <div className="flex items-center gap-2 bg-primary-700 text-white px-5 py-3">
        <Calculator size={18} />
        <h3 className="font-bold text-sm">حاسبة التقسيط</h3>
      </div>

      <div className="p-5 space-y-5">
        {/* Developer financing block */}
        {financing && (
          <>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-xs text-green-700 font-semibold mb-2">
                {financing.developerName
                  ? `التمويل المقدم من: ${financing.developerName}`
                  : 'التمويل المقدم من المطور'}
              </p>
              <p className="text-lg font-bold text-green-800">
                من {formatPrice(financing.monthlyMin)} جنيه / شهر
                {financing.monthlyMax && (
                  <span className="text-base">
                    {' '}— {formatPrice(financing.monthlyMax)} جنيه
                  </span>
                )}
              </p>
              <p className="text-xs text-green-600 mt-1">
                مقدم من {formatPrice(financing.downPaymentMin)} جنيه
                {financing.downPaymentMax && ` — ${formatPrice(financing.downPaymentMax)} جنيه`}
                {' '}· مدة {Math.round(financing.installmentMonths / 12)} سنة
              </p>
            </div>

            {/* Separator */}
            <div className="relative flex items-center gap-3">
              <div className="flex-1 border-t border-gray-200" />
              <span className="text-xs text-gray-400 whitespace-nowrap">أو احسب تمويلك البنكي</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>
          </>
        )}

        {/* Manual calculator */}
        <div className="space-y-4">
          {/* Down payment slider */}
          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-sm font-medium text-gray-700">نسبة المقدم</label>
              <span className="text-sm font-bold text-primary-700">{downPaymentPct}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={30}
              step={5}
              value={downPaymentPct}
              onChange={(e) => setDownPaymentPct(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-700"
              dir="ltr"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>10%</span>
              <span className="text-gray-500">
                ({formatPrice(String(downAmount))} جنيه)
              </span>
              <span>30%</span>
            </div>
          </div>

          {/* Duration slider */}
          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-sm font-medium text-gray-700">مدة القرض</label>
              <span className="text-sm font-bold text-primary-700">{years} سنة</span>
            </div>
            <input
              type="range"
              min={5}
              max={25}
              step={5}
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-700"
              dir="ltr"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>5 سنوات</span>
              <span>25 سنة</span>
            </div>
          </div>

          {/* Interest rate (read-only) */}
          <div className="flex justify-between items-center bg-gray-50 rounded-lg px-4 py-2.5">
            <span className="text-sm text-gray-600">معدل الفائدة السنوي</span>
            <span className="text-sm font-bold text-gray-800">{ANNUAL_RATE}% (سعر السوق)</span>
          </div>

          {/* Result */}
          <div className="bg-primary-700 rounded-xl px-5 py-4 text-center text-white">
            <p className="text-xs opacity-80 mb-1">القسط الشهري التقريبي</p>
            <p className="text-3xl font-bold">
              {formatPrice(monthly.toString())}
            </p>
            <p className="text-sm opacity-80 mt-0.5">جنيه / شهر</p>
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-gray-400 leading-relaxed text-center">
            هذا حساب تقريبي. تواصل مع الشركة لمعرفة تفاصيل التمويل الفعلي.
          </p>
        </div>
      </div>
    </div>
  );
}
