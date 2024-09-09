function clamp(value, min=0, max=100) {
	return Math.min(Math.max(value, min), max);
}

function get_geojson_extent(data) {
	let lng = data.features.map(d => d.geometry.coordinates[0]);
	let lat = data.features.map(d => d.geometry.coordinates[1]);
	return {
		min_x: Math.min(...lng),
		max_x: Math.max(...lng),
		min_y: Math.min(...lat),
		max_y: Math.max(...lat)
	}
}

function extent_latlng2tiles(bounds, tiles_extent, gridsize) {
	let tile_height = (tiles_extent.max_y - tiles_extent.min_y) / gridsize;
	let tile_width = (tiles_extent.max_x - tiles_extent.min_x) / gridsize;

	let min_lng = clamp(bounds._southWest.lng, tiles_extent.min_x, tiles_extent.max_x);
	let max_lng = clamp(bounds._northEast.lng, tiles_extent.min_x, tiles_extent.max_x);
	let min_lat = clamp(bounds._southWest.lat, tiles_extent.min_y, tiles_extent.max_y);
	let max_lat = clamp(bounds._northEast.lat, tiles_extent.min_y, tiles_extent.max_y);

	let min_y_tile = Math.floor((min_lat - tiles_extent.min_y) / tile_height);
	let max_y_tile = Math.floor((max_lat - tiles_extent.min_y) / tile_height);
	let min_x_tile = Math.floor((min_lng - tiles_extent.min_x) / tile_width);
	let max_x_tile = Math.floor((max_lng - tiles_extent.min_x) / tile_width);

	return {min_y_tile, max_y_tile, min_x_tile, max_x_tile};

}

function extent_tiles2latlng(min_y_tile, max_y_tile, min_x_tile, max_x_tile, tiles_extent, gridsize) {
	let tile_height = (tiles_extent.max_y - tiles_extent.min_y) / gridsize;
	let tile_width = (tiles_extent.max_x - tiles_extent.min_x) / gridsize;

	let min_lat = tiles_extent.min_y + min_y_tile * tile_height;
	let max_lat = tiles_extent.min_y + (max_y_tile+1) * tile_height;
	let min_lng = tiles_extent.min_x + min_x_tile * tile_width;
	let max_lng = tiles_extent.min_x + (max_x_tile+1) * tile_width;

	return {min_lat, max_lat, min_lng, max_lng};
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
		.then(response => response.json())
		.then(data => {
			console.log(`fetched ${layer.name} ${i}, ${j}`);
			layer.data.set(`${i}_${j}`, data);

			layer.layer.addData(data);
		});
}


function show_layer(layer, bounds) {
	// find the tiles that are visible in the current view
	let tiles = [];
	if (layer.tiling) {
		let {min_y_tile, max_y_tile, min_x_tile, max_x_tile} = extent_latlng2tiles(bounds, layer.extent, layer.grid_size);
		for (let i=min_x_tile; i<=max_x_tile; i++) {
			for (let j=min_y_tile; j<=max_y_tile; j++) {
				tiles.push([i, j]);
			}
		}
	} else {
		tiles.push([0,0]);
	}

	console.log(`Looking for tiles for ${layer.name}: `, tiles)
	
	for (let tile of tiles) {
		get_data(layer, tile);
	}

	// add this layer to the map and remove the other layers
	for (let l of layers) {
		if (l.layer !== undefined && l.layer !== layer.layer && map.hasLayer(l.layer)) {
			map.removeLayer(l.layer);
		} else if (l.layer === layer.layer && !map.hasLayer(l.layer)) {
			map.addLayer(l.layer);
		}
	}
}

function update_map() {
	let bounds = map.getBounds();
	let zoom = map.getZoom();

	console.log({bounds, zoom});

	// find layer corresponding to zoom level
	let layer = layers.find(l => l.min_zoom <= zoom);
	if (layer === undefined) {
		console.log('no layer found');
		return;
	}

	// get the data for the current view
	show_layer(layer, bounds);


}

function draw_bounds() {
	let bounds = map.getBounds();
	console.log(bounds);
	let rect = L.rectangle(bounds, {color: "#ff7800", weight: 1}).addTo(map);
}

function initialize_layers(layers) {
	for (let layer of layers) {
		layer.data = new Map();

		layer.layer = L.geoJSON({type: "FeatureCollection", features: []}, {
			onEachFeature: function(f, l) {
				if (f.properties) {
					l.bindPopup(layer.popup_text(f));
				}
			},
			style: function(f) {
				
				return {
					fillColor: get_color(colors_scheme, layer.score(f)),
					color: 'black',
					weight: 1,
					fillOpacity: 0.8
				};
			}
		});
	}
}