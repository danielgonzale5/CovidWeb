#!/bin/bash
# Runs once, when the MySQL container initialises its data directory.
# The application user can only read and insert rows in this database: no
# UPDATE, no DELETE, no DDL, and no access to any other database. The MySQL
# entrypoint sources this file, so it must not change shell options.

mysql --user=root --password="${MYSQL_ROOT_PASSWORD}" <<SQL
CREATE USER IF NOT EXISTS '${APP_DB_USER}'@'%' IDENTIFIED BY '${APP_DB_PASS}';
GRANT SELECT, INSERT ON \`${MYSQL_DATABASE}\`.* TO '${APP_DB_USER}'@'%';
SQL
