// Case management (assistants only; the server enforces it): look a case up by
// ID number, case number or name, then record a change of clinical status.
const text = (id, value) => {
  document.getElementById(id).textContent = value;
};

function PreConsultar() {
  const ccedu = document.getElementById('cedulac').value;
  const cnombre = document.getElementById('nombresc').value;
  const capellido = document.getElementById('apellidosc').value;
  const ccodigo = document.getElementById('codigoc').value;
  if (ccedu !== '') {
    lookup('/cosltcheck1', { cedulac: ccedu }, 'CedulaCChecked', '/consulta1', { ctcedu: ccedu }, 'Esta Cédula no se encuentra registrada');
  } else if (ccodigo !== '') {
    lookup('/cosltcheck2', { codigoc: ccodigo }, 'CodigoCChecked', '/consulta2', { ctcodigo: ccodigo }, 'Este Código no se encuentra registrado');
  } else if (cnombre !== '' && capellido === '') {
    alert('Por favor ingrese el apellido');
  } else if (cnombre === '' && capellido !== '') {
    alert('Por favor ingrese el nombre');
  } else if (cnombre !== '' && capellido !== '') {
    lookup('/cosltcheck3', { nombrec: cnombre, apellidoc: capellido }, 'NameChecked', '/consulta3',
      { ctnombre: cnombre, ctapellido: capellido }, 'Existe más de un usuario con el nombre ingresado o no existe');
  }
}

async function lookup(checkPath, checkBody, flag, casePath, caseBody, notFoundMessage) {
  try {
    const check = await api(checkPath, checkBody);
    if (check[flag] !== 1) {
      alert(notFoundMessage);
      return;
    }
    showCase(await api(casePath, caseBody));
  } catch (error) {
    alert(error.status === 400 ? 'Revise el dato ingresado' : `No se pudo consultar el caso: ${error.message}`);
  }
}

// Patient data is written as text: a name or address is never parsed as HTML.
function showCase({ infocase: InfCs, estadocaso, histcaso }) {
  text('nombres', InfCs.NombreCs);
  text('apellidos', InfCs.ApellidoCs);
  text('cedula', InfCs.CedulaCs);
  text('sexo', InfCs.SexoCs);
  text('nacimiento', InfCs.NacimientoCs);
  text('dirres', InfCs.ResidenciaCs);
  text('dirtra', InfCs.TrabajoCs);
  text('resultado', InfCs.ResultadoCs);
  text('fechaexa', InfCs.FExaCs);
  text('codigo', InfCs.CodigoCs);
  text('estado', estadocaso.EstadoCs);
  const rows = histcaso.map((row) => [STATUS_LABELS[row.estado] || '-', row.fecha_mod]);
  document.getElementById('table').replaceChildren(buildTable(['ESTADO', 'FECHA MODIFICACIÓN'], rows));
}

function CheckActualizar() {
  const actr = document.getElementById('estadoa').value;
  const codcnt = document.getElementById('codigo').innerText;
  const est = document.getElementById('estado').innerText;
  if (est.toUpperCase() === 'MUERTE') {
    alert('Este caso no permite más modificaciones');
  } else if (actr === '') {
    alert('Por favor seleccione una actualización');
  } else if (codcnt.trim() === '-') {
    alert('Por favor realice una consulta antes de actualizar');
  } else {
    Actualizar();
  }
}

async function Actualizar() {
  const info = {
    actestado: document.getElementById('estadoa').value,
    actcedu: document.getElementById('cedula').textContent,
    actcode: document.getElementById('codigo').textContent,
    actfemod: document.getElementById('fmod').value,
  };
  try {
    await api('/actestate', info);
    showCase(await api('/consulta2', { ctcodigo: info.actcode }));
  } catch (error) {
    alert(`No se pudo actualizar el caso: ${error.message}`);
  }
}

document.getElementById('lookupCase').addEventListener('click', PreConsultar);
document.getElementById('updateCase').addEventListener('click', CheckActualizar);

// Date fields default to today and cannot be in the future.
const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
document.getElementById('fmod').value = today;
document.getElementById('fmod').max = today;
