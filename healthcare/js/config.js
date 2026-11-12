import { interpolateBuPu, interpolateOrRd, interpolateYlGnBu, quantile } from "d3";

/** Location of the shared geometry GeoParquet file, relative to index.html. */
export const GEOMETRY_URL = "data/municipality_geometry_WGS84.parquet";

/** Indicator files available on the map. */
export const PROFESSIONS = [
  { key: 'gp', label: 'Médecins généralistes', file: 'data/municipality_accessibility_3km_gp.parquet', countLabel: 'médecin généraliste', countLabelPlural: 'médecins généralistes' },
  { key: 'dentiste', label: 'Dentistes', file: 'data/municipality_accessibility_3km_dentiste.parquet', countLabel: 'dentiste', countLabelPlural: 'dentistes' },
  { key: 'kinesitherapeute', label: 'Kinésithérapeutes', file: 'data/municipality_accessibility_3km_kinesitherapeute.parquet', countLabel: 'kinésithérapeute', countLabelPlural: 'kinésithérapeutes' },
  { key: 'pharmacien', label: 'Pharmaciens', file: 'data/municipality_accessibility_3km_pharmacien.parquet', countLabel: 'pharmacien', countLabelPlural: 'pharmaciens' },
  { key: 'sage_femme', label: 'Sages-femmes', file: 'data/municipality_accessibility_3km_sage_femme.parquet', countLabel: 'sage-femme', countLabelPlural: 'sages-femmes' },
];

/** Fill color of municipalities without a value for the selected indicator. */
export const NO_DATA_COLOR = "#d9dde3";

/**
 * Indicators available on the map.
 *
 * - key:          internal identifier
 * - property:     name of the Parquet column holding the value
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
    key: "density",
    property: "doctors_per_10000",
    label: "Densité",
    description: "Professionnels pour 10 000 habitants",
    decimals: 1,
    valueSuffix: "",
    interpolator: interpolateYlGnBu,
    // The distribution is skewed: values above the 98th percentile share the darkest color.
    getDomain: (sortedValues) => [0, Math.ceil(quantile(sortedValues, 0.98))],
  },
  {
    key: "twoSfca",
    property: "two_sfca_score",
    label: "Accessibilité 2SFCA",
    description: "Score d’accessibilité (2SFCA)",
    decimals: 4,
    valueSuffix: "",
    interpolator: interpolateYlGnBu,
    // The distribution is skewed: values above the 98th percentile share the darkest color.
    getDomain: (sortedValues) => [0, quantile(sortedValues, 0.98)],
  },
  // Re-enable when these columns return in a later data version:
  // {
  //   key: 'over60',
  //   property: 'perc_over_60yo',
  //   label: 'Plus de 60 ans',
  //   description: 'Part des médecins généralistes de plus de 60 ans',
  //   decimals: 0,
  //   valueSuffix: '\u202f%',
  //   interpolator: interpolateOrRd,
  //   getDomain: () => [0, 100],
  // },
  // {
  //   key: 'conv',
  //   property: 'perc_conv',
  //   label: 'Conventionnés',
  //   description: 'Part des médecins généralistes conventionnés',
  //   decimals: 0,
  //   valueSuffix: '\u202f%',
  //   interpolator: interpolateBuPu,
  //   getDomain: () => [0, 100],
  // },
];
