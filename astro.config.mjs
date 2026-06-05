// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';
import starlightLinksValidator from 'starlight-links-validator';

// Public documentation site: trilingual (en / es-419 / pt-BR) technical
// reference and governance documentation for the AI Agent Eval Harness
// (healthtech). Dark-only, szemat.pro brand. No source code. Pagefind search is
// on by default.
//
// GitHub Pages project site: https://szematpro.github.io/ai-agent-eval-harness-healthtech-docs/
const SITE = 'https://szematpro.github.io';
const BASE = '/ai-agent-eval-harness-healthtech-docs';

// https://astro.build/config
export default defineConfig({
	site: SITE,
	base: BASE,
	// No root locale (all locales are path-prefixed), so the bare base URL has no
	// page. Redirect it to the default locale so the docs home resolves. Astro
	// does not prepend `base` to redirect targets, so include it explicitly.
	redirects: {
		'/': `${BASE}/en/`,
	},
	integrations: [
		// Client-side Mermaid rendering (CI-safe: no build-time browser). Must come
		// before Starlight so it intercepts ```mermaid code blocks. Dark to match.
		mermaid({ theme: 'dark' }),
		starlight({
			// Fail the build on any broken internal link or anchor (DOC link gate).
			// Allow relative .md links: under a base path, root-absolute links do not
			// get the base prepended and would 404, so relative links are the correct
			// style here. The validator still verifies every target resolves.
			plugins: [starlightLinksValidator({ errorOnRelativeLinks: false })],
			title: 'AI Agent Eval Harness',
			description:
				'Public technical reference and governance documentation for the AI Agent Eval Harness (healthtech). Capability and readiness mapping, trilingual EN/ES/PT-BR. No source code.',
			// Trilingual: every locale is path-prefixed (no root locale), so all
			// three resolve 1:1 by slug -- /en/<slug>/, /es-419/<slug>/, /pt-br/<slug>/.
			// Locale `lang` carries the proper BCP-47 tag (the SPA uses es-419 / pt-BR).
			defaultLocale: 'en',
			locales: {
				en: { label: 'English', lang: 'en' },
				'es-419': { label: 'Español (Latinoamérica)', lang: 'es-419' },
				'pt-br': { label: 'Português (Brasil)', lang: 'pt-BR' },
			},
			// Dark-only brand: force `data-theme="dark"` and remove the toggle.
			components: {
				ThemeProvider: './src/components/ThemeProvider.astro',
				ThemeSelect: './src/components/ThemeSelect.astro',
			},
			customCss: ['./src/styles/brand.css'],
			// Fonts via Google Fonts; system fallbacks live in brand.css.
			head: [
				{
					tag: 'link',
					attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
				},
				{
					tag: 'link',
					attrs: {
						rel: 'preconnect',
						href: 'https://fonts.gstatic.com',
						crossorigin: true,
					},
				},
				{
					tag: 'link',
					attrs: {
						rel: 'stylesheet',
						href: 'https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Geist+Mono:wght@100..900&family=Instrument+Serif:ital@0;1&display=swap',
					},
				},
			],
			social: [
				{
					icon: 'github',
					label: 'GitHub',
					href: 'https://github.com/SzematPro/ai-agent-eval-harness-healthtech-docs',
				},
			],
			// Explicit grouped nav; each group auto-generates from the per-locale
			// content tree. Per-page labels come from each page's frontmatter title
			// (localized per locale); group labels are localized via the i18n
			// dictionary in the translation phases.
			sidebar: [
				{ label: 'Governance & Readiness', items: [{ autogenerate: { directory: 'governance' } }] },
				{ label: 'Architecture Decisions', items: [{ autogenerate: { directory: 'adr' } }] },
				{ label: 'Diagrams', items: [{ autogenerate: { directory: 'diagrams' } }] },
				{ label: 'Reference', items: [{ autogenerate: { directory: 'reference' } }] },
			],
			lastUpdated: false,
			pagination: false,
		}),
	],
});
