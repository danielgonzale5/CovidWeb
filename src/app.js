'use strict';

const path = require('path');
const express = require('express');
const v = require('./validate');
const { hashPassword, verifyPassword, DUMMY_HASH, MIN_LENGTH, MAX_LENGTH } = require('./passwords');
const { clientIp } = require('./sessions');
const { createWebhookHandler } = require('./webhook');

const { ROLES, STATUS_LABELS, DECEASED } = v;
const HOME = { [ROLES.ADMIN]: '/PrincipalPageAdmin', [ROLES.ASSISTANT]: '/PrincipalPageAyudante', [ROLES.DOCTOR]: '/PrincipalPageMedico' };

// Pages may only run scripts served by this app or the pinned, SRI-checked
// libraries from unpkg and jsDelivr. Inline <script> and on* attributes are refused.
// The map pages need Esri (vector basemap, geocoding) and Mapbox tiles.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' https://unpkg.com https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://unpkg.com",
  "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://api.mapbox.com https://*.arcgis.com https://*.arcgisonline.com https://unpkg.com https://maps.google.com https://maps.gstatic.com",
  "font-src 'self' data: https://*.arcgis.com",
  "connect-src 'self' https://api.mapbox.com https://*.arcgis.com https://*.arcgisonline.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

function securityHeaders(req, res, next) {
  res.set({
    'Content-Security-Policy': CONTENT_SECURITY_POLICY,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    // Tile servers require a Referer; send the origin only, never the path.
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cache-Control': 'no-store',
  });
  next();
}

// CSRF defence in depth, on top of the SameSite=Strict session cookie: a POST must
// be JSON (a cross-site form cannot send that without a CORS preflight), and if the
// browser says where it comes from, it must be this origin.
function sameOriginJson(req, res, next) {
  if (req.method !== 'POST') return next();
  const origin = req.get('Origin');
  if (origin) {
    let host = null;
    try {
      host = new URL(origin).host;
    } catch {
      host = null;
    }
    if (host !== req.get('Host')) return res.status(403).json({ error: 'cross-origin request refused' });
  }
  if (!(req.get('Content-Type') || '').startsWith('application/json')) {
    return res.status(415).json({ error: 'requests must be JSON' });
  }
  return next();
}

function toCaseDetails(found, history) {
  const latest = history.length > 0 ? history[history.length - 1].estado : null;
  return {
    infocase: {
      CodigoCs: String(found.idcaso),
      CedulaCs: String(found.cedula),
      NombreCs: found.nombre,
      ApellidoCs: found.apellido,
      SexoCs: found.sexo === 0 ? 'Masculino' : 'Femenino',
      NacimientoCs: found.fecha_nacimiento,
      ResidenciaCs: found.dir_residencia,
      TrabajoCs: found.dir_trabajo,
      ResultadoCs: found.resultado === 0 ? 'Positivo' : 'Negativo',
      FExaCs: found.fecha_examen,
    },
    estadocaso: { EstadoCs: latest ? STATUS_LABELS[latest] : '-' },
    histcaso: history,
  };
}

function createApp({ config, db, sessions, throttle, deploy, log, root = path.join(__dirname, '..') }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(securityHeaders);

  // GitHub authenticates with an HMAC signature. Without a secret the route does not exist.
  if (config.webhook.secret && deploy) {
    app.post(
      '/github',
      express.raw({ type: () => true, limit: '1mb' }),
      createWebhookHandler({ secret: config.webhook.secret, branch: config.webhook.branch, deploy, log }),
    );
  }

  app.use(sameOriginJson);
  app.use(express.json({ limit: '10kb' }));
  app.use((req, res, next) => {
    req.session = sessions.get(req);
    next();
  });

  const bad = (res, error) => res.status(400).json({ error });

  // Access control, checked on the server for every page and every endpoint.
  const page = (file, ...roles) => (req, res) => {
    if (roles.length > 0) {
      if (!req.session) return res.redirect(303, '/');
      if (!roles.includes(req.session.role)) return res.redirect(303, HOME[req.session.role]);
    }
    return res.sendFile(path.join(root, file));
  };
  const api = (...roles) => (req, res, next) => {
    if (!req.session) return res.status(401).json({ error: 'login required' });
    if (!roles.includes(req.session.role)) return res.status(403).json({ error: 'not allowed for this role' });
    return next();
  };
  const { ADMIN, ASSISTANT, DOCTOR } = ROLES;

  // Pages
  app.get('/', (req, res) => (req.session ? res.redirect(303, HOME[req.session.role]) : res.sendFile(path.join(root, 'PrincipalPage.html'))));
  app.get('/PrincipalPageAdmin', page('PrincipalPageAdmin.html', ADMIN));
  app.get('/Administracion', page('Administracion.html', ADMIN));
  app.get('/PrincipalPageAyudante', page('PrincipalPageAyudante.html', ASSISTANT));
  app.get('/Registros', page('Registros.html', ASSISTANT));
  app.get('/Gestion', page('Gestion.html', ASSISTANT));
  app.get('/PrincipalPageMedico', page('PrincipalPageMedico.html', DOCTOR));
  app.get('/Busqueda', page('Busqueda.html', DOCTOR));
  app.get('/MapaGeneral', page('MapaGeneral.html', DOCTOR));
  for (const css of ['PrincipalPage', 'PrincipalPageAdmin', 'PrincipalPageAyudante', 'PrincipalPageMedico', 'Administracion', 'Registros', 'Gestion', 'Busqueda', 'MapaGeneral']) {
    app.get(`/${css}.css`, (req, res) => res.sendFile(path.join(root, `${css}.css`)));
  }
  app.use('/js', express.static(path.join(root, 'js'), { index: false }));

  // Map keys come from the environment, not from the code, and only doctors get them.
  app.get('/map-config.js', api(DOCTOR), (req, res) => {
    res.type('application/javascript').send(`window.MAP_CONFIG = ${JSON.stringify(config.maps)};\n`);
  });

  // Login and logout
  app.post('/login', async (req, res) => {
    const ip = clientIp(req, config.trustProxy);
    if (throttle.isLocked(ip)) {
      res.set('Retry-After', String(throttle.lockoutSeconds));
      return res.status(429).json({ error: 'too many failed logins, try again later' });
    }
    const usuario = v.username(req.body && req.body.user);
    const password = req.body && typeof req.body.pass === 'string' ? req.body.pass : '';
    const user = usuario ? await db.findUser(usuario) : null;
    // Always run scrypt, so an unknown user name takes as long as a wrong password.
    const ok = verifyPassword(password, user ? user.password_hash : DUMMY_HASH) && user !== null;
    if (!ok) {
      throttle.fail(ip);
      log.warn(`auth: failed login from ${ip}`);
      return res.status(401).json({ error: 'wrong user name or password' });
    }
    throttle.succeed(ip);
    sessions.destroy(req, res);
    sessions.create(res, user);
    log.info(`auth: user ${user.id} logged in`);
    return res.json({ redirect: HOME[user.role] });
  });

  app.get('/logout', (req, res) => {
    sessions.destroy(req, res);
    res.redirect(303, '/');
  });

  // Public dashboard: aggregate counts only.
  app.post('/resumen', async (req, res) => res.json(await db.dashboard()));

  // Administrator: users
  app.post('/userinfo', api(ADMIN), async (req, res) => {
    const input = v.fields(req.body, { datauser: v.username, datacedu: v.cedula });
    if (!input.ok) return bad(res, input.error);
    res.json({
      UsInfChk: (await db.usernameTaken(input.value.datauser)) ? 1 : 0,
      CdInfChk: (await db.userCedulaTaken(input.value.datacedu)) ? 1 : 0,
    });
  });

  app.post('/regisinfo', api(ADMIN), async (req, res) => {
    const input = v.fields(req.body, {
      datanombre: v.personName,
      dataapellido: v.personName,
      datacedula: v.cedula,
      datarol: v.role,
      datausuario: v.username,
    });
    if (!input.ok) return bad(res, input.error);
    const password = req.body.datacontra;
    if (typeof password !== 'string' || password.length < MIN_LENGTH || password.length > MAX_LENGTH) {
      return bad(res, `the password must have between ${MIN_LENGTH} and ${MAX_LENGTH} characters`);
    }
    const { datanombre, dataapellido, datacedula, datarol, datausuario } = input.value;
    try {
      const id = await db.createUser({
        cedula: datacedula,
        nombre: datanombre,
        apellido: dataapellido,
        rol: datarol,
        usuario: datausuario,
        passwordHash: hashPassword(password),
      });
      log.info(`audit: user ${req.session.userId} created user ${id} with role ${datarol}`);
      return res.status(201).json({ ok: true });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'user name or ID number already registered' });
      throw err;
    }
  });

  // Assistant: registering and managing cases
  app.post('/rcedinfo', api(ASSISTANT), async (req, res) => {
    const input = v.fields(req.body, { datacedu: v.cedula });
    if (!input.ok) return bad(res, input.error);
    res.json({ CedInfChk: (await db.patientExists(input.value.datacedu)) ? 1 : 0 });
  });

  app.post('/regis', api(ASSISTANT), async (req, res) => {
    const input = v.fields(req.body, {
      cedula: v.cedula,
      nombre: v.personName,
      apellido: v.personName,
      sexo: v.sex,
      fecha_nacimiento: v.date,
      direccion_residencia: v.address,
      direccion_trabajo: v.address,
      resultado_examen: v.testResult,
      fecha_examen: v.date,
    });
    if (!input.ok) return bad(res, input.error);
    const c = input.value;
    try {
      const code = await db.createCase({
        cedula: c.cedula,
        nombre: c.nombre,
        apellido: c.apellido,
        sexo: c.sexo,
        fecha_nacimiento: c.fecha_nacimiento,
        dir_residencia: c.direccion_residencia,
        dir_trabajo: c.direccion_trabajo,
        resultado: c.resultado_examen,
        fecha_examen: c.fecha_examen,
      });
      log.info(`audit: user ${req.session.userId} registered case ${code}`);
      return res.status(201).json({ Code: code });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'a case already exists for this ID number' });
      throw err;
    }
  });

  app.post('/cosltcheck1', api(ASSISTANT, DOCTOR), async (req, res) => {
    const input = v.fields(req.body, { cedulac: v.cedula });
    if (!input.ok) return bad(res, input.error);
    res.json({ CedulaCChecked: (await db.patientExists(input.value.cedulac)) ? 1 : 0 });
  });

  app.post('/cosltcheck2', api(ASSISTANT, DOCTOR), async (req, res) => {
    const input = v.fields(req.body, { codigoc: v.caseId });
    if (!input.ok) return bad(res, input.error);
    res.json({ CodigoCChecked: (await db.caseExists(input.value.codigoc)) ? 1 : 0 });
  });

  // A name only identifies a case when exactly one patient has it.
  app.post('/cosltcheck3', api(ASSISTANT), async (req, res) => {
    const input = v.fields(req.body, { nombrec: v.personName, apellidoc: v.personName });
    if (!input.ok) return bad(res, input.error);
    res.json({ NameChecked: (await db.countByName(input.value.nombrec, input.value.apellidoc)) === 1 ? 1 : 0 });
  });

  async function sendCase(req, res, lookup) {
    const found = await db.findCase(lookup);
    if (!found) return res.status(404).json({ error: 'case not found' });
    log.info(`audit: user ${req.session.userId} viewed case ${found.idcaso}`);
    return res.json(toCaseDetails(found, await db.statusHistory(found.idcaso)));
  }

  app.post('/consulta1', api(ASSISTANT), async (req, res) => {
    const input = v.fields(req.body, { ctcedu: v.cedula });
    if (!input.ok) return bad(res, input.error);
    return sendCase(req, res, { cedula: input.value.ctcedu });
  });

  app.post('/consulta2', api(ASSISTANT), async (req, res) => {
    const input = v.fields(req.body, { ctcodigo: v.caseId });
    if (!input.ok) return bad(res, input.error);
    return sendCase(req, res, { idcaso: input.value.ctcodigo });
  });

  app.post('/consulta3', api(ASSISTANT), async (req, res) => {
    const input = v.fields(req.body, { ctnombre: v.personName, ctapellido: v.personName });
    if (!input.ok) return bad(res, input.error);
    const { ctnombre, ctapellido } = input.value;
    if ((await db.countByName(ctnombre, ctapellido)) !== 1) return res.status(404).json({ error: 'no single case matches this name' });
    return sendCase(req, res, { nombre: ctnombre, apellido: ctapellido });
  });

  app.post('/actestate', api(ASSISTANT), async (req, res) => {
    const input = v.fields(req.body, {
      actestado: v.statusFromLabel,
      actcedu: v.cedula,
      actcode: v.caseId,
      actfemod: v.date,
    });
    if (!input.ok) return bad(res, input.error);
    const { actestado, actcedu, actcode, actfemod } = input.value;
    const found = await db.findCase({ idcaso: actcode });
    if (!found || found.cedula !== actcedu) return res.status(404).json({ error: 'case not found for this ID number' });
    if ((await db.latestStatus(actcode)) === DECEASED) return res.status(409).json({ error: 'this case no longer accepts updates' });
    await db.addStatus({ cedula: actcedu, idcaso: actcode, estado: actestado, fecha_mod: actfemod });
    log.info(`audit: user ${req.session.userId} set case ${actcode} to status ${actestado}`);
    return res.status(201).json({ ok: true });
  });

  // Doctor: search and case map
  async function sendMap(req, res, lookup) {
    const found = await db.findCase(lookup);
    if (!found) return res.status(404).json({ error: 'case not found' });
    log.info(`audit: user ${req.session.userId} viewed the map of case ${found.idcaso}`);
    const examen = await db.examHistory(found.idcaso);
    return res.json({
      mapa: [{ dir_residencia: found.dir_residencia, dir_trabajo: found.dir_trabajo }],
      examen,
      histcaso2: await db.statusHistory(found.idcaso),
    });
  }

  app.post('/Mapdraw1', api(DOCTOR), async (req, res) => {
    const input = v.fields(req.body, { cedulac: v.cedula });
    if (!input.ok) return bad(res, input.error);
    return sendMap(req, res, { cedula: input.value.cedulac });
  });

  app.post('/Mapdraw2', api(DOCTOR), async (req, res) => {
    const input = v.fields(req.body, { codigoc: v.caseId });
    if (!input.ok) return bad(res, input.error);
    return sendMap(req, res, { idcaso: input.value.codigoc });
  });

  app.post('/general_map', api(DOCTOR), async (req, res) => {
    log.info(`audit: user ${req.session.userId} viewed the general map`);
    res.json(await db.generalMap());
  });

  app.use((req, res) => res.status(404).send('Not found.'));

  // Errors end the request, never the process.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    if (status >= 500) log.error(`http: ${req.method} ${req.path} failed (${err.code || err.message})`);
    res.status(status).json({ error: status < 500 && err.expose ? err.message : 'internal error' });
  });

  return app;
}

module.exports = { createApp, CONTENT_SECURITY_POLICY, HOME };
