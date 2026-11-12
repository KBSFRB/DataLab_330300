import { geoArea } from 'd3';
import { parquetReadObjects } from 'hyparquet';
import { INDICATORS } from './config.js';

/** A polygon covering more than a hemisphere is wound the wrong way for d3-geo. */
const HEMISPHERE_AREA = 2 * Math.PI;

/** Reads selected columns from a static Parquet file. */
export async function loadParquet(url, columns) {
  const absoluteUrl = new URL(url, document.baseURI).href;
  const response = await fetch(absoluteUrl);
  if (!response.ok) throw new Error(`HTTP ${response.status} while loading ${absoluteUrl}`);
  const file = await response.arrayBuffer();
  return parquetReadObjects({ file, columns });
}

/**
 * Turns Parquet rows into a flat list of municipalities and pre-sorted values
 * per indicator for the map scales and comparison charts.
 */
export function prepareDataset(geometryRows, indicatorRows) {
  const indicatorsByName = new Map(indicatorRows.map((row) => [row.name, row]));
  const municipalities = geometryRows.map((geometryRow) => {
    const indicatorRow = indicatorsByName.get(geometryRow.name);
    if (!indicatorRow) throw new Error(`No indicator data found for municipality “${geometryRow.name}”.`);
    return createMunicipality(geometryRow, indicatorRow);
  });

  return {
    municipalities,
    sortedValues: collectSortedValues(municipalities),
  };
}

function createMunicipality(geometryRow, indicatorRow) {
  const feature = {
    type: 'Feature',
    properties: { name: geometryRow.name },
    geometry: validateGeometry(geometryRow.geometry),
  };
  normalizeWinding(feature);

  const values = {};
  for (const indicator of INDICATORS) {
    values[indicator.key] = toNumber(indicatorRow[indicator.property]);
  }

  return {
    id: geometryRow.name,
    name: geometryRow.name,
    groupName: 'Belgique',
    practitionerCount: toNumber(indicatorRow.doctors),
    values,
    feature,
  };
}

/** The shared geometry file already contains WGS84 coordinates. */
function validateGeometry(geometry) {
  if (!geometry?.type || !Array.isArray(geometry.coordinates)) {
    throw new Error('Parquet row is missing a supported municipality geometry.');
  }
  return geometry;
}

/** Sorted (ascending) finite values of every indicator, keyed by indicator. */
function collectSortedValues(municipalities) {
  const result = {};
  for (const indicator of INDICATORS) {
    result[indicator.key] = municipalities
      .map((municipality) => municipality.values[indicator.key])
      .filter(Number.isFinite)
      .sort((a, b) => a - b);
  }
  return result;
}

/** Converts a raw property to a number; missing or empty values become NaN. */
function toNumber(value) {
  if (value === null || value === undefined || value === '') return NaN;
  return Number(value);
}

/**
 * d3-geo expects spherical polygons with clockwise exterior rings, whereas
 * RFC 7946 files use counterclockwise rings. A wrongly wound polygon covers
 * "everything but" the municipality, so we reverse the rings when needed.
 */
function normalizeWinding(feature) {
  if (geoArea(feature) <= HEMISPHERE_AREA) return;

  const { type, coordinates } = feature.geometry;
  const polygons = type === 'Polygon' ? [coordinates] : type === 'MultiPolygon' ? coordinates : [];
  for (const rings of polygons) {
    for (const ring of rings) ring.reverse();
  }
}
