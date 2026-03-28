# TrocSpot (E-Commerce Shop)

[![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?logo=github)](https://github.com/AyoubElKharraf/TroShop)

**TrocSpot** est une application web **full stack** : un **catalogue d’annonces** publié par une **boutique (admin)**, des **visiteurs** qui parcourent, **mettent en favori**, **contactent la boutique** via la **messagerie**, et reçoivent des **notifications** dans l’application.  
Interface en **français** et **anglais**, thème **clair / sombre / système**, PWA légère (`manifest`).

**Dépôt :** [github.com/AyoubElKharraf/TroShop](https://github.com/AyoubElKharraf/TroShop)

---

## Table des matières

1. [Vue d’ensemble](#vue-densemble)
2. [Aspects de l’application](#aspects-de-lapplication)
3. [Stack technique](#stack-technique)
4. [Architecture](#architecture)
5. [Prérequis](#prérequis)
6. [Installation (étapes détaillées)](#installation-étapes-détaillées)
7. [Base de données](#base-de-données)
8. [Variables d’environnement](#variables-denvironnement)
9. [Lancement et vérification](#lancement-et-vérification)
10. [Données de démonstration](#données-de-démonstration)
11. [Routes principales (front)](#routes-principales-front)
12. [Scripts npm](#scripts-npm)
13. [Qualité du code](#qualité-du-code)
14. [Déploiement](#déploiement)
15. [Structure du dépôt](#structure-du-dépôt)
16. [Roadmap (sprints)](#roadmap-sprints)
17. [Licence](#licence)

---

## Vue d’ensemble

| Élément | Description |
|--------|-------------|
| **Front** | SPA React (Vite), consomme l’API en JSON ; en local, **proxy Vite** vers `/api` et `/uploads` (port 3001). |
| **API** | Express (Node.js), JWT, MySQL, fichiers uploadés servis sous `/uploads`. |
| **Données** | MySQL 8, schéma dans `server/schema.sql` ; évolutions incrémentales dans `server/migrations/`. |

En production, le front buildé peut pointer vers une API distante via **`VITE_API_URL`** si le domaine ou le chemin diffère.

---

## Aspects de l’application

### Rôles

- **Administrateur (`admin`)** : seul rôle autorisé à **créer / modifier / supprimer** des annonces catalogue. Peut aussi gérer les **conversations clients** (messagerie « boutique »).
- **Utilisateur (`user`)** : parcourt le catalogue, **favoris**, **messages**, **notifications**, **profil** ; peut **demander un article** ou **contacter la boutique** (fiche « contact » / annonces).

### Parcours principaux

1. **Découverte** — Accueil (`/`) avec annonces récentes ; catalogue (`/annonces`) avec recherche, filtres (catégorie, type vente/location, tri), pagination, option **« Disponibles uniquement »** (exclut notamment les annonces **vendues** du filtre par défaut).
2. **Fiche annonce** (`/annonces/:id`) — Détail, photos, statut (**disponible / réservé / vendu**), **favori**, **contacter** (ouverture conversation), **signalement** ; lien vers la **page vendeur** (`/vendeur/:userId`).
3. **Favoris** — Cœur sur les cartes et la fiche ; page dédiée **`/favoris`** (liste des annonces sauvegardées).
4. **Messagerie** (`/messages`, `/messages/:id`) — Conversations liées à une annonce ou au **contact boutique** ; liste avec **badges** (non lu, à répondre, en attente) et **aperçu du dernier message** (nécessite la migration **007** pour le suivi de lecture précis).
5. **Notifications** — Cloche dans la barre : liste, type, **marquer comme lu** ; bannière courte (Sonner) sur nouveaux non lus ; préférences dans **Mon compte**.
6. **Compte** — **`/mon-compte`** : profil, préférences de notification, **onglet Activité** (aperçu favoris + messages récents), pour l’admin **catalogue** (ses annonces).
7. **Auth** — Connexion / inscription (`/auth`), mot de passe oublié / réinitialisation (SMTP optionnel côté serveur).
8. **Légal** — Mentions légales, confidentialité.

### Points transverses

- **Confiance** : bandeau « confiance », pied de page, états vides illustrés, skeletons de chargement.
- **Performance** : **code splitting** par route (`React.lazy` + `Suspense` + `PageLoader`).
- **Accessibilité** : lien **« Aller au contenu principal »**, zone principale `#main-content`, focus visible sur liens / champs natifs.
- **Erreurs réseau** : panneau d’erreur réutilisable (`ErrorStatePanel`) sur les listes clés (annonces, favoris).

---

## Stack technique

| Couche | Technologies |
|--------|----------------|
| **UI** | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui (Radix), Framer Motion |
| **Données** | TanStack Query, React Router, i18next |
| **API** | Express, mysql2, JWT, bcrypt, Multer (images), Helmet, CORS, rate-limit, compression |
| **Base** | MySQL 8 (utf8mb4) |
| **Tests** | Vitest |

---

## Architecture

```
Navigateur
    │
    ├─► Vite (dev :8080) ──proxy /api, /uploads──► Express API (:3001) ──► MySQL
    │         │                                        │
    │         └─ React SPA (lazy routes)                 └─ Fichiers uploads/
    │
    └─ Build statique (dist/) + VITE_API_URL en prod si API séparée
```

- **Auth** : JWT stocké côté client (`localStorage`), envoyé en `Authorization: Bearer`.
- **Sessions** : le front ne déconnecte sur erreur réseau que si le serveur renvoie **401/403** (session expirée).

---

## Prérequis

- **Node.js** LTS (18+)
- **MySQL** 8

---

## Installation (étapes détaillées)

### 1. Cloner et installer les dépendances

```bash
git clone https://github.com/AyoubElKharraf/TroShop.git
cd TroShop
npm install
cd server && npm install && cd ..
```

### 2. Créer la base MySQL

Créer une base dédiée (encodage UTF-8 complet) :

```sql
CREATE DATABASE trocspot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Charger le schéma (nouvelle base)

```bash
mysql -u root -p trocspot < server/schema.sql
```

*(Sur une base **existante** : appliquer uniquement les fichiers manquants dans `server/migrations/`, **dans l’ordre numérique**.)*

### 4. Configurer l’API

```bash
cd server
cp .env.example .env
```

Sous **Windows** : `copy .env.example .env`

Renseigner au minimum : **`MYSQL_*`**, **`JWT_SECRET`**, **`CLIENT_ORIGIN`** (voir section suivante).

### 5. Lancer l’application en développement

À la **racine** du projet :

```bash
npm run dev:all
```

- Front : **http://localhost:8080**
- API : **http://localhost:3001**
- Santé API : **GET** `http://localhost:3001/api/health`

Le proxy Vite redirige `/api` et `/uploads` vers l’API : **aucun `VITE_API_URL` n’est nécessaire en local** si vous utilisez ce mode.

---

## Base de données

Le fichier **`server/schema.sql`** reflète l’état **complet** attendu pour une installation neuve. Les **migrations** servent à des bases déjà créées avant une évolution.

| Fichier | Rôle |
|---------|------|
| `001_production_extras.sql` | Champs / tables complémentaires prod |
| `002_user_role.sql` | Rôle utilisateur (`user` / `admin`) |
| `003_listing_contact_hub.sql` | Fiche « contact boutique » |
| `004_notifications.sql` | Table notifications |
| `005_listing_status.sql` | Statut d’annonce (`available` / `reserved` / `sold`) |
| `006_favorites.sql` | Table favoris |
| `007_conversation_reads.sql` | Horodatage de lecture par participant (messagerie) |

---

## Variables d’environnement

### Racine du projet (optionnel)

| Variable | Quand l’utiliser |
|----------|-------------------|
| `VITE_API_URL` | Build front servi **sans** proxy vers l’API (ex. API sur un autre sous-domaine). Ex. `https://api.mondomaine.fr`. En local avec `npm run dev:all`, **laisser vide**. |

Voir **`.env.example`** à la racine.

### Serveur (`server/.env`) — **obligatoire**

| Variable | Rôle |
|----------|------|
| `NODE_ENV` | `development` / `production` |
| `PORT` | Port d’écoute (défaut **3001**) |
| `TRUST_PROXY` | `1` derrière reverse proxy (production) |
| `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` | Connexion MySQL |
| `JWT_SECRET` | Clé de signature JWT — en production **≥ 32 caractères**, aléatoire |
| `CLIENT_ORIGIN` | Origine(s) CORS autorisée(s), séparées par des virgules. En local : `http://localhost:8080` |

**Optionnelles** :

| Variable | Rôle |
|----------|------|
| `ADMIN_EMAIL` | Email dont le compte reçoit le rôle **admin** à la connexion |
| `SMTP_*` | Envoi d’emails (mot de passe oublié). Sans SMTP, le lien peut être affiché dans les **logs** serveur en dev |

Voir **`server/.env.example`** pour le détail et les exemples.

---

## Lancement et vérification

1. MySQL démarré, base importée et migrations à jour.
2. `server/.env` correct.
3. `npm run dev:all` à la racine.
4. Ouvrir **http://localhost:8080** et vérifier **GET** `http://localhost:3001/api/health`.

---

## Données de démonstration

```bash
cd server && npm run seed
```

Compte démo (admin) : **`demo@trocspot.local`** / **`demo12345`** (voir sortie du script si besoin).

---

## Routes principales (front)

| Chemin | Description |
|--------|----------------|
| `/` | Accueil |
| `/annonces` | Catalogue (filtres, pagination) |
| `/annonces/:id` | Détail annonce |
| `/annonces/nouvelle` | Nouvelle annonce (**admin**) |
| `/annonces/:id/modifier` | Édition (**admin**) |
| `/vendeur/:userId` | Profil vendeur public + annonces actives |
| `/favoris` | Mes favoris (connecté) |
| `/messages` | Messagerie |
| `/messages/:conversationId` | Fil de conversation |
| `/mon-compte` | Profil, préférences, activité, catalogue admin |
| `/auth` | Connexion / inscription |
| `/auth/mot-de-passe-oublie`, `/auth/reinitialiser` | Réinitialisation MDP |
| `/mentions-legales`, `/confidentialite` | Pages légales |

---

## Scripts npm

| Commande | Emplacement | Rôle |
|----------|-------------|------|
| `npm run dev` | racine | Vite seul (port **8080**) |
| `npm run dev:all` | racine | API (**3001**) + Vite (**8080**) en parallèle |
| `npm run build` | racine | Build production → `dist/` |
| `npm run preview` | racine | Prévisualisation du build (proxy identique au dev) |
| `npm run lint` | racine | ESLint |
| `npm run check` | racine | `tsc` + ESLint + build + tests Vitest |
| `npm test` / `npm run test:watch` | racine | Tests |
| `npm run dev` | `server/` | API avec rechargement (`node --watch`) |
| `npm start` | `server/` | API production |
| `npm run seed` | `server/` | Données de démo |

---

## Qualité du code

La commande **`npm run check`** exécute :

1. **TypeScript** (`tsc --noEmit`)
2. **ESLint**
3. **Build Vite**
4. **Vitest**

À lancer avant une PR ou une mise en production.

---

## Déploiement (résumé)

- **`NODE_ENV=production`**, **`JWT_SECRET`** fort et secret, **HTTPS** côté client et idéalement API.
- **`CLIENT_ORIGIN`** = URL exacte du site (ou liste séparée par virgules).
- **`TRUST_PROXY=1`** si l’API est derrière nginx / Cloudflare.
- Build front : définir **`VITE_API_URL`** si le front statique est servi sur un autre domaine que l’API.
- **Persister** le dossier **`server/uploads/`** (images des annonces) sur le serveur ou équivalent stockage objet.
- Ne pas exposer **MySQL** sur Internet ; utiliser un utilisateur dédié avec droits limités à la base.

---

## Structure du dépôt

```
├── server/
│   ├── src/index.js          # API Express
│   ├── schema.sql            # Schéma MySQL complet
│   ├── migrations/           # Migrations incrémentales
│   ├── scripts/              # seed, etc.
│   └── uploads/              # Fichiers uploadés (gitignoré en prod)
├── src/                      # Application React
│   ├── App.tsx               # Routes, lazy loading, providers
│   ├── pages/                # Écrans
│   ├── components/           # UI, layout, erreurs, loader
│   ├── contexts/             # Auth
│   ├── lib/                  # Client API
│   └── locales/              # fr.json, en.json
├── public/
├── vite.config.ts            # Proxy /api → 3001
└── package.json
```

---

## Roadmap (sprints)

Les **sprints 1 à 3** (favoris, statuts, messagerie enrichie, profil vendeur, perf UI, accessibilité) sont **livrés** dans le dépôt actuel.  
Optionnel ensuite : **FAQ** « Comment ça marche ? », **manualChunks** Rollup pour le bundle, extension des panneaux d’erreur partout.

---

## Licence

Projet personnel / démo — adapter les **mentions légales** et la **politique de confidentialité** avant une mise en ligne publique réelle.
