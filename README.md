# PitLog 🏍️

Carnet numérique du pilote motocross, **pensé pour le téléphone** (paddock, bord de piste) :

- **Garage virtuel** — plusieurs motos, ajout par listes déroulantes dépendantes (année → marque → cylindrée → modèle → version), photo, statut.
- **Compteur d'heures** — sessions de roulage, le compteur de la moto est mis à jour automatiquement (trigger SQL).
- **Carnet d'entretien** — 36 opérations prédéfinies (moteur / partie-cycle / suspensions), échéances en heures et/ou en mois, statuts vert / orange / rouge, écran récapitulatif des urgences.
- **Réglages de suspensions** — configurations par moto et par terrain, duplication, comparaison côte à côte, favoris, historique des versions avec restauration.
- **Ressenti pilote** — symptômes prédéfinis (talonne, guidonne, rebondit…), curseurs confort/confiance, **conseils de réglage** administrables (toujours accompagnés d'un avertissement, jamais présentés comme une garantie).
- **Statistiques** — heures/mois, heures/terrain, coûts, coût/heure, durée de vie moyenne du piston et des pneus.
- **Divers** — PWA installable, mode sombre + thème clair fort contraste, export CSV par moto, sauvegarde/restauration JSON, interface admin, RLS Supabase (chaque utilisateur ne voit que ses données).

## Pile technique

- [Next.js 15](https://nextjs.org) (App Router) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com)
- [Supabase](https://supabase.com) : auth, PostgreSQL (avec RLS), stockage des photos
- [Vitest](https://vitest.dev) pour les tests unitaires

## Installation

### 1. Dépendances

```bash
npm install
```

### 2. Projet Supabase

1. Créez un projet sur [supabase.com](https://supabase.com) (gratuit).
2. Dans **SQL Editor**, exécutez dans l'ordre :
   - `supabase/migrations/0001_schema.sql` (tables, contraintes, triggers)
   - `supabase/migrations/0002_rls.sql` (sécurité RLS + bucket photos)
   - `supabase/migrations/0003_alertes.sql` (alertes personnalisables + rappels libres)
   - `supabase/migrations/0004_finances.sql` (catégories de dépenses de la section Finances)
   - `supabase/migrations/0005_fiches_techniques.sql` (fiches techniques par modèle)
   - `supabase/migrations/0006_terrains.sql` (terrains suivis + statut ouvert/fermé automatique)
   - `supabase/migrations/0007_apify.sql` (récupération des annonces Facebook via Apify)
   - `supabase/migrations/0008_post_image.sql` (image des annonces)
   - `supabase/migrations/0009_catalogue_terrains.sql` (catalogue de terrains par région)
   - `supabase/seed.sql` (marques, modèles, types d'entretien, terrains, recommandations)
   - `supabase/seed-specs.sql` (fiches techniques indicatives des modèles populaires)
3. Dans **Authentication → URL Configuration**, ajoutez `http://localhost:3000/auth/callback` aux Redirect URLs.

### 3. Variables d'environnement

```bash
cp .env.example .env.local
```

Renseignez `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Settings → API du projet Supabase).

### 4. Données de démonstration (facultatif)

Ajoutez `SUPABASE_SERVICE_ROLE_KEY` dans `.env.local`, puis :

```bash
npm run seed:demo
```

Compte créé : **demo@motocarnet.fr / demo1234** — une KTM 250 SX-F 2024 avec sessions, entretiens, échéances, deux réglages de suspensions et un ressenti.

### 5. Lancement

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) — idéalement en mode mobile des DevTools, ou depuis votre téléphone sur le réseau local.

## Tests

```bash
npm test
```

Les tests couvrent la logique métier : calcul des échéances (heures / mois / première atteinte), moteur de recommandations, statistiques et formatage.

## Administration

Pour donner les droits admin à un compte (gestion des marques, modèles, types d'entretien, terrains et recommandations) :

```sql
update public.profiles set is_admin = true where id = 'UUID-DU-COMPTE';
```

L'entrée **Administration** apparaît alors dans l'onglet Profil.

## Structure du projet

```
supabase/
  migrations/          Schéma SQL + RLS
  seed.sql             Données de référence communes
scripts/seed-demo.mjs  Compte + données de démonstration
src/
  middleware.ts        Garde d'authentification (redirection /connexion)
  lib/                 Types, logique métier pure (testée), clients Supabase
  components/          Design system tactile (ui.tsx), navigation, formulaires partagés
  app/
    (auth)/            connexion, inscription, mot de passe oublié, réinitialisation
    (app)/             écrans applicatifs avec navigation inférieure :
      page.tsx           Accueil (tableau de bord)
      garage/            liste, ajout (listes dépendantes), fiche, échéances, historique
      sessions/          nouvelle session
      entretiens/        urgences toutes motos, nouvel entretien
      suspensions/       liste, fiche, modifier, dupliquer, comparer, ressenti + conseils
      stats/             statistiques
      profil/            profil, thème, sauvegarde/restauration
      admin/             référentiels (admins uniquement)
```

## Déploiement (Netlify, gratuit)

1. Poussez le dépôt sur GitHub.
2. Sur [netlify.com](https://netlify.com) : **Add new site → Import an existing project** → choisissez le dépôt (Next.js est détecté automatiquement, `netlify.toml` fixe la version de Node).
3. Ajoutez les variables d'environnement `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` (jamais la clé service role).
4. Dans Supabase (**Authentication → URL Configuration**) : Site URL = `https://votre-site.netlify.app` et ajoutez `https://votre-site.netlify.app/auth/callback` aux Redirect URLs.
5. Sur téléphone : ouvrez le site → « Ajouter à l'écran d'accueil » pour installer la PWA.

## Page Terrains — annuaire par région

La page **Terrains** propose un **catalogue de terrains organisé par région**.
L'utilisateur choisit sa région (ex : Hauts-de-France) et voit tous ses terrains
avec un statut **OUVERT / FERMÉ** pour le week-end à venir, déduit automatiquement
de leurs posts Facebook. Aucune configuration côté utilisateur.

Fonctionnement :

1. **L'administrateur** ajoute les terrains (région, nom, URL de la page Facebook)
   dans **Administration → Terrains**.
2. Le serveur récupère les annonces via [Apify](https://apify.com) (acteur
   *Facebook Posts Scraper*) et les partage entre tous les utilisateurs. Le
   scraping est mutualisé (une récupération toutes les 2 h par terrain).
3. Les statuts sont classés par analyse de mots-clés français (`src/lib/terrains.ts`).

**Configuration requise (une seule fois)** : définir la variable d'environnement
serveur `APIFY_TOKEN` (jeton *Personal API token* d'un compte Apify gratuit) —
en local dans `.env.local`, et dans les variables d'environnement Netlify.
Cette clé n'est jamais exposée au navigateur ni incluse dans le dépôt.

## Internationalisation

L'application est en français. Les libellés métier sont centralisés dans `src/lib/domain.ts` ; pour une version anglaise, dupliquez ce fichier par locale et servez-le selon la langue (ou branchez `next-intl`), les écrans consommant déjà ces constantes.
