import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateSlug(titleAr: string, city: string, nanoidSuffix: string): string {
  const citySlug = city.toLowerCase().replace(/\s+/g, '-');
  // For Arabic titles, just use a descriptor
  const suffix = nanoidSuffix;
  return `property-${citySlug}-${suffix}`;
}

export function getTimeSince(dateStr: string): { value: number; unit: 'minutes' | 'hours' | 'days' } {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return { value: minutes, unit: 'minutes' };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { value: hours, unit: 'hours' };
  return { value: Math.floor(hours / 24), unit: 'days' };
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) return '+2' + digits;
  if (digits.startsWith('2')) return '+' + digits;
  if (digits.startsWith('20')) return '+' + digits;
  return '+20' + digits;
}
