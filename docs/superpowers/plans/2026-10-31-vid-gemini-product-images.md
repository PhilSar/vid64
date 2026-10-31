# ViD Gemini Product Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local Gemini image-generation workflow, display three disclosed AI visualizations on the ViD site, and include verified legal-entity details with room for future direct contacts.

**Architecture:** A root-level Python script uses Google's Gen AI SDK and the project `.env` to generate and optimize three WebP assets in `public/images`. React reads local image paths and company/legal contact data from `src/site-content.js`; generated images never load from the API at runtime. The existing Telegram inquiry flow remains the only configured contact channel until the user supplies additional details.

**Tech Stack:** React 19, Vite 6, Node.js `node:test`, Python 3, `google-genai`, `python-dotenv`, Pillow, WebP.

**Spec:** [2026-10-31-vid-gemini-product-images-design.md](../specs/2026-10-31-vid-gemini-product-images-design.md)

## Global Constraints

- Use Google's current Gemini API image model `gemini-nano-banana-2.1`; do not call Imagen 3.
- Read `GEMINI_API_KEY` from the repository-root `.env` only; never log it, bundle it, or send it to the browser.
- Generate three local images: chimney components, ventilation components, and a generic laser-cutting scene.
- Each generated WebP must be at most 500 KB and saved under `public/images/`.
- Mark every generated image visibly as an AI visualization, not a photograph of a completed order or the company's equipment.
- Identify the company as ООО «ВИД» / «Вентиляция и дымоходы», INN `6451021251`, OGRN `1226400012035`; label the registered address as a legal address, not a customer-facing location.
- Leave phone, email, website, and social links empty until the user provides them; do not render blank or invented contact values.
- Keep the Telegram form and its confirmation flow unchanged.
- Never read or reveal `.env` values.

## Review Focus

- **Missing API key:** report a clear error and exit before any network call; pin with a test that omits `GEMINI_API_KEY`.
- **Empty or malformed model response:** fail explicitly and do not write partial output; pin missing-image and invalid-image tests.
- **API failure during regeneration:** do not replace a prior valid named asset with a partial file; pin an atomic-write failure test.
- **Unexpected or oversized image output:** convert and enforce the 500 KB limit, or report failure; pin WebP decode and size checks.
- **Unconfirmed contact/location claims:** omit empty contact values and label the registry address strictly as legal; pin content assertions and browser check.

---

### Task 1: Add Verified Company Details and Contact Slots

**Files:**
- Modify: `src/site-content.js`
- Modify: `src/site-content.test.js`
- Modify: `src/App.jsx`
- Modify: `src/index.css`
- Modify: `README.md`

**Interfaces:**
- Produces `companyDetails` with `shortName`, `legalName`, `inn`, `ogrn`, `registrationDate`, `primaryActivity`, and `legalAddress`.
- Produces `companyContacts` with optional empty-string `phone`, `email`, and `website` values; the page renders only populated values.
- The new «О компании» section uses the legal address label and does not imply it is a workshop or a customer visit address.

- [ ] **Step 1: Write failing tests for the verified company record**

Add a test asserting:
  - `companyDetails.inn === '6451021251'` and `companyDetails.ogrn === '1226400012035'`.
  - The full legal name is «Вентиляция и дымоходы», registration date is `05.10.2022`, and the address is labeled as a legal address.
  - `companyContacts.phone`, `email`, and `website` are empty; the page renders direct-contact links only for non-empty values.

- [ ] **Step 2: Run the content tests and verify the missing exports fail**

Run: `node --test src/site-content.test.js`

Expected: FAIL because the company details and contact data exports are not present.

- [ ] **Step 3: Add the company data and the «О компании» block**

Implement `companyDetails` and `companyContacts` in `src/site-content.js`. Render the verified registry data in a new «О компании» area in `src/App.jsx`; label the registered address «Юридический адрес». Render optional direct-contact links only when the corresponding value is non-empty. Keep the existing Telegram form as-is.

- [ ] **Step 4: Document the legal-data sources and run tests/build**

Add the Checko and Rusprofile record links to `README.md`, with a note that the public records did not provide phone, email, or an official website.

Run: `npm test && npm run build`

Expected: all tests pass and Vite builds successfully. In the browser, verify the legal address is labeled accurately and no empty phone/email/website labels appear.

- [ ] **Step 5: Commit company details**

```bash
git add src/site-content.js src/site-content.test.js src/App.jsx src/index.css README.md
git commit -m "Add verified ViD company details"
```

### Task 2: Create and Test the Local Gemini Image Generator

**Files:**
- Create: `generate_product_images.py`
- Create: `requirements-image-gen.txt`
- Create: `tests/test_generate_product_images.py`

**Interfaces:**
- `IMAGE_JOBS` is a tuple of `(filename, prompt)` pairs for: chimney sections/elbows/cap; galvanized ventilation ductwork/fittings; and a generic CNC laser cutting sheet metal. Prompts exclude logos, readable text, and identifying company/workshop details.
- Defines `require_api_key(environment: Mapping[str, str]) -> str`, `extract_image_bytes(image_output: object | None) -> bytes`, `to_webp(image_data: bytes, max_bytes: int = 500_000) -> bytes`, and `generate_images(generate: Callable[[str], bytes], output_dir: Path) -> None`.
- CLI entry point loads the repository-root `.env`, creates `google.genai.Client(api_key=...)`, and calls `client.interactions.create(model="gemini-nano-banana-2.1", input=prompt, response_format={"type": "image", "mime_type": "image/jpeg", ...}, timeout=600)` for each job.

- [ ] **Step 1: Add generator dependencies and write offline unit tests**

Add `google-genai==2.34.0`, `python-dotenv>=1.0,<2.0`, and `Pillow>=10,<13` to `requirements-image-gen.txt`. Pin the SDK version because the Interactions API is experimental. Write `unittest` cases asserting:
  - `require_api_key({})` raises a clear missing-key error before an SDK client can be created.
  - Base64 is extracted from `Interaction.output_image`; text-only, absent, or invalid image data raises a clear error.
  - `to_webp` returns bytes that Pillow can reopen as WebP and enforces the maximum size; invalid source bytes raise a clear error.
  - `generate_images` calls the injected generator exactly once per named job, writes all three expected files with public-read permissions, and `main` sends image-only requests to the configured model without a network call.
  - If generation fails, the failed destination does not contain a partial file and any previously valid destination remains unchanged.

- [ ] **Step 2: Install the declared generator dependencies and verify RED**

Run: `python3 -m pip install -r requirements-image-gen.txt`

Then run: `python3 -m unittest discover -s tests -p test_generate_product_images.py -v`

Expected: FAIL because `generate_product_images.py` is not implemented yet (not because dependencies are missing).

- [ ] **Step 3: Implement the generator and explicit key validation**

Implement the four named functions and CLI. Load only the project-root `.env`; if `GEMINI_API_KEY` is absent, exit non-zero with a setup instruction before constructing the client. Request image-only output, extract the image from the SDK's `response.output_image` convenience field, validate it with Pillow, resize/encode to WebP under 500 KB, and write via a temporary file followed by atomic replacement. Surface SDK/API and image conversion errors; never print the key.

- [ ] **Step 4: Verify offline tests and missing-key behavior**

Run: `python3 -m unittest discover -s tests -p test_generate_product_images.py -v`

Expected: unit tests pass, including the pure missing-key check. Do not run the real CLI until the user-provided key is intentionally available, because loading `.env` may authorize billable generation requests.

- [ ] **Step 5: Commit the generator**

```bash
git add generate_product_images.py requirements-image-gen.txt tests/test_generate_product_images.py
git commit -m "Add local Gemini product image generator"
```

### Task 3: Generate Local Images and Connect Them to the Site

**Files:**
- Create: `public/images/chimney-components.webp`
- Create: `public/images/ventilation-components.webp`
- Create: `public/images/laser-cutting.webp`
- Create: `src/site-assets.test.js`
- Modify: `src/site-content.js`
- Modify: `src/App.jsx`
- Modify: `src/index.css`
- Modify: `README.md`

**Interfaces:**
- `primaryServices[].image` and `primaryServices[].imageAlt` refer to the chimney and ventilation assets.
- `homepageCopy.productionImage` and `homepageCopy.productionImageAlt` refer to the laser-cutting asset.
- Every image includes visible «AI-визуализация — не фото выполненного заказа» disclosure.

- [ ] **Step 1: Write failing tests for image paths and disclosure copy**

Create `src/site-assets.test.js` asserting that all three expected paths resolve under `public/`, each file is no larger than 500 KB, each path is used by its intended page area, and the image alt/caption text identifies it as an AI visualization rather than a real completed order.

- [ ] **Step 2: Verify RED before generating**

Run: `node --test src/site-assets.test.js`

Expected: FAIL because the local image files and image metadata are missing.

- [ ] **Step 3: Add image metadata and connect the page**

Add the paths and descriptive alt text to `src/site-content.js`. Render the chimney and ventilation images in their service cards and the laser-cutting image in the production section. Add image sizing/cropping and visible disclosure styles that preserve text contrast and keyboard focus.

- [ ] **Step 4: Generate the images using the user's local key**

Do not inspect or print `.env` contents. If the root `.env` is absent, ask the user to add `GEMINI_API_KEY` locally and stop this task until then. Otherwise run:

```bash
python3 generate_product_images.py
```

Expected: the three named WebP files are saved in `public/images/`, each no larger than 500 KB. Do not report generation as successful unless all three files exist and decode as WebP.

- [ ] **Step 5: Verify the full site**

Run: `python3 -m unittest discover -s tests -p test_generate_product_images.py -v && npm test && npm run build && git diff --check`

Use the browser at 320 px and desktop width to verify all image locations and disclosures, no horizontal overflow, readable production text, and unchanged Telegram form behavior.

- [ ] **Step 6: Document generation and commit the connected images**

Document installation of `requirements-image-gen.txt`, `.env` key setup without adding a real key, the generation command, disclosure meaning, and the fact that contact details remain blank in `README.md`.

```bash
git add public/images src/site-assets.test.js src/site-content.js src/App.jsx src/index.css README.md
git commit -m "Add disclosed ViD product visualizations"
```
