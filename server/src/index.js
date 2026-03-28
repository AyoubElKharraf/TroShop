import "./config.js";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { config } from "./config.js";
import { pool } from "./db.js";
import { sendPasswordResetEmail } from "./email.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const uploadsDir = path.join(rootDir, "uploads", "listings");

const { JWT_SECRET, CLIENT_ORIGINS, PORT, ADMIN_EMAIL } = config;

const app = express();
if (config.TRUST_PROXY) app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(compression());
app.use(morgan(config.isProd ? "combined" : "dev"));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (CLIENT_ORIGINS.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: { error: "Trop de tentatives. Réessayez plus tard." },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.isProd ? 400 : 2000,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", apiLimiter);

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(path.join(rootDir, "uploads")));

function sha256(s) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function mapListing(row) {
  if (!row) return null;
  let images = row.images;
  if (images == null) images = [];
  else if (typeof images === "string") {
    try {
      images = JSON.parse(images);
    } catch {
      images = [];
    }
  }
  if (!Array.isArray(images)) images = [];
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    description: row.description,
    category: row.category,
    listing_type: row.listing_type,
    price: Number(row.price),
    price_period: row.price_period,
    condition: row.condition,
    location: row.location,
    images,
    is_active: row.is_active === 1 || row.is_active === true,
    status: row.status || "available",
    is_contact_hub: row.is_contact_hub === 1 || row.is_contact_hub === true,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** Crée si besoin l’annonce masquée « contact boutique » pour le premier compte admin. */
async function ensureContactHubListingId() {
  const [admins] = await pool.query(
    "SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1"
  );
  if (!admins.length) return null;
  const adminId = admins[0].id;
  const [existing] = await pool.query(
    "SELECT id FROM listings WHERE user_id = ? AND is_contact_hub = 1 LIMIT 1",
    [adminId]
  );
  if (existing.length) return existing[0].id;
  const id = crypto.randomUUID();
  await pool.query(
    `INSERT INTO listings (id, user_id, title, description, category, listing_type, price, \`condition\`, images, is_active, is_contact_hub)
     VALUES (?, ?, ?, '', 'materiel', 'vente', 0, 'bon', ?, 0, 1)`,
    [id, adminId, "[Contact boutique] — message général", JSON.stringify([])]
  );
  return id;
}

function mapProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    location: row.location,
    bio: row.bio,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapNotification(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    link_path: row.link_path,
    read: row.read_at != null,
    created_at: row.created_at,
  };
}

async function getNotifyMessagesEnabled(userId) {
  try {
    const [r] = await pool.query("SELECT notify_messages FROM user_preferences WHERE user_id = ?", [userId]);
    if (!r.length) return true;
    return r[0].notify_messages === 1;
  } catch (e) {
    if (e.code === "ER_NO_SUCH_TABLE") return true;
    throw e;
  }
}

async function notifyNewMessage(recipientUserId, conversationId, previewText) {
  if (!recipientUserId) return;
  try {
    const ok = await getNotifyMessagesEnabled(recipientUserId);
    if (!ok) return;
    const nid = crypto.randomUUID();
    const preview =
      previewText && String(previewText).trim()
        ? String(previewText).trim().slice(0, 200)
        : "Nouveau message";
    await pool.query(
      `INSERT INTO notifications (id, user_id, type, title, body, link_path)
       VALUES (?, ?, 'message', 'Nouveau message', ?, ?)`,
      [nid, recipientUserId, preview, `/messages/${conversationId}`]
    );
  } catch (e) {
    if (e.code === "ER_NO_SUCH_TABLE") return;
    console.error(e);
  }
}

function authMiddleware(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Non authentifié" });
  }
  try {
    req.user = jwt.verify(h.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Token invalide" });
  }
}

/** Met à jour le rôle admin si l’email correspond à ADMIN_EMAIL (fichier .env). */
async function ensureAdminRoleFromEnv(userId, email) {
  if (!ADMIN_EMAIL || !email || String(email).toLowerCase() !== ADMIN_EMAIL) return;
  await pool.query("UPDATE users SET role = 'admin' WHERE id = ?", [userId]);
}

async function requireAdmin(req, res, next) {
  try {
    const [rows] = await pool.query("SELECT role FROM users WHERE id = ?", [req.user.userId]);
    const role = rows[0]?.role;
    if (role !== "admin") {
      return res.status(403).json({ error: "Réservé aux administrateurs" });
    }
    next();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

async function requireAdminListingOwner(req, res, next) {
  try {
    const listingId = req.params.id;
    const [r] = await pool.query("SELECT user_id FROM listings WHERE id = ?", [listingId]);
    if (!r.length) return res.status(404).json({ error: "Introuvable" });
    const [u] = await pool.query("SELECT role FROM users WHERE id = ?", [req.user.userId]);
    if (u[0]?.role !== "admin" || r[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: "Interdit" });
    }
    next();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

/** Express 4 : évite les rejets de promesses non gérés sur les handlers async */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uid = req.user?.userId;
    if (!uid) return cb(new Error("auth"));
    const dir = path.join(uploadsDir, uid);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { files: 5, fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/^image\//.test(file.mimetype)) {
      return cb(new Error("Seules les images sont acceptées"));
    }
    cb(null, true);
  },
});

const PW_MIN = 8;

// --- Auth ---
app.post("/api/auth/register", authLimiter, asyncHandler(async (req, res) => {
  const { email, password, display_name } = req.body || {};
  if (!email || !password || !display_name) {
    return res.status(400).json({ error: "email, password et display_name requis" });
  }
  if (password.length < PW_MIN) {
    return res.status(400).json({ error: `Mot de passe : au moins ${PW_MIN} caractères` });
  }
  const hash = await bcrypt.hash(password, 12);
  const userId = crypto.randomUUID();
  const profileId = crypto.randomUUID();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      "INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)",
      [userId, email.trim().toLowerCase(), hash]
    );
    await conn.query(
      "INSERT INTO profiles (id, user_id, display_name) VALUES (?, ?, ?)",
      [profileId, userId, display_name.trim().slice(0, 255)]
    );
    try {
      await conn.query("INSERT INTO user_preferences (user_id) VALUES (?)", [userId]);
    } catch (prefErr) {
      if (prefErr.code !== "ER_NO_SUCH_TABLE") throw prefErr;
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    if (e.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Cet email est déjà utilisé" });
    }
    console.error(e);
    return res.status(500).json({ error: "Erreur serveur" });
  } finally {
    conn.release();
  }
  const emailNorm = email.trim().toLowerCase();
  const token = jwt.sign(
    { userId, email: emailNorm, role: "user" },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
  res.json({
    token,
    user: { id: userId, email: emailNorm, role: "user" },
  });
}));

app.post("/api/auth/login", authLimiter, asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email et mot de passe requis" });
  }
  const [rows] = await pool.query(
    "SELECT id, email, password_hash, role FROM users WHERE email = ?",
    [email.trim().toLowerCase()]
  );
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: "Email ou mot de passe incorrect" });
  }
  await ensureAdminRoleFromEnv(user.id, user.email);
  const [again] = await pool.query("SELECT role FROM users WHERE id = ?", [user.id]);
  const role = again[0]?.role === "admin" ? "admin" : "user";
  const token = jwt.sign(
    { userId: user.id, email: user.email, role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
  res.json({ token, user: { id: user.id, email: user.email, role } });
}));

app.post("/api/auth/forgot-password", authLimiter, asyncHandler(async (req, res) => {
  const email = (req.body?.email || "").trim().toLowerCase();
  const generic = {
    ok: true,
    message: "Si cet email est inscrit, vous recevrez un lien de réinitialisation.",
  };
  if (!email) {
    return res.json(generic);
  }
  const [users] = await pool.query("SELECT id, email FROM users WHERE email = ?", [email]);
  const u = users[0];
  if (!u) {
    return res.json(generic);
  }
  await pool.query("DELETE FROM password_reset_tokens WHERE user_id = ?", [u.id]);
  const plainToken = crypto.randomBytes(32).toString("hex");
  const id = crypto.randomUUID();
  const expires = new Date(Date.now() + 60 * 60 * 1000);
  await pool.query(
    "INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)",
    [id, u.id, sha256(plainToken), expires]
  );
  const origin = CLIENT_ORIGINS[0] || "http://localhost:8080";
  const resetUrl = `${origin}/auth/reinitialiser?token=${encodeURIComponent(plainToken)}`;
  await sendPasswordResetEmail(u.email, resetUrl);
  res.json(generic);
}));

app.post("/api/auth/reset-password", authLimiter, asyncHandler(async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) {
    return res.status(400).json({ error: "token et mot de passe requis" });
  }
  if (password.length < PW_MIN) {
    return res.status(400).json({ error: `Mot de passe : au moins ${PW_MIN} caractères` });
  }
  const hashToken = sha256(String(token));
  const [rows] = await pool.query(
    "SELECT user_id FROM password_reset_tokens WHERE token_hash = ? AND expires_at > NOW(3)",
    [hashToken]
  );
  const row = rows[0];
  if (!row) {
    return res.status(400).json({ error: "Lien invalide ou expiré." });
  }
  const newHash = await bcrypt.hash(password, 12);
  await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, row.user_id]);
  await pool.query("DELETE FROM password_reset_tokens WHERE user_id = ?", [row.user_id]);
  res.json({ ok: true, message: "Mot de passe mis à jour. Vous pouvez vous connecter." });
}));

app.get("/api/auth/me", authMiddleware, asyncHandler(async (req, res) => {
  const [rows] = await pool.query("SELECT id, email, role FROM users WHERE id = ?", [req.user.userId]);
  const u = rows[0];
  if (!u) return res.status(404).json({ error: "Utilisateur introuvable" });
  await ensureAdminRoleFromEnv(u.id, u.email);
  const [r2] = await pool.query("SELECT role FROM users WHERE id = ?", [u.id]);
  const role = r2[0]?.role === "admin" ? "admin" : "user";
  res.json({ user: { id: u.id, email: u.email, role } });
}));

app.delete("/api/me", authMiddleware, asyncHandler(async (req, res) => {
  await pool.query("DELETE FROM users WHERE id = ?", [req.user.userId]);
  res.status(204).end();
}));

// --- Listings ---
app.get("/api/listings", asyncHandler(async (req, res) => {
  const search = (req.query.search || req.query.q || "").trim();
  const category = req.query.category;
  const listingType = req.query.listing_type;
  const availableOnly = String(req.query.available ?? "1") !== "0";
  const sortBy = req.query.sort || "recent";
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(48, Math.max(1, Number(req.query.pageSize) || 12));
  const offset = (page - 1) * pageSize;

  let orderSql = "l.created_at DESC";
  if (sortBy === "price_asc") orderSql = "l.price ASC";
  if (sortBy === "price_desc") orderSql = "l.price DESC";

  const params = [];
  let where = "l.is_active = 1 AND COALESCE(l.is_contact_hub, 0) = 0";
  if (availableOnly) {
    where += " AND COALESCE(l.status, 'available') = 'available'";
  }
  if (search) {
    where += " AND l.title LIKE ?";
    params.push(`%${search}%`);
  }
  if (category && category !== "all") {
    where += " AND l.category = ?";
    params.push(category);
  }
  if (listingType && listingType !== "all") {
    where += " AND l.listing_type = ?";
    params.push(listingType);
  }

  const countSql = `SELECT COUNT(*) AS c FROM listings l WHERE ${where}`;
  const [countRows] = await pool.query(countSql, params);
  const total = countRows[0]?.c ?? 0;

  const dataParams = [...params, pageSize, offset];
  const [rows] = await pool.query(
    `SELECT l.* FROM listings l WHERE ${where} ORDER BY ${orderSql} LIMIT ? OFFSET ?`,
    dataParams
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  res.json({
    items: rows.map(mapListing),
    total,
    page,
    pageSize,
    totalPages,
  });
}));

app.get("/api/listings/:id", asyncHandler(async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM listings WHERE id = ?", [req.params.id]);
  const listing = rows[0];
  if (!listing) return res.status(404).json({ error: "Annonce introuvable" });
  if (listing.is_contact_hub === 1 || listing.is_contact_hub === true) {
    return res.status(404).json({ error: "Annonce introuvable" });
  }
  res.json(mapListing(listing));
}));

app.post("/api/listings", authMiddleware, requireAdmin, upload.array("images", 5), asyncHandler(async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      listing_type,
      price,
      price_period,
      condition: cond,
      location,
      status,
    } = req.body;

    if (!title || !category) {
      return res.status(400).json({ error: "Titre et catégorie requis" });
    }
    if (String(title).length > 200) {
      return res.status(400).json({ error: "Titre trop long (200 caractères max)" });
    }

    const publicUrls = (req.files || []).map(
      (f) => `/uploads/listings/${req.user.userId}/${f.filename}`
    );

    const id = crypto.randomUUID();
    const lt = listing_type || "vente";
    const pp = lt === "location" && price_period ? price_period : null;

    const listingStatus =
      status === "reserved" || status === "sold" || status === "available"
        ? status
        : "available";

    await pool.query(
      `INSERT INTO listings (id, user_id, title, description, category, listing_type, price, price_period, \`condition\`, location, images, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        req.user.userId,
        String(title).trim(),
        String(description || "").slice(0, 10000),
        category,
        lt,
        parseFloat(price) || 0,
        pp,
        cond || "bon",
        location ? String(location).slice(0, 255) : null,
        JSON.stringify(publicUrls),
        listingStatus,
      ]
    );

    const [rows] = await pool.query("SELECT * FROM listings WHERE id = ?", [id]);
    res.status(201).json(mapListing(rows[0]));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Erreur création annonce" });
  }
}));

/** Upload photos (sans lier à une annonce) — renvoie des URLs à inclure dans PATCH listings. */
app.post("/api/upload/listing-images", authMiddleware, requireAdmin, upload.array("images", 5), asyncHandler(async (req, res) => {
  const urls = (req.files || []).map(
    (f) => `/uploads/listings/${req.user.userId}/${f.filename}`
  );
  res.json({ urls });
}));

app.patch("/api/listings/:id", authMiddleware, requireAdminListingOwner, asyncHandler(async (req, res) => {
  const listingId = req.params.id;

  const body = req.body || {};
  const allowed = [
    "title",
    "description",
    "category",
    "listing_type",
    "price",
    "price_period",
    "condition",
    "location",
    "is_active",
    "status",
    "images",
  ];
  const updates = [];
  const vals = [];

  for (const key of allowed) {
    if (body[key] === undefined) continue;
    if (key === "images") {
      if (!Array.isArray(body.images)) return res.status(400).json({ error: "images doit être un tableau" });
      if (body.images.length > 5) return res.status(400).json({ error: "Maximum 5 images" });
      updates.push("images = ?");
      vals.push(JSON.stringify(body.images));
    } else if (key === "title") {
      updates.push("title = ?");
      vals.push(String(body.title).trim().slice(0, 200));
    } else if (key === "description") {
      updates.push("description = ?");
      vals.push(String(body.description).slice(0, 10000));
    } else if (key === "location") {
      updates.push("location = ?");
      vals.push(body.location ? String(body.location).slice(0, 255) : null);
    } else if (key === "price") {
      updates.push("price = ?");
      vals.push(parseFloat(body.price) || 0);
    } else if (key === "is_active") {
      updates.push("is_active = ?");
      vals.push(body.is_active ? 1 : 0);
    } else if (key === "status") {
      const next = String(body.status || "");
      if (!["available", "reserved", "sold"].includes(next)) {
        return res.status(400).json({ error: "status invalide" });
      }
      updates.push("status = ?");
      vals.push(next);
    } else {
      updates.push(`${key === "condition" ? "`condition`" : key} = ?`);
      vals.push(body[key]);
    }
  }

  if (!updates.length) return res.status(400).json({ error: "Aucun champ à mettre à jour" });

  vals.push(listingId);
  await pool.query(`UPDATE listings SET ${updates.join(", ")} WHERE id = ?`, vals);
  const [rows] = await pool.query("SELECT * FROM listings WHERE id = ?", [listingId]);
  res.json(mapListing(rows[0]));
}));

app.delete("/api/listings/:id", authMiddleware, requireAdminListingOwner, asyncHandler(async (req, res) => {
  await pool.query("DELETE FROM listings WHERE id = ?", [req.params.id]);
  res.status(204).end();
}));

app.post("/api/listings/:id/report", authMiddleware, asyncHandler(async (req, res) => {
  const listingId = req.params.id;
  const reason = String(req.body?.reason || "").trim();
  if (reason.length < 10 || reason.length > 500) {
    return res.status(400).json({ error: "Motif entre 10 et 500 caractères." });
  }
  const [L] = await pool.query("SELECT user_id FROM listings WHERE id = ?", [listingId]);
  if (!L.length) return res.status(404).json({ error: "Annonce introuvable" });
  if (L[0].user_id === req.user.userId) {
    return res.status(400).json({ error: "Vous ne pouvez pas signaler votre propre annonce." });
  }
  const id = crypto.randomUUID();
  try {
    await pool.query(
      "INSERT INTO listing_reports (id, listing_id, reporter_id, reason) VALUES (?, ?, ?, ?)",
      [id, listingId, req.user.userId, reason]
    );
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Vous avez déjà signalé cette annonce." });
    }
    throw e;
  }
  res.status(201).json({ ok: true, message: "Signalement enregistré. Merci." });
}));

app.get("/api/me/favorites/ids", authMiddleware, asyncHandler(async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT listing_id FROM favorites WHERE user_id = ?`,
      [req.user.userId]
    );
    res.json({ ids: rows.map((r) => r.listing_id) });
  } catch (e) {
    if (e.code === "ER_NO_SUCH_TABLE") return res.json({ ids: [] });
    throw e;
  }
}));

app.get("/api/me/favorites", authMiddleware, asyncHandler(async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT l.*
       FROM favorites f
       INNER JOIN listings l ON l.id = f.listing_id
       WHERE f.user_id = ? AND l.is_active = 1 AND COALESCE(l.is_contact_hub, 0) = 0
       ORDER BY f.created_at DESC`,
      [req.user.userId]
    );
    res.json(rows.map(mapListing));
  } catch (e) {
    if (e.code === "ER_NO_SUCH_TABLE") return res.json([]);
    throw e;
  }
}));

app.post("/api/listings/:id/favorite", authMiddleware, asyncHandler(async (req, res) => {
  const listingId = req.params.id;
  const [rows] = await pool.query(
    "SELECT id, COALESCE(is_contact_hub, 0) AS is_contact_hub FROM listings WHERE id = ?",
    [listingId]
  );
  if (!rows.length) return res.status(404).json({ error: "Annonce introuvable" });
  if (rows[0].is_contact_hub === 1 || rows[0].is_contact_hub === true) {
    return res.status(400).json({ error: "Annonce non éligible aux favoris." });
  }
  await pool.query(
    "INSERT IGNORE INTO favorites (user_id, listing_id) VALUES (?, ?)",
    [req.user.userId, listingId]
  );
  res.status(201).json({ ok: true });
}));

app.delete("/api/listings/:id/favorite", authMiddleware, asyncHandler(async (req, res) => {
  await pool.query(
    "DELETE FROM favorites WHERE user_id = ? AND listing_id = ?",
    [req.user.userId, req.params.id]
  );
  res.status(204).end();
}));

// --- Profiles ---
app.get("/api/profile", authMiddleware, asyncHandler(async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM profiles WHERE user_id = ?", [req.user.userId]);
  const p = rows[0];
  if (!p) return res.status(404).json({ error: "Profil introuvable" });
  res.json(mapProfile(p));
}));

app.patch("/api/profile", authMiddleware, asyncHandler(async (req, res) => {
  const { display_name, bio, location } = req.body || {};
  const updates = [];
  const vals = [];
  if (display_name !== undefined) {
    updates.push("display_name = ?");
    vals.push(String(display_name).slice(0, 255));
  }
  if (bio !== undefined) {
    updates.push("bio = ?");
    vals.push(String(bio).slice(0, 2000));
  }
  if (location !== undefined) {
    updates.push("location = ?");
    vals.push(location ? String(location).slice(0, 255) : null);
  }
  if (!updates.length) return res.status(400).json({ error: "Rien à mettre à jour" });
  vals.push(req.user.userId);
  await pool.query(`UPDATE profiles SET ${updates.join(", ")} WHERE user_id = ?`, vals);
  const [rows] = await pool.query("SELECT * FROM profiles WHERE user_id = ?", [req.user.userId]);
  res.json(mapProfile(rows[0]));
}));

app.get("/api/users/:userId/profile", asyncHandler(async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM profiles WHERE user_id = ?", [req.params.userId]);
  const p = rows[0];
  if (!p) return res.status(404).json({ error: "Profil introuvable" });
  res.json(mapProfile(p));
}));

/** Catalogue public d’un vendeur (annonces actives, hors fiche contact / vendues). */
app.get("/api/users/:userId/listings", asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT * FROM listings
     WHERE user_id = ? AND is_active = 1 AND COALESCE(is_contact_hub, 0) = 0 AND status != 'sold'
     ORDER BY created_at DESC`,
    [req.params.userId]
  );
  res.json(rows.map(mapListing));
}));

app.get("/api/me/listings", authMiddleware, asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    "SELECT * FROM listings WHERE user_id = ? AND COALESCE(is_contact_hub, 0) = 0 ORDER BY created_at DESC",
    [req.user.userId]
  );
  res.json(rows.map(mapListing));
}));

const CONVERSATIONS_LIST_SQL = `
     SELECT c.*,
            l.title AS listing_title, l.images AS listing_images, COALESCE(l.is_contact_hub, 0) AS is_contact_hub,
            bp.display_name AS buyer_display_name,
            sp.display_name AS seller_display_name,
            bu.email AS buyer_email,
            su.email AS seller_email,
            (SELECT m.sender_id FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_sender_id,
            (SELECT LEFT(m.content, 140) FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_preview,
            (SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at
     FROM conversations c
     INNER JOIN listings l ON l.id = c.listing_id
     LEFT JOIN profiles bp ON bp.user_id = c.buyer_id
     LEFT JOIN profiles sp ON sp.user_id = c.seller_id
     LEFT JOIN users bu ON bu.id = c.buyer_id
     LEFT JOIN users su ON su.id = c.seller_id
     WHERE c.buyer_id = ? OR c.seller_id = ?
     ORDER BY c.updated_at DESC`;

/** Sans migration 007 : pas de colonnes de lecture — on expose quand même le fil et le dernier message. */
const CONVERSATIONS_LIST_SQL_LEGACY = `
     SELECT c.id, c.listing_id, c.buyer_id, c.seller_id, c.created_at, c.updated_at,
            CAST(NULL AS DATETIME(3)) AS buyer_last_read_at,
            CAST(NULL AS DATETIME(3)) AS seller_last_read_at,
            l.title AS listing_title, l.images AS listing_images, COALESCE(l.is_contact_hub, 0) AS is_contact_hub,
            bp.display_name AS buyer_display_name,
            sp.display_name AS seller_display_name,
            bu.email AS buyer_email,
            su.email AS seller_email,
            (SELECT m.sender_id FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_sender_id,
            (SELECT LEFT(m.content, 140) FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_preview,
            (SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at
     FROM conversations c
     INNER JOIN listings l ON l.id = c.listing_id
     LEFT JOIN profiles bp ON bp.user_id = c.buyer_id
     LEFT JOIN profiles sp ON sp.user_id = c.seller_id
     LEFT JOIN users bu ON bu.id = c.buyer_id
     LEFT JOIN users su ON su.id = c.seller_id
     WHERE c.buyer_id = ? OR c.seller_id = ?
     ORDER BY c.updated_at DESC`;

// --- Conversations ---
app.get("/api/conversations", authMiddleware, asyncHandler(async (req, res) => {
  const uid = req.user.userId;
  const [roleRows] = await pool.query("SELECT role FROM users WHERE id = ?", [uid]);
  const viewerIsAdmin = roleRows[0]?.role === "admin";

  let rows;
  let legacyConversationList = false;
  try {
    ;[rows] = await pool.query(CONVERSATIONS_LIST_SQL, [uid, uid]);
  } catch (e) {
    if (e.code !== "ER_BAD_FIELD_ERROR") throw e;
    legacyConversationList = true;
    ;[rows] = await pool.query(CONVERSATIONS_LIST_SQL_LEGACY, [uid, uid]);
  }

  const out = rows.map((row) => {
    let imgs = row.listing_images;
    if (typeof imgs === "string") {
      try {
        imgs = JSON.parse(imgs);
      } catch {
        imgs = [];
      }
    }
    if (!Array.isArray(imgs)) imgs = [];

    const isSeller = uid === row.seller_id;
    const isContactHub = row.is_contact_hub === 1 || row.is_contact_hub === true;
    let peer_display_name;
    if (isSeller) {
      peer_display_name =
        row.buyer_display_name?.trim() ||
        (row.buyer_email ? String(row.buyer_email).split("@")[0] : null) ||
        "Client";
    } else {
      peer_display_name = row.seller_display_name?.trim() || "Boutique";
    }

    const peer_email =
      viewerIsAdmin && isSeller ? row.buyer_email || null : viewerIsAdmin && !isSeller ? row.seller_email || null : null;

    const listTitle = isContactHub ? "Message général" : row.listing_title;

    const lastSenderId = row.last_sender_id || null;
    const lastMessageAt = row.last_message_at || null;
    const lastFromPeer = Boolean(lastSenderId && lastSenderId !== uid);
    const myReadAt = isSeller ? row.seller_last_read_at : row.buyer_last_read_at;
    let unread = false;
    if (!legacyConversationList && lastFromPeer && lastMessageAt) {
      if (!myReadAt) unread = true;
      else unread = new Date(lastMessageAt).getTime() > new Date(myReadAt).getTime();
    }
    let thread_status = "neutral";
    if (!legacyConversationList && unread) thread_status = "unread";
    else if (lastFromPeer) thread_status = "needs_reply";
    else if (lastSenderId === uid) thread_status = "waiting";

    return {
      id: row.id,
      listing_id: row.listing_id,
      buyer_id: row.buyer_id,
      seller_id: row.seller_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      is_contact_hub: isContactHub,
      peer_display_name,
      peer_email,
      listings: { title: listTitle, images: imgs },
      last_message_preview: row.last_message_preview || null,
      last_message_at: lastMessageAt,
      unread,
      thread_status,
    };
  });
  const priority = (x) =>
    x.unread ? 3 : x.thread_status === "needs_reply" ? 2 : x.thread_status === "waiting" ? 1 : 0;
  out.sort((a, b) => {
    const pa = priority(a);
    const pb = priority(b);
    if (pa !== pb) return pb - pa;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
  res.json(out);
}));

app.post("/api/conversations/open", authMiddleware, asyncHandler(async (req, res) => {
  const { listing_id } = req.body || {};
  if (!listing_id) return res.status(400).json({ error: "listing_id requis" });

  const [L] = await pool.query(
    "SELECT user_id, title, COALESCE(is_contact_hub, 0) AS is_contact_hub, COALESCE(status, 'available') AS status, is_active FROM listings WHERE id = ?",
    [listing_id]
  );
  if (!L.length) return res.status(404).json({ error: "Annonce introuvable" });
  if (!L[0].is_contact_hub && (L[0].is_active !== 1 || L[0].status === "sold")) {
    return res.status(409).json({ error: "Cette annonce n'est plus disponible." });
  }
  const sellerId = L[0].user_id;
  const listingTitle = L[0].title;
  const isContactHub = L[0].is_contact_hub === 1 || L[0].is_contact_hub === true;
  const buyerId = req.user.userId;
  if (buyerId === sellerId) {
    return res.status(400).json({ error: "Vous ne pouvez pas vous contacter vous-même" });
  }

  const [existing] = await pool.query(
    "SELECT id FROM conversations WHERE listing_id = ? AND buyer_id = ?",
    [listing_id, buyerId]
  );
  if (existing.length) {
    return res.json({ id: existing[0].id });
  }

  const id = crypto.randomUUID();
  await pool.query(
    "INSERT INTO conversations (id, listing_id, buyer_id, seller_id) VALUES (?, ?, ?, ?)",
    [id, listing_id, buyerId, sellerId]
  );
  const intro = isContactHub
    ? "Bonjour, je souhaite contacter la boutique."
    : `Demande concernant : ${String(listingTitle).slice(0, 500)}`;
  await pool.query(
    "INSERT INTO messages (id, conversation_id, sender_id, content) VALUES (?, ?, ?, ?)",
    [crypto.randomUUID(), id, buyerId, intro]
  );
  await pool.query("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?", [id]);
  await notifyNewMessage(sellerId, id, intro);
  res.status(201).json({ id });
}));

/** Ouvre (ou récupère) la conversation « contact boutique » pour un client. */
app.post("/api/conversations/open-with-admin", authMiddleware, asyncHandler(async (req, res) => {
  const buyerId = req.user.userId;
  const [roleRows] = await pool.query("SELECT role FROM users WHERE id = ?", [buyerId]);
  if (roleRows[0]?.role === "admin") {
    return res.status(400).json({ error: "Les administrateurs répondent depuis la liste des clients." });
  }
  let listingId;
  try {
    listingId = await ensureContactHubListingId();
  } catch (e) {
    console.error(e);
    return res.status(503).json({ error: "Messagerie indisponible (migration base à jour ?)." });
  }
  if (!listingId) {
    return res.status(503).json({ error: "Aucun compte administrateur." });
  }

  const [L] = await pool.query(
    "SELECT user_id, title, COALESCE(is_contact_hub, 0) AS is_contact_hub FROM listings WHERE id = ?",
    [listingId]
  );
  if (!L.length) return res.status(404).json({ error: "Contact introuvable" });
  const sellerId = L[0].user_id;
  const listingTitle = L[0].title;
  const isContactHub = L[0].is_contact_hub === 1 || L[0].is_contact_hub === true;
  if (buyerId === sellerId) {
    return res.status(400).json({ error: "Vous ne pouvez pas vous contacter vous-même" });
  }

  const [existing] = await pool.query(
    "SELECT id FROM conversations WHERE listing_id = ? AND buyer_id = ?",
    [listingId, buyerId]
  );
  if (existing.length) {
    return res.json({ id: existing[0].id });
  }

  const id = crypto.randomUUID();
  await pool.query(
    "INSERT INTO conversations (id, listing_id, buyer_id, seller_id) VALUES (?, ?, ?, ?)",
    [id, listingId, buyerId, sellerId]
  );
  const intro = isContactHub
    ? "Bonjour, je souhaite contacter la boutique."
    : `Demande concernant : ${String(listingTitle).slice(0, 500)}`;
  await pool.query(
    "INSERT INTO messages (id, conversation_id, sender_id, content) VALUES (?, ?, ?, ?)",
    [crypto.randomUUID(), id, buyerId, intro]
  );
  await pool.query("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?", [id]);
  await notifyNewMessage(sellerId, id, intro);
  res.status(201).json({ id });
}));

app.get("/api/conversations/:conversationId/messages", authMiddleware, asyncHandler(async (req, res) => {
  const cid = req.params.conversationId;
  const uid = req.user.userId;
  const [c] = await pool.query(
    "SELECT id FROM conversations WHERE id = ? AND (buyer_id = ? OR seller_id = ?)",
    [cid, uid, uid]
  );
  if (!c.length) return res.status(404).json({ error: "Conversation introuvable" });

  const [rows] = await pool.query(
    `SELECT m.* FROM messages m WHERE m.conversation_id = ? ORDER BY m.created_at ASC`,
    [cid]
  );
  try {
    await pool.query(
      `UPDATE conversations SET
        buyer_last_read_at = IF(buyer_id = ?, CURRENT_TIMESTAMP(3), buyer_last_read_at),
        seller_last_read_at = IF(seller_id = ?, CURRENT_TIMESTAMP(3), seller_last_read_at)
      WHERE id = ?`,
      [uid, uid, cid]
    );
  } catch (e) {
    if (e.code !== "ER_BAD_FIELD_ERROR") throw e;
  }
  res.json(rows);
}));

app.post("/api/conversations/:conversationId/messages", authMiddleware, asyncHandler(async (req, res) => {
  const cid = req.params.conversationId;
  const uid = req.user.userId;
  const { content } = req.body || {};
  const text = content != null ? String(content).trim() : "";
  if (!text) {
    return res.status(400).json({ error: "Message vide" });
  }
  if (text.length > 5000) {
    return res.status(400).json({ error: "Message trop long (5000 caractères max)" });
  }

  const [c] = await pool.query(
    "SELECT buyer_id, seller_id FROM conversations WHERE id = ? AND (buyer_id = ? OR seller_id = ?)",
    [cid, uid, uid]
  );
  if (!c.length) return res.status(404).json({ error: "Conversation introuvable" });

  const recipientId = c[0].buyer_id === uid ? c[0].seller_id : c[0].buyer_id;

  const id = crypto.randomUUID();
  await pool.query(
    "INSERT INTO messages (id, conversation_id, sender_id, content) VALUES (?, ?, ?, ?)",
    [id, cid, uid, text]
  );
  await pool.query("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?", [cid]);

  await notifyNewMessage(recipientId, cid, text);

  const [rows] = await pool.query("SELECT * FROM messages WHERE id = ?", [id]);
  res.status(201).json(rows[0]);
}));

// --- Notifications & préférences ---
app.get("/api/notifications", authMiddleware, asyncHandler(async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 25));
    const [rows] = await pool.query(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
      [req.user.userId, limit]
    );
    res.json(rows.map(mapNotification));
  } catch (e) {
    if (e.code === "ER_NO_SUCH_TABLE") return res.json([]);
    throw e;
  }
}));

app.get("/api/notifications/unread-count", authMiddleware, asyncHandler(async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read_at IS NULL`,
      [req.user.userId]
    );
    res.json({ count: Number(rows[0]?.c ?? 0) });
  } catch (e) {
    if (e.code === "ER_NO_SUCH_TABLE") return res.json({ count: 0 });
    throw e;
  }
}));

app.patch("/api/notifications/:id/read", authMiddleware, asyncHandler(async (req, res) => {
  const [r] = await pool.query(
    `UPDATE notifications SET read_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND user_id = ?`,
    [req.params.id, req.user.userId]
  );
  if (!r.affectedRows) {
    return res.status(404).json({ error: "Introuvable" });
  }
  res.json({ ok: true });
}));

app.post("/api/notifications/read-all", authMiddleware, asyncHandler(async (req, res) => {
  await pool.query(
    `UPDATE notifications SET read_at = CURRENT_TIMESTAMP(3) WHERE user_id = ? AND read_at IS NULL`,
    [req.user.userId]
  );
  res.json({ ok: true });
}));

app.get("/api/me/preferences", authMiddleware, asyncHandler(async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT notify_messages FROM user_preferences WHERE user_id = ?", [
      req.user.userId,
    ]);
    if (!rows.length) {
      return res.json({ notify_messages: true });
    }
    res.json({ notify_messages: rows[0].notify_messages === 1 });
  } catch (e) {
    if (e.code === "ER_NO_SUCH_TABLE") return res.json({ notify_messages: true });
    throw e;
  }
}));

app.patch("/api/me/preferences", authMiddleware, asyncHandler(async (req, res) => {
  const { notify_messages } = req.body || {};
  if (notify_messages === undefined) {
    return res.status(400).json({ error: "notify_messages requis (booléen)" });
  }
  const v = notify_messages ? 1 : 0;
  const uid = req.user.userId;
  try {
    const [ex] = await pool.query("SELECT user_id FROM user_preferences WHERE user_id = ?", [uid]);
    if (!ex.length) {
      await pool.query("INSERT INTO user_preferences (user_id, notify_messages) VALUES (?, ?)", [uid, v]);
    } else {
      await pool.query("UPDATE user_preferences SET notify_messages = ? WHERE user_id = ?", [v, uid]);
    }
    res.json({ notify_messages: v === 1 });
  } catch (e) {
    if (e.code === "ER_NO_SUCH_TABLE") {
      return res.status(503).json({ error: "Migration base de données requise (user_preferences)." });
    }
    throw e;
  }
}));

app.get("/api/health", asyncHandler(async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, db: true, env: config.NODE_ENV });
  } catch (e) {
    res.status(503).json({ ok: false, db: false });
  }
}));

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  let status = 500;
  if (err.code === "ER_ACCESS_DENIED_ERROR" || err.code === "ECONNREFUSED" || err.code === "PROTOCOL_CONNECTION_LOST") {
    status = 503;
  }
  const publicMessage =
    status === 503
      ? "Service temporairement indisponible (base de données)."
      : config.isProd
        ? "Erreur serveur"
        : err.message || "Erreur serveur";
  res.status(status).json({ error: publicMessage });
});

app.listen(PORT, () => {
  console.log(`API TrocSpot http://localhost:${PORT} (${config.NODE_ENV})`);
});
