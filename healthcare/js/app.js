import { renderComparisons } from './charts.js';
import { DATA_URL, INDICATORS, NO_DATA_COLOR } from './config.js';
import { loadGeoJson, prepareDataset } from './data.js';
import { formatValue } from './format.js';
import { createMap } from './map.js';
import { createColorScales, gradientCss } from './scales.js';

const ZOOM_STEP = 1.6;

const LOAD_ERROR_MESSAGE =
  `Impossible de charger les données (${DATA_URL}). ` +
  'Vérifiez que le fichier est présent et que le site est servi par un serveur HTTP.';

/**
 * Alpine component driving the whole page.
 *
 * Alpine wraps component state in reactive proxies. The dataset, scales and map
 * are large and managed by d3, so they live in this closure instead of in the
 * reactive state.
 */
export function createApp() {
  let dataset = null;
  let scales = null;
  let mapView = null;

  return {
    // Reactive state used by the template.
    indicators: INDICATORS.map(({ key, label }) => ({ key, label })),
    indicatorKey: INDICATORS[0].key,
    status: 'loading', // 'loading' | 'ready' | 'error'
    errorMessage: '',
    legend: { title: '', gradient: '', min: '', max: '' },
    noDataColor: NO_DATA_COLOR,
    selected: null,
    popupSide: 'right',

    async init() {
      try {
        dataset = prepareDataset(await loadGeoJson(DATA_URL));
      } catch (error) {
        console.error(error);
        this.status = 'error';
        this.errorMessage = LOAD_ERROR_MESSAGE;
        return;
      }

      scales = createColorScales(dataset);
      mapView = createMap(this.$refs.map, {
        municipalities: dataset.municipalities,
        onSelect: (municipality, anchor) => this.openPopup(municipality, anchor),
        onDeselect: () => this.closePopup(),
      });

      this.status = 'ready';
      this.applyIndicator();
      this.$watch('indicatorKey', () => this.applyIndicator());
    },

    /** Recolors the map and refreshes the legend for the chosen indicator. */
    applyIndicator() {
      const indicator = INDICATORS.find(({ key }) => key === this.indicatorKey);
      const scale = scales.get(indicator.key);

      mapView.setIndicator(indicator, scale.color);

      this.legend = {
        title: indicator.description,
        gradient: gradientCss(scale),
        min: formatValue(indicator, scale.domain[0]),
        max: (scale.isUpperClamped ? '≥\u00a0' : '') + formatValue(indicator, scale.domain[1]),
      };
    },

    openPopup(municipality, anchor) {
      this.selected = {
        name: municipality.name,
        groupName: municipality.groupName,
        gpSummary: describeGpCount(municipality.gpCount),
      };
      // Open the popup on the side opposite to the click, so it never hides the municipality.
      this.popupSide = anchor.x < anchor.width / 2 ? 'right' : 'left';

      mapView.setSelected(municipality);
      renderComparisons(this.$refs.charts, { municipality, dataset, scales });
      this.$refs.popup.scrollTop = 0;
    },

    closePopup() {
      this.selected = null;
      mapView?.setSelected(null);
    },

    zoomIn() {
      mapView?.zoomBy(ZOOM_STEP);
    },

    zoomOut() {
      mapView?.zoomBy(1 / ZOOM_STEP);
    },

    resetZoom() {
      mapView?.resetZoom();
    },
  };
}

function describeGpCount(count) {
  if (!Number.isFinite(count)) return '';
  const plural = count > 1 ? 's' : '';
  return `${count} médecin${plural} généraliste${plural}`;
}
