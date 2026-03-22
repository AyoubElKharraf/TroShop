# E-Commerce Shop

[![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?logo=github)](https://github.com/AyoubElKharraf/E-Commerce-Shop)

Application e-commerce full stack : **catalogue géré par un administrateur**, **clients** qui parcourent les annonces, passent par la **messagerie** pour demander un produit, et reçoivent des **notifications** dans l’app.  
Nom du produit dans l’interface : **TrocSpot**. Langues : **français** / **anglais**.

**Dépôt :** [github.com/AyoubElKharraf/E-Commerce-Shop](https://github.com/AyoubElKharraf/E-Commerce-Shop)

---

## Fonctionnalités

- Authentification (JWT), inscription, réinitialisation du mot de passe (avec SMTP optionnel)
- Rôle **admin** : publication / édition / suppression des annonces ; rôle **user** pour les clients
- Catalogue : recherche, filtres, pagination
- Messagerie (annonces + contact boutique)
- Notifications in-app, préférences utilisateur
- Thème clair / sombre / système, PWA légère (`manifest`)

---

## Stack

| Partie | Tech |
|--------|------|
| Front | React 18, TypeScript, Vite, Tailwind, shadcn/ui, TanStack Query, React Router, i18next, Framer Motion |
| Back | Node.js, Express, MySQL (mysql2), JWT, bcrypt, Multer, Helmet, rate-limit |
| DB | MySQL 8 (utf8mb4) |

---

## Prérequis

- Node.js **LTS** (18+)
- **MySQL** 8

---

## Installation & lancement (local)

```bash
git clone https://github.com/AyoubElKharraf/E-Commerce-Shop.git
cd E-Commerce-Shop

npm install
cd server && npm install && cd ..
```

**Base de données**

```sql
CREATE DATABASE trocspot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

```bash
mysql -u root -p trocspot < server/schema.sql
```

*(Si la base existait déjà : appliquer les fichiers dans `server/migrations/` dans l’ordre, uniquement ce qui manque.)*

**Configuration API**

```bash
cd server
cp .env.example .env   # Windows : copy .env.example .env
```

Renseigner `MYSQL_*`, `JWT_SECRET`, `CLIENT_ORIGIN` (ex. `http://localhost:8080`). Voir `server/.env.example` pour le détail.

**Lancer**

À la racine du projet :

```bash
npm run dev:all
```

- Front : **http://localhost:8080**
- API : **http://localhost:3001** — santé : `/api/health`

**Données de démo (optionnel)**

```bash
cd server && npm run seed
```

Compte démo : `demo@trocspot.local` / `demo12345` (admin).

---

## Scripts utiles

| Commande | Rôle |
|----------|------|
| `npm run dev` | Vite seul (port 8080) |
| `npm run dev:all` | API + Vite |
| `npm run build` | Build production (`dist/`) |
| `npm run lint` | ESLint |

---

## Déploiement (résumé)

- Production : `NODE_ENV=production`, `JWT_SECRET` fort (≥ 32 caractères), HTTPS, `CLIENT_ORIGIN` = URL du site.
- Build front avec `VITE_API_URL` si l’API est sur un autre domaine.
- Persister `server/uploads/` sur le serveur.

---

## Structure

```
├── server/          # API Express (schema.sql, migrations/, scripts/)
├── src/             # React (pages, composants, locales/)
├── public/
└── package.json
```

---

## Licence

Projet personnel / démo — adapter les mentions légales avant une mise en ligne publique.
