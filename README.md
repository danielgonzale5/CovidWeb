# CovidWeb

Web platform to register and follow COVID-19 cases: patient intake, test results, case status over time, searches, a map of cases by address, and a public dashboard with charts.

University team project for the *Telematics* course at Universidad del Norte (Barranquilla, Colombia), November 2021. It ran on AWS EC2 with the database on Amazon RDS.

## Features

- **Role-based pages** for administrators, doctors and assistants, each with its own menu.
- **User administration:** create users with a role, with checks for duplicate usernames and national ID numbers.
- **Patient registration:** national ID, name, sex, date of birth, home and work address, test result and test date. Each registration opens a case.
- **Case management:** update a case's status over time (healthy, treated at home, in hospital, in ICU, recovered, deceased) and view its full history.
- **Search:** look up a case by its case number or the patient's national ID, and see the patient's addresses on a map.
- **Case map:** addresses are geocoded with Esri and plotted on a Leaflet map, coloured by the latest status of each case.
- **Public dashboard:** Chart.js charts with the daily count and the current status of all cases.

## Architecture

```
 Browser (HTML/CSS/JS, Leaflet, Chart.js, Esri geocoder)
   │  fetch() POST requests          ▲ Socket.IO events with the results
   ▼                                 │
 Node.js + Express (CovidWeb.js) ────┘
   │  SQL queries (mysql2)
   ▼
 MySQL on Amazon RDS
   tables: usuarios, registro_pacientes, estado_pacientes, resultados, conteo
```

The browser sends each request with `fetch()`, and the server answers through a Socket.IO event instead of the HTTP response.

## My part

I owned the repository and wrote most of the application: 44 of the 57 commits, including the Node.js server (`CovidWeb.js`) and most of the pages (case management, registration, administration, search, the map and the dashboard). The app was deployed on the EC2 server I had set up earlier for [LocateCabs](https://github.com/danielgonzale5/LocateCabs).

## Running it

The database schema was never versioned in this repository, so the app cannot be started from scratch without recreating the tables from the queries in `CovidWeb.js`. To point it at a database:

```bash
cp .env_sample .env      # fill in DB_HOST, DB_USER, DB_PASS
npm install
npm start                # http://localhost:3000
```

## Known issues

This is the code as we submitted it in 2021, with two changes: the database credentials were moved to `.env`, and the map API keys were replaced with placeholders. Looking back at it as a security engineer, it should never handle real patient data:

- **Hardcoded credentials in the history:** the original commits contain the RDS hostname and the database `root` password. That database instance was deleted long ago and the password is not used anywhere else.
- **SQL injection, including on login:** every query is built by concatenating request values, so the login form can be bypassed with a classic `' OR '1'='1` payload.
- **Plaintext passwords:** user passwords are stored and compared in clear text instead of as salted hashes.
- **Broken access control:** the role is only checked in the browser. The server serves every page, admin pages included, to anyone who knows the URL, and the API endpoints have no authentication.
- **Results broadcast to every client:** answers are sent with `io.emit`, so every connected browser receives every other user's login result and query data, including patient records.
- **Sensitive health data without protection:** national ID numbers, addresses and test results travel over plain HTTP and are stored unencrypted.
- **Unauthenticated deploy webhook:** anyone can call `POST /github` and trigger a `git reset --hard && git pull` on the server.
- **Map API keys in the frontend:** the Mapbox token and Esri API key were embedded in the HTML. They are replaced with placeholders now; to run the map pages, put your own keys in `Busqueda.html` and `MapaGeneral.html` where it says `[INSERT_MAPBOX_TOKEN]` and `[INSERT_ESRI_API_KEY]`.
