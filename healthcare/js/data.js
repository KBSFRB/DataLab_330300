import { geoArea, group } from 'd3';
import { INDICATORS } from './config.js';

/** A polygon covering more than a hemisphere is wound the wrong way for d3-geo. */
const HEMISPHERE_AREA = 2 * Math.PI;

/** Fetches and parses the GeoJSON file. */
export async function loadGeoJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} while loading ${url}`);
  return response.json();
}

/**
 * Turns a GeoJSON FeatureCollection into the structures used by the app:
 * a flat list of municipalities, a lookup by id, and groups (provinces, or
 * regions where there is no province) with pre-sorted values per indicator.
 */
export function prepareDataset(geojson) {
  const municipalities = geojson.features.map(createMunicipality);

  const groups = new Map();
  for (const [id, members] of group(municipalities, (municipality) => municipality.groupId)) {
    groups.set(id, {
      id,
      name: members[0].groupName,
      municipalities: members,
      sortedValues: collectSortedValues(members),
    });
  }

  return {
    municipalities,
    byId: new Map(municipalities.map((municipality) => [municipality.id, municipality])),
    groups,
    sortedValues: collectSortedValues(municipalities),
  };
}

function createMunicipality(feature) {
  const properties = feature.properties;
  normalizeWinding(feature);

  const values = {};
  for (const indicator of INDICATORS) {
    values[indicator.key] = toNumber(properties[indicator.property]);
  }

  return {
    id: properties.mun_nis,
    name: properties.tx_munty_descr_fr || properties.tx_munty_descr_nl,
    // The Brussels-Capital Region has no province: fall back to the region.
    groupId: properties.cd_prov_refnis || properties.cd_rgn_refnis,
    groupName: properties.tx_prov_descr_fr || properties.tx_rgn_descr_fr,
    gpCount: toNumber(properties.pr),
    values,
    feature,
  };
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
