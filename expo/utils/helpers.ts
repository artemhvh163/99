import { GRACE_HOURS, MONTHLY_PERIOD_DAYS } from '@/constants/tariffs';
import type { Car, Client, PaymentMethod } from '@/types';

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export function roundMoney(value: number): number {
  return Math.round(value);
}

export function formatMoney(value: number): string {
  const rounded = roundMoney(value);
  if (isNaN(rounded) || !isFinite(rounded)) return '0 ₽';
  return rounded.toLocaleString('ru-RU') + ' ₽';
}

export function formatPlateNumber(plate: string): string {
  return plate.toUpperCase().replace(/\s+/g, '').trim();
}

export function calculateDays(entryTime: string, exitTime?: string, skipGrace?: boolean): number {
  const entry = new Date(entryTime).getTime();
  const exit = exitTime ? new Date(exitTime).getTime() : Date.now();
  const graceMs = skipGrace ? 0 : GRACE_HOURS * 60 * 60 * 1000;
  const diffMs = exit - entry - graceMs;
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.ceil(diffMs / dayMs));
}

export function getMonthlyAmount(dailyRate: number): number {
  return roundMoney(dailyRate * MONTHLY_PERIOD_DAYS);
}

export function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(dateStr: string): string {
  return `${formatDate(dateStr)} ${formatTime(dateStr)}`;
}

export function daysBetween(start: string, end: string): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return Math.max(0, Math.floor((e - s) / (24 * 60 * 60 * 1000)));
}

export function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.floor((target.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

export function getMethodLabel(method?: PaymentMethod): string {
  switch (method) {
    case 'cash':
      return 'Наличные';
    case 'card':
      return 'Безнал';
    case 'adjustment':
      return 'Корректировка';
    default:
      return '';
  }
}

const LATIN_TO_CYRILLIC: Record<string, string> = {
  'A': 'А', 'B': 'В', 'C': 'С', 'E': 'Е', 'H': 'Н',
  'K': 'К', 'M': 'М', 'O': 'О', 'P': 'Р', 'T': 'Т',
  'X': 'Х', 'Y': 'У',
};

export function normalizeForSearch(text?: string | null): string {
  return (text ?? '')
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/Ё/g, 'Е')
    .split('')
    .map(ch => LATIN_TO_CYRILLIC[ch] ?? ch)
    .join('');
}

export function normalizePhone(phone?: string | null): string {
  const digits = (phone ?? '').replace(/[^\d]/g, '');
  if (digits.startsWith('8')) {
    return `7${digits.slice(1)}`;
  }
  return digits;
}

export function normalizePlateForSearch(plate?: string | null): string {
  return normalizeForSearch(plate).replace(/[^A-Z\u0410-\u042F0-9]/g, '');
}

export interface EntitySearchQuery {
  text: string;
  phone: string;
  plate: string;
  hasText: boolean;
  hasPhone: boolean;
  hasPlate: boolean;
}

export interface EntitySearchMatch {
  matches: boolean;
  exact: boolean;
}

export interface SearchClientFields {
  name?: string | null;
  phone?: string | null;
  phone2?: string | null;
}

export interface SearchCarFields {
  plateNumber?: string | null;
  carModel?: string | null;
}

export function buildEntitySearchQuery(query?: string | null): EntitySearchQuery {
  const raw = (query ?? '').trim();
  const text = normalizeForSearch(raw);
  const phone = normalizePhone(raw);
  const plate = normalizePlateForSearch(raw);
  return {
    text,
    phone,
    plate,
    hasText: text.length > 0,
    hasPhone: phone.length > 0,
    hasPlate: plate.length > 0,
  };
}

export function matchClientFieldsWithCars(client: SearchClientFields | undefined, cars: SearchCarFields[], query: EntitySearchQuery): EntitySearchMatch {
  const name = normalizeForSearch(client?.name);
  const phone = normalizePhone(client?.phone);
  const phone2 = normalizePhone(client?.phone2);
  const plates = cars.map(car => normalizePlateForSearch(car.plateNumber));
  const models = cars.map(car => normalizeForSearch(car.carModel));

  const matchesText =
    query.hasText &&
    (name.includes(query.text) || models.some(model => model.includes(query.text)));
  const matchesPhone =
    query.hasPhone &&
    (phone.includes(query.phone) || phone2.includes(query.phone));
  const matchesPlate =
    query.hasPlate &&
    plates.some(plate => plate.includes(query.plate));

  const exactText =
    query.hasText &&
    (name === query.text || models.some(model => model === query.text));
  const exactPhone =
    query.hasPhone &&
    (phone === query.phone || phone2 === query.phone);
  const exactPlate =
    query.hasPlate &&
    plates.some(plate => plate === query.plate);

  return {
    matches: matchesText || matchesPhone || matchesPlate,
    exact: exactText || exactPhone || exactPlate,
  };
}

export function matchClientWithCars(client: Client | undefined, cars: Car[], query: EntitySearchQuery): EntitySearchMatch {
  return matchClientFieldsWithCars(client, cars, query);
}

export function matchCarAndClientFields(car: SearchCarFields | undefined, client: SearchClientFields | undefined, query: EntitySearchQuery): EntitySearchMatch {
  const carMatch = car
    ? matchClientFieldsWithCars(client, [car], query)
    : matchClientFieldsWithCars(client, [], query);

  if (!car) return carMatch;

  const plate = normalizePlateForSearch(car.plateNumber);
  const model = normalizeForSearch(car.carModel);
  const matchesCar =
    (query.hasPlate && plate.includes(query.plate)) ||
    (query.hasText && model.includes(query.text));
  const exactCar =
    (query.hasPlate && plate === query.plate) ||
    (query.hasText && model === query.text);

  return {
    matches: carMatch.matches || matchesCar,
    exact: carMatch.exact || exactCar,
  };
}

export function matchCarAndClient(car: Car | undefined, client: Client | undefined, query: EntitySearchQuery): EntitySearchMatch {
  return matchCarAndClientFields(car, client, query);
}

export function getServiceTypeLabel(type: string): string {
  switch (type) {
    case 'onetime':
      return 'Разово';
    case 'monthly':
      return 'Месяц';
    case 'lombard':
      return 'Ломбард';
    default:
      return type;
  }
}

export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин. назад`;
  if (hours < 24) return `${hours} ч. назад`;
  return `${days} дн. назад`;
}
