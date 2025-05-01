// This file exports functions to load GeoJSON data for the application
// For air-gapped environments, we attempt to load files from the public folder

// Simplified data for fallback/backup purposes
const simplifiedCountries = {
  "type": "FeatureCollection",
  "features": [
    // United States
    {
      "type": "Feature",
      "properties": {
        "name": "United States",
        "iso_a2": "US"
      },
      "geometry": {
        "type": "MultiPolygon",
        "coordinates": [
          [[[-125.0, 24.0], [-125.0, 49.0], [-66.0, 49.0], [-66.0, 24.0], [-125.0, 24.0]]],
          [[[-160.0, 18.0], [-154.0, 18.0], [-154.0, 23.0], [-160.0, 23.0], [-160.0, 18.0]]],
          [[[-178.0, 51.0], [-130.0, 51.0], [-130.0, 72.0], [-178.0, 72.0], [-178.0, 51.0]]]
        ]
      }
    },
    // Russia
    {
      "type": "Feature",
      "properties": {
        "name": "Russia",
        "iso_a2": "RU"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [[30.0, 50.0], [30.0, 80.0], [50.0, 80.0], [50.0, 70.0], [60.0, 70.0], [60.0, 75.0], 
           [100.0, 75.0], [100.0, 80.0], [180.0, 80.0], [180.0, 70.0], [170.0, 65.0], [170.0, 60.0], 
           [160.0, 60.0], [160.0, 55.0], [150.0, 55.0], [150.0, 50.0], [140.0, 50.0], [140.0, 45.0], 
           [130.0, 45.0], [130.0, 50.0], [120.0, 50.0], [120.0, 45.0], [35.0, 45.0], [30.0, 50.0]]
        ]
      }
    },
    // China
    {
      "type": "Feature", 
      "properties": {
        "name": "China",
        "iso_a2": "CN"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [[75.0, 25.0], [75.0, 35.0], [80.0, 35.0], [80.0, 40.0], [90.0, 40.0], [90.0, 45.0], 
           [120.0, 45.0], [120.0, 50.0], [130.0, 50.0], [130.0, 45.0], [135.0, 45.0], [135.0, 35.0], 
           [125.0, 25.0], [120.0, 20.0], [110.0, 18.0], [100.0, 20.0], [90.0, 25.0], [75.0, 25.0]]
        ]
      }
    }
  ]
};

// Cache for loaded GeoJSON data
let countriesGeoJSONCache = null;
let fallbackGeoJSONCache = null;

// Function to load GeoJSON data from public folder
export const loadCountriesGeoJSON = async () => {
  if (countriesGeoJSONCache) {
    return countriesGeoJSONCache;
  }

  try {
    // Copy the GeoJSON files to the public folder for this to work
    const response = await fetch('/countries.geojson');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    countriesGeoJSONCache = data;
    return data;
  } catch (error) {
    console.warn('Failed to load countries.geojson:', error);
    
    try {
      // Try fallback file
      const fallbackResponse = await fetch('/countries-fallback.geojson');
      
      if (!fallbackResponse.ok) {
        throw new Error(`HTTP error! status: ${fallbackResponse.status}`);
      }
      
      const fallbackData = await fallbackResponse.json();
      countriesGeoJSONCache = fallbackData;
      return fallbackData;
    } catch (fallbackError) {
      console.error('Failed to load fallback GeoJSON:', fallbackError);
      
      // Return simplified data as last resort
      countriesGeoJSONCache = simplifiedCountries;
      return simplifiedCountries;
    }
  }
};

// Function to load fallback GeoJSON
export const loadFallbackGeoJSON = async () => {
  if (fallbackGeoJSONCache) {
    return fallbackGeoJSONCache;
  }
  
  try {
    const response = await fetch('/countries-fallback.geojson');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    fallbackGeoJSONCache = data;
    return data;
  } catch (error) {
    console.warn('Failed to load fallback GeoJSON:', error);
    fallbackGeoJSONCache = simplifiedCountries;
    return simplifiedCountries;
  }
};

// For backward compatibility
export const countriesGeoJSON = simplifiedCountries;
export const fallbackGeoJSON = simplifiedCountries;

// Dummy data function remains as fallback of last resort
export const generateDummyData = () => {
  return simplifiedCountries;
}; 