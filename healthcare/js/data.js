import { geoArea } from 'd3';
import { asyncBufferFromUrl, parquetReadObjects } from 'hyparquet';
import proj4 from 'proj4';
import { INDICATORS } from './config.js';

/** A polygon covering more than a hemisphere is wound the wrong way for d3-geo. */
const HEMISPHERE_AREA = 2 * Math.PI;

const PARQUET_COLUMNS = ['id', 'name', 'boundary_doctors', 'geometry', ...INDICATORS.map(({ property }) => property)];
const BELGIAN_LAMBERT_2008 = '+proj=lcc +lat_1=49.8333333333333 +lat_2=51.1666666666667 +lat_0=50.797815 +lon_0=4.35921583333333 +x_0=649328 +y_0=665262 +ellps=GRS80 +units=m +no_defs';

/** Reads municipality rows and GeoParquet geometries from the static file. */
export async function loadParquet(url) {
  const file = await asyncBufferFromUrl({ url: new URL(url, document.baseURI).href });
  return parquetReadObjects({ file, columns: PARQUET_COLUMNS });
}

/**
 * Turns Parquet rows into a flat list of municipalities and pre-sorted values
 * per indicator for the map scales and comparison charts.
 */
export function prepareDataset(rows) {
  const municipalities = rows.map(createMunicipality);

  return {
    municipalities,
    sortedValues: collectSortedValues(municipalities),
  };
}

function createMunicipality(row) {
  const feature = {
    type: 'Feature',
    properties: row,
    geometry: projectGeometry(row.geometry),
  };
  normalizeWinding(feature);

  const values = {};
  for (const indicator of INDICATORS) {
    values[indicator.key] = toNumber(row[indicator.property]);
  }

  return {
    id: String(row.id),
    name: row.name,
    groupName: 'Belgique',
    gpCount: toNumber(row.boundary_doctors),
    values,
    feature,
  };
}

/** GeoParquet coordinates use EPSG:3812; D3's geographic projection needs WGS84. */
function projectGeometry(geometry) {
  if (!geometry?.type || !Array.isArray(geometry.coordinates)) {
    throw new Error('Parquet row is missing a supported municipality geometry.');
  }
  return {
    type: geometry.type,
    coordinates: mapCoordinates(geometry.coordinates),
  };
}

function mapCoordinates(value) {
  if (typeof value[0] === 'number') return proj4(BELGIAN_LAMBERT_2008, 'EPSG:4326', value.slice(0, 2));
  return value.map(mapCoordinates);
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
