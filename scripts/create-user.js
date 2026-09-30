'use strict';

// Creates a staff account, for example the first administrator of a new install.
// The password is read from standard input, never from the command line:
//   node scripts/create-user.js <user> <role 1|2|3> <national id> <first name> <last name> < password.txt
const { loadConfig } = require('../src/config');
const { createDb } = require('../src/db');
const { hashPassword, MIN_LENGTH } = require('../src/passwords');
const v = require('../src/validate');

async function readPassword() {
  if (process.stdin.isTTY) process.stderr.write('Password, then Enter: ');
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
    if (process.stdin.isTTY && input.includes('\n')) break;
  }
  return input.replace(/\r?\n$/, '');
}

async function main() {
  const [usuario, rol, cedula, nombre, apellido] = process.argv.slice(2);
  const input = v.fields({ usuario, rol, cedula, nombre, apellido }, {
    usuario: v.username,
    rol: v.role,
    cedula: v.cedula,
    nombre: v.personName,
    apellido: v.personName,
  });
  if (!input.ok) throw new Error(`${input.error}. Usage: create-user <user> <role 1|2|3> <national id> <first name> <last name>`);
  const password = await readPassword();
  if (password.length < MIN_LENGTH) throw new Error(`the password must have at least ${MIN_LENGTH} characters`);

  const db = createDb(loadConfig().db);
  try {
    const id = await db.createUser({ ...input.value, passwordHash: hashPassword(password) });
    console.log(`Created user ${input.value.usuario} (id ${id}, role ${input.value.rol})`);
  } finally {
    await db.close();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
