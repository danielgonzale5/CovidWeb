# CovidWeb

Web platform to register and follow COVID-19 cases: patient intake, test results, case status over time, searches, a map of cases by address, and a public dashboard with charts.

University team project for the *Telematics* course at Universidad del Norte (Barranquilla, Colombia), November 2021. It ran on AWS EC2 with the database on Amazon RDS.

In 2026 I reviewed the 2021 code as a security engineer and fixed what I found. The review is in [SECURITY_REVIEW.md](SECURITY_REVIEW.md), with a CVSS score, CWE and OWASP Top 10 classification, a local reproduction and the fix for each finding. A one-page version for non-technical readers, with the business risk and the remediation roadmap, is in [EXECUTIVE_SUMMARY.md](EXECUTIVE_SUMMARY.md). The code as we submitted it in 2021 is at commit [`739b2dd`](https://github.com/danielgonzale5/CovidWeb/tree/739b2dd).

## Features

- **Roles enforced by the server:**
  - administrators manage users;
  - assistants register and manage cases;
  - doctors search cases and see the case map.
- **User administration:** create users with a role. User names and national ID numbers are unique.
- **Patient registration:** national ID, name, sex, date of birth, home and work address, test result and test date. Each registration opens a case.
- **Case management:** update a case's status over time (healthy, treated at home, in hospital, in ICU, recovered, deceased) and view its full history. A deceased case accepts no further updates.
- **Search:** look up a case by its case number or the patient's national ID, and see the patient's addresses on a map.
- **Case map:** addresses are geocoded with Esri and plotted on a Leaflet map, coloured by the latest status of each case.
- **Public dashboard:** Chart.js charts with the daily count and the current status of all cases. It shows aggregate counts only.

## Architecture

```
 Browser (pages + js/, Leaflet, Chart.js, Esri geocoder)
   │  fetch() POST, JSON           ▲ JSON answer to that request only
   ▼                               │
 Node.js + Express (server.js, src/) ───────────────────────────────────
   ├─ sessions.js   login, server-side sessions (HttpOnly, SameSite=Strict, Secure cookie), lockout
   ├─ app.js        role check on every page and endpoint, CSRF checks, CSP, errors that never stop the process
   ├─ validate.js   every field checked before it reaches the database
   └─ db.js         parameterised queries (mysql2)
   ▼
 MySQL: usuarios, registro_pacientes, estado_pacientes, resultados  (db/schema.sql)
```

- **Authentication:**
  - passwords are stored as salted scrypt hashes;
  - a successful login creates a server-side session;
  - sessions end after 30 minutes idle or 8 hours in total;
  - ten failed logins from one address lock it out for 15 minutes.
- **Authorisation:** the server checks the session's role on every page and every API call. The menus in the pages are a convenience, not the control.
- **Answers:** each request is answered in its own HTTP response. The 2021 version broadcast every answer, patient records included, to every connected browser through Socket.IO. That channel is gone.
- **Hardening:**
  - Content-Security-Policy with no inline script, and SRI on every third-party script;
  - a 10 KB request limit;
  - logs that record events ("user 2 viewed case 1"), never passwords or patient data;
  - a database user that can only `SELECT` and `INSERT`.

## Running it locally

Requirements: Node.js 22+ and Docker.

```bash
npm install
npm run init-env
docker compose up -d --build
docker compose exec app node scripts/seed-demo.js
```

1. `npm run init-env` writes a `.env` with random database passwords.
2. `docker compose up` starts MySQL, creates the schema and a least-privilege user, and starts the app on `127.0.0.1:3000`.
3. `seed-demo.js` creates one account per role (`admin.demo`, `asistente.demo`, `medico.demo`) and prints their passwords once. It also adds a dozen synthetic patients: every name, ID number (all starting with 9999) and address is made up.
4. Open `http://localhost:3000` and log in with one of those accounts.

The map pages work without keys, but then they show OpenStreetMap tiles and cannot geocode addresses. To enable geocoding, set `ESRI_API_KEY` (and optionally `MAPBOX_TOKEN`) in `.env`. The server hands them only to logged-in doctors. Restrict both keys to your domain in their consoles.

To start over: `docker compose down -v`.

For an install without the demo data, create the first administrator with `npm run create-user -- <user> 3 <national id> <first name> <last name>`. It reads the password from standard input.

## Tests

```bash
npm test
```

35 tests with Node's built-in test runner. They run against an in-memory database, so no MySQL is needed. They cover each finding of the review as a regression test:

- **Access control:** sessions and role checks on every page and endpoint, the cookie flags, and the login lockout.
- **Input handling:** SQL syntax and markup refused before the database.
- **Answers:** go to the caller only, with no Socket.IO left.
- **Robustness:** unknown IDs and database errors that do not stop the server.
- **Secrets and data:** hashed passwords, clean logs, and each registration returning its own case number.
- **CSRF and the webhook.**

GitHub Actions runs them, plus `npm audit`, on every push.

## Deploying

Put the app behind a reverse proxy that terminates TLS, and set `TRUST_PROXY=1`. Session cookies are marked `Secure`, so outside `localhost` the app only works over HTTPS, as it should.

On the database side, enable storage encryption and encrypted backups: this is health data.

To auto-deploy on push, set `GITHUB_WEBHOOK_SECRET`, `DEPLOY_DIR` and `DEPLOY_BRANCH`. The server then checks GitHub's signature and runs `git fetch` and `git reset --hard origin/<branch>` without a shell.

## Relevant areas

- Infrastructure: deployment on the AWS EC2 server set up for [LocateCabs](https://github.com/danielgonzale5/LocateCabs), with the MySQL database on Amazon RDS.
- Server work: the Express API and the SQL queries behind every feature.
- Pages: case management, patient registration, user administration, search, the case map and the dashboard.
- Integration: branch-per-person workflow with pull requests into `master`.
- 2026 security review and fixes:
  - [SECURITY_REVIEW.md](SECURITY_REVIEW.md);
  - the rewrite of the server into `src/`, with sessions and role checks;
  - the versioned schema;
  - the tests and the Docker setup.

## Known limitations

- The database credentials and map keys of 2021 remain in the git history. They no longer work; see CW-12 in the review.
- Esri geocodes addresses from the browser, which sends each patient's address to a third party (see CW-13). A production version should geocode once at registration and store rounded coordinates.
- Sessions live in the server's memory, so a restart logs everyone out. Several instances would need a shared session store.
