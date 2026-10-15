import { interpolateBuPu, interpolateOrRd, interpolateYlGnBu, quantile } from 'd3';

/** Location of the GeoJSON file, relative to index.html. */
export const DATA_URL = 'data/GP_per_municipality_2021.geojson';

/** Fill color of municipalities without a value for the selected indicator. */
export const NO_DATA_COLOR = '#d9dde3';

/**
 * Indicators available on the map.
 *
 * - key:          internal identifier
 * - property:     name of the GeoJSON property holding the value
 * - label:        short name, shown in the picker and in the popup
 * - description:  longer name, shown in the legend
 * - decimals:     number of decimals when displaying a value
 * - valueSuffix:  text appended to a formatted value
 * - interpolator: d3 color interpolator (0 = lowest value, 1 = highest)
 * - getDomain:    returns the [min, max] range mapped to the color scale and
 *                 to the histogram axes, given all values sorted ascending
 */
export const INDICATORS = [
  {
    key: 'density',
    property: 'pr_dens',
    label: 'Densité',
    description: 'Médecins généralistes pour 10 000 habitants',
    decimals: 1,
    valueSuffix: '',
    interpolator: interpolateYlGnBu,
    // The distribution is skewed: values above the 98th percentile share the darkest color.
    getDomain: (sortedValues) => [0, Math.ceil(quantile(sortedValues, 0.98))],
  },
  {
    key: 'over60',
    property: 'perc_over_60yo',
    label: 'Plus de 60 ans',
    description: 'Part des médecins généralistes de plus de 60 ans',
    decimals: 0,
    valueSuffix: '\u202f%',
    interpolator: interpolateOrRd,
    getDomain: () => [0, 100],
  },
  {
    key: 'conv',
    property: 'perc_conv',
    label: 'Conventionnés',
    description: 'Part des médecins généralistes conventionnés',
    decimals: 0,
    valueSuffix: '\u202f%',
    interpolator: interpolateBuPu,
    getDomain: () => [0, 100],
  },
];
