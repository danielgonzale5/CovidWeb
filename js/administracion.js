// User administration (administrators only; the server enforces it).
function onUserChecked(UsChk) {
  const userFree = UsChk.UsInfChk === 0;
  const cedulaFree = UsChk.CdInfChk === 0;
  if (document.getElementById('pass1').value !== document.getElementById('pass2').value) {
    alert('La contraseña no coincide');
  } else if (userFree && cedulaFree) {
    Registrar();
  } else if (userFree) {
    alert('la cedula ya existe');
  } else if (cedulaFree) {
    alert('El usuario ya existe');
  } else {
    alert('El usuario y la cedula ya existen');
  }
}

async function CheckUser() {
  const datauser = document.getElementById('user').value;
  const datacedu = document.getElementById('cedula').value;
  try {
    onUserChecked(await api('/userinfo', { datauser, datacedu }));
  } catch (error) {
    alert(`No se pudo verificar el usuario: ${error.message}`);
  }
}

async function Registrar() {
  const roles = { Administrador: 3, 'Médico': 1, Ayudante: 2 };
  const datarol = roles[document.getElementById('rol').value];
  if (!datarol) {
    alert('Por favor seleccione un rol');
    return;
  }
  const info = {
    datanombre: document.getElementById('nombres').value,
    dataapellido: document.getElementById('apellidos').value,
    datacedula: document.getElementById('cedula').value,
    datarol,
    datausuario: document.getElementById('user').value,
    datacontra: document.getElementById('pass1').value,
  };
  try {
    await api('/regisinfo', info);
    alert('Usuario registrado');
  } catch (error) {
    alert(`No se pudo registrar el usuario: ${error.message}`);
  }
}

document.getElementById('registerUser').addEventListener('click', (event) => {
  event.preventDefault();
  CheckUser();
});
