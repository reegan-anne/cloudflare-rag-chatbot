import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import chatbot from './chatbot.config.json';

export default defineConfig({
  site: chatbot.brand.siteUrl,
  integrations: [
    starlight({
      title: chatbot.brand.name + ' Docs',
      description: chatbot.brand.description,
      logo: {
        src: './public/logo.svg',
        alt: chatbot.brand.name,
        replacesTitle: false,
      },
      favicon: '/favicon.svg',
      // brand-tokens.css is generated from chatbot.config.json (scripts/gen-brand.mjs).
      customCss: ['./src/styles/brand-tokens.css', './src/styles/brand.css'],
      lastUpdated: true,
      pagination: true,
      head: [
        // Order matters: widget-config.js defines window.__CHATBOT_CONFIG, which
        // widget.js then reads. `defer` preserves execution order.
        { tag: 'script', attrs: { src: '/widget-config.js', defer: true } },
        { tag: 'script', attrs: { src: '/widget.js', defer: true } },
      ],
      // Drop your own Markdown into docs/ and adjust these groups to taste.
      sidebar: [
        { label: 'Get started', slug: 'getting-started' },
        { label: 'Features', autogenerate: { directory: 'features' } },
        { label: 'FAQ', slug: 'faq' },
      ],
    }),
  ],
});
