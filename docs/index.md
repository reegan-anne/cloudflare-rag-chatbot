---
title: Acme Docs
description: Help docs for Acme — the all-in-one widget company. This site ships with an embedded AI chatbot that answers from these pages.
template: splash
hero:
  tagline: Everything you need to use Acme — plus an AI assistant that answers from these docs.
  actions:
    - text: Get started
      link: /getting-started/
      icon: right-arrow
      variant: primary
    - text: Browse features
      link: /features/example-feature/
    - text: FAQ
      link: /faq/
---

## This is a template

You're looking at **cloudflare-rag-chatbot** — an open-source starter for shipping a
documentation chatbot on Cloudflare Workers. The example brand is the fictional **Acme**;
replace it with your own.

To make it yours:

1. Edit `chatbot.config.json` — name, colors, greeting, suggested questions, and the
   assistant's persona all live there.
2. Drop your own Markdown into `docs/` (delete these example pages).
3. Run `npm run ingest` to embed your docs, then deploy to Cloudflare.

The chat bubble in the bottom-right corner is the widget. Open it and ask one of the
suggested questions — the answer is retrieved from the pages in this `docs/` folder.

## How it works

Your question is embedded with Workers AI, matched against your docs in Cloudflare
Vectorize, and answered by Claude through Cloudflare AI Gateway — with citations back to
the source pages. See the project `README.md` for the full setup.
