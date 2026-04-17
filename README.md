# NCF Tool Template

Template pour créer des outils interactifs Nocode Factory — checklists, calculateurs, quiz, guides, audits.

## Créer un outil avec Claude (recommandé)

1. **"Use this template"** sur GitHub → créer ton repo
2. Cloner en local, ouvrir avec Claude Code
3. Dire : `"Crée un [type] sur [sujet]"`
   - Ex : `"Crée une checklist d'audit automatisation no-code"`
   - Ex : `"Crée un calculateur de ROI no-code"`
4. Claude crée le fichier HTML complet en suivant les instructions de `CLAUDE.md`

## Déploiement Cloudflare Pages

1. **Cloudflare Dashboard** → Workers & Pages → Create → Pages → Connect to Git
2. Sélectionner ton repo
3. Build settings : Framework preset = **None**, pas de build command
4. Déployer → noter l'URL (ex: `mon-outil.pages.dev`)
5. Mettre à jour `<base href>` dans ton fichier HTML avec cette URL
6. Push → Cloudflare redéploie automatiquement

## Structure du repo

```
├── CLAUDE.md             ← Instructions pour Claude (recettes par type d'outil)
├── README.md             ← Ce fichier
├── index.html             ← Template HTML vierge à dupliquer
│
├── ncf-design.css        ← Design system NCF (ne pas modifier)
├── ncf-components.js     ← Web components nav/footer (ne pas modifier)
├── checklist-engine.js   ← Moteur checklist optionnel (ne pas modifier)
│
├── favicon.svg
├── logo.svg
├── logo-blanc.svg
└── type.png
```
