import { geoConicConformal, geoPath, select, zoom, zoomIdentity } from 'd3';
import { NO_DATA_COLOR } from './config.js';
import { formatValue } from './format.js';

const WIDTH = 800;
const HEIGHT = 620;
const PADDING = 12;
const MAX_ZOOM = 16;
const TRANSITION_MS = 350;

/**
 * Draws the choropleth map inside `container` and returns a small API to
 * recolor it, highlight a municipality and control the zoom.
 *
 * Callbacks:
 * - onSelect(municipality, anchor): a municipality was clicked; `anchor` holds
 *   the click position (x) and the container width, relative to the container
 * - onDeselect(): the map background was clicked
 */
export function createMap(container, { municipalities, onSelect, onDeselect }) {
  const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : TRANSITION_MS;

  const svg = select(container)
    .append('svg')
    .attr('class', 'map__svg')
    .attr('viewBox', `0 0 ${WIDTH} ${HEIGHT}`)
    .attr('role', 'img')
    .attr('aria-label', 'Carte des communes de Belgique');

  // Everything inside the viewport group is moved and scaled by the zoom behavior.
  const viewport = svg.append('g');

  // A conic projection suits a country this size better than Mercator.
  const projection = geoConicConformal().parallels([49.83, 51.17]).rotate([-4.37, 0]);
  projection.fitExtent(
    [
      [PADDING, PADDING],
      [WIDTH - PADDING, HEIGHT - PADDING],
    ],
    { type: 'FeatureCollection', features: municipalities.map((municipality) => municipality.feature) },
  );
  const path = geoPath(projection);

  // Project every municipality once; the outlines below reuse the result.
  const pathData = new Map(municipalities.map((municipality) => [municipality.id, path(municipality.feature)]));

  const paths = viewport
    .append('g')
    .selectAll('path')
    .data(municipalities, (municipality) => municipality.id)
    .join('path')
    .attr('class', 'municipality')
    .attr('d', (municipality) => pathData.get(municipality.id))
    .attr('fill', NO_DATA_COLOR);
  paths.append('title');

  // Outlines are separate elements drawn on top, so they are never hidden by neighbors.
  const hoverOutline = viewport.append('path').attr('class', 'outline outline--hover');
  const selectedOutline = viewport.append('path').attr('class', 'outline outline--selected');

  paths
    .on('mouseenter', (event, municipality) => hoverOutline.attr('d', pathData.get(municipality.id)))
    .on('mouseleave', () => hoverOutline.attr('d', null))
    .on('click', (event, municipality) => {
      const box = container.getBoundingClientRect();
      onSelect(municipality, { x: event.clientX - box.left, width: box.width });
    });

  svg.on('click', (event) => {
    if (event.target === svg.node()) onDeselect();
  });

  const zoomBehavior = zoom()
    .scaleExtent([1, MAX_ZOOM])
    .translateExtent([
      [0, 0],
      [WIDTH, HEIGHT],
    ])
    .on('zoom', (event) => viewport.attr('transform', event.transform));
  svg.call(zoomBehavior);

  return {
    /** Recolors the map for an indicator, using the given d3 color scale. */
    setIndicator(indicator, colorScale) {
      const value = (municipality) => municipality.values[indicator.key];

      paths
        .transition()
        .duration(duration)
        .attr('fill', (municipality) =>
          Number.isFinite(value(municipality)) ? colorScale(value(municipality)) : NO_DATA_COLOR,
        );

      paths
        .select('title')
        .text(
          (municipality) =>
            `${municipality.name} (${municipality.groupName}) : ${formatValue(indicator, value(municipality))}`,
        );
    },

    /** Highlights a municipality, or clears the highlight when given null. */
    setSelected(municipality) {
      selectedOutline.attr('d', municipality ? pathData.get(municipality.id) : null);
    },

    zoomBy(factor) {
      svg.transition().duration(duration / 2).call(zoomBehavior.scaleBy, factor);
    },

    resetZoom() {
      svg.transition().duration(duration).call(zoomBehavior.transform, zoomIdentity);
    },
  };
}
