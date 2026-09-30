// Case map for doctors: each case at its home address, coloured by its latest status.
const map = createMap(12);
const STATUS_COLORS = { 1: 'yellow', 2: 'orange', 3: 'pink', 4: 'yellow', 5: 'green', 6: 'red' };
let markers = [];

async function a(fromButton) {
  markers.forEach((marker) => marker.remove());
  markers = [];
  if (!MAP_KEYS.esriApiKey) {
    if (fromButton === true) alert('Configure ESRI_API_KEY en el servidor para ubicar direcciones en el mapa');
    return;
  }
  const { pos, neg } = await api('/general_map');
  const cases = [
    ...neg.map((row) => ({ address: row.dir_residencia, color: 'green' })),
    ...pos.map((row) => ({ address: row.dir_residencia, color: STATUS_COLORS[row.estado] || 'yellow' })),
  ];
  for (const { address, color } of cases) {
    geocode(address).then((at) => {
      if (at) markers.push(L.marker(at, { icon: dotIcon(color) }).addTo(map));
    });
  }
}

document.getElementById('refreshMap').addEventListener('click', () => a(true));
a();
