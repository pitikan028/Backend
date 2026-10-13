import path from 'node:path';
import { fileURLToPath } from 'node:url';
import config from './src/config/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));

const connection = config.db.connectionString
  ? {
      connectionString: config.db.connectionString,
      ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
    }
  : {
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      // MySQL ต้องบอกให้คืนค่า DATE เป็น string ไม่งั้น driver จะแปลงเป็น Date ตาม timezone ของเครื่อง
      ...(config.db.isPostgres ? {} : { dateStrings: true, timezone: 'Z' }),
      ...(config.db.ssl ? { ssl: { rejectUnauthorized: false } } : {}),
    };

/**
 * ใช้ร่วมกันทั้ง Knex CLI และตัว app เอง (src/db/knex.js)
 * client จะสลับระหว่าง pg / mysql2 ตามค่า DB_CLIENT
 */
export const knexConfig = {
  client: config.db.client,
  connection,
  pool: {
    min: config.db.poolMin,
    max: config.db.poolMax,
  },
  migrations: {
    directory: path.join(here, 'src', 'db', 'migrations'),
    tableName: 'knex_migrations',
    loadExtensions: ['.js'],
  },
  seeds: {
    directory: path.join(here, 'src', 'db', 'seeds'),
    loadExtensions: ['.js'],
  },
};

export default knexConfig;
