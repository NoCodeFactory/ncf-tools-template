# NCF Tool Template — Instructions pour Claude

Ce repo est un template pour créer des **outils interactifs** Nocode Factory.
Chaque outil est une page HTML statique déployée sur Cloudflare Pages.

Types d'outils supportés : Checklist, Calculateur, Quiz, Guide, Audit.
La structure HTML (nav, aside, footer, SEO) est identique pour tous les types.
Seule la zone outil et les scripts diffèrent selon le type choisi.

---

## Fichiers à ne JAMAIS modifier

```
ncf-design.css
ncf-components.js
checklist-engine.js
favicon.svg
logo.svg
logo-blanc.svg
type.png
```

---

## Créer un outil

### 1. Nommer le fichier

Créer `{slug}.html` en kebab-case depuis `tool.html`.
Exemples : `checklist-audit-automatisation.html`, `calculateur-roi-nocode.html`

### 2. Remplir le `<head>`

- `<title>` : `[Type] [Sujet] : [Accroche] | Nocode Factory` (60-70 car.)
- `<meta name="description">` : 150-160 caractères avec mot-clé principal
- `<meta property="og:title">` et `<og:description>`
- `<base href>` : conserver `https://crm-migration-checklist.pages.dev/` (mis à jour au déploiement)

### 3. Mettre à jour l'aside

- `<ncf-breadcrumb label="Titre Court de l'Outil">`
- `<span class="tool-badge">` : adapter avec `Checklist` / `Calculateur` / `Quiz` / `Guide` / `Audit`
- `<h1 class="tool-title">Titre Complet H1</h1>`

### 4. Écrire les 2 sections SEO (toujours 2, avant la zone outil)

Chacune doit :
- Avoir un `<h2>` avec un mot-clé long-tail différent du `<title>`
- Contenir 2-3 paragraphes de texte de qualité, naturel, non générique
- Inclure 2-4 liens internes vers nocodefactory.fr

Pages NCF confirmées :
```
/agence-nocode
/ia-automatisation
/nos-realisations
/agence-webflow
/agence-xano
/agence-weweb
/agence-make
/a-propos
/outils-nocode/hubspot
/outils-nocode/attio
/outils-nocode/notion
/outils-nocode/folk
/outils-nocode/n8n
/outils-nocode/make
/outils-nocode/zapier
```

### 5. Implémenter la zone outil

Voir les recettes ci-dessous selon le type d'outil.

### 6. Vérifications avant livraison

- [ ] Les fichiers partagés n'ont pas été modifiés
- [ ] Le fichier est nommé en kebab-case avec extension `.html`
- [ ] Les liens SEO pointent vers des pages NCF vérifiées
- [ ] `ncf-components.js` est inclus dans les scripts

---

## Recette : Checklist interactive

La zone outil contient une barre de progression et un `<main>` géré automatiquement par `checklist-engine.js`.

### Zone outil (remplace `<!-- ZONE OUTIL -->`)

```html
<div class="progress-wrapper">
  <div class="g-progress"
       role="progressbar"
       aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"
       aria-label="Progression globale">
    <div class="g-track">
      <div class="g-fill" id="g-bar" style="width:0%"></div>
    </div>
  </div>
  <div class="progress-meta">
    <div class="progress-info">
      <span class="progress-eyebrow">Votre progression</span>
      <p class="progress-label" id="hdr-sub">Chargement…</p>
    </div>
    <span class="g-pct" id="g-pct" aria-live="polite">0%</span>
  </div>
</div>
<main class="main" id="main-content" aria-label="[Description accessible de la checklist]"></main>
```

### Scripts (remplace `<!-- SCRIPTS -->`)

```html
<script>
window.TOOL_CONFIG = {
  webhookUrl:     'https://ncf-tools.prod-ebe.workers.dev', // NE PAS CHANGER
  storageKey:     '{slug}_progress',    // ex: audit_automatisation_progress
  totalItems:     N,                    // nombre EXACT de cases (compter tous les items)
  checklistType:  '{slug}',             // même slug que le fichier sans .html
  checklistTitle: 'Titre affiché dans les emails',
  shareText:      'Partagez cette checklist [sujet] avec vos équipes et recevez votre récapitulatif ainsi que les conseils personnalisés de nos experts no-code.',
  phases: [
    {
      id: 1,
      name: "Nom de la Phase",
      items: [
        { id: '1-1', text: "Action concrète à l'infinitif..." },
        { id: '1-2', text: "Deuxième action..." },
      ]
    }
  ]
};
</script>
<script src="ncf-components.js"></script>
<script src="checklist-engine.js"></script>
```

### Règles phases/items

- 4 à 8 phases, chacune avec 4 à 8 items
- Chaque item = action concrète à l'infinitif (`"Cartographier..."`, `"Valider..."`, `"Tester..."`)
- IDs uniques : `'1-1'`, `'1-2'`, `'2-1'`, `'2-2'`... (format `phase-item`)
- Ordre chronologique ou de complexité croissante
- `totalItems` = somme **exacte** de tous les items (compter avant de renseigner)

### Vérifications supplémentaires (checklist)

- [ ] `totalItems` = nombre réel d'items dans les phases
- [ ] Tous les IDs d'items sont uniques
- [ ] `storageKey` différent de `"crm_migration_progress"`

---

## Recette : Calculateur

La zone outil contient un formulaire d'entrée et une zone de résultat.
Pas de `checklist-engine.js`. La logique est écrite en JS inline ou dans un fichier `{slug}.js`.

### Zone outil (remplace `<!-- ZONE OUTIL -->`)

```html
<div class="calc-form">
  <!-- Champs input avec labels, classes CSS du design system -->
</div>
<div class="calc-result" id="calc-result" aria-live="polite">
  <!-- Résultat calculé, mis à jour dynamiquement -->
</div>
```

### Scripts (remplace `<!-- SCRIPTS -->`)

```html
<script src="ncf-components.js"></script>
<script>
  // Logique du calculateur ici
  // Écouter les inputs, calculer, injecter dans #calc-result
</script>
```

### Règles

- Utiliser les classes CSS existantes du design system (voir `ncf-design.css`)
- Pas de dépendance externe, JS vanilla uniquement
- Le résultat doit être accessible (`aria-live`)
- Pas de `window.TOOL_CONFIG` ni de `checklist-engine.js`
