import { formatLocale } from 'd3';

const locale = formatLocale({
  decimal: ',',
  thousands: '\u202f',
  grouping: [3],
  currency: ['', '\u00a0€'],
});

const formatters = new Map();

/** Returns a (memoized) d3 formatter for the given specifier. */
function getFormatter(specifier) {
  if (!formatters.has(specifier)) formatters.set(specifier, locale.format(specifier));
  return formatters.get(specifier);
}

/** Formats an indicator value for display, e.g. "12,3" or "72 %". */
export function formatValue(indicator, value) {
  if (!Number.isFinite(value)) return 'Pas de données';
  return getFormatter(`,.${indicator.decimals}f`)(value) + indicator.valueSuffix;
}

/** Returns a formatter for axis ticks: trailing zeros are trimmed ("5" rather than "5,0"). */
export function formatTick(indicator) {
  const format = getFormatter(',.2~f');
  return (value) => format(value) + indicator.valueSuffix;
}
