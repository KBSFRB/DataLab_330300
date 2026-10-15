import { range, scaleSequential } from 'd3';
import { INDICATORS } from './config.js';

/** Interpolators start near white; skip that end so low values stay visible on the page. */
const LOWEST_COLOR_POSITION = 0.08;

/**
 * Builds one color scale per indicator, from the values of the whole country.
 * Returns a Map: indicator key -> { domain, color, isUpperClamped }.
 */
export function createColorScales(dataset) {
  const scales = new Map();

  for (const indicator of INDICATORS) {
    const sortedValues = dataset.sortedValues[indicator.key];
    const domain = indicator.getDomain(sortedValues);
    const color = scaleSequential((t) =>
      indicator.interpolator(LOWEST_COLOR_POSITION + (1 - LOWEST_COLOR_POSITION) * t),
    )
      .domain(domain)
      .clamp(true);

    scales.set(indicator.key, {
      domain,
      color,
      isUpperClamped: sortedValues.at(-1) > domain[1],
    });
  }

  return scales;
}

/** CSS gradient reproducing a color scale from left (lowest) to right (highest). */
export function gradientCss({ domain, color }) {
  const [low, high] = domain;
  const stops = range(0, 1.001, 0.1).map((t) => color(low + t * (high - low)));
  return `linear-gradient(to right, ${stops.join(', ')})`;
}
