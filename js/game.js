import { MAPILLARY_API_KEY } from './config.js';

const osmStyle = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors'
    }
  },
  layers: [
    { id: 'osm', type: 'raster', source: 'osm' }
  ]
};

const satStyle = {
  version: 8,
  sources: {
    esri: {
      type: 'raster',
      tiles: ['https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution: 'Tiles &copy; Esri'
    }
  },
  layers: [
    { id: 'esri', type: 'raster', source: 'esri' }
  ]
};

const map = new maplibregl.Map({
  container: 'map',
  style: osmStyle,
  center: [0, 0],
  zoom: 2
});

const basemapSelect = document.getElementById('basemap');
basemapSelect.addEventListener('change', () => {
  map.setStyle(basemapSelect.value === 'osm' ? osmStyle : satStyle);
});

const projSelect = document.getElementById('projection');
projSelect.addEventListener('change', () => {
  map.setProjection(projSelect.value);
});

let guessMarker = new maplibregl.Marker();
let guessCoords = null;
map.on('click', (e) => {
  guessCoords = [e.lngLat.lng, e.lngLat.lat];
  guessMarker.setLngLat(guessCoords).addTo(map);
});

let viewer;
let actualCoords;

async function fetchRandomPano() {
  const lat = Math.random() * 170 - 85;
  const lon = Math.random() * 360 - 180;
  const radius = 1000;
  const url = `https://graph.mapillary.com/images?access_token=${MAPILLARY_API_KEY}&fields=id,computed_geometry&is_pano=true&limit=1&lat=${lat}&lng=${lon}&radius=${radius}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.data || data.data.length === 0) {
    return fetchRandomPano();
  }
  const img = data.data[0];
  const coords = img.computed_geometry.coordinates;
  return { id: img.id, lat: coords[1], lng: coords[0] };
}

async function loadNewPano() {
  const pano = await fetchRandomPano();
  actualCoords = { lat: pano.lat, lng: pano.lng };
  if (!viewer) {
    viewer = new Mapillary.Viewer({
      container: 'mly',
      accessToken: MAPILLARY_API_KEY,
      imageId: pano.id
    });
  } else {
    viewer.moveTo(pano.id);
  }
  resetRound();
}

function resetRound() {
  guessCoords = null;
  guessMarker.remove();
  if (map.getLayer('line')) {
    map.removeLayer('line');
    map.removeSource('line');
  }
  document.getElementById('result').textContent = '';
  timeLeft = 300;
  startTimer();
}

function haversine(aLat, aLng, bLat, bLng) {
  const R = 6371;
  const dLat = (bLat - aLat) * Math.PI / 180;
  const dLng = (bLng - aLng) * Math.PI / 180;
  const sa = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * Math.PI / 180) * Math.cos(bLat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(sa), Math.sqrt(1 - sa));
  return R * c;
}

function showResult() {
  if (!guessCoords) {
    alert('地図をクリックして推測地点を選んでください');
    return;
  }
  const dist = haversine(guessCoords[1], guessCoords[0], actualCoords.lat, actualCoords.lng);
  const score = Math.max(0, Math.round(5000 - dist));
  document.getElementById('result').textContent = `距離: ${dist.toFixed(2)} km 得点: ${score}`;
  new maplibregl.Marker({ color: 'green' }).setLngLat([actualCoords.lng, actualCoords.lat]).addTo(map);
  const line = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [guessCoords, [actualCoords.lng, actualCoords.lat]]
        }
      }
    ]
  };
  map.addSource('line', { type: 'geojson', data: line });
  map.addLayer({ id: 'line', type: 'line', source: 'line', paint: { 'line-color': '#f00', 'line-width': 2 } });
}

document.getElementById('guess-btn').addEventListener('click', showResult);
document.getElementById('new-round').addEventListener('click', loadNewPano);

let timeLeft = 300;
let timerInterval;
function startTimer() {
  clearInterval(timerInterval);
  const timerEl = document.getElementById('timer');
  timerEl.textContent = formatTime(timeLeft);
  timerInterval = setInterval(() => {
    timeLeft--;
    timerEl.textContent = formatTime(timeLeft);
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      alert('時間切れです');
      showResult();
    }
  }, 1000);
}

function formatTime(t) {
  const m = Math.floor(t / 60).toString().padStart(2, '0');
  const s = (t % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

loadNewPano();
