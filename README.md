# Alice Gillig SGDF — Application de gestion du matériel

Application web progressive (PWA) pour la gestion du matériel de camp du groupe scout Alice Gillig (SGDF).

## Fonctionnalités

- Inventaire du matériel avec suivi de l'état de chaque composant
- Réservation du matériel pour les sorties et camps
- Upload de photos pour signaler les problèmes
- Dashboard adapté selon le rôle (admin, équipier, chef)
- Réinitialisation de mot de passe par email
- Installable sur mobile (PWA)

## Rôles

| Rôle | Accès |
|---|---|
| Admin | Tout, y compris la gestion des comptes |
| Équipier | Gestion du matériel + réservations |
| Chef | Réservations + signalement de problèmes |

## Stack technique

- **Framework** : Next.js 14 (App Router)
- **Base de données** : MongoDB Atlas
- **Auth** : NextAuth.js
- **Emails** : Resend
- **Photos** : Cloudinary
- **Style** : Tailwind CSS
- **PWA** : next-pwa

## Installation

```bash
npm install
```

Copie `.env.local.example` en `.env.local` et remplis les variables :

```bash
cp .env.local.example .env.local
```

Variables requises :

```
MONGODB_URI=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
RESEND_API_KEY=
```

## Initialisation

Crée le compte admin et les catégories par défaut :

```bash
node scripts/create-admin.mjs
```

## Développement

```bash
npm run dev
```

## Déploiement

L'application est déployée sur [Vercel](https://vercel.com). Connecte le repo GitHub à Vercel et configure les variables d'environnement dans les settings du projet.
