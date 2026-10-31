# ООО «ВиД» One-Page Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the unrelated design-studio landing page with an industrial one-page website for ООО «ВиД» that turns requests for chimneys, ventilation, and custom metal products into Telegram messages.

**Architecture:** Keep the existing React/Vite application and implement the page in `src/App.jsx` and `src/index.css`. Extract Telegram message formatting into a pure helper with Node's built-in test runner; keep the existing Telegram deep-link flow and no-backend constraint.

**Tech Stack:** React 19, Vite 6, lucide-react, CSS, Node.js built-in `node:test`.

**Spec:** [2026-10-31-vid-metalworking-website-design.md](../specs/2026-10-31-vid-metalworking-website-design.md)

## Global Constraints

- Do not add dependencies or introduce a router.
- Use only company facts confirmed in the spec; do not invent address, phone, warranty, lead time, certifications, or machine specifications.
- Preserve the Telegram handoff: open a prepared message and tell the customer to confirm sending it in Telegram.
- Show a manual Telegram link after valid submission so a blocked popup has a clear recovery path.
- If `VITE_TELEGRAM_BOT_USERNAME` is missing, show an explicit configuration message and do not claim the request was sent.
- Do not add a backend, prices, or file uploads.
- Use the approved dark steel / warm orange visual direction, with clear text labels and visible metal-production imagery.
- Respect responsive layouts, keyboard interaction, focus visibility, semantic form labels, and `prefers-reduced-motion`.

## Review Focus

- **Missing Telegram bot username or blocked popup:** show an explicit configuration error or a manual fallback link; never imply delivery without Telegram confirmation. Pin in Task 1's browser smoke check.
- **Cyrillic and URL-reserved characters in user input:** the Telegram deep link must preserve the complete request text. Pin message formatting in Task 1 with `formats_company_service_and_order_details`; verify URL encoding in Task 1's browser smoke check.
- **Empty required fields:** browser validation prevents submission and Telegram opening. Verify in Task 1's browser smoke check.
- **Narrow/mobile viewport and open menu:** controls stay visible, navigation remains usable, and no horizontal overflow appears. Verify in Task 2's mobile browser check.
- **Keyboard focus and reduced-motion preference:** interactive controls stay discoverable and animations respect the preference. Verify in Task 2's accessibility browser check.

---

### Task 1: Replace Studio Content and Wire the Telegram Request Form

**Files:**
- Create: `src/contact-message.js`
- Create: `src/contact-message.test.js`
- Modify: `package.json`
- Modify: `src/App.jsx`

**Interfaces:**
- Produces: `buildTelegramMessage({ name, contact, service, details }) -> string` in `src/contact-message.js`. App uses this helper to build the prefilled Telegram message.

- [ ] **Step 1: Write the failing message-format test**

Create `src/contact-message.test.js` using `node:test` and `node:assert/strict`.

Test `buildTelegramMessage` with Cyrillic name, contact, service, and description containing `+`, `&`, and `#`; assert the returned text contains the exact company header `Новая заявка с сайта ООО «ВиД»` and preserves all submitted values on the correct labeled lines.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test src/contact-message.test.js`

Expected: FAIL because the helper does not exist yet.

- [ ] **Step 3: Implement the helper and replace the page content**

Implement `buildTelegramMessage({ name, contact, service, details })` as a pure formatter. Add `"test": "node --test src/contact-message.test.js"` to `package.json`.

Replace the studio name, copy, service list, project cards, contact copy, and footer in `src/App.jsx` with ООО «ВиД» content: chimney systems, ventilation, custom stainless-steel and other-metal products, own production, laser cutting, bending, and other equipment.

Add a semantic contact form with required `name`, `contact`, `service`, and `details` fields. On valid submission, use `VITE_TELEGRAM_BOT_USERNAME` and the helper to open a URL-encoded Telegram deep link; preserve an explicit status for missing configuration and a status explaining that the customer must confirm sending in Telegram. Show a direct fallback link in the status area in case the browser blocks the new tab; do not rely on the return value of `window.open` when using `noopener`. The form must not claim delivery before the customer sends the message.

- [ ] **Step 4: Run unit tests and the form browser smoke checks**

Run: `npm test`

Expected: PASS for `formats_company_service_and_order_details`.

In the running app, verify `shows_missing_bot_configuration_without_opening_telegram`; verify an empty required field is blocked by native validation; with a test bot username, submit values containing Cyrillic and URL-reserved characters and verify the popup URL's decoded `text` includes the company, selected service, and full description. Verify the form also displays a usable fallback link. Do not send a real message.

### Task 2: Add the Industrial Visual System and Responsive Page Polish

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/index.css`
- Modify: `index.html`
- Modify: `README.md`

**Interfaces:**
- Consumes: `#top`, `#services`, `#production`, and `#contact` anchors and the form in `src/App.jsx`.
- Produces: responsive industrial styling, ООО «ВиД» metadata, and accurate setup/Telegram documentation.

- [x] **Step 1: Implement the steel-and-orange visual system**

Replace studio palette and styling in `src/index.css` with dark graphite / steel surfaces, warm orange accents, clear hover and focus states, and mobile layouts. Style the hero illustration with original CSS/inline-SVG-like geometric metal and chimney elements; do not use unrelated office imagery. Keep the primary text CTA obvious and style a separate chimney-motif button with a descriptive accessible label that scrolls to the product directions.

- [x] **Step 2: Update page metadata and README**

Update the Russian document title, description, and theme color in `index.html` for ООО «ВиД», metalworking, ventilation, chimneys, and Saratov. Update `README.md` to identify the project as the ООО «ВиД» website and retain accurate Vite and Telegram bot setup instructions.

- [x] **Step 3: Run production build**

Run: `npm run build`

Expected: Vite completes and produces the production bundle without errors.

- [x] **Step 4: Verify navigation, mobile layout, and keyboard accessibility**

Open the Vite app in the browser. At desktop width, verify all navigation and CTA anchors reach the intended sections. At a 320px-wide mobile viewport, verify the mobile menu opens/closes, all controls remain visible, and the page has no horizontal overflow (`mobile_layout_has_no_overflow`). Use keyboard-only navigation to confirm visible focus, that opening the mobile menu places focus next on its first link, and that the chimney CTA and form can be operated (`keyboard_focus_is_visible`). Enable reduced motion and verify decorative transitions/scroll behavior are reduced (`reduced_motion_is_respected`).
