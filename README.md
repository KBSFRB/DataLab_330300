# 3/30/300 website

single page app, the entry point is index.html

scripts/ - javascript files
styles/ - css files

relies on the following libraries:
- leaflet (for maps)
- [leaflet geosearch](https://github.com/smeijer/leaflet-geosearch) (for geocoding. The css has been added to styles/ and slightly modified)
- tailwindcss (for styling)

TODO
- [x] Make places names more visible
- [x] add loading indicator
- [ ] add error handling for failed fetches
- [x] allow users to correct data
- [x] increase the bounds
- [x] allow deeper zoom
- [x] less transparency for the legend overlay
- [x] Visual 300m and 500m radius
- [x] investigate wrong tile fetching
- [x] multi-language support
	- [ ] translate everything
- [x] remove aggregate layers
- [ ] add centroid layer ? -> done but must test if it's better with or without
- [ ] improve/stress-test search bar
  - [x] set autocomplete false if using nominatim
  - [ ] see if we can use other providers. need to proxy ?
- [x] move to new cloudflare account
