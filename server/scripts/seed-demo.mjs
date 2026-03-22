/**
 * Insère des annonces d'exemple avec images (fichiers dans /public/sample-listings/).
 * Usage :
 *   npm run seed          → crée les annonces si aucune [Démo] n’existe encore
 *   npm run seed:force    → supprime les [Démo] existantes puis les recrée
 * Compte démo : demo@trocspot.local / demo12345
 */
import "../src/config.js";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { pool } from "../src/db.js";

const DEMO_EMAIL = "demo@trocspot.local";
const DEMO_PASSWORD = "demo12345";

const SAMPLES = [
  {
    title: "[Démo] Pull en laine — taille M",
    description:
      "Exemple d’annonce : pull doux, peu porté. Idéal pour l’hiver. Cette fiche sert à illustrer le rendu des photos sur TrocSpot.",
    category: "vetements",
    listing_type: "vente",
    price: 24.99,
    price_period: null,
    condition: "bon",
    location: "Lyon",
    images: ["/sample-listings/vetements.svg", "/sample-listings/chaussures.svg"],
  },
  {
    title: "[Démo] Roman — polar français",
    description:
      "Exemple livre : broché, bon état. Parfait pour un week-end lecture.",
    category: "livres",
    listing_type: "vente",
    price: 6.5,
    price_period: null,
    condition: "comme_neuf",
    location: "Paris",
    images: ["/sample-listings/livres.svg"],
  },
  {
    title: "[Démo] Casque audio sans fil",
    description:
      "Exemple matériel : autonomie d’environ 20 h, boîte incluse (démo visuelle uniquement).",
    category: "materiel",
    listing_type: "vente",
    price: 59.0,
    price_period: null,
    condition: "neuf",
    location: "Marseille",
    images: ["/sample-listings/materiel.svg"],
  },
  {
    title: "[Démo] Appareil photo — location week-end",
    description:
      "Exemple de location : tarif indicatif pour un week-end. Matériel illustratif.",
    category: "materiel",
    listing_type: "location",
    price: 35.0,
    price_period: "semaine",
    condition: "comme_neuf",
    location: "Toulouse",
    images: ["/sample-listings/materiel.svg"],
  },
];

async function ensureDemoUser() {
  const [rows] = await pool.query("SELECT id FROM users WHERE email = ?", [DEMO_EMAIL]);
  if (rows.length) {
    await pool.query("UPDATE users SET role = 'admin' WHERE email = ?", [DEMO_EMAIL]);
    return rows[0].id;
  }

  const userId = crypto.randomUUID();
  const profileId = crypto.randomUUID();
  const hash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      "INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, 'admin')",
      [userId, DEMO_EMAIL, hash]
    );
    await conn.query(
      "INSERT INTO profiles (id, user_id, display_name) VALUES (?, ?, ?)",
      [profileId, userId, "Compte démo"]
    );
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  return userId;
}

async function main() {
  const force = process.argv.includes("--force") || process.argv.includes("-f");
  const userId = await ensureDemoUser();

  const [existing] = await pool.query(
    "SELECT COUNT(*) AS c FROM listings WHERE user_id = ? AND title LIKE '[Démo]%'",
    [userId]
  );
  const count = existing[0]?.c ?? 0;

  if (count > 0) {
    if (force) {
      const [del] = await pool.query(
        "DELETE FROM listings WHERE user_id = ? AND title LIKE '[Démo]%'",
        [userId]
      );
      console.log(`Anciennes annonces [Démo] supprimées (${del.affectedRows ?? 0}).`);
    } else {
      console.log("Des annonces [Démo] existent déjà pour ce compte.");
      console.log("Pour les supprimer et tout recréer : npm run seed:force");
      console.log(`Connexion démo : ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
      await pool.end();
      return;
    }
  }

  for (const s of SAMPLES) {
    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO listings (id, user_id, title, description, category, listing_type, price, price_period, \`condition\`, location, images, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        id,
        userId,
        s.title,
        s.description,
        s.category,
        s.listing_type,
        s.price,
        s.price_period,
        s.condition,
        s.location,
        JSON.stringify(s.images),
      ]
    );
  }

  console.log(`✓ ${SAMPLES.length} annonces d’exemple créées.`);
  console.log(`  Compte démo : ${DEMO_EMAIL}`);
  console.log(`  Mot de passe  : ${DEMO_PASSWORD}`);
  console.log("  Visuels : fichiers SVG dans public/sample-listings/");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
