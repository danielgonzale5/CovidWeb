// Login form on the home page. The server checks the password, starts a session
// and tells this browser, and only this browser, where to go.
async function check() {
  const user = document.getElementById('username').value;
  const pass = document.getElementById('password').value;
  try {
    const { redirect } = await api('/login', { user, pass });
    location.href = redirect;
  } catch (error) {
    if (error.status === 429) alert('Demasiados intentos fallidos. Intente de nuevo en unos minutos.');
    else alert('El Usuario o la Contraseña no existen o son incorrectos');
  }
}

// Pressing Enter used to submit the form as a GET, which put the password in the URL.
document.getElementById('loginForm').addEventListener('submit', (event) => {
  event.preventDefault();
  check();
});
