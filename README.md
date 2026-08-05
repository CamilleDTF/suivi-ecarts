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

On se connecte avec son **prénom**, pas avec une adresse e-mail : le terrain n'a
pas toujours d'adresse professionnelle sous la main. L'identifiant est insensible
à la casse et aux espaces autour.

Aucun identifiant n'est en dur dans le dépôt : les scripts lisent leur
paramétrage dans l'environnement et échouent si une variable manque.

```bash
# Premier compte (administrateur)
SEED_ADMIN_IDENTIFIANT="Prénom" \
SEED_ADMIN_NAME="Prénom Nom" \
SEED_ADMIN_PASSWORD="…" \
npm run db:seed

# Comptes suivants, ou réinitialisation d'un mot de passe oublié
UTILISATEUR_IDENTIFIANT="Prénom" \
UTILISATEUR_NOM="Prénom Nom" \
UTILISATEUR_MOT_DE_PASSE="…" \
npm run db:utilisateur
```

Le mot de passe passe par l'environnement et jamais par un argument de ligne de
commande : les arguments sont visibles dans la liste des processus et restent
dans l'historique du shell.

Il n'y a pas encore d'écran de gestion des utilisateurs. Le rôle `ADMIN` existe
en base mais n'ouvre aucun droit supplémentaire pour l'instant.

## Sauvegardes

Tout est dans une seule base PostgreSQL. Neon fait de la restauration à un
instant T, mais sa fenêtre dépend du plan et ne protège pas d'un incident chez
l'hébergeur lui-même : une copie vit donc **ailleurs**.

`.github/workflows/sauvegarde.yml` exporte la base chaque lundi à 03:00 UTC et
dépose le fichier en artefact GitHub, conservé 90 jours. Le workflow se lance
aussi à la demande depuis l'onglet Actions, avant une opération risquée.

90 jours est le plafond configuré sur le dépôt : demander davantage est ramené à
cette valeur avec un avertissement. Pour garder plus longtemps, relever d'abord
Settings -> Actions -> General -> *Artifact and log retention*, puis
`retention-days` dans le workflow. Au-delà, télécharger un artefact de temps en
temps et le ranger ailleurs.

**Prérequis** : le secret `DATABASE_URL` doit exister dans le dépôt GitHub
(Settings → Secrets and variables → Actions), avec l'URL de la base de
production.

```bash
npm run db:sauvegarder      # écrit sauvegardes/sauvegarde-AAAA-MM-JJ.json

# Restauration dans une base vide (nouvel hébergeur, par exemple)
DATABASE_URL="<nouvelle base>" npm run db:migrate
DATABASE_URL="<nouvelle base>" FICHIER=sauvegardes/sauvegarde-2026-08-04.json \
  npm run db:restaurer
```

L'export est un JSON et non un `pg_dump` : `pg_dump` refuse de tourner quand sa
version ne correspond pas à celle du serveur, ce qui casserait la sauvegarde
automatique le jour où Neon met PostgreSQL à jour.

Le JSON embarque les enregistrements joints aux dossiers (photos et PDF) en
base64 : il grossit à mesure qu'on en dépose. Rien d'inquiétant à cette échelle,
mais c'est ce qui pèsera le plus dans le fichier.

Les empreintes de mots de passe sont **exclues** de l'export : une sauvegarde
circule et se stocke ailleurs, elle n'a pas à emporter de quoi tenter des mots de
passe hors ligne. Après une restauration, les comptes reviennent sans mot de
passe utilisable — les réattribuer avec `npm run db:utilisateur`.

`db:restaurer` refuse de tourner sur une base déjà peuplée, sauf `VIDER_AVANT=oui`.

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Applique les migrations puis construit |
| `npm run db:migrate` | Applique les migrations seules |
| `npm run db:seed` | Crée le compte d'administration |
| `npm run db:utilisateur` | Crée un compte ou réinitialise son mot de passe |
| `npm run db:sauvegarder` | Exporte toute la base dans un JSON daté |
| `npm run db:restaurer` | Recharge une sauvegarde dans une base vide |
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
5. Ajouter le secret GitHub `DATABASE_URL` pour que la sauvegarde hebdomadaire
   tourne (voir « Sauvegardes »).

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
