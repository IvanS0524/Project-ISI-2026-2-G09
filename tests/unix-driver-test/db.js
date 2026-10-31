'use strict';
/**
 * Conexión MySQL con pool + bootstrap del esquema y datos semilla.
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const CFG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD != null ? process.env.DB_PASSWORD : '',
  database: process.env.DB_NAME || 'unixdriver',
  charset: 'utf8mb4_unicode_ci',
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true,
  timezone: 'local'
};

let pool = null;

async function crearBaseSiFalta() {
  const conn = await mysql.createConnection({
    host: CFG.host, port: CFG.port, user: CFG.user, password: CFG.password
  });
  try {
    await conn.query(
      'CREATE DATABASE IF NOT EXISTS `' + CFG.database + '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
    );
  } catch (e) {
    // Si el usuario no puede crear bases, seguimos: la base puede existir ya
    // (por ejemplo, importada desde phpMyAdmin con database.sql).
    if (e.code !== 'ER_DBACCESS_DENIED_ERROR' && e.code !== 'ER_DB_CREATE_EXISTS') throw e;
  } finally {
    await conn.end();
  }
}

/** Divide schema.sql en sentencias ejecutables (ignora comentarios y líneas vacías). */
function sentencias(sql) {
  return sql
    .split('\n')
    .filter(l => !/^\s*--/.test(l))
    .join('\n')
    .split(';')
    .map(s => s.trim())
    .filter(Boolean);
}

async function aplicarEsquema() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  for (const st of sentencias(sql)) await pool.query(st);
}

async function sembrar() {
  const datos = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'seed', 'barrios_cartagena.json'), 'utf8')
  );

  const tarifas = [
    ['corto', 5000, 15000, 'Zona corta 🟢'],
    ['medio', 9000, 20000, 'Zona media 🟡'],
    ['largo', 14000, 32000, 'Zona larga 🔴']
  ];
  for (const t of tarifas) {
    await pool.query(
      `INSERT INTO tarifas (zona, moto, carro, etiqueta) VALUES (?,?,?,?)
       ON DUPLICATE KEY UPDATE moto=VALUES(moto), carro=VALUES(carro), etiqueta=VALUES(etiqueta)`,
      t
    );
  }

  const barrios = datos.barrios || datos;
  for (const b of barrios) {
    await pool.query(
      `INSERT INTO barrios
        (id, nombre, nombre_norm, localidad, zona, tarifa_moto, tarifa_carro,
         lat, lon, distancia_km, area_ha, es_rural)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         nombre=VALUES(nombre), nombre_norm=VALUES(nombre_norm), localidad=VALUES(localidad),
         zona=VALUES(zona), tarifa_moto=VALUES(tarifa_moto), tarifa_carro=VALUES(tarifa_carro),
         lat=VALUES(lat), lon=VALUES(lon), distancia_km=VALUES(distancia_km),
         area_ha=VALUES(area_ha), es_rural=VALUES(es_rural)`,
      [
        b.id, b.nombre, b.nombre_norm, b.localidad, b.zona, b.tarifa_moto, b.tarifa_carro,
        b.lat, b.lon, b.distancia_km, b.area_ha != null ? b.area_ha : null, b.es_rural ? 1 : 0
      ]
    );
  }
  return { barrios: barrios.length, tarifas: tarifas.length };
}

async function conectar() {
  await crearBaseSiFalta();
  pool = mysql.createPool(CFG);
  const [r] = await pool.query('SELECT 1 AS ok');
  if (!r || !r.length) throw new Error('MySQL no respondió al ping inicial');
  await aplicarEsquema();
  const info = await sembrar();
  return { pool, info, cfg: { host: CFG.host, port: CFG.port, database: CFG.database, user: CFG.user } };
}

module.exports = { conectar, getPool: () => pool, CFG };
