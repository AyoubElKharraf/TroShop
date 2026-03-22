import dotenv from "dotenv";

dotenv.config();

const NODE_ENV = process.env.NODE_ENV || "development";
const isProd = NODE_ENV === "production";

function requireEnv(name, fallback = "") {
  const v = process.env[name];
  if (v != null && v !== "") return v;
  if (isProd && !fallback) throw new Error(`Variable d'environnement requise en production : ${name}`);
  return fallback;
}

const JWT_SECRET = requireEnv("JWT_SECRET", "dev-secret-change-me");
if (isProd && JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET doit faire au moins 32 caractères en production.");
}

const rawOrigins = requireEnv("CLIENT_ORIGIN", "http://localhost:8080");
const CLIENT_ORIGINS = rawOrigins.split(",").map((s) => s.trim()).filter(Boolean);

/** Email du compte administrateur (minuscules). À la connexion, le rôle admin est appliqué si l’email correspond. */
const ADMIN_EMAIL_RAW = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const ADMIN_EMAIL = ADMIN_EMAIL_RAW || null;

export const config = {
  NODE_ENV,
  isProd,
  PORT: Number(process.env.PORT || 3001),
  JWT_SECRET,
  CLIENT_ORIGINS,
  MYSQL: {
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD ?? "",
    database: process.env.MYSQL_DATABASE || "trocspot",
  },
  SMTP: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || "noreply@trocspot.local",
  },
  TRUST_PROXY: process.env.TRUST_PROXY === "1" || process.env.TRUST_PROXY === "true",
  ADMIN_EMAIL,
};
