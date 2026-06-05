# AI Agent Eval Harness Documentation

Public technical reference and governance documentation for the **AI Agent Eval
Harness (healthtech)**: a measurement-first, cite-or-refuse conversational health
agent for medication adherence and its CI-gated evaluation harness. Every
clinical assertion the agent makes must cite a verified knowledge-base card, or
the agent refuses.

- **Live docs:** https://szematpro.github.io/ai-agent-eval-harness-healthtech-docs/
- **Live demo:** https://huggingface.co/spaces/SzematPro/ai-agent-eval-harness-healthtech

Trilingual: English, Español (Latinoamérica), Português (Brasil).

> **Reference documentation, not a medical device.** This is a capability and
> readiness reference, not a compliance certification or legal advice. The
> system is built and evaluated on 100% synthetic data; it is not clinically
> validated and handles no production PHI.

## Build locally

This site is built with [Astro Starlight](https://starlight.astro.build/).

```sh
npm install
npm run dev      # local dev server
npm run build    # production build to ./dist/ (with Pagefind search index)
```

## License

Documentation is licensed under [CC BY 4.0](./LICENSE). The product name and
brand are excluded from the license grant.
