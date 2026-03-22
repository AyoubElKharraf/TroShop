import mysql from "mysql2/promise";
import { config } from "./config.js";

export const pool = mysql.createPool({
  host: config.MYSQL.host,
  port: config.MYSQL.port,
  user: config.MYSQL.user,
  password: config.MYSQL.password,
  database: config.MYSQL.database,
  waitForConnections: true,
  connectionLimit: 10,
});
