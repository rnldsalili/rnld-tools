import { parseISO, startOfDay } from 'date-fns';

export function toStartOfDayIso(dateValue: string) {
  return startOfDay(parseISO(dateValue)).toISOString();
}
