import { Sequelize } from 'sequelize';
import type { Dialect } from 'sequelize';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

const dialect = (process.env.DB_DIALECT || 'mysql') as Dialect;

// SQLite needs no host/credentials, so it gets its own constructor path.
// Set DB_DIALECT=sqlite (and optionally DB_STORAGE) for local development
// and tests; MySQL remains the default for production.
export const sequelize =
  dialect === 'sqlite'
    ? new Sequelize({
        dialect: 'sqlite',
        storage: process.env.DB_STORAGE || 'dev.sqlite',
        logging: false
      })
    : new Sequelize(
        process.env.DB_NAME!, process.env.DB_USER!, process.env.DB_PASS!, {
          host: process.env.DB_HOST,
          port: Number(process.env.DB_PORT||3306),
          dialect,
          logging: false
        }
      );
