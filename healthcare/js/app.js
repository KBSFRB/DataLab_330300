import { renderComparisons } from './charts.js';
import { GEOMETRY_URL, INDICATORS, NO_DATA_COLOR, PROFESSIONS } from './config.js';
import { loadParquet, prepareDataset } from './data.js';
import { formatValue } from './format.js';
import { createMap } from './map.js';
import { createColorScales, gradientCss } from './scales.js';

const ZOOM_STEP = 1.6;

const INDICATOR_COLUMNS = ['name', 'doctors', ...INDICATORS.map(({ property }) => property)];
const GEOMETRY_COLUMNS = ['name', 'geometry'];

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
  let geometryRows = null;
  let loadVersion = 0;

  return {
    // Reactive state used by the template.
    professions: PROFESSIONS.map(({ key, label }) => ({ key, label })),
    professionKey: 'gp',
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
        geometryRows = await loadParquet(GEOMETRY_URL, GEOMETRY_COLUMNS);
        await this.loadProfession(this.professionKey);
      } catch (error) {
        console.error(error);
        this.status = 'error';
        this.errorMessage = 'Impossible de charger les données. Vérifiez que les fichiers Parquet sont présents et que le site est servi par un serveur HTTP.';
        return;
      }
      this.$watch('professionKey', (key) => this.loadProfession(key));
      this.$watch('indicatorKey', () => this.applyIndicator());
    },

    /** Loads the selected profession's indicators and joins them to shared geometry. */
    async loadProfession(key) {
      const version = ++loadVersion;
      const profession = PROFESSIONS.find((item) => item.key === key);
      try {
        const indicatorRows = await loadParquet(profession.file, INDICATOR_COLUMNS);
        if (version !== loadVersion) return;

        dataset = prepareDataset(geometryRows, indicatorRows);
        scales = createColorScales(dataset);
        if (!mapView) {
          mapView = createMap(this.$refs.map, {
            municipalities: dataset.municipalities,
            onSelect: (municipality, anchor) => this.openPopup(municipality, anchor),
            onDeselect: () => this.closePopup(),
          });
        } else {
          mapView.setMunicipalities(dataset.municipalities);
        }

        this.status = 'ready';
        this.errorMessage = '';
        this.selected = null;
        mapView.setSelected(null);
        this.applyIndicator();
      } catch (error) {
        if (version !== loadVersion) return;
        console.error(error);
        this.status = 'error';
        this.errorMessage = `Impossible de charger les données pour ${profession.label}. Vérifiez que le fichier ${profession.file} est présent.`;
      }
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
        countSummary: describeCount(municipality.practitionerCount, PROFESSIONS.find(({ key }) => key === this.professionKey)),
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

function describeCount(count, profession) {
  if (!Number.isFinite(count)) return '';
  const label = count > 1 ? profession.countLabelPlural : profession.countLabel;
  return `${count} ${label}`;
}
