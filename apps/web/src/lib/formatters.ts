const currency = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});
const dateFormat = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota' });
const dateTimeFormat = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  dateStyle: 'short',
  timeStyle: 'short'
});
export function formatMoney(value: string | number | null | undefined, empty = '—'): string {
  if (value == null || String(value).trim() === '' || !Number.isFinite(Number(value))) return empty;
  return currency.format(Number(value));
}
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? value + 'T12:00:00Z' : value);
  return Number.isNaN(date.getTime()) ? '—' : dateFormat.format(date);
}
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormat.format(date);
}
