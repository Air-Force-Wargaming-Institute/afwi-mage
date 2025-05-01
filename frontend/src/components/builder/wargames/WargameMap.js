import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, ZoomControl, LayerGroup, Polygon, Tooltip, CircleMarker, Marker, useMapEvents } from 'react-leaflet';
import { makeStyles } from '@material-ui/core/styles';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Box, CircularProgress, Typography, Snackbar, Paper, IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import ZoomInIcon from '@material-ui/icons/ZoomIn';
import ZoomOutIcon from '@material-ui/icons/ZoomOut';
import HomeIcon from '@material-ui/icons/Home';
import InfoIcon from '@material-ui/icons/Info';
import CloseIcon from '@material-ui/icons/Close';
import WarningIcon from '@material-ui/icons/Warning';

// Import GeoJSON data from JavaScript wrapper instead of direct import
import { loadCountriesGeoJSON, loadFallbackGeoJSON, countriesGeoJSON, fallbackGeoJSON } from '../../../assets/maps/countriesData';

// Fix for default Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/images/leaflet/marker-icon-2x.png',
  iconUrl: '/images/leaflet/marker-icon.png',
  shadowUrl: '/images/leaflet/marker-shadow.png'
});

// Define organization properties with center coordinates and styling
const ORGANIZATIONS = {
  'NATO': {
    name: 'NATO',
    color: '#1E88E5',
    centerLat: 41.8503,
    centerLng: -37,  // Brussels, NATO HQ
    weight: 2,
    opacity: 0.6,
    icon: '🌐' // NATO symbol
  },
  'EU': {
    name: 'European Union',
    color: '#4CAF50',
    centerLat: 50.8503,
    centerLng: -30,  // Brussels, EU HQ
    weight: 2,
    opacity: 0.6,
    icon: '⭐' // EU symbol
  },
  'UN': {
    name: 'United Nations',
    color: '#42A5F5',
    centerLat: 30.7128,
    centerLng: -45.0060,  // New York, UN HQ
    weight: 2,
    opacity: 0.3,
    icon: '🕊️' // UN symbol
  },
  'BRICS': {
    name: 'BRICS',
    color: '#FFA000',
    centerLat: 39.9042,
    centerLng: 150.4074,  // Beijing
    weight: 2,
    opacity: 0.6,
    icon: '🌍' // BRICS symbol
  },
  'AU': {
    name: 'African Union',
    color: '#8D6E63',
    centerLat: -8,
    centerLng: 0,  // Addis Ababa, AU HQ
    weight: 2,
    opacity: 0.6,
    icon: '🌍' // AU symbol
  },
  'ASEAN': {
    name: 'ASEAN',
    color: '#7E57C2',
    centerLat: 3.1390,
    centerLng: 90.6869,  // Jakarta, ASEAN Secretariat
    weight: 2,
    opacity: 0.6,
    icon: '🌏' // ASEAN symbol
  }
};

const useStyles = makeStyles((theme) => ({
  mapRoot: {
    height: '100%',
    width: '100%',
    position: 'relative',
    '& .leaflet-container': {
      height: '100%',
      width: '100%',
      backgroundColor: '#1e1e1e',
    },
    '& .leaflet-control-attribution': {
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      color: '#999',
      '& a': {
        color: '#bbb',
      }
    },
    '& .leaflet-control-zoom': {
      border: 'none',
      '& a': {
        backgroundColor: 'rgba(40, 40, 40, 0.8)',
        color: '#fff',
        '&:hover': {
          backgroundColor: 'rgba(60, 60, 60, 0.8)',
        }
      }
    },
    '& .leaflet-tile-pane': {
      background: '#1e1e1e',
    },
    '& .dark-tiles': {
      filter: 'brightness(0.8) contrast(1.2)',
    }
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  debugInfo: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    zIndex: 999,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: '5px 10px',
    borderRadius: '4px',
    color: 'white',
    fontSize: '12px',
    maxWidth: '300px',
    overflowY: 'auto',
    maxHeight: '150px',
  },
  selectedCountryIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 999,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: '8px 12px',
    borderRadius: '4px',
    color: 'white',
    fontSize: '14px',
    maxWidth: '250px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countryCount: {
    fontWeight: 'bold',
    marginRight: '8px',
    color: theme.palette.primary.main,
  },
  orgLabel: {
    position: 'absolute',
    transform: 'translate(-50%, -100%)',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    color: 'rgba(255, 255, 255, 0.6)',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 'bold',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    zIndex: 1000,
    pointerEvents: 'none',
    transition: 'color 0.3s ease, opacity 0.3s ease',
  },
  orgLabelSelected: {
    color: 'rgba(255, 255, 255, 1)',
    textShadow: '0 0 5px rgba(255, 255, 255, 0.5)',
  },
  nationLabel: {
    position: 'absolute',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    color: 'white',
    padding: '3px 8px',
    borderRadius: '3px',
    fontSize: '12px',
    fontWeight: 'bold',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.3)',
    zIndex: 900, // Lower than org labels
    pointerEvents: 'none',
    border: '1px solid rgba(66, 133, 244, 0.7)',
  },
  orgTooltip: {
    fontWeight: 'bold',
    fontSize: '13px',
    borderRadius: '4px',
    border: 'none',
    padding: '4px 10px',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    color: 'white',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    whiteSpace: 'nowrap',
    pointerEvents: 'none'
  }
}));

// Component to handle map controls and feature focusing
function MapControls({ center, zoom, selectedNations, countriesRef }) {
  const map = useMap();
  const previousSelectedNations = useRef([]);
  const [lastAdded, setLastAdded] = useState(null);
  
  useEffect(() => {
    if (map) {
      try {
        map.setView(center, zoom);
      } catch (error) {
        console.error("Error setting map view:", error);
      }
    }
  }, [map, center, zoom]);
  
  // Helper function to reapply styles to all country layers based on selection status
  const reapplyAllStyles = useCallback(() => {
    if (!countriesRef.current || !map) return;
    
    try {
      // Go through all layers and apply the appropriate style
      countriesRef.current.getLayers().forEach(layer => {
        const props = layer.feature?.properties;
        if (!props) return;
        
        const iso2 = props.ISO_A2 || props.iso_a2 || props.ISO2;
        const iso3 = props.ISO_A3 || props.iso_a3 || props.ISO3 || props.ADM0_A3;
        
        const isSelected = selectedNations.includes(iso2) || selectedNations.includes(iso3);
        
        // Apply the appropriate style based on selection status
        layer.setStyle({
          fillColor: isSelected ? '#4285f4' : '#333333',
          weight: isSelected ? 2 : 1,
          opacity: 1,
          color: isSelected ? '#4285f4' : '#666666',
          dashArray: isSelected ? '' : '1',
          fillOpacity: isSelected ? 0.6 : 0.2
        });
        
        // Bring selected countries to front for better visibility
        if (isSelected && layer.bringToFront) {
          layer.bringToFront();
        }
      });
    } catch (error) {
      console.error("Error reapplying styles:", error);
    }
  }, [selectedNations, countriesRef, map]);
  
  // Focus on newly selected nation
  useEffect(() => {
    if (!map || !countriesRef.current) return;
    
    // Find newly added nation (if any)
    const newlyAdded = selectedNations.find(nation => 
      !previousSelectedNations.current.includes(nation)
    );
    
    if (newlyAdded) {
      setLastAdded(newlyAdded);
      
      // Find the feature for this nation
      const layers = countriesRef.current.getLayers();
      const targetLayer = layers.find(layer => {
        if (!layer || !layer.feature) return false;
        
        const props = layer.feature.properties;
        if (!props) return false;
        
        const iso2 = props.ISO_A2 || props.iso_a2 || props.ISO2;
        const iso3 = props.ISO_A3 || props.iso_a3 || props.ISO3 || props.ADM0_A3;
        
        return iso2 === newlyAdded || iso3 === newlyAdded;
      });
      
      if (targetLayer && targetLayer.getBounds) {
        try {
          // Zoom to the bounds of the selected country
          map.fitBounds(targetLayer.getBounds(), {
            padding: [50, 50],
            maxZoom: 6,
            animate: true,
            duration: 1.0
          });
          
          // Add a highlight animation
          const originalStyle = {
            weight: 2,
            color: '#4285f4',
            fillOpacity: 0.6,
            fillColor: '#4285f4'
          };
          
          const highlightStyle = {
            weight: 3,
            color: '#FFFFFF',
            fillOpacity: 0.8,
            fillColor: '#4285f4'
          };
          
          // Store the original style for later restoration
          let pulseCount = 0;
          const intervalId = setInterval(() => {
            if (pulseCount % 2 === 0) {
              targetLayer.setStyle(originalStyle);
            } else {
              targetLayer.setStyle(highlightStyle);
            }
            
            pulseCount++;
            if (pulseCount >= 6) {
              clearInterval(intervalId);
              
              // Instead of just styling the target layer, reapply styles to ALL layers
              // This ensures all selected countries maintain their highlighting
              reapplyAllStyles();
            }
          }, 300);
        } catch (error) {
          console.error("Error handling map animation:", error);
        }
      } else {
        // If the target layer wasn't found, still refresh all styles
        reapplyAllStyles();
      }
    } else if (selectedNations.length !== previousSelectedNations.current.length) {
      // If a country was removed, make sure to update styles
      reapplyAllStyles();
    }
    
    // Update ref for next comparison
    previousSelectedNations.current = [...selectedNations];
  }, [map, selectedNations, countriesRef, reapplyAllStyles]);
  
  // Ensure styles are correctly applied on map load
  useEffect(() => {
    if (map && countriesRef.current && selectedNations.length > 0) {
      // Short delay to ensure the map is fully rendered
      const timer = setTimeout(() => {
        reapplyAllStyles();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [map, countriesRef, selectedNations.length, reapplyAllStyles]);
  
  return null;
}

// ISO2 to ISO3 country code mapping (partial, will be expanded as needed)
const countryCodeMapping = {
  'US': 'USA',
  'RU': 'RUS',
  'CN': 'CHN',
  'GB': 'GBR',
  'DE': 'DEU',
  'FR': 'FRA',
  'JP': 'JPN',
  'IN': 'IND',
  'BR': 'BRA',
  'CA': 'CAN',
  'AU': 'AUS',
  // Add more mappings as needed
};

// Create a reverse mapping for ISO3 to ISO2
const reverseCodeMapping = {};
Object.entries(countryCodeMapping).forEach(([iso2, iso3]) => {
  reverseCodeMapping[iso3] = iso2;
});

// Create a mapping from country names to ISO2 codes for major countries
// This helps identify countries when ISO codes are not present in the GeoJSON
const countryNameToCodeMapping = {
  'United States': 'US',
  'United States of America': 'US',
  'Russia': 'RU',
  'Russian Federation': 'RU',
  'China': 'CN',
  "People's Republic of China": 'CN',
  'United Kingdom': 'GB',
  'Great Britain': 'GB',
  'Germany': 'DE',
  'France': 'FR',
  'Japan': 'JP',
  'India': 'IN',
  'Brazil': 'BR',
  'Canada': 'CA',
  'Australia': 'AU',
  'Mexico': 'MX',
  'Italy': 'IT',
  'Spain': 'ES',
  'South Korea': 'KR',
  'Republic of Korea': 'KR',
  'Netherlands': 'NL',
  'Turkey': 'TR',
  'Saudi Arabia': 'SA',
  'Switzerland': 'CH',
  'Argentina': 'AR',
  'Sweden': 'SE',
  'Poland': 'PL',
  'Belgium': 'BE',
  'Indonesia': 'ID',
  'Thailand': 'TH',
  'Austria': 'AT',
  'Norway': 'NO',
  'United Arab Emirates': 'AE',
  'South Africa': 'ZA',
  'Denmark': 'DK',
  'Singapore': 'SG',
  'Egypt': 'EG',
  'Finland': 'FI',
  'Malaysia': 'MY',
  'Israel': 'IL',
  'Portugal': 'PT',
  'Greece': 'GR',
  'Ireland': 'IE',
  'New Zealand': 'NZ',
  'Vietnam': 'VN',
  'Pakistan': 'PK',
  'Ukraine': 'UA',
  'Czech Republic': 'CZ',
  'Romania': 'RO',
  'Hungary': 'HU',
  'Philippines': 'PH',
  'Colombia': 'CO',
  'Chile': 'CL',
  'Peru': 'PE',
  'Iraq': 'IQ',
  'Kazakhstan': 'KZ',
  'Algeria': 'DZ'
};

// Add a mapping of country codes to predetermined central coordinates for major countries
const COUNTRY_CENTERS = {
  'US': { lat: 39.8283, lng: -98.5795, name: 'United States' },
  'RU': { lat: 61.5240, lng: 105.3188, name: 'Russia' },
  'CN': { lat: 35.8617, lng: 104.1954, name: 'China' },
  'GB': { lat: 55.3781, lng: -3.4360, name: 'United Kingdom' },
  'DE': { lat: 51.1657, lng: 10.4515, name: 'Germany' },
  'FR': { lat: 46.2276, lng: 2.2137, name: 'France' },
  'JP': { lat: 36.2048, lng: 138.2529, name: 'Japan' },
  'IN': { lat: 20.5937, lng: 78.9629, name: 'India' },
  'BR': { lat: -14.2350, lng: -51.9253, name: 'Brazil' },
  'CA': { lat: 56.1304, lng: -106.3468, name: 'Canada' },
  'AU': { lat: -25.2744, lng: 133.7751, name: 'Australia' },
  'CD': { lat: -4.0383, lng: 21.7587, name: 'Democratic Republic of the Congo' }
};

function WargameMap({ 
  selectedNations = [], 
  onSelectNation, 
  onSelectOrganization,
  onRemoveNation,
  conflictTheaters = []
}) {
  const classes = useStyles();
  const [worldGeoJSON, setWorldGeoJSON] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');
  const [notification, setNotification] = useState(null);
  const [removalDialog, setRemovalDialog] = useState({
    open: false,
    entityId: null,
    entityName: null
  });
  const mapContainerRef = useRef(null);
  const mapInitialized = useRef(false);
  const geoJsonLayerRef = useRef(null);
  const mapRef = useRef(null);
  
  // Use a ref for country polygons to avoid re-renders
  const countryPolygonsRef = useRef({});
  
  // Use ref instead of state for country centers to avoid render loops
  const selectedCountryCentersRef = useRef({});
  const debugCountryRef = useRef(null);
  
  // Default map settings
  const defaultCenter = [30, 10]; // More centered view of populated areas
  const defaultZoom = 2.5;  // Set to 2.5 as a middle ground between 2 (too zoomed out) and 3 (too zoomed in)

  // Helper function to determine if a nation is part of a theater
  const getTheaterInfo = useCallback((nationId) => {
    if (!conflictTheaters || conflictTheaters.length === 0) return null;
    
    for (const theater of conflictTheaters) {
      // Check side 1
      if (theater.sides[0].leadNationId === nationId) {
        return { theater, side: theater.sides[0], isLead: true };
      }
      if (theater.sides[0].supportingNationIds?.includes(nationId)) {
        return { theater, side: theater.sides[0], isLead: false };
      }
      
      // Check side 2
      if (theater.sides[1].leadNationId === nationId) {
        return { theater, side: theater.sides[1], isLead: true };
      }
      if (theater.sides[1].supportingNationIds?.includes(nationId)) {
        return { theater, side: theater.sides[1], isLead: false };
      }
    }
    
    return null;
  }, [conflictTheaters]);
  
  // Helper function to reapply styles to all selected nations
  const reapplySelectedNationsStyles = useCallback(() => {
    if (!geoJsonLayerRef.current) return;
    
    try {
      // Get all layers from the GeoJSON layer
      const layers = geoJsonLayerRef.current.getLayers();
      
      layers.forEach(layer => {
        if (!layer || !layer.feature || !layer.feature.properties) return;
        
        const props = layer.feature.properties;
        const iso2 = props.ISO_A2 || props.iso_a2 || props.ISO2;
        const iso3 = props.ISO_A3 || props.iso_a3 || props.ISO3 || props.ADM0_A3;
        
        const isSelected = selectedNations.includes(iso2) || selectedNations.includes(iso3);
        
        if (isSelected) {
          // Get theater info if applicable
          const nationId = iso2 || iso3;
          const theaterInfo = getTheaterInfo(nationId);
          
          if (theaterInfo) {
            // Country is part of a theater
            const { side, isLead } = theaterInfo;
            const colorCode = side.colorCode || '#4285f4';
            
            layer.setStyle({
              fillColor: colorCode,
              weight: isLead ? 3 : 2,
              opacity: 1,
              color: isLead ? '#FFFFFF' : colorCode,
              dashArray: isLead ? '' : '1',
              fillOpacity: isLead ? 0.6 : 0.4
            });
          } else {
            // Default styling for selected nations not in theaters
            layer.setStyle({
              fillColor: '#4285f4',
              weight: 2,
              opacity: 1,
              color: '#4285f4',
              dashArray: '',
              fillOpacity: 0.6
            });
          }
          
          // Bring selected countries to front
          if (layer.bringToFront) {
            layer.bringToFront();
          }
        }
      });
    } catch (error) {
      console.error("Error reapplying styles to selected nations:", error);
    }
  }, [selectedNations, getTheaterInfo]);
  
  // Ensure styles are consistently applied whenever selectedNations changes
  useEffect(() => {
    if (selectedNations.length > 0) {
      // Add a small delay to ensure map and layers are initialized
      const timer = setTimeout(() => {
        reapplySelectedNationsStyles();
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [selectedNations, reapplySelectedNationsStyles]);

  // Make sure styles are applied after the map is fully loaded and GeoJSON layer is ready
  useEffect(() => {
    if (worldGeoJSON && mapInitialized.current && geoJsonLayerRef.current && selectedNations.length > 0) {
      // Apply styles after the GeoJSON layer is fully rendered
      const timer = setTimeout(() => {
        reapplySelectedNationsStyles();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [worldGeoJSON, reapplySelectedNationsStyles, selectedNations.length]);

  // Add map event listeners to maintain styling during interaction
  useEffect(() => {
    // Only add listeners if map is initialized
    if (mapRef.current && selectedNations.length > 0) {
      const map = mapRef.current;
      
      // Function to reapply styles after map interactions
      const handleMapInteraction = () => {
        // Small delay to ensure the map rendering is complete
        setTimeout(() => {
          reapplySelectedNationsStyles();
        }, 100);
      };
      
      // Add listeners for map events that could affect styling
      map.on('zoomend', handleMapInteraction);
      map.on('moveend', handleMapInteraction);
      map.on('layeradd', handleMapInteraction);
      
      // Clean up listeners when component unmounts or selectedNations changes
      return () => {
        map.off('zoomend', handleMapInteraction);
        map.off('moveend', handleMapInteraction);
        map.off('layeradd', handleMapInteraction);
      };
    }
  }, [mapRef, selectedNations, reapplySelectedNationsStyles]);

  // Initialize country centers for selected nations
  useEffect(() => {
    // Set known country centers first
    selectedNations.forEach(nationCode => {
      // Check for predefined centers for major countries
      if (COUNTRY_CENTERS[nationCode]) {
        selectedCountryCentersRef.current[nationCode] = {
          center: [COUNTRY_CENTERS[nationCode].lat, COUNTRY_CENTERS[nationCode].lng],
          name: COUNTRY_CENTERS[nationCode].name
        };
      } else if (reverseCodeMapping[nationCode] && COUNTRY_CENTERS[reverseCodeMapping[nationCode]]) {
        // Try to use ISO2 if we have ISO3
        const iso2 = reverseCodeMapping[nationCode];
        selectedCountryCentersRef.current[nationCode] = {
          center: [COUNTRY_CENTERS[iso2].lat, COUNTRY_CENTERS[iso2].lng],
          name: COUNTRY_CENTERS[iso2].name
        };
      }
      
      // Note: Other countries will be set when their features are processed in onEachFeature
    });
  }, [selectedNations]);
  
  // Define styling for GeoJSON features
  const getFeatureStyle = useCallback((feature) => {
    // Attempt to extract country codes from various property formats
    let iso2 = null;
    let iso3 = null;
    
    // Check all possible property locations
    if (feature.properties) {
      iso2 = feature.properties.ISO_A2 || feature.properties.iso_a2 || feature.properties.ISO2;
      iso3 = feature.properties.ISO_A3 || feature.properties.iso_a3 || feature.properties.ISO3 || feature.properties.ADM0_A3;
      
      // If we have iso3 but not iso2, try to get iso2 from the mapping
      if (!iso2 && iso3) {
        iso2 = reverseCodeMapping[iso3];
      }
      
      // If we have neither, set default properties for debugging
      if (!iso2 && !iso3) {
        // Set to empty string so we can still render the country
        iso2 = '';
        iso3 = '';
      }
    }
    
    const isSelected = selectedNations.includes(iso2) || selectedNations.includes(iso3);
    
    // If country is part of a theater, style it accordingly
    const nationId = iso2 || iso3;
    const theaterInfo = isSelected ? getTheaterInfo(nationId) : null;
    
    if (theaterInfo) {
      // Country is part of a theater
      const { side, isLead } = theaterInfo;
      const colorCode = side.colorCode || '#4285f4';
      
      return {
        fillColor: colorCode,
        weight: isLead ? 3 : 2,
        opacity: 1,
        color: isLead ? '#FFFFFF' : colorCode,
        dashArray: isLead ? '' : '1',
        fillOpacity: isLead ? 0.6 : 0.4
      };
    }
    
    // Default styling for countries not in theaters
    return {
      fillColor: isSelected ? '#4285f4' : '#333333',
      weight: isSelected ? 2 : 1,
      opacity: 1,
      color: isSelected ? '#4285f4' : '#666666',
      dashArray: isSelected ? '' : '1',
      fillOpacity: isSelected ? 0.6 : 0.2
    };
  }, [selectedNations, getTheaterInfo]);
  
  // Handle click events on map countries
  const onEachFeature = useCallback((feature, layer) => {
    // Attempt to extract name from various property formats
    let name = null;
    let iso2 = null;
    let iso3 = null;
    
    if (feature.properties) {
      // Try all possible name property formats
      name = feature.properties.ADMIN || 
             feature.properties.admin ||
             feature.properties.NAME || 
             feature.properties.name ||
             feature.properties.NAME_LONG ||
             feature.properties.name_long ||
             feature.properties.FORMAL_EN;  // Added another potential name field
      
      // Try all possible ISO code formats
      iso2 = feature.properties.ISO_A2 || 
             feature.properties.iso_a2 ||
             feature.properties.ISO2;  // Added another potential ISO2 field
             
      iso3 = feature.properties.ISO_A3 || 
             feature.properties.iso_a3 ||
             feature.properties.ISO3 ||
             feature.properties.ADM0_A3;  // Some GeoJSON uses ADM0_A3 for country codes
      
      // If we have iso3 but not iso2, try to get iso2 from the mapping
      if (!iso2 && iso3) {
        iso2 = reverseCodeMapping[iso3];
      }
      
      // Try to extract country code from the name as a last resort
      if (!iso2 && name && countryNameToCodeMapping[name]) {
        iso2 = countryNameToCodeMapping[name];
      }
      
      // For the United States specifically, which seems to be a problem case
      if (name && (name.includes('United States') || name === 'USA' || name === 'US' || name.includes('America'))) {
        iso2 = 'US';
      }
    }
    
    // If we couldn't extract the necessary information, use placeholder values
    name = name || 'Unknown Country';
    iso2 = iso2 || '';  // Changed to empty string instead of feature.id
    
    // Store country polygon for organization layers in ref instead of state
    if (iso2 && feature.geometry && feature.geometry.coordinates) {
      countryPolygonsRef.current[iso2] = feature.geometry.coordinates;
      
      // Calculate and store center point for this country if it's in the selected list
      if (selectedNations.includes(iso2) || (iso3 && selectedNations.includes(iso3))) {
        try {
          // Only calculate centers for countries we don't already have from COUNTRY_CENTERS
          if (!selectedCountryCentersRef.current[iso2] && !selectedCountryCentersRef.current[iso3]) {
            // Use layer.getBounds().getCenter() to get center of the country
            const center = layer.getBounds().getCenter();
            
            // Store center point with the country's ISO code(s)
            if (selectedNations.includes(iso2)) {
              selectedCountryCentersRef.current[iso2] = {
                center: [center.lat, center.lng],
                name: name
              };
            }
            
            // If ISO3 is present and selected, store with that code too
            if (iso3 && selectedNations.includes(iso3)) {
              selectedCountryCentersRef.current[iso3] = {
                center: [center.lat, center.lng],
                name: name
              };
            }
            
            debugCountryRef.current = `Calculated center for ${name} (${iso2}/${iso3}): [${center.lat}, ${center.lng}]`;
          }
        } catch (error) {
          console.error(`Error calculating country center for ${name} (${iso2}):`, error);
        }
      }
    }
    
    // Create a display name for the popup
    const displayName = name;
    
    // Add a permanent tooltip that's visible on hover
    layer.bindTooltip(displayName, {
      permanent: false,
      direction: 'center',
      className: 'country-tooltip',
      opacity: 0.9
    });
    
    // Improve popup content with better styling and information
    const popupContent = `
      <div style="text-align: center; min-width: 150px;">
        <strong style="font-size: 16px;">${displayName}</strong>
        <div style="margin-top: 8px; font-size: 13px;">
          ${iso2 ? `<span style="opacity: 0.7;">ISO: ${iso2}</span><br>` : ''}
          <span style="color: #4285f4; margin-top: 5px; display: inline-block;">
            ${selectedNations.includes(iso2) || selectedNations.includes(iso3) 
              ? '✓ Nation Activated' 
              : 'Click to activate this nation'}
          </span>
        </div>
      </div>
    `;
    
    layer.bindPopup(popupContent);
    
    layer.on({
      mouseover: (e) => {
        const layer = e.target;
        const isSelected = iso2 && (selectedNations.includes(iso2) || (iso3 && selectedNations.includes(iso3)));
        
        layer.setStyle({
          weight: 3,
          color: isSelected ? '#FFFFFF' : '#AAAAAA',
          fillOpacity: isSelected ? 0.8 : 0.5
        });
        
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
          layer.bringToFront();
        }
      },
      mouseout: (e) => {
        const layer = e.target;
        const isSelected = iso2 && (selectedNations.includes(iso2) || (iso3 && selectedNations.includes(iso3)));
        
        // Instead of directly setting style, use the same logic as our reapplySelectedNationsStyles function
        if (isSelected) {
          // Get theater info if applicable
          const nationId = iso2 || iso3;
          const theaterInfo = getTheaterInfo(nationId);
          
          if (theaterInfo) {
            // Country is part of a theater
            const { side, isLead } = theaterInfo;
            const colorCode = side.colorCode || '#4285f4';
            
            layer.setStyle({
              fillColor: colorCode,
              weight: isLead ? 3 : 2,
              opacity: 1,
              color: isLead ? '#FFFFFF' : colorCode,
              dashArray: isLead ? '' : '1',
              fillOpacity: isLead ? 0.6 : 0.4
            });
          } else {
            // Default styling for selected nations
            layer.setStyle({
              fillColor: '#4285f4',
              weight: 2,
              opacity: 1,
              color: '#4285f4',
              dashArray: '',
              fillOpacity: 0.6
            });
          }
        } else {
          // Non-selected nation styling
          layer.setStyle({
            fillColor: '#333333',
            weight: 1,
            opacity: 1,
            color: '#666666',
            dashArray: '1',
            fillOpacity: 0.2
          });
        }
      },
      click: () => {
        // Only call onSelectNation if we have both a name and an iso2 code
        if (name) {
          // Ensure we have a valid ISO code, fallback to using name for identification if necessary
          const countryCode = iso2 || (countryNameToCodeMapping[name] || name);
          
          if (selectedNations.includes(countryCode) || selectedNations.includes(iso3)) {
            // Show confirmation dialog
            setRemovalDialog({
              open: true,
              entityId: countryCode,
              entityName: name
            });
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.log(`Selected country: ${name} (${countryCode})`);
            }
            
            // Call the selection handler with the country code and name
            if (onSelectNation) {
              onSelectNation(countryCode, name);
              
              // Schedule a reapply of styles after selection is processed
              setTimeout(() => {
                reapplySelectedNationsStyles();
              }, 100);
            }
            
            // Show notification
            setNotification({
              message: `${name} activated successfully`,
              severity: 'success'
            });
          }
        } else {
          console.error("Unable to select country: missing name", feature.properties);
          setNotification({
            message: 'Unable to activate country due to missing data',
            severity: 'error'
          });
        }
      }
    });
  }, [selectedNations, onSelectNation]);
  
  // Helper function to check if organization is selected
  const isOrgSelected = useCallback((orgId) => {
    return selectedNations.includes(orgId);
  }, [selectedNations]);
  
  // Handle click on organization layer
  const handleOrganizationClick = useCallback((orgId) => {
    if (!onSelectOrganization) return;
    
    const orgData = ORGANIZATIONS[orgId];
    
    // Check if organization is already selected
    if (selectedNations.includes(orgId)) {
      setNotification({
        message: `${orgData.name} is already activated`,
        severity: 'info'
      });
      return;
    }
    
    // Call the handler
    onSelectOrganization(orgId, orgData.name);
    
    // Show notification
    setNotification({
      message: `${orgData.name} activated successfully`,
      severity: 'success'
    });
  }, [onSelectOrganization, selectedNations]);
  
  // Fetch GeoJSON data and process countries
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    
    // Function to load GeoJSON data
    const loadGeoJSON = async () => {
      try {
        // Try to load the primary GeoJSON data
        if (isMounted) {
          const data = await loadCountriesGeoJSON();
          
          if (process.env.NODE_ENV === 'development') {
            console.log("Loaded primary GeoJSON data");
            
            // Check a sample feature to see available properties
            if (data.features && data.features.length > 0) {
              console.log("Sample feature properties:", data.features[0].properties);
            }
          }
          
          // Check if the format is as expected
          if (!data.features || !Array.isArray(data.features)) {
            throw new Error('Invalid primary GeoJSON format: missing features array');
          }
          
          // Process country geometries eagerly to avoid doing it in the onEachFeature callback
          data.features.forEach(feature => {
            if (feature.properties && feature.geometry) {
              let iso2 = feature.properties.ISO_A2 || 
                        feature.properties.iso_a2 || 
                        feature.properties.ISO2;
              
              // Try to get iso2 from iso3 if needed
              const iso3 = feature.properties.ISO_A3 || 
                          feature.properties.iso_a3 || 
                          feature.properties.ISO3 || 
                          feature.properties.ADM0_A3;
              
              if (!iso2 && iso3 && reverseCodeMapping[iso3]) {
                iso2 = reverseCodeMapping[iso3];
              }
              
              // Try to extract from name as last resort
              if (!iso2) {
                const name = feature.properties.ADMIN || 
                            feature.properties.admin || 
                            feature.properties.NAME || 
                            feature.properties.name ||
                            feature.properties.NAME_LONG ||
                            feature.properties.name_long ||
                            feature.properties.FORMAL_EN;
                
                if (name && countryNameToCodeMapping[name]) {
                  iso2 = countryNameToCodeMapping[name];
                }
                
                // Special case for US
                if (!iso2 && name && (name.includes('United States') || name === 'USA' || name === 'US' || name.includes('America'))) {
                  iso2 = 'US';
                }
              }
              
              // Store polygon if we have an ISO code
              if (iso2 && feature.geometry.coordinates) {
                countryPolygonsRef.current[iso2] = feature.geometry.coordinates;
              }
            }
          });
          
          setWorldGeoJSON(data);
          setLoading(false);
          return; // Successfully loaded primary data
        }
      } catch (primaryError) {
        console.error("Error processing primary GeoJSON data, trying fallback:", primaryError);
        
        if (!isMounted) return;
        
        // Try fallback GeoJSON
        try {
          const fallbackData = await loadFallbackGeoJSON();
          
          if (isMounted) {
            // Process country geometries from fallback data
            fallbackData.features.forEach(feature => {
              if (feature.properties && feature.geometry) {
                let iso2 = feature.properties.ISO_A2 || 
                          feature.properties.iso_a2 || 
                          feature.properties.ISO2;
                
                if (!iso2) {
                  // Try to get from name
                  const name = feature.properties.ADMIN || 
                              feature.properties.admin || 
                              feature.properties.NAME || 
                              feature.properties.name;
                  
                  if (name && countryNameToCodeMapping[name]) {
                    iso2 = countryNameToCodeMapping[name];
                  }
                }
                
                // Store polygon if we have an ISO code
                if (iso2 && feature.geometry.coordinates) {
                  countryPolygonsRef.current[iso2] = feature.geometry.coordinates;
                }
              }
            });
            
            setWorldGeoJSON(fallbackData);
            setLoading(false);
            setNotification({
              message: 'Using alternative map data source',
              severity: 'warning'
            });
            return; // Successfully loaded fallback data
          }
        } catch (fallbackError) {
          console.error("Error processing fallback GeoJSON data:", fallbackError);
          
          if (!isMounted) return;
          
          // Use the embedded data as a last resort
          setError("Failed to load GeoJSON data. Using simplified map.");
          setWorldGeoJSON(fallbackGeoJSON);
          setLoading(false);
        }
      }
    };
    
    // Call the async function
    loadGeoJSON();
      
    return () => {
      isMounted = false;
    };
  }, []);
  
  // Handle notification close
  const handleCloseNotification = () => {
    setNotification(null);
  };
  
  // Handle confirmation of nation removal
  const handleConfirmRemoval = () => {
    if (removalDialog.entityId && onRemoveNation) {
      onRemoveNation(removalDialog.entityId);
      setNotification({
        message: `${removalDialog.entityName} has been removed from your wargame`,
        severity: 'info'
      });
      
      // Ensure styles are reapplied after a nation is removed
      setTimeout(() => {
        reapplySelectedNationsStyles();
      }, 200);
    }
    setRemovalDialog({ open: false, entityId: null, entityName: null });
  };
  
  // Handle cancellation of nation removal
  const handleCancelRemoval = () => {
    setRemovalDialog({ open: false, entityId: null, entityName: null });
  };
  
  // Ensure GeoJSON is refreshed only when selections change
  // Use a simple string as the key to reduce complexity
  const geoJsonKey = `geojson-${selectedNations.join('-')}-theaters-${conflictTheaters.length}`;
  
  // Component to render permanent labels for selected nations and theaters
  const NationLabels = () => {
    const map = useMap();
    const [labelPositions, setLabelPositions] = useState({});
    const positionsRef = useRef(labelPositions);
    
    // Update label positions when the map moves
    useEffect(() => {
      const updatePositions = () => {
        if (!map) return;
        
        const newPositions = {};
        let hasChanges = false;
        
        // Calculate screen positions for all selected nations
        selectedNations.forEach(nationCode => {
          const data = selectedCountryCentersRef.current[nationCode];
          
          if (data && data.center) {
            const point = map.latLngToContainerPoint(data.center);
            
            // Check if nation is part of a theater
            const theaterInfo = getTheaterInfo(nationCode);
            
            newPositions[nationCode] = {
              position: [point.x, point.y],
              name: data.name,
              theaterInfo
            };
            
            // Check if position has changed significantly
            const oldPos = positionsRef.current[nationCode]?.position;
            if (!oldPos || Math.abs(oldPos[0] - point.x) > 1 || Math.abs(oldPos[1] - point.y) > 1) {
              hasChanges = true;
            }
          }
        });
        
        // Only update state if positions have changed
        if (hasChanges) {
          setLabelPositions(newPositions);
          positionsRef.current = newPositions;
        }
      };
      
      // Initial update
      updatePositions();
      
      // Add event listeners
      map.on('zoom', updatePositions);
      map.on('move', updatePositions);
      
      return () => {
        map.off('zoom', updatePositions);
        map.off('move', updatePositions);
      };
    }, [map]);
    
    return (
      <>
        {Object.entries(labelPositions).map(([countryCode, data]) => {
          // Special styling for nations in theaters
          const theaterStyle = data.theaterInfo ? {
            borderLeft: `3px solid ${data.theaterInfo.side.colorCode}`,
            backgroundColor: data.theaterInfo.isLead 
              ? `${data.theaterInfo.side.colorCode}90` // More opacity for leads
              : `${data.theaterInfo.side.colorCode}70`,
          } : {};
          
          const theaterName = data.theaterInfo?.theater.name;
          
          return (
            <div
              key={`nation-label-${countryCode}`}
              className={classes.nationLabel}
              style={{
                left: `${data.position[0]}px`,
                top: `${data.position[1]}px`,
                ...theaterStyle
              }}
            >
              {data.name}
              {theaterName && (
                <Typography variant="caption" style={{ fontSize: '10px', display: 'block', opacity: 0.8 }}>
                  {theaterName} {data.theaterInfo?.isLead ? '(Lead)' : ''}
                </Typography>
              )}
            </div>
          );
        })}
      </>
    );
  };
  
  return (
    <div className={classes.mapRoot} ref={mapContainerRef}>
      {loading && (
        <Box className={classes.loadingOverlay}>
          <CircularProgress color="primary" />
          <Typography variant="body1" style={{ marginTop: 16, color: 'white' }}>
            Loading world map data...
          </Typography>
        </Box>
      )}
      
      {error && !worldGeoJSON && (
        <Box className={classes.loadingOverlay}>
          <Typography variant="h6" color="error" gutterBottom>
            Error loading map data
          </Typography>
          <Typography variant="body2">
            {error}. Using fallback data.
          </Typography>
        </Box>
      )}
      
      {/* Display counter for selected nations */}
      {selectedNations.length > 0 && (
        <Box className={classes.selectedCountryIndicator}>
          <span className={classes.countryCount}>{selectedNations.length}</span>
          <span>nations & organizations activated</span>
        </Box>
      )}
      
      {debugInfo && (
        <Box className={classes.debugInfo}>
          {debugInfo}
        </Box>
      )}
      
      {/* Only render MapContainer when container ref is available and data is loaded */}
      {worldGeoJSON && (
        <MapContainer 
          center={defaultCenter} 
          zoom={defaultZoom} 
          zoomControl={false}
          minZoom={2}
          maxZoom={8}
          maxBounds={[[-90, -180], [90, 180]]}
          ref={mapRef}
          whenCreated={(map) => {
            // Record that the map has been initialized
            mapInitialized.current = true;
            mapRef.current = map;
          }}
          whenReady={(mapEvent) => {
            // Force a map invalidation after a short delay to handle any container size issues
            if (mapEvent && mapEvent.target) {
              setTimeout(() => {
                try {
                  mapEvent.target.invalidateSize();
                } catch (error) {
                  console.error("Error invalidating map size:", error);
                }
              }, 500);
            }
          }}
        >
          {/* Use local tiles if available, otherwise try online source */}
          <TileLayer
            attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png"
            // If tiles don't load, use the backgroundColor style to provide a dark background
            // The background color will show through beneath the GeoJSON
            className="dark-tiles"
          />
          
          {/* Organization layer group - using improved circular markers */}
          <LayerGroup>
            {Object.entries(ORGANIZATIONS).map(([orgId, orgData]) => {
              const isSelected = isOrgSelected(orgId);
              
              // Create a more visually appealing style object with consistent size
              const orgStyle = {
                fillColor: orgData.color,
                weight: isSelected ? 2.5 : 1.5,
                opacity: isSelected ? 0.9 : 0.7,
                color: isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)',
                fillOpacity: isSelected ? 0.7 : 0.4,
              };
              
              // Use a consistent radius for all organization markers
              const radius = 25;

              // Create a custom marker for organization label
              const CustomLabel = () => {
                const map = useMap();
                const [position, setPosition] = useState([0, 0]);
                
                useEffect(() => {
                  // Convert lat/lng to pixel coordinates
                  const updatePosition = () => {
                    if (map) {
                      const center = [orgData.centerLat, orgData.centerLng];
                      const point = map.latLngToContainerPoint(center);
                      setPosition([point.x, point.y - 5]); // Position above the circle
                    }
                  };
                  
                  updatePosition();
                  map.on('zoom move', updatePosition);
                  
                  return () => {
                    map.off('zoom move', updatePosition);
                  };
                }, [map]);
                
                // Check if organization is part of a theater
                const theaterInfo = getTheaterInfo(orgId);
                const theaterStyle = theaterInfo ? {
                  backgroundColor: `${theaterInfo.side.colorCode}90`,
                  borderLeft: `3px solid ${theaterInfo.side.colorCode}`,
                } : {};
                
                return (
                  <div 
                    className={`${classes.orgLabel} ${isSelected ? classes.orgLabelSelected : ''}`}
                    style={{
                      left: `${position[0]}px`,
                      top: `${position[1]}px`,
                      ...theaterStyle
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ marginRight: '6px' }}>{orgData.icon}</span>
                      <span>{orgData.name}</span>
                      {isSelected && <span style={{ marginLeft: '6px', color: '#4CAF50' }}>✓</span>}
                    </div>
                    {theaterInfo && (
                      <Typography variant="caption" style={{ fontSize: '10px', display: 'block', opacity: 0.8 }}>
                        {theaterInfo.theater.name} {theaterInfo.isLead ? '(Lead)' : ''}
                      </Typography>
                    )}
                  </div>
                );
              };
              
              return (
                <React.Fragment key={orgId}>
                  <CircleMarker 
                    center={[orgData.centerLat, orgData.centerLng]}
                    radius={radius}
                    pathOptions={orgStyle}
                    eventHandlers={{
                      click: () => handleOrganizationClick(orgId),
                      mouseover: (e) => {
                        const layer = e.target;
                        layer.setStyle({
                          weight: isSelected ? 3 : 2,
                          color: '#FFFFFF',
                          fillOpacity: isSelected ? 0.9 : 0.7
                        });
                        layer.bringToFront();
                      },
                      mouseout: (e) => {
                        const layer = e.target;
                        layer.setStyle(orgStyle);
                      }
                    }}
                  />
                  <CustomLabel />
                </React.Fragment>
              );
            })}
          </LayerGroup>
          
          <ZoomControl position="bottomright" />
          <GeoJSON 
            data={worldGeoJSON} 
            style={getFeatureStyle}
            onEachFeature={onEachFeature}
            key={geoJsonKey}
            ref={geoJsonLayerRef}
          />
          <MapControls 
            center={defaultCenter} 
            zoom={defaultZoom} 
            selectedNations={selectedNations}
            countriesRef={geoJsonLayerRef}
          />
          
          {/* Add component for nation labels */}
          <NationLabels />
        </MapContainer>
      )}
      
      {/* Notification system */}
      <Snackbar 
        open={notification !== null} 
        autoHideDuration={3000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {notification && (
          <Alert 
            onClose={handleCloseNotification} 
            severity={notification.severity || 'info'}
            elevation={6}
            variant="filled"
          >
            {notification.message}
          </Alert>
        )}
      </Snackbar>

      {/* Add custom CSS for tooltips */}
      <style jsx global>{`
        .country-tooltip {
          background-color: rgba(0, 0, 0, 0.8);
          border: none;
          border-radius: 4px;
          padding: 5px 10px;
          color: white;
          font-weight: bold;
          box-shadow: 0 1px 3px rgba(0,0,0,0.4);
        }
        .country-tooltip::before {
          border-color: transparent;
        }
        .org-tooltip {
          background-color: rgba(0, 0, 0, 0.8);
          border: none;
          border-radius: 4px;
          padding: 5px 10px;
          color: white;
          font-weight: bold;
          box-shadow: 0 1px 3px rgba(0,0,0,0.4);
        }
        .org-tooltip::before {
          border-color: transparent;
        }
      `}</style>

      {/* Add confirmation dialog */}
      <Dialog
        open={removalDialog.open}
        onClose={handleCancelRemoval}
        aria-labelledby="removal-dialog-title"
      >
        <DialogTitle id="removal-dialog-title" disableTypography>
          <Box display="flex" alignItems="center">
            <WarningIcon color="error" style={{ marginRight: 8 }} />
            <Typography variant="h6">Remove {removalDialog.entityName}?</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Removing <b>{removalDialog.entityName}</b> will delete all of its configuration data, including:
          </Typography>
          <Box component="ul" mt={1} ml={2}>
            <Typography component="li">DIME framework configuration (Diplomacy, Information, Military, Economic)</Typography>
            <Typography component="li">All relationships with other nations and organizations</Typography>
            <Typography component="li">Theater assignments and conflict roles</Typography>
            <Typography component="li">Strategic objectives and posture settings</Typography>
          </Box>
          <Typography variant="body1" mt={2} style={{ marginTop: 16 }} color="error">
            <b>This action cannot be undone.</b> Are you sure you want to remove {removalDialog.entityName} from the wargame?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelRemoval} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmRemoval} color="secondary" variant="contained">
            Remove Nation
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default WargameMap;
