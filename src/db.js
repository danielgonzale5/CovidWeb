'use strict';

const mysql = require('mysql2/promise');

// Every query uses placeholders: request values never become part of the SQL
// text. Dates come back as 'YYYY-MM-DD' strings (dateStrings), so no time zone
// conversion can shift them by a day.
function createDb(options) {
  const pool = mysql.createPool({
    ...options,
    charset: 'utf8mb4',
    dateStrings: true,
    connectionLimit: 10,
    waitForConnections: true,
    enableKeepAlive: true,
  });

  const rows = async (sql, params = []) => (await pool.execute(sql, params))[0];
  const first = async (sql, params) => (await rows(sql, params))[0] || null;

  return {
    // Users
    findUser: (usuario) =>
      first('SELECT idusuario AS id, usuario, rol AS role, password_hash FROM usuarios WHERE usuario = ?', [usuario]),
    usernameTaken: async (usuario) => (await first('SELECT 1 AS x FROM usuarios WHERE usuario = ?', [usuario])) !== null,
    userCedulaTaken: async (cedula) => (await first('SELECT 1 AS x FROM usuarios WHERE cedula = ?', [cedula])) !== null,
    async createUser({ cedula, nombre, apellido, rol, usuario, passwordHash }) {
      const [result] = await pool.execute(
        'INSERT INTO usuarios (cedula, nombre, apellido, rol, usuario, password_hash) VALUES (?, ?, ?, ?, ?, ?)',
        [cedula, nombre, apellido, rol, usuario, passwordHash],
      );
      return result.insertId;
    },

    // Cases
    patientExists: async (cedula) =>
      (await first('SELECT 1 AS x FROM registro_pacientes WHERE cedula = ?', [cedula])) !== null,
    caseExists: async (idcaso) => (await first('SELECT 1 AS x FROM registro_pacientes WHERE idcaso = ?', [idcaso])) !== null,
    countByName: async (nombre, apellido) =>
      (await first('SELECT COUNT(*) AS n FROM registro_pacientes WHERE nombre = ? AND apellido = ?', [nombre, apellido])).n,
    async createCase(c) {
      const [result] = await pool.execute(
        `INSERT INTO registro_pacientes
           (cedula, nombre, apellido, sexo, fecha_nacimiento, dir_residencia, dir_trabajo, resultado, fecha_examen)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [c.cedula, c.nombre, c.apellido, c.sexo, c.fecha_nacimiento, c.dir_residencia, c.dir_trabajo, c.resultado, c.fecha_examen],
      );
      // The ID of this insert, never "the newest row", which may be someone else's.
      return result.insertId;
    },
    findCase({ cedula, idcaso, nombre, apellido }) {
      const columns = 'idcaso, cedula, nombre, apellido, sexo, fecha_nacimiento, dir_residencia, dir_trabajo, resultado, fecha_examen';
      if (cedula !== undefined) return first(`SELECT ${columns} FROM registro_pacientes WHERE cedula = ?`, [cedula]);
      if (idcaso !== undefined) return first(`SELECT ${columns} FROM registro_pacientes WHERE idcaso = ?`, [idcaso]);
      return first(`SELECT ${columns} FROM registro_pacientes WHERE nombre = ? AND apellido = ? LIMIT 1`, [nombre, apellido]);
    },
    statusHistory: (idcaso) =>
      rows('SELECT estado, fecha_mod FROM estado_pacientes WHERE idcaso = ? ORDER BY fecha_mod, idregistro_estado', [idcaso]),
    async latestStatus(idcaso) {
      const row = await first(
        'SELECT estado FROM estado_pacientes WHERE idcaso = ? ORDER BY fecha_mod DESC, idregistro_estado DESC LIMIT 1',
        [idcaso],
      );
      return row ? row.estado : null;
    },
    addStatus: ({ cedula, idcaso, estado, fecha_mod }) =>
      pool.execute('INSERT INTO estado_pacientes (cedula, idcaso, estado, fecha_mod) VALUES (?, ?, ?, ?)', [cedula, idcaso, estado, fecha_mod]),
    examHistory: (idcaso) =>
      rows(
        `SELECT r.resultados, rp.fecha_examen FROM registro_pacientes rp
         JOIN resultados r ON r.idresultados = rp.resultado WHERE rp.idcaso = ? ORDER BY rp.fecha_examen`,
        [idcaso],
      ),

    // Aggregates for the public dashboard: counts only, no personal data.
    async dashboard() {
      const resum = await rows(
        `WITH RECURSIVE d(n) AS (SELECT 0 UNION ALL SELECT n + 1 FROM d WHERE n < 6)
         SELECT DATE_FORMAT(CURDATE() - INTERVAL n DAY, '%a') AS dia,
                (SELECT COUNT(*) FROM registro_pacientes WHERE fecha_examen = CURDATE() - INTERVAL n DAY) AS num_pacientes,
                DATE_FORMAT(CURDATE() - INTERVAL n DAY, '%Y-%m-%d') AS fechacom
         FROM d ORDER BY n DESC`,
      );
      const info = await rows(
        `SELECT ep.estado, COUNT(*) AS cantidad FROM estado_pacientes ep
         WHERE ep.idregistro_estado IN (SELECT MAX(idregistro_estado) FROM estado_pacientes GROUP BY idcaso)
         GROUP BY ep.estado ORDER BY ep.estado DESC`,
      );
      const resultados = await rows(
        `SELECT r.resultados, COUNT(*) AS cantidad FROM registro_pacientes rp
         JOIN resultados r ON r.idresultados = rp.resultado GROUP BY r.resultados`,
      );
      return { resum, info, resultados };
    },

    // Case map for doctors: latest status and home address of each case.
    async generalMap() {
      const pos = await rows(
        `SELECT ep.idcaso, ep.estado, rp.dir_residencia FROM estado_pacientes ep
         JOIN registro_pacientes rp ON rp.idcaso = ep.idcaso
         WHERE ep.idregistro_estado IN (SELECT MAX(idregistro_estado) FROM estado_pacientes GROUP BY idcaso)
         ORDER BY ep.idregistro_estado DESC`,
      );
      const neg = await rows(
        `SELECT rp.idcaso, rp.dir_residencia FROM registro_pacientes rp
         WHERE rp.resultado = 0 AND NOT EXISTS (SELECT 1 FROM estado_pacientes ep WHERE ep.idcaso = rp.idcaso)`,
      );
      return { pos, neg };
    },

    close: () => pool.end(),
  };
}

module.exports = { createDb };
