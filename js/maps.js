// Shared map setup for the doctor pages. Keys come from /map-config.js, which the
// server builds from its environment. Without a Mapbox token the map uses
// OpenStreetMap tiles; without an Esri key addresses cannot be geocoded.
const MAP_KEYS = window.MAP_CONFIG || { mapboxToken: '', esriApiKey: '' };

function createMap(zoom) {
  const map = L.map('map').setView([10.9943595, -74.7935713], zoom);
  if (MAP_KEYS.mapboxToken) {
    L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
      attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      maxZoom: 18,
      id: 'mapbox/streets-v11',
      tileSize: 512,
      zoomOffset: -1,
      accessToken: MAP_KEYS.mapboxToken,
    }).addTo(map);
  } else {
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
  }
  if (MAP_KEYS.esriApiKey) {
    L.esri.Vector.vectorBasemapLayer('ArcGIS:Navigation', { apiKey: MAP_KEYS.esriApiKey }).addTo(map);
  }
  return map;
}

// Resolves an address in Barranquilla to [lat, lng], or null. Only the address
// is sent to Esri: never a name or an ID number.
function geocode(address) {
  return new Promise((resolve) => {
    if (!MAP_KEYS.esriApiKey) {
      resolve(null);
      return;
    }
    L.esri.Geocoding.geocodeService({ apikey: MAP_KEYS.esriApiKey })
      .geocode().address(address).city('Barranquilla').region('Atlantico')
      .run((err, results) => {
        const first = !err && results && results.results[0];
        resolve(first ? [first.latlng.lat, first.latlng.lng] : null);
      });
  });
}

function dotIcon(color) {
  return L.icon({
    iconUrl: `https://maps.google.com/mapfiles/ms/icons/${color}-dot.png`,
    iconSize: [50, 50],
    iconAnchor: [25, 50],
    popupAnchor: [-3, -76],
  });
}
