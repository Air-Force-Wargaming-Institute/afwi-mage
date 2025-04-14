# Map Data for Air-Gapped Environments

This directory contains GeoJSON data files used by the WargameMap component to render country boundaries. These files have been localized to support operation in air-gapped environments without internet access.

## Files in this Directory

- `countries.geojson` - Primary country boundary data (from github.com/datasets/geo-countries)
- `countries-fallback.geojson` - Alternative country boundary data (from github.com/johan/world.geo.json)
- `countriesData.js` - JavaScript wrapper for importing the GeoJSON data into React

## How to Update

If you need to update the map data:

1. Replace the GeoJSON files with updated versions
2. If the format of the GeoJSON changes, you may need to adjust the properties accessed in WargameMap.js

## Leaflet Marker Images

For the map markers to work properly, make sure these files exist in the public directory:

```
/public/images/leaflet/marker-icon.png
/public/images/leaflet/marker-icon-2x.png
/public/images/leaflet/marker-shadow.png
```

You can download these from the Leaflet distribution or GitHub repository.

## Map Tiles

In a fully air-gapped environment, the map tiles from CartoDB won't load. The map has been configured with a dark background color to ensure it's still usable without internet access. If you want to provide local map tiles, you would need to:

1. Set up a local tile server
2. Update the TileLayer URL in WargameMap.js to point to your local tiles

Example:
```javascript
<TileLayer
  attribution='Local Map Tiles'
  url="/tiles/{z}/{x}/{y}.png"
/>
``` 