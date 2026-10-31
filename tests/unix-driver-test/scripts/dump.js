'use strict';
/* Genera database.sql (esquema + datos) sin depender de mysqldump.
   Uso: node scripts/dump.js  ->  crea ./database.sql */
const fs = require('fs');
const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch (_) {}
const mysql = require('mysql2/promise');

const CFG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD != null ? process.env.DB_PASSWORD : '',
  database: process.env.DB_NAME || 'unixdriver',
  decimalNumbers: true
};

const TABLAS = ['tarifas', 'barrios', 'viajes', 'ofertas', 'pagos', 'eventos'];
const esc = v => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (v instanceof Date) {
    const p = n => String(n).padStart(2, '0');
    return "'" + v.getFullYear() + '-' + p(v.getMonth() + 1) + '-' + p(v.getDate()) + ' ' +
      p(v.getHours()) + ':' + p(v.getMinutes()) + ':' + p(v.getSeconds()) + "'";
  }
  return "'" + String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
};

(async () => {
  const c = await mysql.createConnection(CFG);
  const out = [];
  out.push('-- ============================================================');
  out.push('--  UniX Driver · Cartagena — respaldo completo de la base de datos');
  out.push('--  Generado: ' + new Date().toISOString());
  out.push('--  Base: ' + CFG.database + '   Motor: MySQL/MariaDB (XAMPP)');
  out.push('--');
  out.push('--  Cómo usarlo en phpMyAdmin (XAMPP):');
  out.push('--    1) http://localhost/phpmyadmin  ->  pestaña "Importar"');
  out.push('--    2) Selecciona este archivo y pulsa "Continuar"');
  out.push('--  O por consola:  mysql -u root < database.sql');
  out.push('-- ============================================================');
  out.push('');
  out.push('CREATE DATABASE IF NOT EXISTS `' + CFG.database + '`');
  out.push('  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
  out.push('USE `' + CFG.database + '`;');
  out.push('');
  out.push('SET NAMES utf8mb4;');
  out.push('SET FOREIGN_KEY_CHECKS = 0;');
  out.push('');

  // 1) Esquema real de las tablas
  for (const t of TABLAS) {
    const [[r]] = await c.query('SHOW CREATE TABLE `' + t + '`');
    out.push('DROP TABLE IF EXISTS `' + t + '`;');
    out.push(r['Create Table'] + ';');
    out.push('');
  }

  // 2) Datos
  for (const t of TABLAS) {
    const [rows] = await c.query('SELECT * FROM `' + t + '`');
    if (!rows.length) continue;
    out.push('-- ' + t + ': ' + rows.length + ' fila(s)');
    const cols = Object.keys(rows[0]).map(x => '`' + x + '`').join(', ');
    const CH = 400;
    for (let i = 0; i < rows.length; i += CH) {
      const trozo = rows.slice(i, i + CH);
      out.push('INSERT INTO `' + t + '` (' + cols + ') VALUES');
      out.push(trozo.map(r => '(' + Object.values(r).map(esc).join(', ') + ')').join(',\n') + ';');
    }
    out.push('');
  }

  out.push('SET FOREIGN_KEY_CHECKS = 1;');
  out.push('-- Fin del respaldo');
  const destino = path.join(__dirname, '..', 'database.sql');
  fs.writeFileSync(destino, out.join('\n'), 'utf8');
  console.log('✔ database.sql generado (' + fs.statSync(destino).size + ' bytes)');
  await c.end();
})().catch(e => { console.error('✖ ' + e.message); process.exit(1); });
