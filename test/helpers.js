'use strict';

// Test helpers: an in-memory database with the same interface as src/db.js, and
// a running app on a random port.
const http = require('http');
const { createApp } = require('../src/app');
const { createSessionStore, createLoginThrottle } = require('../src/sessions');
const { hashPassword } = require('../src/passwords');
const { silentLog } = require('../src/log');

const PASSWORDS = { 'admin.test': 'admin password 123', 'asistente.test': 'assistant password 123', 'medico.test': 'doctor password 123' };

function duplicate() {
  return Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' });
}

function fakeDb() {
  const users = [
    { id: 1, usuario: 'admin.test', role: 3, cedula: 1000001, password_hash: hashPassword(PASSWORDS['admin.test']) },
    { id: 2, usuario: 'asistente.test', role: 2, cedula: 1000002, password_hash: hashPassword(PASSWORDS['asistente.test']) },
    { id: 3, usuario: 'medico.test', role: 1, cedula: 1000003, password_hash: hashPassword(PASSWORDS['medico.test']) },
  ];
  const cases = [
    {
      idcaso: 1, cedula: 2000001, nombre: 'Laura', apellido: 'Pérez', sexo: 1, fecha_nacimiento: '1990-01-15',
      dir_residencia: 'Calle 72 # 38-95', dir_trabajo: 'Carrera 46 # 80-10', resultado: 0, fecha_examen: '2026-09-28',
    },
  ];
  const statuses = [{ idcaso: 1, cedula: 2000001, estado: 4, fecha_mod: '2026-09-29' }];
  const db = {
    users,
    cases,
    statuses,
    calls: [],
    failNext: false,
    async findUser(usuario) {
      return users.find((u) => u.usuario === usuario) || null;
    },
    async usernameTaken(usuario) {
      return users.some((u) => u.usuario === usuario);
    },
    async userCedulaTaken(cedula) {
      return users.some((u) => u.cedula === cedula);
    },
    async createUser(user) {
      if (users.some((u) => u.usuario === user.usuario || u.cedula === user.cedula)) throw duplicate();
      users.push({ id: users.length + 1, usuario: user.usuario, role: user.rol, cedula: user.cedula, password_hash: user.passwordHash });
      return users.length;
    },
    async patientExists(cedula) {
      return cases.some((c) => c.cedula === cedula);
    },
    async caseExists(idcaso) {
      return cases.some((c) => c.idcaso === idcaso);
    },
    async countByName(nombre, apellido) {
      return cases.filter((c) => c.nombre === nombre && c.apellido === apellido).length;
    },
    async createCase(c) {
      if (cases.some((x) => x.cedula === c.cedula)) throw duplicate();
      const idcaso = cases.length + 1;
      cases.push({ idcaso, ...c });
      return idcaso;
    },
    async findCase(lookup) {
      if (db.failNext) {
        db.failNext = false;
        throw Object.assign(new Error('connection lost'), { code: 'PROTOCOL_CONNECTION_LOST' });
      }
      return cases.find((c) => Object.entries(lookup).every(([key, value]) => c[key] === value)) || null;
    },
    async statusHistory(idcaso) {
      return statuses.filter((s) => s.idcaso === idcaso).map(({ estado, fecha_mod }) => ({ estado, fecha_mod }));
    },
    async latestStatus(idcaso) {
      const history = statuses.filter((s) => s.idcaso === idcaso);
      return history.length ? history[history.length - 1].estado : null;
    },
    async addStatus(status) {
      statuses.push(status);
    },
    async examHistory(idcaso) {
      const c = cases.find((x) => x.idcaso === idcaso);
      return c ? [{ resultados: c.resultado === 0 ? 'Positivo' : 'Negativo', fecha_examen: c.fecha_examen }] : [];
    },
    async dashboard() {
      return { resum: [], info: [], resultados: [] };
    },
    async generalMap() {
      return { pos: [], neg: [] };
    },
  };
  // Record every call, to prove that invalid input never reaches the database.
  for (const name of Object.keys(db)) {
    if (typeof db[name] === 'function') {
      const original = db[name];
      db[name] = (...args) => {
        db.calls.push(name);
        return original(...args);
      };
    }
  }
  return db;
}

async function startApp({ db = fakeDb(), webhook = { secret: '', branch: 'master' }, log = silentLog, throttle = createLoginThrottle() } = {}) {
  const config = { webhook, trustProxy: false, maps: { mapboxToken: '', esriApiKey: '' } };
  const sessions = createSessionStore({ secure: true });
  const server = http.createServer(createApp({ config, db, sessions, throttle, deploy: () => {}, log }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  const request = (path, { method = 'POST', body, cookie, headers = {} } = {}) =>
    fetch(base + path, {
      method,
      redirect: 'manual',
      headers: {
        ...(method === 'POST' ? { 'content-type': 'application/json' } : {}),
        ...(cookie ? { cookie } : {}),
        ...headers,
      },
      body: method === 'POST' ? (typeof body === 'string' ? body : JSON.stringify(body || {})) : undefined,
    });

  async function login(usuario) {
    const res = await request('/login', { body: { user: usuario, pass: PASSWORDS[usuario] } });
    const cookie = res.headers.getSetCookie().find((c) => /^cw_session=[^;]+/.test(c));
    return cookie ? cookie.split(';')[0] : null;
  }

  return { base, db, sessions, request, login, stop: () => new Promise((resolve) => server.close(resolve)) };
}

module.exports = { fakeDb, startApp, PASSWORDS };
