// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

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
	integrations: [
		starlight({
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
			// Sidebar is auto-generated from the file tree until the curated content
			// lands, at which point it becomes an explicit grouped nav.
			lastUpdated: false,
			pagination: false,
		}),
	],
});
