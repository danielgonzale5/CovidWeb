// Case search for doctors: exam and status history, and the patient's home and
// work address on the map.
const map = createMap(13);
const home = L.marker([0, 0]).bindPopup('Direccion Casa');
const work = L.marker([0, 0]).bindPopup('Direccion Trabajo');

// Writes "header" and then one line per entry, as text.
function lines(id, header, entries) {
  const paragraph = document.createElement('p');
  for (const line of [header, '', ...entries]) {
    paragraph.append(line, document.createElement('br'));
  }
  document.getElementById(id).replaceChildren(paragraph);
}

async function search(checkPath, checkBody, flag, mapPath, notFoundMessage) {
  try {
    const check = await api(checkPath, checkBody);
    if (check[flag] !== 1) {
      alert(notFoundMessage);
      return;
    }
    const { mapa, examen, histcaso2 } = await api(mapPath, checkBody);
    lines('table2', 'RESULTADO  :  FECHA', examen.map((row) => `${row.resultados}  :  ${row.fecha_examen}`));
    lines('table', 'ESTADO  :  FECHA MODIFICACIÓN', histcaso2.map((row) => `${STATUS_LABELS[row.estado] || '-'}  :  ${row.fecha_mod}`));
    await showAddresses(mapa[0]);
  } catch (error) {
    alert(error.status === 400 ? 'Revise el dato ingresado' : `No se pudo consultar el caso: ${error.message}`);
  }
}

async function showAddresses({ dir_residencia, dir_trabajo }) {
  if (!MAP_KEYS.esriApiKey) {
    alert('Configure ESRI_API_KEY en el servidor para ubicar direcciones en el mapa');
    return;
  }
  const [homeAt, workAt] = await Promise.all([geocode(dir_residencia), geocode(dir_trabajo)]);
  if (homeAt) home.setLatLng(homeAt).addTo(map);
  if (workAt) work.setLatLng(workAt).addTo(map);
  if (homeAt && workAt) map.flyToBounds(L.latLngBounds(homeAt, workAt), { padding: [50, 50] });
  else if (homeAt || workAt) map.setView(homeAt || workAt, 13);
}

function CheckCedula() {
  const cedulac = document.getElementById('cedulac').value;
  search('/cosltcheck1', { cedulac }, 'CedulaCChecked', '/Mapdraw1', 'Esta Cédula no se encuentra registrada');
}

function CheckCaso() {
  const codigoc = document.getElementById('codigoc').value;
  search('/cosltcheck2', { codigoc }, 'CodigoCChecked', '/Mapdraw2', 'Este Código no se encuentra registrado');
}

document.getElementById('searchByCedula').addEventListener('click', CheckCedula);
document.getElementById('searchByCase').addEventListener('click', CheckCaso);
