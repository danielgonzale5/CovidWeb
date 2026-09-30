'use strict';

// End-to-end checks of each finding against the HTTP server, with an in-memory database.
const test = require('node:test');
const assert = require('node:assert/strict');
const { startApp, PASSWORDS } = require('./helpers');
const { verifyPassword } = require('../src/passwords');

async function withApp(t, options) {
  const app = await startApp(options);
  t.after(app.stop);
  return app;
}

test('CW-02: role pages need a session; without one they redirect to the login page', async (t) => {
  const app = await withApp(t);
  for (const page of ['/Administracion', '/Registros', '/Gestion', '/Busqueda', '/MapaGeneral', '/PrincipalPageAdmin']) {
    const res = await app.request(page, { method: 'GET' });
    assert.equal(res.status, 303, page);
    assert.equal(res.headers.get('location'), '/', page);
  }
});

test('CW-02: every API endpoint needs a session', async (t) => {
  const app = await withApp(t);
  for (const path of ['/userinfo', '/regisinfo', '/regis', '/rcedinfo', '/cosltcheck1', '/consulta1', '/actestate', '/Mapdraw1', '/general_map']) {
    assert.equal((await app.request(path, { body: {} })).status, 401, path);
  }
  assert.equal(app.db.calls.filter((c) => c !== 'findUser').length, 0);
});

test('CW-02: each role reaches only its own pages and endpoints', async (t) => {
  const app = await withApp(t);
  const assistant = await app.login('asistente.test');
  const doctor = await app.login('medico.test');
  const admin = await app.login('admin.test');

  assert.equal((await app.request('/Gestion', { method: 'GET', cookie: assistant })).status, 200);
  const wrongPage = await app.request('/Administracion', { method: 'GET', cookie: assistant });
  assert.equal(wrongPage.status, 303);
  assert.equal(wrongPage.headers.get('location'), '/PrincipalPageAyudante');

  const newAdmin = { datanombre: 'Eve', dataapellido: 'Test', datacedula: '1000099', datarol: 3, datausuario: 'eve.test', datacontra: 'long enough password' };
  assert.equal((await app.request('/regisinfo', { cookie: assistant, body: newAdmin })).status, 403);
  assert.equal((await app.request('/regisinfo', { cookie: doctor, body: newAdmin })).status, 403);
  assert.equal((await app.request('/consulta1', { cookie: doctor, body: { ctcedu: '2000001' } })).status, 403);
  assert.equal((await app.request('/Mapdraw1', { cookie: assistant, body: { cedulac: '2000001' } })).status, 403);
  assert.equal((await app.request('/regisinfo', { cookie: admin, body: newAdmin })).status, 201);
});

test('CW-02: the session cookie is HttpOnly, SameSite=Strict and Secure, and logout ends it', async (t) => {
  const app = await withApp(t);
  const res = await app.request('/login', { body: { user: 'asistente.test', pass: PASSWORDS['asistente.test'] } });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { redirect: '/PrincipalPageAyudante' });
  const cookie = res.headers.getSetCookie().find((c) => /^cw_session=[^;]+/.test(c));
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Secure/);

  const session = cookie.split(';')[0];
  assert.equal((await app.request('/Gestion', { method: 'GET', cookie: session })).status, 200);
  await app.request('/logout', { method: 'GET', cookie: session });
  assert.equal((await app.request('/Gestion', { method: 'GET', cookie: session })).status, 303);
});

test('CW-02: wrong passwords and unknown users get the same answer, then a lockout', async (t) => {
  const app = await withApp(t);
  const wrong = await app.request('/login', { body: { user: 'asistente.test', pass: 'wrong password' } });
  const unknown = await app.request('/login', { body: { user: 'nobody.here', pass: 'wrong password' } });
  assert.equal(wrong.status, 401);
  assert.equal(unknown.status, 401);
  assert.deepEqual(await wrong.json(), await unknown.json());
  for (let i = 0; i < 8; i += 1) await app.request('/login', { body: { user: 'asistente.test', pass: 'wrong' } });
  const locked = await app.request('/login', { body: { user: 'asistente.test', pass: PASSWORDS['asistente.test'] } });
  assert.equal(locked.status, 429);
});

test('CW-01: SQL syntax and malformed values are refused before the database', async (t) => {
  const app = await withApp(t);
  const assistant = await app.login('asistente.test');
  app.db.calls.length = 0;
  for (const [path, body] of [
    ['/consulta1', { ctcedu: "1' OR '1'='1" }],
    ['/consulta2', { ctcodigo: '1; DROP TABLE usuarios' }],
    ['/consulta3', { ctnombre: 'Laura") OR ("1', ctapellido: 'Pérez' }],
    ['/cosltcheck1', { cedulac: ['2000001'] }],
    ['/regis', { cedula: '2000002', nombre: '<b>x</b>', apellido: 'Test', sexo: 0, fecha_nacimiento: '1990-01-01', direccion_residencia: 'Calle 1', direccion_trabajo: 'Calle 2', resultado_examen: 0, fecha_examen: '2026-09-29' }],
  ]) {
    assert.equal((await app.request(path, { cookie: assistant, body })).status, 400, path);
  }
  assert.deepEqual(app.db.calls, []);
});

test('CW-03: a lookup is answered to the caller only, over HTTP', async (t) => {
  const app = await withApp(t);
  const assistant = await app.login('asistente.test');
  const res = await app.request('/consulta1', { cookie: assistant, body: { ctcedu: '2000001' } });
  const data = await res.json();
  assert.equal(data.infocase.NombreCs, 'Laura');
  assert.deepEqual(data.estadocaso, { EstadoCs: 'En Tratamiento Casa' });
  // Socket.IO is gone: nothing to connect to and listen on.
  assert.equal((await app.request('/socket.io/?EIO=4&transport=polling', { method: 'GET' })).status, 404);
});

test('CW-04: an unknown ID gets 404, a database error gets 500, and the server keeps serving', async (t) => {
  const app = await withApp(t);
  const assistant = await app.login('asistente.test');
  assert.equal((await app.request('/consulta1', { cookie: assistant, body: { ctcedu: '99999' } })).status, 404);
  app.db.failNext = true;
  const failed = await app.request('/consulta1', { cookie: assistant, body: { ctcedu: '2000001' } });
  assert.equal(failed.status, 500);
  assert.deepEqual(await failed.json(), { error: 'internal error' });
  assert.equal((await app.request('/consulta1', { cookie: assistant, body: { ctcedu: '2000001' } })).status, 200);
});

test('CW-04: request bodies over 10 KB are refused', async (t) => {
  const app = await withApp(t);
  const res = await app.request('/login', { body: JSON.stringify({ user: 'x', pass: 'y'.repeat(20_000) }) });
  assert.equal(res.status, 413);
});

test('CW-07: responses carry a CSP that forbids inline script', async (t) => {
  const app = await withApp(t);
  const res = await app.request('/', { method: 'GET' });
  const csp = res.headers.get('content-security-policy');
  assert.match(csp, /script-src 'self' https:\/\/unpkg\.com https:\/\/cdn\.jsdelivr\.net(;|$)/);
  assert.doesNotMatch(csp, /script-src[^;]*unsafe-inline/);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('x-powered-by'), null);
});

test('CW-07: names with markup are refused at registration', async (t) => {
  const app = await withApp(t);
  const assistant = await app.login('asistente.test');
  const body = {
    cedula: '2000002', nombre: 'Laura', apellido: 'Pérez', sexo: 1, fecha_nacimiento: '1990-01-01',
    direccion_residencia: 'Calle 72 # 38-95', direccion_trabajo: 'Carrera 46 # 80-10', resultado_examen: 0, fecha_examen: '2026-09-28',
  };
  assert.equal((await app.request('/regis', { cookie: assistant, body: { ...body, nombre: '<img src=x>' } })).status, 400);
  assert.equal((await app.request('/regis', { cookie: assistant, body: { ...body, direccion_residencia: 'Calle <b>1</b>' } })).status, 400);
  assert.equal((await app.request('/regis', { cookie: assistant, body })).status, 201);
});

test('CW-08: logins and lookups log events, never passwords or patient data', async (t) => {
  const lines = [];
  const log = { info: (m) => lines.push(m), warn: (m) => lines.push(m), error: (m) => lines.push(m) };
  const app = await withApp(t, { log });
  await app.request('/login', { body: { user: 'asistente.test', pass: 'a wrong password' } });
  const assistant = await app.login('asistente.test');
  await app.request('/consulta1', { cookie: assistant, body: { ctcedu: '2000001' } });
  const all = lines.join('\n');
  assert.match(all, /failed login/);
  assert.match(all, /viewed case 1/);
  for (const secret of ['a wrong password', PASSWORDS['asistente.test'], '2000001', 'Laura', 'Calle 72']) {
    assert.ok(!all.includes(secret), `log contains ${secret}`);
  }
});

test('CW-09: new users are stored with a scrypt hash, not the password', async (t) => {
  const app = await withApp(t);
  const admin = await app.login('admin.test');
  const body = { datanombre: 'Eve', dataapellido: 'Test', datacedula: '1000099', datarol: 2, datausuario: 'eve.test', datacontra: 'long enough password' };
  assert.equal((await app.request('/regisinfo', { cookie: admin, body })).status, 201);
  const stored = app.db.users.find((u) => u.usuario === 'eve.test');
  assert.match(stored.password_hash, /^scrypt:/);
  assert.ok(!stored.password_hash.includes('long enough password'));
  assert.equal(verifyPassword('long enough password', stored.password_hash), true);
  const short = { ...body, datausuario: 'short.pw', datacedula: '1000098', datacontra: 'short' };
  assert.equal((await app.request('/regisinfo', { cookie: admin, body: short })).status, 400);
});

test('CW-10: registration returns the ID of its own case', async (t) => {
  const app = await withApp(t);
  const assistant = await app.login('asistente.test');
  const body = {
    cedula: '2000002', nombre: 'Carlos', apellido: 'Gómez', sexo: 0, fecha_nacimiento: '1985-05-05',
    direccion_residencia: 'Calle 1 # 2-3', direccion_trabajo: 'Calle 4 # 5-6', resultado_examen: 1, fecha_examen: '2026-09-28',
  };
  const res = await app.request('/regis', { cookie: assistant, body });
  assert.equal(res.status, 201);
  assert.deepEqual(await res.json(), { Code: 2 });
  assert.equal((await app.request('/regis', { cookie: assistant, body })).status, 409);
});

test('status updates must match the case, and a deceased case accepts no more', async (t) => {
  const app = await withApp(t);
  const assistant = await app.login('asistente.test');
  const update = { actestado: 'Muerte', actcedu: '2000001', actcode: '1', actfemod: '2026-09-29' };
  assert.equal((await app.request('/actestate', { cookie: assistant, body: { ...update, actcedu: '2000009' } })).status, 404);
  assert.equal((await app.request('/actestate', { cookie: assistant, body: { ...update, actestado: 'Otro' } })).status, 400);
  assert.equal((await app.request('/actestate', { cookie: assistant, body: update })).status, 201);
  assert.equal((await app.request('/actestate', { cookie: assistant, body: { ...update, actestado: 'Curado' } })).status, 409);
});

test('CSRF: cross-origin and non-JSON POSTs are refused', async (t) => {
  const app = await withApp(t);
  const assistant = await app.login('asistente.test');
  const crossSite = await app.request('/consulta1', { cookie: assistant, body: { ctcedu: '2000001' }, headers: { origin: 'https://evil.example' } });
  assert.equal(crossSite.status, 403);
  const form = await fetch(`${app.base}/consulta1`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: assistant },
    body: 'ctcedu=2000001',
  });
  assert.equal(form.status, 415);
});

test('CW-06: without a secret the webhook route does not exist', async (t) => {
  const app = await withApp(t);
  assert.equal((await app.request('/github', { body: { ref: 'refs/heads/master' } })).status, 404);
});

test('the public dashboard needs no session and returns aggregates only', async (t) => {
  const app = await withApp(t);
  const res = await app.request('/resumen', { body: {} });
  assert.equal(res.status, 200);
  assert.deepEqual(Object.keys(await res.json()), ['resum', 'info', 'resultados']);
});
