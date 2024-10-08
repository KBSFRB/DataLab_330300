function clamp(value, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max);
}

function get_geojson_extent(data) {
  let lng = data.features.map((d) => d.geometry.coordinates[0]);
  let lat = data.features.map((d) => d.geometry.coordinates[1]);
  return {
    min_x: Math.min(...lng),
    max_x: Math.max(...lng),
    min_y: Math.min(...lat),
    max_y: Math.max(...lat),
  };
}

function extent_latlng2tiles(bounds, tiles_extent, gridsize) {
  let tile_height = (tiles_extent.max_y - tiles_extent.min_y) / gridsize;
  let tile_width = (tiles_extent.max_x - tiles_extent.min_x) / gridsize;

  let min_y_tile = clamp(
    Math.floor((bounds._southWest.lat - tiles_extent.min_y) / tile_height),
    0,
    gridsize - 1,
  );
  let max_y_tile = clamp(
    Math.floor((bounds._northEast.lat - tiles_extent.min_y) / tile_height),
    0,
    gridsize - 1,
  );
  let min_x_tile = clamp(
    Math.floor((bounds._southWest.lng - tiles_extent.min_x) / tile_width),
    0,
    gridsize - 1,
  );
  let max_x_tile = clamp(
    Math.floor((bounds._northEast.lng - tiles_extent.min_x) / tile_width),
    0,
    gridsize - 1,
  );

  return { min_y_tile, max_y_tile, min_x_tile, max_x_tile };
}

function extent_tiles2latlng(
  min_y_tile,
  max_y_tile,
  min_x_tile,
  max_x_tile,
  tiles_extent,
  gridsize,
) {
  let tile_height = (tiles_extent.max_y - tiles_extent.min_y) / gridsize;
  let tile_width = (tiles_extent.max_x - tiles_extent.min_x) / gridsize;

  let min_lat = tiles_extent.min_y + min_y_tile * tile_height;
  let max_lat = tiles_extent.min_y + (max_y_tile + 1) * tile_height;
  let min_lng = tiles_extent.min_x + min_x_tile * tile_width;
  let max_lng = tiles_extent.min_x + (max_x_tile + 1) * tile_width;

  return { min_lat, max_lat, min_lng, max_lng };
}

/**
 * Use the layer.ids set to identify the areas that are already in the dataset.
 * returns an array containing only the element of data that were not already present.
 * @param {Array} data: array of geojson features
 * @param {Object} layer: layer object
 * @returns {Array} array of geojson features
 *
 */
function filter_new_data(data, layer) {
  if (layer.data_id === undefined) {
    return data;
  }

  let new_data = data.filter(
    (d) => !layer.ids.has(d.properties[layer.data_id]),
  );
  console.log(
    `filtering data for ${layer.name}: ${data.length} -> ${new_data.length}`,
  );
  return new_data;
}

function get_data(layer, tile) {
  let i = tile[0];
  let j = tile[1];

  if (layer.data.has(`${i}_${j}`)) {
    if (layer.data.get(`${i}_${j}`) === null) {
      console.log(`fetching ${layer.name} ${i}, ${j}`);
      return;
    } else {
      console.log(`already fetched ${layer.name} ${i}, ${j}`);
      return;
    }
  }

  layer.data.set(`${i}_${j}`, null);

  let url = layer.url(i, j);
  fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          `Failed to fetch tile ${i}, ${j} -> status: ${response.status}`,
        );
      }
      return response.json();
    })
    .then((data) => {
      console.log(`fetched ${layer.name} ${i}, ${j}`);
      // save data in the layer object
      layer.data.set(`${i}_${j}`, true);
      // find the new data that is not already on the map
      let new_data = filter_new_data(data.features, layer);
      // add the new data to the map
      layer.layer.addData(new_data);
      // update the ids set
      for (let d of new_data) {
        layer.ids.add(d.properties[layer.data_id]);
      }
    })
    .catch((error) => {
      console.error(`Error fetching or processing tile ${i}, ${j}:`, error);
      layer.data.delete(`${i}_${j}`);
    });
}

function show_layer(layer, bounds) {
  // find the tiles that are visible in the current view
  let tiles = [];
  if (layer.tiling) {
    let { min_y_tile, max_y_tile, min_x_tile, max_x_tile } =
      extent_latlng2tiles(bounds, layer.extent, layer.grid_size);
    for (let i = min_x_tile; i <= max_x_tile; i++) {
      for (let j = min_y_tile; j <= max_y_tile; j++) {
        tiles.push([i, j]);
      }
    }
  } else {
    tiles.push([0, 0]);
  }

  console.log(`Looking for tiles for ${layer.name}: `, tiles);

  for (let tile of tiles) {
    get_data(layer, tile);
  }

  // add this layer to the map and remove the other layers
  for (let l of layers) {
    if (
      l.layer !== undefined &&
      l.layer !== layer.layer &&
      map.hasLayer(l.layer)
    ) {
      map.removeLayer(l.layer);
    } else if (l.layer === layer.layer && !map.hasLayer(l.layer)) {
      map.addLayer(l.layer);
    }
  }
}

function update_map() {
  let bounds = map.getBounds();
  let zoom = map.getZoom();

  console.log({ bounds, zoom });

  // find layer corresponding to zoom level
  let layer = layers.find((l) => l.min_zoom <= zoom);
  if (layer === undefined) {
    // hide all layers
    for (let l of layers) {
      if (l.layer !== undefined && map.hasLayer(l.layer)) {
        map.removeLayer(l.layer);
      }
    }

    console.log("no layer found");
    return;
  }

  // get the data for the current view
  show_layer(layer, bounds);
}

function draw_bounds() {
  let bounds = map.getBounds();
  console.log(bounds);
  let rect = L.rectangle(bounds, { color: "#ff7800", weight: 1 }).addTo(map);
}

function initialize_layers(layers) {
  for (let layer of layers) {
    // map to store the tiles data
    layer.data = new Map();
    // map to store the set of nis of the area that have been fetched. needed to avoid adding multiple copies of an area that lies on two tiles
    layer.ids = new Set();

    layer.layer = L.geoJSON(
      { type: "FeatureCollection", features: [] },
      {
        onEachFeature: function (f, l) {
          if (f.properties && layer.popup_text !== undefined) {
            l.bindPopup(layer.popup_text(f));
          }
          if (layer.on !== undefined) {
            l.on(layer.on);
          }
        },
        style: function (f) {
          return {
            fillColor: get_color(colors_scheme, layer.score(f)),
            color: "black",
            weight: 1,
            fillOpacity: 0.5,
          };
        },
        pointToLayer: function (f, latlng) {
          return L.circleMarker(latlng, {
            radius: 4,
            fillColor: get_color(colors_scheme, layer.score(f)),
            stroke: false,
            fillOpacity: 0.9,
          });
        },
      },
    );
  }
}
