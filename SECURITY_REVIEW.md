# CovidWeb security review

| | |
| --- | --- |
| **Target** | `master` at commit [`739b2dd`](https://github.com/danielgonzale5/CovidWeb/tree/739b2dd): the Node.js server `CovidWeb.js` and its nine pages |
| **Reviewer** | Daniel González |
| **Date** | 2026-09-29 |
| **Method** | Manual code review, `npm audit`, a scan of the git history, and local reproduction of every finding |
| **Scoring** | CVSS v3.1 base score |

## Context

My team and I wrote this app in 2021 for a university course. It registered COVID-19 patients and followed their cases: national ID number, name, date of birth, home and work address, test result and clinical status. That is health data, which Colombian law (Ley 1581 de 2012) treats as sensitive personal data. The AWS deployment no longer exists, and it never held real patients. This review reads the code as if it were about to go live with real patients.

Every finding was reproduced on a local lab and nowhere else:
- The 2021 code ran unchanged against MySQL 8.0 in a Docker container bound to `127.0.0.1`.
- The database schema was never versioned in this repository, so I rebuilt it from the queries in `CovidWeb.js`.
- It held one synthetic staff account and synthetic patients.
- Inputs were benign: a single quote, an HTML `<b>` tag, an ID number that does not exist, and a request with no session.

## Summary

| ID | Finding | Severity | CVSS | CWE | OWASP Top 10:2025 | Status |
| --- | --- | --- | --- | --- | --- | --- |
| [CW-01](#cw-01-sql-injection-in-every-lookup-including-the-login) | SQL injection in every lookup, including the login | Critical | 9.1 | CWE-89 | A05:2025 | Fixed |
| [CW-02](#cw-02-no-server-side-authentication-or-access-control) | No server-side authentication or access control | Critical | 9.1 | CWE-602 | A01:2025 | Fixed |
| [CW-03](#cw-03-every-answer-is-broadcast-to-every-connected-browser) | Every answer is broadcast to every connected browser | High | 7.5 | CWE-200 | A01:2025 | Fixed |
| [CW-04](#cw-04-denial-of-service-one-request-stops-the-server) | Denial of service: one request stops the server | High | 7.5 | CWE-248 | A10:2025 | Fixed |
| [CW-05](#cw-05-vulnerable-and-unused-dependencies) | Vulnerable and unused dependencies | High | per advisory | CWE-1395 | A03:2025 | Fixed |
| [CW-06](#cw-06-unauthenticated-deploy-webhook) | Unauthenticated deploy webhook | Medium | 6.5 | CWE-345 | A08:2025 | Fixed |
| [CW-07](#cw-07-stored-xss-in-case-management) | Stored XSS in case management | Medium | 6.1 | CWE-79 | A05:2025 | Fixed |
| [CW-08](#cw-08-passwords-and-patient-data-written-to-the-logs) | Passwords and patient data written to the logs | Medium | 5.5 | CWE-532 | A09:2025 | Fixed |
| [CW-09](#cw-09-passwords-stored-in-plain-text) | Passwords stored in plain text | Medium | 4.9 | CWE-256 | A04:2025 | Fixed |
| [CW-10](#cw-10-a-new-case-can-be-given-another-cases-number) | A new case can be given another case's number | Medium | 4.8 | CWE-362 | A06:2025 | Fixed |
| [CW-11](#cw-11-third-party-scripts-without-integrity-checks) | Third-party scripts without integrity checks | Medium | 4.7 | CWE-829 | A08:2025 | Fixed |
| [CW-12](#cw-12-database-credentials-in-the-git-history) | Database credentials in the git history | Low | n/a | CWE-798 | A07:2025 | Credentials dead; documented |
| [CW-13](#cw-13-health-data-in-transit-at-rest-and-with-third-parties) | Health data in transit, at rest and with third parties | Informational | n/a | CWE-319 | A04:2025 | Documented |

CWE IDs are from [MITRE's CWE list](https://cwe.mitre.org/); OWASP categories are from the [OWASP Top 10:2025](https://owasp.org/Top10/2025/). Each finding shows its closest OWASP category and, where more than one weakness is involved, the main CWE first.

CW-01 to CW-11 are fixed in the 2026 rewrite of the server (`server.js` and `src/`), and each has a regression test in `test/`. CW-12 and CW-13 need action outside the code and are documented. Each finding below lists the change it needs, and [Verification after the fix](#verification-after-the-fix) shows the same reproduction steps run against the fixed version.

---

## CW-01: SQL injection in every lookup, including the login

**Critical, 9.1** `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:H`

**Classification:** [CWE-89](https://cwe.mitre.org/data/definitions/89.html) SQL Injection · OWASP A05:2025 Injection

**Where:**
- the login query: [`CovidWeb.js:113`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/CovidWeb.js#L113)
- every other lookup:
  - [`L136`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/CovidWeb.js#L136), [`L143`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/CovidWeb.js#L143), [`L213`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/CovidWeb.js#L213)
  - [`L231`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/CovidWeb.js#L231), [`L249`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/CovidWeb.js#L249), [`L268`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/CovidWeb.js#L268)
  - [`L286`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/CovidWeb.js#L286), [`L323`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/CovidWeb.js#L323), [`L349`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/CovidWeb.js#L349)
  - [`L364`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/CovidWeb.js#L364), [`L401`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/CovidWeb.js#L401), [`L427`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/CovidWeb.js#L427)
  - [`L443`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/CovidWeb.js#L443), [`L480`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/CovidWeb.js#L480), [`L508`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/CovidWeb.js#L508)
  - [`L556`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/CovidWeb.js#L556), [`L564`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/CovidWeb.js#L564), [`L572`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/CovidWeb.js#L572)
  - [`L589`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/CovidWeb.js#L589), [`L596`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/CovidWeb.js#L596), [`L604`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/CovidWeb.js#L604)

**What is wrong:** 22 queries are built by concatenating values from the JSON body into the SQL string. The inserts use placeholders; none of the lookups do.

**Impact:**
- **Login.** On the login query, a crafted user name changes the `WHERE` clause so that it matches an existing account without its password.
- **Data.** On the lookups, an attacker can read any table the database user can see, including every patient record and the plaintext passwords (CW-09). The app connected as `root`, which widens that to every database on the server.
- **Availability.** Any malformed query throws inside a callback and ends the process (CW-04).

**Reproduction:** a single quote as the user name on the login form. MySQL reported a syntax error at the injected position, and the Node process exited:

```
POST /login with a single quote as the user name -> no response
MySQL error: You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version ...
process exit code: 1
```

**Fix:**
- Use placeholders for every value.
- Validate each field before it reaches the database (the ID number as digits, the case number as a positive integer, names and addresses as bounded text).
- Connect as a dedicated user with only the privileges the app needs: `SELECT` and `INSERT`, and no `UPDATE`, `DELETE` or DDL.

## CW-02: No server-side authentication or access control

**Critical, 9.1** `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N`

**Classification:** [CWE-602](https://cwe.mitre.org/data/definitions/602.html) Client-Side Enforcement of Server-Side Security, [CWE-862](https://cwe.mitre.org/data/definitions/862.html) Missing Authorization, [CWE-306](https://cwe.mitre.org/data/definitions/306.html) Missing Authentication for Critical Function · OWASP A01:2025 Broken Access Control

**Where:**
- every route: [`CovidWeb.js:20-73`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/CovidWeb.js#L20-L73) (pages) and [`L106-665`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/CovidWeb.js#L106-L665) (API)
- the only role check, in the browser: [`PrincipalPage.html:58-71`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/PrincipalPage.html#L58-L71)

**What is wrong:** the server has no session and no notion of who is calling. The login endpoint only tells the browser which role the user has, and the page then navigates to that role's menu. Every page and every API endpoint answers anyone, whatever their role, and even with no login at all.

**Impact:** anyone who can reach the server can:
- read any patient's record by ID number, case number or name;
- register cases and change their clinical status;
- create users with any role, including administrator.

The roles (administrator, doctor, assistant) exist only in the menus.

**Reproduction:** with no login at all:

```
GET /Administracion -> 200
POST /consulta1 for a national ID number -> the record was delivered, fields:
    CodigoCs, CedulaCs, NombreCs, ApellidoCs, SexoCs, NacimientoCs, ResidenciaCs, TrabajoCs, ResultadoCs, FExaCs
POST /regisinfo creating a user with role 3 (administrator) -> row created:
    {"usuario":"lab-intruder","rol":3,"contraseña":"lab-password-123"}
```

**Fix:**
- **Sessions.** A successful login creates a server-side session, sent as a random session ID in a cookie marked `HttpOnly`, `SameSite=Strict` and `Secure`.
- **Roles on the server.** Every page and every endpoint checks the session's role against an explicit list:
  - administrator: user administration;
  - assistant: registering and managing cases;
  - doctor: search and the case map;
  - public dashboard: aggregate counts only.
- **Login throttling.** Repeated failed logins from one address are locked out for a while.

## CW-03: Every answer is broadcast to every connected browser

**High, 7.5** `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N`

**Classification:** [CWE-200](https://cwe.mitre.org/data/definitions/200.html) Exposure of Sensitive Information to an Unauthorized Actor · OWASP A01:2025 Broken Access Control

**Where:**
- every `io.emit` in `CovidWeb.js`, for example the login result at [`L124`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/CovidWeb.js#L124) and the patient record at [`L310`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/CovidWeb.js#L310)
- the matching `io().on(...)` handlers in every page

**What is wrong:** the server never answers the HTTP request that asked. It sends the result as a Socket.IO event to **every** connected browser.

**Impact:**
- **Silent eavesdropping.** A browser that only keeps a Socket.IO connection open, without ever logging in, receives every patient record anyone looks up, every exam history and case map, and the result of every login. No request is needed: listening is enough.
- **Mixed-up sessions.** It also breaks the app for honest users. When one person logs in, every browser sitting on the login page receives that person's role and navigates to that role's menu. Two assistants looking up different patients at the same time see each other's results.

**Reproduction:** an anonymous Socket.IO client connected and only listened, while a staff member logged in and looked up a patient:

```
anonymous browser received: [["roluser",{"RolUsu":3}]]
patient record delivered to the anonymous browser, fields: CodigoCs, CedulaCs, NombreCs, ...
```

**Fix:** answer each request in its own HTTP response (`res.json`) and remove Socket.IO. Nothing in the app needs server push.

## CW-04: Denial of service: one request stops the server

**High, 7.5** `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H`

**Classification:** [CWE-248](https://cwe.mitre.org/data/definitions/248.html) Uncaught Exception, [CWE-770](https://cwe.mitre.org/data/definitions/770.html) Allocation of Resources Without Limits or Throttling · OWASP A10:2025 Mishandling of Exceptional Conditions

**Where:**
- `JSON.parse(JSON.stringify(rows[0]))` with no check that a row exists: [`L288`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/CovidWeb.js#L288), [`L366`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/CovidWeb.js#L366), [`L445`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/CovidWeb.js#L445)
- `if (err) throw err` in every query callback
- the body limit at [`L104`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/CovidWeb.js#L104)

**What is wrong:**
1. **Unknown IDs crash the server.** Looking up an ID number, case number or name that does not exist makes `rows[0]` undefined, and parsing it throws outside any handler.
2. **Database errors crash the server.** Any database error is thrown from an asynchronous callback, which also ends the process.
3. **Requests never get an answer.** Most endpoints never send a response at all (see CW-03), so every request stays open until the client gives up.
4. **Body limit.** The JSON body limit is 200 MB.

**Impact:** one lookup of a non-existent ID stops the service for every user. A doctor who mistypes an ID number does the same by accident. Nothing restarts the process, because `nodemon` only restarts on file changes.

**Reproduction:**

```
POST /consulta1 for a national ID number that does not exist -> no response
SyntaxError: "undefined" is not valid JSON
process exit code: 1
```

The login request in CW-01 ended the process the same way.

**Fix:**
- Check for "not found" and answer `404`.
- Handle every query error by logging it and answering `500`.
- Always send a response.
- Set the body limit to 10 KB.
- Run the app under a supervisor that restarts it.

## CW-05: Vulnerable and unused dependencies

**High (per advisory; `npm audit` reports 3 critical and 12 high)**

**Classification:** [CWE-1395](https://cwe.mitre.org/data/definitions/1395.html) Dependency on Vulnerable Third-Party Component · OWASP A03:2025 Software Supply Chain Failures

**Where:** [`package.json`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/package.json) and `package-lock.json`

**What is wrong:** `npm audit --omit=dev` reports 19 vulnerable packages:

| Package | Why it matters here |
| --- | --- |
| `mysql2` 2.3.x (critical) | The database driver itself. The advisories cover code execution, prototype pollution, and an authentication downgrade that can leak the database password in clear. |
| `socket.io-parser` (critical), `engine.io`, `ws` | Reachable without authentication: crashes and memory exhaustion from crafted packets. |
| `express`, `body-parser`, `qs`, `path-to-regexp` | Every HTTP request goes through them. |
| `ejs` (critical), `no-ip`, `express-myconnection` | **Not used anywhere in the code**, but installed and shipped. |
| `chart.js`, `leaflet`, `esri-leaflet-geocoder` | Installed as server dependencies but never served: the pages load their own copies from CDNs. |

**Impact:** known crash bugs are reachable without authentication, and the database driver has critical advisories. The unused packages add attack surface and audit noise.

**Fix:**
- Remove the unused packages.
- Upgrade `express`, `mysql2` and `socket.io`, or drop `socket.io` entirely (CW-03), and regenerate the lockfile.
- Run `npm audit` in CI.

## CW-06: Unauthenticated deploy webhook

**Medium, 6.5** `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:L`

**Classification:** [CWE-345](https://cwe.mitre.org/data/definitions/345.html) Insufficient Verification of Data Authenticity, [CWE-306](https://cwe.mitre.org/data/definitions/306.html) Missing Authentication for Critical Function · OWASP A08:2025 Software or Data Integrity Failures

**Where:** [`CovidWeb.js:12-16`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/CovidWeb.js#L12-L16)

**What is wrong:** `POST /github` runs `git reset --hard && git pull` in a shell for any request, with no check of GitHub's `X-Hub-Signature-256` header or of the event. It also runs in `/home/ubuntu/LocateCabs`, the checkout of a different project that shared the server, so a CovidWeb push redeployed LocateCabs. It logs "GIT PULL realizado exitosamente" before `git` has even started.

**Impact:** anyone can make the server discard local changes and redeploy, as often as they want. The command is fixed, so this is not command injection.

**Reproduction:**

```
POST /github with no signature -> HTTP 200
server log: GIT PULL realizado exitosamente.
```

**Fix:**
- Verify `X-Hub-Signature-256` with a secret from `.env`, using a constant-time comparison.
- Act only on pushes to the deploy branch.
- Run `git` without a shell, in a directory taken from configuration.
- Log the real outcome.
- Disable the route when no secret is set.

## CW-07: Stored XSS in case management

**Medium, 6.1** `CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N`

**Classification:** [CWE-79](https://cwe.mitre.org/data/definitions/79.html) Cross-site Scripting · OWASP A05:2025 Injection

**Where:** [`Gestion.html:280-289`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/Gestion.html#L280-L289)

**What is wrong:** the case management page writes the patient's name, surname and both addresses into the page with `innerHTML`. Those values come straight from the registration form and are stored as typed. Because of CW-02, anyone can register a patient.

**Impact:** a patient registered with markup in their name or address runs script in the browser of every staff member who opens that case. That script can read any other patient record the staff member can reach.

**Reproduction:** a patient registered with the name `<b>lab</b>`, then looked up by case number:

```
name stored and sent to the innerHTML sink unchanged: <b>lab</b>
```

**Fix:**
- Validate names and addresses on the server (length and allowed characters).
- Write every value with `textContent`, and build tables with DOM methods instead of HTML strings.
- Add a Content-Security-Policy that forbids inline script, which means moving the page scripts into their own files.

## CW-08: Passwords and patient data written to the logs

**Medium, 5.5** `CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N`

**Classification:** [CWE-532](https://cwe.mitre.org/data/definitions/532.html) Insertion of Sensitive Information into Log File · OWASP A09:2025 Security Logging and Alerting Failures

**Where:** the login prints the user name and password at [`CovidWeb.js:108`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/CovidWeb.js#L108) and [`L112`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/CovidWeb.js#L112). Every other endpoint prints its full request body, which carries patient data (for example [`L178`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/CovidWeb.js#L178)).

**What is wrong:** every login writes the password in clear to the process output. Every registration and lookup writes the patient's ID number, name, addresses and test result.

**Impact:** anyone who can read the logs collects every staff password and a copy of the patient registry. That includes log files, `journalctl`, a log shipper, or a screenshot pasted into a ticket.

**Reproduction:**

```
the login password appears in the server output: true
```

**Fix:** log events and outcomes ("login failed", "case 42 updated by user 7"), never request bodies, passwords or patient fields.

## CW-09: Passwords stored in plain text

**Medium, 4.9** `CVSS:3.1/AV:N/AC:L/PR:H/UI:N/S:U/C:H/I:N/A:N`

**Classification:** [CWE-256](https://cwe.mitre.org/data/definitions/256.html) Plaintext Storage of a Password · OWASP A04:2025 Cryptographic Failures

**Where:** user creation at [`CovidWeb.js:168-169`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/CovidWeb.js#L168-L169) and the login comparison at [`L113`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/CovidWeb.js#L113)

**What is wrong:** passwords are stored as typed and compared in SQL.

**Impact:**
- Anyone who reads the `usuarios` table has every password. That includes a database administrator, a backup, or an attacker through CW-01.
- People reuse passwords, so the damage goes beyond this app.

On its own this needs privileged access, hence the score. Combined with CW-01 it needs none.

**Reproduction:** the row created in CW-02 holds `"contraseña":"lab-password-123"`.

**Fix:**
- Store a salted hash from a slow function (scrypt) and compare it in constant time on the server.
- Enforce a minimum length.
- Existing plaintext passwords cannot be converted. Reset them.

## CW-10: A new case can be given another case's number

**Medium, 4.8** `CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:L/A:N`

**Classification:** [CWE-362](https://cwe.mitre.org/data/definitions/362.html) Race Condition · OWASP A06:2025 Insecure Design

**Where:** [`CovidWeb.js:197`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/CovidWeb.js#L197)

**What is wrong:** after inserting a case, the server reads back "the newest case in the table" and broadcasts its number, instead of using the ID of the row it just inserted.

**Impact:** when two assistants register cases at the same time, both can be shown the same case number. One of them then files updates against another patient's case. Combined with CW-03, every browser is shown that number.

**Fix:** use the `insertId` returned by the insert, and return it in that request's response.

## CW-11: Third-party scripts without integrity checks

**Medium, 4.7** `CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:C/C:L/I:L/A:N`

**Classification:** [CWE-829](https://cwe.mitre.org/data/definitions/829.html) Inclusion of Functionality from Untrusted Control Sphere · OWASP A08:2025 Software or Data Integrity Failures

**Where:**
- Chart.js 2.9.3 from jsDelivr on the four dashboard pages: [`PrincipalPage.html:10`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/PrincipalPage.html#L10) and the same line in the three role pages
- `esri-leaflet`, `esri-leaflet-vector` and `esri-leaflet-geocoder` 3.0.0 from unpkg: [`Busqueda.html:20-26`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/Busqueda.html#L20-L26), [`MapaGeneral.html:20-26`](https://github.com/danielgonzale5/CovidWeb/blob/739b2dd/MapaGeneral.html#L20-L26)

**What is wrong:** these scripts are pinned to a version but load with no `integrity` attribute. Leaflet itself has one.

**Impact:** if the CDN served a modified file, it would run with full access to pages that show patient records.

**Fix:** add `integrity` and `crossorigin` to each tag, or serve the files from the app.

## CW-12: Database credentials in the git history

**Low (the credentials no longer work)**

**Classification:** [CWE-798](https://cwe.mitre.org/data/definitions/798.html) Use of Hard-coded Credentials · OWASP A07:2025 Authentication Failures

**Where:** commits [`abae817`](https://github.com/danielgonzale5/CovidWeb/commit/abae817) and [`9b1d224`](https://github.com/danielgonzale5/CovidWeb/commit/9b1d224). [`eb725e6`](https://github.com/danielgonzale5/CovidWeb/commit/eb725e6) moved the values to `.env`.

**What is wrong:** the first versions of `CovidWeb.js` contain the Amazon RDS hostname and the database `root` password. The Mapbox token and Esri API key are also in the history before [`8539d71`](https://github.com/danielgonzale5/CovidWeb/commit/8539d71).

**Impact:** none today. The RDS instance was deleted long ago, and that password is not used anywhere else. Had the instance still existed, this alone would have been critical: anyone who read the public history could log in as `root`.

**Fix:**
- **Rotation, not rewriting.** Rotating the credential is what fixes a leaked secret: the password is dead, and the map keys' owners should revoke them. Rewriting public history does not help, because clones and caches keep the old commits.
- **Prevention.** Keep secrets out of the code (`.env`, done), and scan every push for secrets so the next one is caught before it is published.

## CW-13: Health data in transit, at rest and with third parties

**Informational**

**Classification:** [CWE-319](https://cwe.mitre.org/data/definitions/319.html) Cleartext Transmission of Sensitive Information, [CWE-311](https://cwe.mitre.org/data/definitions/311.html) Missing Encryption of Sensitive Data · OWASP A04:2025 Cryptographic Failures

- **In transit.** The app is served over plain HTTP, so logins, ID numbers and clinical status cross the network in clear. Terminate TLS in front of it and mark the session cookie `Secure`.
- **At rest.** The database stores health data unencrypted. On RDS, enable storage encryption and encrypted backups, and restrict who can take snapshots.
- **Third parties.** The case map and the search page send each patient's home and work address from the browser to Esri's geocoding service. Under Ley 1581 that is a transfer of personal data to a processor, which needs a basis and should be minimised. For example, geocode once on registration, store only coordinates rounded to the neighbourhood, and never send names or ID numbers with the address.

## Verification after the fix

The fixed version was started with `docker compose` from a fresh `.env`, seeded with synthetic accounts and patients, and sent the same benign inputs:

```
[CW-02] GET /Administracion with no session -> 303 to /
[CW-02] anonymous POST /consulta1 -> 401
[CW-02] anonymous POST /regisinfo creating an administrator -> 401
[CW-02] assistant POST /regisinfo -> 403 | doctor POST /consulta1 -> 403
[CW-02/09] rows for lab-intruder: 0
[CW-03] assistant lookup answered over HTTP -> 200 | Socket.IO endpoint -> 404
[CW-07] registering a patient named <b>lab</b> -> 400
[CW-10] registration answer (own case number): 201 {"Code":13}
[CW-04] lookup of an ID number that does not exist -> 404
[CW-01] login with a single quote as the user name -> 401
[CW-04] server still answering -> 200 | 20 KB body -> 413
[CW-06] POST /github -> 404 (the route does not exist without a secret)
[CW-08] passwords or patient data in the app logs: none
[CW-08] sample log lines:
    INFO audit: user 2 viewed case 1
    INFO audit: user 2 registered case 13
    WARN auth: failed login from ::ffff:172.18.0.1
[CW-09] stored password format: asistente.demo scrypt:16384:8:1:...
[CW-01] app DB user trying DELETE: ERROR 1142 (42000): DELETE command denied to user 'covidweb'
[CW-04] app container: Up
[CW-05] npm audit --omit=dev: found 0 vulnerabilities
```

Every page was then used in a browser, once per role:
- the login form, including pressing Enter;
- case lookup and status update as an assistant;
- search and the case map as a doctor;
- user creation as an administrator.

An assistant who opens an administrator page is sent back to their own menu. The console showed no CSP violations or script errors.

## Out of scope and notes

- **Browser pages.** Reviewed only for how they handle data from the server. The fix moves their scripts into files, but it does not redesign them. One more issue turned up while doing so: the login inputs sat in a `<form>` with no handler, so pressing Enter submitted it as a GET and put the password in the URL, and from there in browser history and server logs. The login form now always posts JSON.
- **Lab only.** No production system was touched. The EC2 and RDS resources from 2021 no longer exist, and every record in the lab was synthetic.
