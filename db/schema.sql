-- CovidWeb schema. It was never versioned in 2021; this is rebuilt from the
-- queries in the original server, with passwords stored as scrypt hashes and
-- uniqueness enforced by the database instead of by the pages.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS usuarios (
  idusuario     INT AUTO_INCREMENT PRIMARY KEY,
  cedula        BIGINT NOT NULL UNIQUE,
  nombre        VARCHAR(60) NOT NULL,
  apellido      VARCHAR(60) NOT NULL,
  rol           TINYINT NOT NULL COMMENT '1 doctor, 2 assistant, 3 administrator',
  usuario       VARCHAR(40) NOT NULL UNIQUE,
  password_hash VARCHAR(128) NOT NULL
) DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS resultados (
  idresultados TINYINT PRIMARY KEY,
  resultados   VARCHAR(20) NOT NULL
) DEFAULT CHARSET = utf8mb4;

INSERT IGNORE INTO resultados VALUES (0, 'Positivo'), (1, 'Negativo');

CREATE TABLE IF NOT EXISTS registro_pacientes (
  idcaso           INT AUTO_INCREMENT PRIMARY KEY,
  cedula           BIGINT NOT NULL UNIQUE,
  nombre           VARCHAR(60) NOT NULL,
  apellido         VARCHAR(60) NOT NULL,
  sexo             TINYINT NOT NULL COMMENT '0 male, 1 female',
  fecha_nacimiento DATE NOT NULL,
  dir_residencia   VARCHAR(120) NOT NULL,
  dir_trabajo      VARCHAR(120) NOT NULL,
  resultado        TINYINT NOT NULL,
  fecha_examen     DATE NOT NULL,
  INDEX idx_nombre (nombre, apellido),
  INDEX idx_fecha_examen (fecha_examen),
  FOREIGN KEY (resultado) REFERENCES resultados (idresultados)
) DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS estado_pacientes (
  idregistro_estado INT AUTO_INCREMENT PRIMARY KEY,
  cedula            BIGINT NOT NULL,
  idcaso            INT NOT NULL,
  estado            TINYINT NOT NULL COMMENT '1 hospital, 2 ICU, 3 recovered, 4 home, 5 healthy, 6 deceased',
  fecha_mod         DATE NOT NULL,
  INDEX idx_caso (idcaso),
  FOREIGN KEY (idcaso) REFERENCES registro_pacientes (idcaso)
) DEFAULT CHARSET = utf8mb4;
