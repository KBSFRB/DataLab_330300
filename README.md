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
- [ ] add loading indicator
- [ ] add error handling for failed fetches
- [ ] allow users to correct data
- [x] increase the bounds
- [x] allow deeper zoom
- [x] less transparency for the legend overlay
- [ ] Visual 300m and 500m radius
- [ ] investigate wrong tile fetching
- [ ] multi-language support
- [ ] remove aggregate layers
- [ ] add centroid layer ?
- [ ] improve/stress-test search bar
- [ ] move to new cloudflare account
