# Suivi des écarts

Application web (Next.js + Postgres) de suivi des écarts SSE — remplace l'ancienne
application Power Apps du même nom. Couvre le flux principal :
**Dossiers → Écarts → Fiches SSE → Plan d'action**.

Les écrans plus spécifiques de l'application Power Apps d'origine (écart amiante,
arbre des causes, synthèse) n'ont pas encore été portés — voir "Ce qui reste à
faire" plus bas.

## Stack technique

- [Next.js 16](https://nextjs.org) (App Router, Server Actions) + TypeScript
- [Prisma 7](https://www.prisma.io) + PostgreSQL (adapter `@prisma/adapter-pg`)
- [Auth.js / NextAuth v5](https://authjs.dev) (connexion email + mot de passe)
- Tailwind CSS

## Développement local

Prérequis : Node.js 20+, une base PostgreSQL accessible.

```bash
npm install

# Copier .env.example vers .env et renseigner DATABASE_URL + AUTH_SECRET
cp .env.example .env

# Appliquer le schéma et générer le client Prisma
npx prisma migrate dev
npx prisma generate

# Créer l'utilisateur admin (admin@example.com / admin1234) + données de démo
npx prisma db seed

npm run dev
```

L'application est disponible sur http://localhost:3000. Change le mot de passe
de l'utilisateur admin dès que possible (voir "Comptes utilisateurs" plus bas).

## Variables d'environnement

| Variable | Description |
|---|---|
| `DATABASE_URL` | Chaîne de connexion PostgreSQL (`postgresql://user:password@host:port/db?schema=public`) |
| `AUTH_SECRET` | Secret utilisé pour signer les sessions (`npx auth secret` en génère un) |

## Déploiement (Vercel + Postgres managé)

1. **Base de données** : créer une base Postgres managée — [Neon](https://neon.tech)
   ou [Supabase](https://supabase.com) ont toutes les deux un plan gratuit suffisant
   pour démarrer. Récupérer la chaîne de connexion (`DATABASE_URL`).
2. **Déployer sur Vercel** :
   - Importer ce dépôt dans [Vercel](https://vercel.com/new).
   - Renseigner les variables d'environnement `DATABASE_URL` et `AUTH_SECRET`
     (génère `AUTH_SECRET` avec `npx auth secret`, à faire une seule fois).
   - Vercel détecte Next.js automatiquement, aucune configuration de build
     supplémentaire n'est nécessaire.
3. **Appliquer les migrations sur la base de production** avant le premier
   déploiement (depuis ta machine, avec `DATABASE_URL` pointant vers la prod) :
   ```bash
   DATABASE_URL="<url de prod>" npx prisma migrate deploy
   DATABASE_URL="<url de prod>" npx prisma db seed
   ```
4. Une fois déployé, se connecter avec `admin@example.com` / `admin1234` et
   **changer immédiatement ce mot de passe** (voir ci-dessous), ou supprimer cet
   utilisateur et en créer un nouveau directement en base.

## Comptes utilisateurs

Il n'y a pas encore d'écran de gestion des utilisateurs : les comptes se créent
directement en base. Pour créer un utilisateur :

```bash
npx tsx -e "
import bcrypt from 'bcryptjs';
import { prisma } from './src/lib/prisma';
const passwordHash = await bcrypt.hash('un-mot-de-passe-sûr', 10);
await prisma.user.create({ data: { email: 'nom@exemple.com', name: 'Nom Prénom', passwordHash, role: 'UTILISATEUR' } });
"
```

## Ce qui reste à faire

- Écrans "Écart amiante" et "Arbre des causes" (spécifiques à l'app d'origine,
  hors périmètre de cette première version).
- Écran de synthèse / tableau de bord.
- Gestion des utilisateurs depuis l'interface (actuellement en base uniquement).
- Upload de fichiers (photos, preuves) — l'app d'origine avait un flux Power
  Automate pour ça, à remplacer par un stockage (S3, Vercel Blob, etc.).
- Tests automatisés (le flux principal a été vérifié manuellement de bout en
  bout avec Playwright pendant le développement, mais il n'y a pas encore de
  suite de tests dans le dépôt).
