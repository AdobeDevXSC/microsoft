# AGENTS.md

Edge Delivery Services. Read a block first. Omissions are in the repo or known.

## Avoid
- `scripts/aem.js` is vendored. Never edit.
- Markup comes from the backend. `curl localhost:3000/x.plain.html` first.
- `buildAutoBlocks` rewrites content before your block runs.
- Authors omit and add cells. Decorate defensively.
- No build step; devDependencies only.
- Scope CSS to `.blockname`; `-wrapper`/`-container` are section classes.
- `fragment/fragment.js` is the only cross-block import. Otherwise use `/scripts/`.

## Outdated
- `fstab.yaml`, `helix-query.yaml`, `paths.json` are retired. Config lives at tools.aem.live.

## Remember
- `npx -y @adobe/aem-cli up`: local code, previewed content.
- Merging `main` ships code; content publishes separately.
- A PR without a `{branch}--microsoft--AdobeDevXSC.aem.page/{path}` link is rejected.
- All committed files are served. Use `.hlxignore`.
- Skills: `/plugin marketplace add adobe/skills`, then `aem-edge-delivery-services` (24 skills, incl. `docs-search`).

## Commerce (ACO drop-ins, catalog only)
- `scripts/__dropins__/` is copied from `node_modules/@dropins` by `postinstall.js`. Never edit; bump the package and `npm install`.
- Endpoint, headers and catalog view live in `config.json`.
- `scripts/commerce.js` and the drop-ins load only on pages with a block in `COMMERCE_BLOCKS` (`scripts/scripts.js`). Add new commerce blocks there.
- No cart. Buy links out to microsoft.com from the product's `externalIds`.
- PDP SKU order: block `sku` row, `sku` metadata, then `/products/{urlKey}/{sku}`.
- `/products/` → `/products/default` is a folder mapping in the site config, not a page.
- Local draft pages need `head.html` (import map) in `<head>`, or drop-ins never load.
- DA canvas renders `main`; add `?ref={branch}` to test unmerged code.
- `aco/` is a separate Node ingestion project (own `package.json`, `.env` credentials). It's excluded from site lint and `.hlxignore`. Never commit `.env`.
