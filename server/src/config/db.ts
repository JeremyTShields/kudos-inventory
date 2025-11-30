import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

export const sequelize = new Sequelize(
  process.env.DB_NAME!, process.env.DB_USER!, process.env.DB_PASS!, {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT||3306),
    dialect: 'mysql',
    logging: false
  }
);
