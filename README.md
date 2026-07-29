# Suivi des écarts

Application web (Next.js + Postgres) de suivi des écarts SSE — remplace l'ancienne
application Power Apps du même nom.

Flux principal : **Dossiers → Écarts → Évènements SSE → Plan d'action**, plus deux
entrées autonomes : **Écarts amiante** et **Remontées d'informations**.

## Modules

| Module | Contenu |
|---|---|
| Dossiers | Regroupement d'écarts par chantier, avec compteur d'écarts ouverts. |
| Écarts | Nature, domaine, thème, gravité × fréquence → criticité calculée côté serveur. |
| Évènements SSE | Fiche de déclaration, arbre des causes, validation. |
| Écarts amiante | Analyses, cause, exposition, nouvelle analyse, clôture. Indépendant des dossiers. |
| Remontées d'informations | Saisie interne rapide, transformable en écart. |
| Plan d'action | Actions curatives / correctives / préventives, validation, preuve photo. |
| Synthèse | Tuiles, graphiques, activité récente. |

Chaque fiche — et la synthèse — s'exporte en PDF via l'impression du navigateur,
avec une feuille de styles `@media print` dédiée : il n'y a pas de seconde mise
en page à maintenir en parallèle.

## Stack technique

- [Next.js 16](https://nextjs.org) (App Router, Server Actions) + TypeScript
- [Prisma 7](https://www.prisma.io) + PostgreSQL (adapter `@prisma/adapter-pg`)
- [Auth.js / NextAuth v5](https://authjs.dev) (connexion email + mot de passe)
- Tailwind CSS v4

## Développement local

Prérequis : Node.js 20+, une base PostgreSQL accessible.

```bash
npm install
cp .env.example .env          # renseigner DATABASE_URL et AUTH_SECRET

npx prisma migrate deploy
npx prisma generate

npm run db:seed               # crée le premier compte, voir ci-dessous
npm run dev
```

L'application est disponible sur http://localhost:3000.

## Comptes

Le seed ne contient aucun identifiant en dur : il lit son paramétrage dans
l'environnement et échoue si l'un des trois manque.

```bash
SEED_ADMIN_EMAIL="nom@exemple.com" \
SEED_ADMIN_NAME="Nom Prénom" \
SEED_ADMIN_PASSWORD="…" \
npm run db:seed
```

Il n'y a pas encore d'écran de gestion des utilisateurs : les comptes suivants se
créent en relançant le seed avec d'autres variables, ou directement en base.

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Applique les migrations puis construit |
| `npm run db:migrate` | Applique les migrations seules |
| `npm run db:seed` | Crée le compte d'administration |
| `npm run db:import` | Importe le classeur Excel converti en JSON |
| `npm run db:recheck-statuts` | Recalcule les statuts des évènements SSE |

`build` applique les migrations avant de construire. Ce n'est pas la pratique la
plus propre — un build de prévisualisation mal cloisonné migrerait la mauvaise
base — mais c'est le seul point d'exécution disponible sur ce déploiement. Les
avoir séparés a déjà causé une panne : le build réussissait, l'application
plantait faute de colonnes. Tant qu'il n'y a pas d'étape de déploiement dédiée,
les deux restent ensemble.

## Déploiement (Vercel)

1. Pousser le dépôt sur GitHub, puis importer le projet dans Vercel.
2. Renseigner `DATABASE_URL` et `AUTH_SECRET` (`npx auth secret` une fois).
3. Les migrations s'appliquent automatiquement au build. Pour les passer à la
   main depuis une machine dont `DATABASE_URL` pointe vers la production :
   ```bash
   DATABASE_URL="<url de prod>" npm run db:migrate
   ```
4. Créer le premier compte avec `npm run db:seed` et les variables `SEED_ADMIN_*`.

## Données d'import

`prisma/import-excel.ts` attend un fichier `prisma/import-data/donnees-<mois>.json`
converti depuis le classeur Excel d'origine.

**Ce fichier contient des données réelles** (chantiers, noms de collaborateurs) :
il n'a pas vocation à rester dans le dépôt. Le déposer au moment de l'import, puis
le retirer.

## Conventions

- **Références** (`EC-2026-0001`, `ACT-2026-0042`…) générées dans une transaction
  avec verrou, pour éviter les collisions du `Max(...)+1` de l'application d'origine.
- **Statuts calculés** : celui d'un écart, d'un évènement ou d'un écart amiante suit
  ses actions. La criticité d'un écart est recalculée côté serveur, jamais reprise
  du champ caché du formulaire.
- **Archivage** : chaque fiche peut être archivée plutôt que supprimée. Les listes
  masquent les archives ; un lien « Voir les archives » les affiche.
- **Champs vidés** : un champ effacé est enregistré comme vide (`null`) et non
  ignoré — voir `src/lib/formulaire.ts`.
- **Transformation d'une remontée** : création de l'écart et bascule de la remontée
  dans une seule transaction, et une remontée déjà transformée ne peut plus l'être
  une seconde fois.

## Points ouverts

- Les rôles `ADMIN` / `UTILISATEUR` existent en base mais ne restreignent encore
  aucune action côté serveur : tout utilisateur connecté peut supprimer et archiver.
- Les preuves photo sont stockées en base sous forme de data URL. Au-delà de
  quelques centaines d'images, un stockage dédié (Vercel Blob, S3) s'impose.
- Les références attribuées à l'import ne correspondent pas à la numérotation du
  classeur Excel d'origine — `npm run db:realigner-references` les réaligne.
- Pas de suite de tests automatisés : le flux est vérifié avec Playwright pendant
  le développement, mais rien n'est versionné.
