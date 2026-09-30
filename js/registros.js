// Case registration (assistants only; the server enforces it).
async function CheckCed() {
  const datacedu = document.getElementById('cedula').value;
  try {
    const { CedInfChk } = await api('/rcedinfo', { datacedu });
    if (CedInfChk === 1) alert('Ya existe un caso con esta cédula, por favor gestione el caso');
    else Registro_Caso();
  } catch (error) {
    alert(`No se pudo verificar la cédula: ${error.message}`);
  }
}

async function Registro_Caso() {
  const sexos = { Masculino: 0, Femenino: 1 };
  const resultados = { Positivo: 0, Negativo: 1 };
  const sexo = sexos[document.getElementById('sexo').value];
  if (sexo === undefined) {
    alert('Por favor seleccione el sexo');
    return;
  }
  const resultado_examen = resultados[document.getElementById('resultado').value];
  if (resultado_examen === undefined) {
    alert('Por favor seleccione el resultado');
    return;
  }
  const info = {
    cedula: document.getElementById('cedula').value,
    nombre: document.getElementById('nombres').value,
    apellido: document.getElementById('apellidos').value,
    sexo,
    fecha_nacimiento: document.getElementById('nacimiento').value,
    direccion_residencia: document.getElementById('dirres').value,
    direccion_trabajo: document.getElementById('dirtra').value,
    resultado_examen,
    fecha_examen: document.getElementById('fechaexa').value,
  };
  try {
    // The case number of this registration, returned to this browser only.
    const { Code } = await api('/regis', info);
    document.getElementById('codigo').textContent = Code;
  } catch (error) {
    alert(`No se pudo registrar el caso: ${error.message}`);
  }
}

document.getElementById('registerCase').addEventListener('click', CheckCed);

// Date fields default to today and cannot be in the future.
const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
document.getElementById('fechaexa').value = today;
for (const id of ['nacimiento', 'fechaexa']) document.getElementById(id).max = today;
