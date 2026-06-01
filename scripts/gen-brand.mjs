/**
 * Generates brand artifacts from the single source of truth, chatbot.config.json:
 *
 *   public/widget-config.js   → window.__CHATBOT_CONFIG (read by public/widget.js)
 *   src/styles/brand-tokens.css → CSS custom properties (palette + Starlight accents)
 *
 * Runs automatically before `dev` and `build` (see package.json predev/prebuild).
 * Both outputs are committed so a fresh clone is browseable before the first build.
 *
 * Do not edit the generated files by hand — edit chatbot.config.json and re-run.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const config = JSON.parse(
  await fs.readFile(path.join(ROOT, 'chatbot.config.json'), 'utf-8'),
);
const { brand, widget, colors } = config;

// --- public/widget-config.js -------------------------------------------------
// Only the fields the browser widget needs; the system-prompt fields stay
// server-side (bundled into the Worker), never shipped to the client.
const widgetConfig = {
  assistantName: brand.assistantName,
  subtitle: widget.subtitle,
  greeting: widget.greeting,
  blurb: widget.blurb,
  footer: widget.footer,
  placeholder: widget.placeholder,
  suggestedQuestions: widget.suggestedQuestions,
  colors,
};

const widgetJs = `/* GENERATED from chatbot.config.json by scripts/gen-brand.mjs — do not edit. */
window.__CHATBOT_CONFIG = ${JSON.stringify(widgetConfig, null, 2)};
`;
await fs.writeFile(path.join(ROOT, 'public', 'widget-config.js'), widgetJs);

// --- src/styles/brand-tokens.css ---------------------------------------------
const css = `/* GENERATED from chatbot.config.json by scripts/gen-brand.mjs — do not edit. */
:root {
  --brand-primary: ${colors.primary};
  --brand-primary-dark: ${colors.primaryDark};
  --brand-accent: ${colors.accent};
  --brand-accent-light: ${colors.accentLight};
  --brand-dark-surface: ${colors.darkSurface};

  /* Starlight accent mapping (dark theme) */
  --sl-color-accent-low: ${colors.primaryDark};
  --sl-color-accent: ${colors.primary};
  --sl-color-accent-high: ${colors.accentLight};
  --sl-color-text-accent: ${colors.accent};
}
:root[data-theme='light'] {
  --sl-color-accent-low: ${colors.accentLight};
  --sl-color-accent: ${colors.primary};
  --sl-color-accent-high: ${colors.primaryDark};
  --sl-color-text-accent: ${colors.primaryDark};
}
`;
await fs.writeFile(path.join(ROOT, 'src', 'styles', 'brand-tokens.css'), css);

console.log('✓ generated public/widget-config.js and src/styles/brand-tokens.css');
