export function parseDateInputValue(value: unknown) {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }

  const stringValue = String(value).trim();

  if (!stringValue) {
    return undefined;
  }

  const calendarDateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(stringValue);

  if (calendarDateMatch) {
    const [, year, month, day] = calendarDateMatch;
    return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0);
  }

  const parsedDate = new Date(stringValue);
  return Number.isNaN(parsedDate.getTime()) ? undefined : parsedDate;
}
