'use strict';

// Fills an empty database with a demo: one account per role and a dozen
// synthetic patients. Every name, ID number and address here is made up
// (the ID numbers all start with 9999). The generated passwords are printed
// once; only their hashes are stored.
//   docker compose exec app node scripts/seed-demo.js
const crypto = require('crypto');
const { loadConfig } = require('../src/config');
const { createDb } = require('../src/db');
const { hashPassword } = require('../src/passwords');

const ACCOUNTS = [
  { usuario: 'admin.demo', rol: 3, cedula: 9999000001, nombre: 'Ana', apellido: 'Demo' },
  { usuario: 'asistente.demo', rol: 2, cedula: 9999000002, nombre: 'Andrés', apellido: 'Demo' },
  { usuario: 'medico.demo', rol: 1, cedula: 9999000003, nombre: 'María', apellido: 'Demo' },
];

// First names alternate female and male.
const FIRST = ['Laura', 'Carlos', 'Valentina', 'Julián', 'Camila', 'Santiago', 'Daniela', 'Mateo', 'Sofía', 'Felipe', 'Isabella', 'Tomás'];
const LAST = ['Pérez', 'Gómez', 'Rodríguez', 'Martínez', 'Herrera', 'Castro', 'Rojas', 'Vargas', 'Ortiz', 'Mendoza', 'Ruiz', 'Navarro'];
// status history per patient; [] = no follow-up yet
const TIMELINES = [[4], [4, 3], [1, 2], [5], [4, 1], [1, 3], [2, 6], [4], [], [5], [1], [4, 3]];

const day = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
};

async function main() {
  const db = createDb(loadConfig().db);
  try {
    if (await db.findUser('admin.demo')) {
      console.log('The demo data is already there. Reset with `docker compose down -v` to start over.');
      return;
    }
    console.log('Demo accounts (passwords shown only now):');
    for (const account of ACCOUNTS) {
      const password = crypto.randomBytes(12).toString('base64url');
      await db.createUser({ ...account, passwordHash: hashPassword(password) });
      // Printing each freshly generated demo password once is the point of the script.
      // nosemgrep: secrets-or-request-data-in-logs
      console.log(`  ${account.usuario.padEnd(15)} ${password}   role ${account.rol}`);
    }
    for (let i = 0; i < FIRST.length; i += 1) {
      const cedula = 9999100000 + i;
      const tested = i % 7;
      const idcaso = await db.createCase({
        cedula,
        nombre: FIRST[i],
        apellido: LAST[i],
        sexo: i % 2 === 0 ? 1 : 0, // the first names alternate female, male
        fecha_nacimiento: `19${60 + i * 3}-0${(i % 9) + 1}-15`,
        dir_residencia: `Calle ${70 + i} # ${38 + i}-${10 + i}`,
        dir_trabajo: `Carrera ${46 + i} # ${80 - i}-${20 + i}`,
        resultado: TIMELINES[i].length === 1 && TIMELINES[i][0] === 5 ? 1 : 0,
        fecha_examen: day(tested),
      });
      for (const [step, estado] of TIMELINES[i].entries()) {
        await db.addStatus({ cedula, idcaso, estado, fecha_mod: day(Math.max(tested - step - 1, 0)) });
      }
    }
    console.log(`Created ${FIRST.length} synthetic patients.`);
  } finally {
    await db.close();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
