'use strict';

// CW-01 and CW-07: what each field accepts.
const test = require('node:test');
const assert = require('node:assert/strict');
const v = require('../src/validate');

test('ID numbers and case numbers are digits only', () => {
  assert.equal(v.cedula('1045678901'), 1045678901);
  assert.equal(v.cedula(12345), 12345);
  for (const bad of ["1' OR '1'='1", '12 34', '1234', '12345678901', '', null, undefined, [], {}, true]) {
    assert.equal(v.cedula(bad), null, JSON.stringify(bad));
  }
  assert.equal(v.caseId('42'), 42);
  for (const bad of ['0', '-1', '1.5', '1e3', "1'"]) assert.equal(v.caseId(bad), null, bad);
});

test('names allow accents and hyphens, not markup or quotes used as SQL', () => {
  for (const good of ['José', 'María Fernanda', "O'Neil", 'Pérez-Gómez', 'Ñuñez']) assert.equal(v.personName(good), good);
  for (const bad of ['<b>x</b>', 'x'.repeat(61), '', ' ', 'Ana;', '1Ana', 'Ana"']) assert.equal(v.personName(bad), null, bad);
});

test('addresses allow Colombian formats, not markup', () => {
  for (const good of ['Calle 72 # 38-95', 'Cra. 46 No. 80-10, Barranquilla', 'Diagonal 3º Sur']) assert.equal(v.address(good), good);
  for (const bad of ['<script>', 'Calle "1"', 'ab', 'x'.repeat(121)]) assert.equal(v.address(bad), null, bad);
});

test('dates must be real calendar dates, not in the future', () => {
  assert.equal(v.date('1990-02-28'), '1990-02-28');
  for (const bad of ['1990-02-30', '2990-01-01', '1899-12-31', '29/09/2026', '2026-9-1', "2026-09-29' --"]) {
    assert.equal(v.date(bad), null, bad);
  }
});

test('roles, sex, results and statuses come from fixed lists', () => {
  assert.equal(v.role('3'), 3);
  assert.equal(v.role(4), null);
  assert.equal(v.role(''), null);
  assert.equal(v.sex(0), 0);
  assert.equal(v.sex(2), null);
  assert.equal(v.statusFromLabel('En UCI'), 2);
  assert.equal(v.statusFromLabel('en uci'), null);
});

test('fields() names the invalid field without echoing its value', () => {
  const result = v.fields({ a: '12345', b: "x' OR 1=1" }, { a: v.cedula, b: v.cedula });
  assert.deepEqual(result, { ok: false, error: 'invalid or missing field: b' });
});
