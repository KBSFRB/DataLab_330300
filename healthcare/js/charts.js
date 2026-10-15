import { axisBottom, interpolateRgb, max, mean, scaleLinear, scaleSequential, select } from 'd3';
import { INDICATORS } from './config.js';
import { formatTick, formatValue } from './format.js';

// Layout of one chart, in SVG user units (the SVG scales to its container).
const WIDTH = 340;
const MARGIN = { top: 12, right: 8, bottom: 16, left: 8 };
const BAND_HEIGHT = 18;
const BAND_TOP = MARGIN.top;
const BAND_BOTTOM = BAND_TOP + BAND_HEIGHT;
const MARKER_SIZE = 4; // half-width of the triangle markers
const AXIS_Y = BAND_BOTTOM + 14;
const HEIGHT = AXIS_Y + MARGIN.bottom;

// Density band: the color ramp goes from light (few municipalities around a
// value) to dark (many municipalities around that value).
const DENSITY_SAMPLES = 120;
const DENSITY_BANDWIDTH = 0.05; // fraction of the domain width
const DENSITY_LOW_COLOR = '#eef1f4';
const DENSITY_HIGH_COLOR = '#4f6070';

let gradientCounter = 0;

/**
 * Renders, for every indicator, one density band showing how all Belgian
 * municipalities are spread over the indicator's range, with three markers:
 * the selected municipality, the mean of its province, and the national mean.
 *
 * `scales` is the Map created by createColorScales(); only its domains are used here.
 */
export function renderComparisons(container, { municipality, dataset, scales }) {
  const root = select(container);
  root.selectAll('*').remove();

  const group = dataset.groups.get(municipality.groupId);
  const groupKind = municipality.groupName.startsWith('Région') ? 'région' : 'province';

  for (const indicator of INDICATORS) {
    const value = municipality.values[indicator.key];
    const countryValues = dataset.sortedValues[indicator.key];
    const groupMean = mean(group.sortedValues[indicator.key]);
    const countryMean = mean(countryValues);

    const section = root.append('section').attr('class', 'comparison');
    const title = section.append('h3').attr('class', 'comparison__title');
    title.append('span').text(indicator.label);
    title.append('strong').text(formatValue(indicator, value));

    drawChart(section, {
      indicator,
      domain: scales.get(indicator.key).domain,
      countryValues,
      markers: { value, groupMean, countryMean },
    });

    drawLegend(section, { indicator, groupKind, value, groupMean, countryMean });
  }
}

/** One chart: a density band for the whole country, with the three markers on it. */
function drawChart(section, { indicator, domain, countryValues, markers }) {
  const [low, high] = domain;
  const clamp = (v) => Math.min(Math.max(v, low), high);

  const svg = section
    .append('svg')
    .attr('class', 'comparison__chart')
    .attr('viewBox', `0 0 ${WIDTH} ${HEIGHT}`)
    .attr('role', 'img')
    .attr('aria-label', `Position de la commune pour l'indicateur « ${indicator.label} »`);

  const x = scaleLinear()
    .domain(domain)
    .range([MARGIN.left, WIDTH - MARGIN.right]);

  // The band is filled with a gradient whose color encodes the density of municipalities.
  const density = estimateDensity(countryValues.map(clamp), domain);
  const densityColor = scaleSequential(interpolateRgb(DENSITY_LOW_COLOR, DENSITY_HIGH_COLOR)).domain([
    0,
    max(density, (d) => d.value) || 1,
  ]);

  const gradientId = `density-gradient-${gradientCounter++}`;
  svg
    .append('defs')
    .append('linearGradient')
    .attr('id', gradientId)
    .attr('x1', '0%')
    .attr('x2', '100%')
    .selectAll('stop')
    .data(density)
    .join('stop')
    .attr('offset', (d) => `${((d.position - low) / (high - low)) * 100}%`)
    .attr('stop-color', (d) => densityColor(d.value));

  svg
    .append('rect')
    .attr('class', 'band')
    .attr('x', MARGIN.left)
    .attr('y', BAND_TOP)
    .attr('width', WIDTH - MARGIN.left - MARGIN.right)
    .attr('height', BAND_HEIGHT)
    .attr('fill', `url(#${gradientId})`);

  svg
    .append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(0, ${AXIS_Y})`)
    .call(axisBottom(x).ticks(5).tickSize(3).tickFormat(formatTick(indicator)));

  // Means: triangles pointing at the band, province above and country below.
  if (Number.isFinite(markers.groupMean)) {
    const mx = x(clamp(markers.groupMean));
    svg
      .append('path')
      .attr('class', 'marker marker--group-mean')
      .attr('d', `M ${mx - MARKER_SIZE} ${BAND_TOP - 11} L ${mx + MARKER_SIZE} ${BAND_TOP - 11} L ${mx} ${BAND_TOP - 4} Z`);
  }
  if (Number.isFinite(markers.countryMean)) {
    const mx = x(clamp(markers.countryMean));
    svg
      .append('path')
      .attr('class', 'marker marker--country-mean')
      .attr('d', `M ${mx - MARKER_SIZE} ${BAND_BOTTOM + 11} L ${mx + MARKER_SIZE} ${BAND_BOTTOM + 11} L ${mx} ${BAND_BOTTOM + 4} Z`);
  }

  // Municipality: a vertical line across the band, drawn last so it stays on top.
  // The white halo keeps it readable on the darkest part of the band.
  if (Number.isFinite(markers.value)) {
    const mx = x(clamp(markers.value));
    for (const className of ['marker-halo', 'marker marker--value']) {
      svg
        .append('line')
        .attr('class', className)
        .attr('x1', mx)
        .attr('x2', mx)
        .attr('y1', BAND_TOP - 3)
        .attr('y2', BAND_BOTTOM + 3);
    }
  }
}

/** Legend under a chart, giving the key and the numeric value of each marker. */
function drawLegend(section, { indicator, groupKind, value, groupMean, countryMean }) {
  const legend = section.append('p').attr('class', 'comparison__legend');

  const addKey = (className, text) => {
    legend.append('span').attr('class', `key ${className}`).text(text);
  };

  addKey('key--value', Number.isFinite(value) ? 'Commune' : 'Commune : pas de données');
  if (Number.isFinite(groupMean)) {
    addKey('key--group-mean', `Moy. ${groupKind} : ${formatValue(indicator, groupMean)}`);
  }
  if (Number.isFinite(countryMean)) {
    addKey('key--country-mean', `Moy. Belgique : ${formatValue(indicator, countryMean)}`);
  }
}

/**
 * Simple 1-D kernel density estimate (Gaussian kernel) of `values` over
 * `domain`, sampled at DENSITY_SAMPLES + 1 evenly spaced positions.
 * Returns [{ position, value }, ...]. It only colors the band, so the
 * absolute scale does not matter.
 */
function estimateDensity(values, domain) {
  const [low, high] = domain;
  const span = high - low || 1;
  const bandwidth = span * DENSITY_BANDWIDTH;

  const points = [];
  for (let i = 0; i <= DENSITY_SAMPLES; i++) {
    const position = low + (i / DENSITY_SAMPLES) * span;
    let sum = 0;
    for (const v of values) {
      const u = (position - v) / bandwidth;
      sum += Math.exp(-0.5 * u * u);
    }
    points.push({ position, value: sum });
  }
  return points;
}
