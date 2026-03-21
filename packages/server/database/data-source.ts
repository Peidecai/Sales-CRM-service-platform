import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { SnakeNamingStrategy } from '../src/config/snake-naming.strategy';

dotenv.config({ path: join(__dirname, '../.env') });

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || 'crm_password_123',
  database: process.env.DB_DATABASE || 'crm_sales',
  entities: [join(__dirname, '../src/**/*.entity{.ts,.js}')],
  migrations: [join(__dirname, './migrations/*{.ts,.js}')],
  synchronize: false,
  namingStrategy: new SnakeNamingStrategy(),
  logging: true,
  timezone: '+08:00',
  charset: 'utf8mb4',
});
