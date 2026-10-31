# Product Image Generation for ООО «ВиД»

## Intent

Replace the current chimney and laser-cutting SVG/CSS artwork with local, photorealistic AI-generated visualizations, and add a visualization to the ventilation card. The images should make the company's metal products easier to understand without implying that generated scenes are photographs of ООО «ВиД» work or equipment.

## Goals

- Add a root-level Python script that generates three images: chimney components, ventilation components, and a generic laser-cutting scene.
- Use the Google Gemini API with `GEMINI_API_KEY` loaded from the project-root `.env`.
- Save optimized, local WebP assets under `public/images/`.
- Wire the chimney and ventilation assets into their service cards and the laser-cutting asset into the production section.
- Clearly identify generated assets on the site as AI visualizations, not actual completed orders or company equipment.
- Add a concise company/about block with public legal-entity details verified for the user's company.
- Keep the contact area ready for a future phone, email, or website without inventing or displaying empty contact values.
- Keep the API key server-side/local; never expose it in the browser bundle or print it in logs.

## Non-goals

- Claim the generated images depict real customer work, the actual workshop, or the company's exact machinery.
- Add image generation to the public website or run generation in the browser.
- Change the Telegram form or its message flow.
- Generate images for address plaques or stainless furniture in this iteration.
- Treat the registered legal address as a confirmed customer-facing office, workshop, or visit address.
- Invent phone, email, social, or website details while public contact details are unavailable.
- Keep using Imagen 3: Google documents it as a legacy model shut down in the Gemini API.

## Constraints and anti-goals

- The user's requested `GEMINI_API_KEY` credential selects the Gemini Developer API, not Vertex AI.
- Google's current image-generation guide recommends `gemini-nano-banana-2.1` and demonstrates the Python Gen AI SDK `client.interactions.create`; Imagen is no longer available through the Gemini API.
- The current worktree has no root `.env`. The script can be implemented and tested without credentials, but actual generation must wait until the user supplies a valid local key.
- No real company product photos were supplied. Generated output must not be presented as documentary evidence.
- The user confirmed the matching Saratov legal entity by INN 6451021251 and asked to leave phone/email/site empty for now.
- Registry aggregators identify the entity as ООО «ВИД» / ООО «Вентиляция и дымоходы», OGRN 1226400012035, registered 05.10.2022, with a registered legal address at пл. Советско-Чехословацкой Дружбы, д. 5, Саратов. These details must be labeled as legal-entity information; the legal address is not verified as a customer-facing location.
- The public records reviewed do not list a telephone, website, or email. Keep optional contact fields empty and render only non-empty details. The existing Telegram inquiry form remains available.
- Generated assets are local and replaceable; no remote image host or runtime API request is permitted.
- The site already has three primary UI locations: the chimney card, ventilation card, and production artwork. The product catalog is in `src/site-content.js`; the cards and production artwork are rendered in `src/App.jsx`.
- Any API failure must be surfaced, and a failed generation must not leave a partial or success-shaped output file.

## Approaches

1. **Gemini image generation using the AI Studio API key (selected).** Use Google's current recommended `gemini-nano-banana-2.1` model with `GEMINI_API_KEY`. This matches the requested credential and keeps generation local to a maintainer-run script. Trade-off: it is not Imagen 3, and the results are visualizations rather than real photos.
2. **Vertex AI Imagen.** Use Google Cloud project configuration and Vertex AI credentials. This no longer matches the requested Gemini API key and still would produce generated imagery, not photographs of company products.
3. **Photographs supplied by the company.** Best for truthful examples of actual work, but requires source photos and does not provide the requested generation workflow.

## Design

- Add `generate_product_images.py` at the repository root.
- Keep generator-only Python dependencies in a dedicated requirements file so website and Telegram bot setup remain unchanged.
- Load `.env` from the repository root with `python-dotenv`, read the key only into the SDK client, and use the official Google Gen AI Python SDK.
- Make three explicit prompt/output entries. Prompts request neutral, photorealistic industrial imagery with no logo, address, readable branding, or claim that the pictured workshop belongs to the company.
- Convert returned image bytes to WebP with Pillow, resize to a website-friendly landscape size, and enforce the existing 500 KB-per-image budget. Save atomically to deterministic paths in `public/images/`.
- Add image-path and file-size tests, plus focused tests for image conversion and generation error handling that do not make network calls.
- Extend the service data with local image paths and descriptive alt text. Render the images in the existing cards and production section. Add visible “AI-визуализация — не фото выполненного заказа” disclosures and matching README documentation.
- Add an «О компании»/legal details block for the verified full legal name, INN, OGRN, registration date, primary registered activity, and legal address. Keep the existing contact form and add optional contact data slots that remain invisible until real values are supplied.
- Document that registry contact fields were unavailable and cite the public sources used for company details.
- Do not alter the Telegram inquiry flow.

## Acceptance criteria

- The Python script runs from the project root and clearly reports a missing key, dependency, API error, missing image response, or invalid image instead of silently continuing.
- A successful run writes exactly three valid local WebP images under `public/images/`, each at most 500 KB.
- Re-running the script updates only those three named generated assets; a failed request does not replace an existing valid asset with a partial file.
- Each UI image path resolves locally and appears in its intended page area with descriptive alternative text and a visible AI-visualization disclosure.
- Company details match the confirmed INN and are not phrased as unverified customer-contact or manufacturing-location claims. No empty or invented phone/email/site is rendered.
- Tests and production build pass; no API key or API call is included in frontend code.
- At 320 px and desktop widths, the page has no horizontal overflow and card/production text remains legible.

## Builder decisions

- The current model is Google's recommended Gemini API image model, `gemini-nano-banana-2.1`; this is the selected substitute for the unavailable Imagen 3 API.
- The user selected this Gemini API approach and accepted the visualization distinction.
- The user confirmed company INN 6451021251 as the correct entity and asked to leave direct-contact values blank for now.
- The site remains Russian-language and uses its existing visual style.
- The API key is absent from the current worktree. Do not attempt generation until a valid local key is available; after implementation, ask the user to add it to `.env` and run the script if it is still missing.

## Public sources checked

- [Checko company record for OGRN 1226400012035](https://checko.ru/company/vid-1226400012035)
- [Rusprofile company record for OGRN 1226400012035](https://www.rusprofile.ru/id/1226400012035)

Both sources identify the company by INN and OGRN and show its legal name, Saratov registration, primary activity, and registered address. Rusprofile states that phone and official website details are absent from its EGRUL-based contact data.
