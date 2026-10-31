# ООО «ВиД» — обновление текстов и портфолио: план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace generic copy and schematic artwork with clear production-first messaging, a chimney-and-ventilation-led service hierarchy, and an honest gallery of replaceable stainless-steel product visualizations.

**Architecture:** Keep the existing React/Vite one-page site and Telegram inquiry flow. Move customer-facing copy and service/gallery data into a small content module, render a separate product gallery from local assets, and tune existing CSS for more photographic imagery and responsive layouts.

**Tech Stack:** React 19, Vite 6, CSS, Node.js built-in `node:test`, local WebP image assets.

**Spec:** [2026-10-31-vid-production-first-copy-and-portfolio-design.md](../specs/2026-10-31-vid-production-first-copy-and-portfolio-design.md)

## Global Constraints

- The company is ООО «ВиД», Саратов.
- The main directions are дымоходы и вентиляция; the company manufactures all elements for both.
- Confirmed equipment/processes: лазерный станок, гибочное оборудование, аргоновая сварка, множество вальцовочных станков и другое оборудование.
- Other products include адресные таблички с подсветкой, столы, мебель из нержавеющей стали, and custom metal products.
- The company does not offer installation.
- Do not invent dimensions, specifications, lead times, guarantees, delivery, certificates, or other unsupported claims.
- Do not claim generated imagery shows real company jobs, equipment, or workshop.
- Keep the Telegram confirmation flow unchanged; do not add uploads, a backend, prices, or dependencies.
- Keep generated imagery local, replaceable by real company photos, and usable without a third-party image host.
- If an image-generation capability is unavailable, stop before substituting hand-drawn, remote stock, or misleading imagery and ask the user how to proceed.

## Review Focus

- **Product order:** chimney and ventilation remain the primary directions before furniture and other metalwork. Pin the order in `src/site-content.test.js`.
- **Unsupported company claims:** copy must not imply installation or unconfirmed specifications/services. Pin confirmed process names and lack of installation claims in `src/site-content.test.js`.
- **Generated imagery disclosure:** each conceptual gallery image is labeled as a visualization, not a completed job. Pin gallery captions/alt text in `src/site-content.test.js`.
- **Missing or unexpectedly large assets:** all rendered local asset paths resolve and each image fits the documented per-file size budget. Pin path and size checks in `src/site-assets.test.js`.
- **Small screens and accessibility:** at 320px there is no horizontal overflow; image alternatives, keyboard focus, contrast, and reduced motion remain usable. Verify with a browser smoke check in Task 2.

---

### Task 1: Rewrite Copy and Define the Content Hierarchy

**Files:**
- Create: `src/site-content.js`
- Create: `src/site-content.test.js`
- Modify: `src/App.jsx`
- Modify: `package.json`

**Interfaces:**
- Produces `homepageCopy`, `productionProcesses`, `primaryServices`, and `otherProducts` from `src/site-content.js`.
- `homepageCopy` includes the new Russian hero/section text and a `heroImage` local asset path when Task 2 adds imagery.
- `primaryServices` contains chimney and ventilation categories, in that order; `otherProducts` contains illuminated address plaques, stainless tables/furniture, and custom metal products.
- `App.jsx` consumes these exports for all customer-facing page copy and service cards.

- [ ] **Step 1: Write tests for the copy and category ordering**

Create `src/site-content.test.js` with Node's built-in `node:test`. Add tests asserting that:
  - `primaryServices` contains chimney then ventilation, and `otherProducts` contains the confirmed secondary products.
  - `productionProcesses` names laser cutting, bending, argon welding, and rolling equipment without invented specifications.
  - customer-facing copy does not claim installation or unconfirmed guarantees, deadlines, delivery, or certifications.

- [ ] **Step 2: Run the tests and verify they fail for the missing content module**

Run: `node --test src/site-content.test.js`

Expected: FAIL because `src/site-content.js` has not been created.

- [ ] **Step 3: Implement the content module and connect it to the page**

Write concise, natural Russian copy: state what the company manufactures, describe production processes plainly, and invite the visitor to describe a task. Replace the unsupported promise “Ответим в Telegram” with copy that describes the actual Telegram confirmation flow. Keep the primary chimney/ventilation priority and put other products in their own section.

- [ ] **Step 4: Make the project test command discover all Node tests**

Change the package script to `"test": "node --test"` so both existing Telegram-formatting tests and the new site-content tests run.

- [ ] **Step 5: Run the site-content and existing Telegram tests**

Run: `npm test`

Expected: both test files pass; the existing Telegram-message output remains unchanged.

- [ ] **Step 6: Commit the copy and content hierarchy**

```bash
git add src/site-content.js src/site-content.test.js src/App.jsx package.json
git commit -m "Rewrite ViD website copy around production"
```

### Task 2: Add Replaceable Product Visualizations and a Portfolio Gallery

**Files:**
- Create: `public/images/vid-production-hero.webp`
- Create: `public/images/chimney-components.webp`
- Create: `public/images/ventilation-components.webp`
- Create: `public/images/illuminated-address-plaque.webp`
- Create: `public/images/stainless-work-table.webp`
- Create: `public/images/stainless-furniture.webp`
- Create: `src/site-assets.test.js`
- Modify: `src/site-content.js`
- Modify: `src/App.jsx`
- Modify: `src/index.css`

**Interfaces:**
- `productGallery` in `src/site-content.js` contains each gallery item's title, local `/images/...webp` source, descriptive alt text, and a visible caption identifying it as a visualization.
- Hero artwork uses a locally stored production/product visualization; other product visuals appear in their own gallery section.
- Gallery sources remain plain local asset paths so they can be replaced with actual company photographs without changing the layout.

- [ ] **Step 1: Add failing checks for local gallery assets**

Create `src/site-assets.test.js` using `node:test` and `node:assert/strict`. Define the six expected asset paths from this task and assert that each resolves under `public/`, exists, and is no larger than 500 KB. This first check pins asset presence without depending on gallery data that Task 2 has not added yet.

- [ ] **Step 2: Run the asset tests and verify they fail because the image files are missing**

Run: `node --test src/site-assets.test.js`

Expected: FAIL because the six local image files do not exist yet.

- [ ] **Step 3: Generate and save the six original visualizations locally**

Create natural-looking product visualizations for a metalworking/production backdrop, chimney components, ventilation components, an illuminated address plaque, a stainless work table, and stainless furniture. Use WebP at a suitable size and keep every file under 500 KB. Do not depict a recognizable real company workshop or machine; do not render legible customer/address details into the plaque. If no suitable image-generation capability is available, pause and ask instead of substituting schematic drawings or unlicensed stock images.

- [ ] **Step 4: Add gallery data and truthful captions**

Extend `src/site-assets.test.js` to assert that `homepageCopy.heroImage` and each `productGallery[].src` use the expected local paths. Add the five product entries to `productGallery`, each captioned “Визуализация изделия — не фото готового заказа” (or an equally clear concise wording) and given meaningful Russian alt text. Add the hero asset path to `homepageCopy.heroImage`.

- [ ] **Step 5: Implement the page gallery and photographic styling**

Render the separate “Примеры изделий” gallery after the primary chimney and ventilation sections. Display the visualization disclosure in the gallery, and use the local production image as a restrained hero/background image with an overlay that preserves text contrast. Keep image loading local; do not reference external hosts.

- [ ] **Step 6: Run asset/content tests and build**

Run: `npm test && npm run build`

Expected: all tests pass, Vite production build succeeds, and all referenced gallery assets are copied into `dist`.

- [ ] **Step 7: Verify responsive and accessible behavior in the browser**

At 320px and desktop widths, verify no horizontal overflow, text remains readable over images, gallery images and disclosure are visible, and the navigation/form remain usable by keyboard. Verify `prefers-reduced-motion` continues to disable smooth scrolling and decorative movement.

- [ ] **Step 8: Commit the gallery and imagery**

```bash
git add public/images src/site-content.js src/site-assets.test.js src/App.jsx src/index.css
git commit -m "Add replaceable product visualization gallery"
```

### Task 3: Update Metadata and Verify Security on the Final Site

**Files:**
- Modify: `index.html`
- Modify: `README.md`
- Review: website frontend, Telegram bot, and static gallery assets

**Interfaces:**
- Metadata describes production, chimney/ventilation products, and metal furniture in Saratov without unverified claims.
- README documents that initial portfolio imagery is generated visualization and can be replaced with real work photographs; existing Telegram setup stays accurate.

- [ ] **Step 1: Update title, description, and project documentation**

Update the Russian page title and meta description to match the confirmed manufacturing scope. Document the replaceable visualizations and preserve the existing run, test, build, and Telegram instructions.

- [ ] **Step 2: Run the complete test suite, production build, and whitespace validation**

Run: `npm test && npm run build && git diff --check`

Expected: tests pass, Vite completes, and `git diff --check` reports no whitespace errors.

- [ ] **Step 3: Perform a focused security review of the final frontend and Telegram bot**

Review the changed React markup, content/assets, existing Telegram URL handling, and bot input/secret-handling paths. Report only concrete exploitable vulnerabilities; fix any finding with a regression test before final review. Do not inspect or reveal `.env` secret values.

- [ ] **Step 4: Commit the metadata and documentation**

```bash
git add index.html README.md
git commit -m "Document ViD production gallery"
```
