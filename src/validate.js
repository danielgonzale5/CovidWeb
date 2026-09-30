'use strict';

// Every value from a request is checked here before it reaches the database.
// Each validator returns the clean value, or null when the input is not valid.

const CEDULA = /^\d{5,10}$/;
const CASE_ID = /^[1-9]\d{0,8}$/;
const USERNAME = /^[A-Za-z0-9._-]{3,40}$/;
const PERSON_NAME = /^\p{L}[\p{L}\p{M} .'-]{0,59}$/u;
const ADDRESS = /^[\p{L}\p{M}\p{N} #.,°º/-]{3,120}$/u;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const ROLES = { ADMIN: 3, ASSISTANT: 2, DOCTOR: 1 };

// Clinical status: code stored in estado_pacientes <-> label shown in the pages.
const STATUS_LABELS = {
  1: 'En Tratamiento Hospital',
  2: 'En UCI',
  3: 'Curado',
  4: 'En Tratamiento Casa',
  5: 'Sano',
  6: 'Muerte',
};
const DECEASED = 6;

const asText = (value) => (typeof value === 'string' || typeof value === 'number' ? String(value).trim() : null);

function match(regex) {
  return (value) => {
    const text = asText(value);
    return text !== null && regex.test(text) ? text : null;
  };
}

const cedula = (value) => {
  const text = match(CEDULA)(value);
  return text === null ? null : Number(text);
};
const caseId = (value) => {
  const text = match(CASE_ID)(value);
  return text === null ? null : Number(text);
};
const username = match(USERNAME);
const personName = match(PERSON_NAME);
const address = match(ADDRESS);

// A calendar date between 1900-01-01 and tomorrow (time zones differ by a day at most).
function date(value) {
  const text = asText(value);
  const parts = text && DATE.exec(text);
  if (!parts) return null;
  const parsed = new Date(Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])));
  if (parsed.toISOString().slice(0, 10) !== text) return null;
  const tomorrow = Date.now() + 86_400_000;
  return parsed.getTime() >= Date.UTC(1900, 0, 1) && parsed.getTime() <= tomorrow ? text : null;
}

function oneOf(...allowed) {
  return (value) => {
    const number = Number(value);
    return value !== '' && value !== null && allowed.includes(number) ? number : null;
  };
}
const role = oneOf(ROLES.ADMIN, ROLES.ASSISTANT, ROLES.DOCTOR);
const sex = oneOf(0, 1);
const testResult = oneOf(0, 1);

function statusFromLabel(label) {
  const entry = Object.entries(STATUS_LABELS).find(([, text]) => text === label);
  return entry ? Number(entry[0]) : null;
}

// Validates `body` against a { field: validator } map. Returns { ok, value } or
// { ok: false, error } naming the first invalid field (never echoing its value).
function fields(body, schema) {
  const value = {};
  for (const [name, check] of Object.entries(schema)) {
    const result = check(body ? body[name] : undefined);
    if (result === null || result === undefined) return { ok: false, error: `invalid or missing field: ${name}` };
    value[name] = result;
  }
  return { ok: true, value };
}

module.exports = {
  cedula,
  caseId,
  username,
  personName,
  address,
  date,
  role,
  sex,
  testResult,
  statusFromLabel,
  fields,
  ROLES,
  STATUS_LABELS,
  DECEASED,
};
