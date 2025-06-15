# 3/30/300 website

single page app, the entry point is index.html

scripts/ - javascript files
styles/ - css files

relies on the following libraries:
- leaflet (for maps)
- [leaflet geosearch](https://github.com/smeijer/leaflet-geosearch) (for geocoding. The css has been added to styles/ and slightly modified)
- tailwindcss (for styling)

Uses data from [ip-location-db/geolite2-city](https://github.com/sapics/ip-location-db/tree/main/geolite2-city/) for IP geolocation.

TODO
- [ ] add error handling for failed fetches
- [ ] improve/stress-test search bar
  - [x] set autocomplete false if using nominatim
  - [ ] see if we can use other providers. need to proxy ?
- [x] show users correction with stripped pattern: https://stackoverflow.com/questions/65426304/leaflet-multicolor-pattern-fill

colors:
- water: #2ABAAC
- dark: #022041
- orange: #FA970B
