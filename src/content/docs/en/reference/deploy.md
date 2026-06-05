---
title: Deploy
description: Deployment notes for the reference implementation - Hugging Face Spaces under the Docker SDK, runtime configuration, streaming, rollback, and backup paths.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# Deploy

> Deployment notes for `ai-agent-eval-harness-healthtech`. The canonical
> primary deploy target is **Hugging Face Spaces** under the **Docker SDK**.
> Backup paths (Render, local Docker) are documented at the bottom.

## Why Hugging Face Spaces

The demonstration target is a public, zero-cost, always-on demo URL anyone
can open in one click. HF Spaces, Docker SDK, **CPU Basic** tier
gives us:

- 2 vCPU, 16 GB RAM, 50 GB ephemeral disk.
- A public HTTPS URL with no card-on-file requirement.
- Automatic image rebuild on every push to the Space's `main` branch.
- Sleeps after 48 h of zero traffic; auto-wakes on next request.

The trade-offs are: a cold start of 10-30 s after a sleep, and the resource
ceilings above. Both are acceptable for a demonstration platform.

The Space repo (`SzematPro/ai-agent-eval-harness-healthtech`) is a deploy
target mirror of the canonical GitHub repository - it is not a separate
collaboration repo. Every deploy is a force-push from the GitHub workflow.

## Deploy story (the happy path)

1. A commit lands on `main` of the GitHub repo (or a release tag matching
   `v*` is pushed, or the workflow is manually dispatched).
2. The deploy workflow runs on `ubuntu-latest`. It
   verifies the `HF_TOKEN` secret is present, configures the deploy git
   identity, substitutes the Space-specific README for the root README
   (which carries the HF Spaces YAML front-matter), strips binary media
   (the GIFs and PNGs are GitHub README assets, not Space runtime
   files - Hugging Face rejects raw pushes that carry binary blobs),
   builds a single-commit **orphan** `deploy` branch (no history), and
   force-pushes that branch to the Space remote's `main`.
3. Hugging Face detects the push, rebuilds the Docker image from the same
   `Dockerfile` the repo ships, and brings the new revision online.
4. The Space card on huggingface.co reflects the values declared in
   the Space-specific README; the live demo URL is
   <https://huggingface.co/spaces/SzematPro/ai-agent-eval-harness-healthtech>.

The deploy commit is **never** pushed back to the GitHub repo; it exists
only on the Space remote, which is a deploy mirror and tolerates the
force-push. The GitHub `main` branch and GitHub tags are never
force-pushed.

## Bootstrap - one-off setup

The first deploy needs the `HF_TOKEN` GitHub repo secret to exist. Until it
does, the workflow fails fast with a clear message and the Space card on
huggingface.co will render the README placeholder.

### 1. Create the Space

1. Sign in at <https://huggingface.co> as `SzematPro`.
2. New Space -> name `ai-agent-eval-harness-healthtech`, SDK = Docker,
   visibility = Public.
3. After the empty Space is created, take note of the remote URL:
   `https://huggingface.co/spaces/SzematPro/ai-agent-eval-harness-healthtech`.

### 2. Mint a write-scoped HF token

1. Go to <https://huggingface.co/settings/tokens>.
2. Create a token with the **write** role (read-only is not enough - the
   workflow pushes to the Space remote).
3. Copy the token; HF only shows it once.

### 3. Register the secret on the GitHub repo

1. Open the GitHub repository's Actions secrets settings page.
2. New repository secret. Name: `HF_TOKEN`. Value: the token from step 2.
3. Trigger the deploy workflow manually to confirm the first deploy
   completes.

The deploy workflow is the automated deploy path. The
*first* deploy can also be done by hand by pushing the working tree
directly to the Space git remote, which makes the Space go live without
waiting on the GitHub origin push. The hand-deploy substitutes the
Space-specific README for the root README and strips binary media that
Hugging Face rejects; the automated workflow does the same thing on
every push.

## Runtime configuration (HF Space)

The live Space is configured entirely through Space secrets and
variables read by the application settings (pydantic-settings;
env-var names are the upper-cased field names). Set sensitive values as
**Secrets** and the rest as **Variables** in the Space's
**Settings -> Variables and secrets** page.

Secrets:

- `GROQ_API_KEY` - primary LLM provider.
- `CEREBRAS_API_KEY` - fallback LLM provider; its presence is what
  activates the Groq-to-Cerebras fallback client.

Variables: `LLM_PROVIDER=groq`, `AUTO_INGEST_ON_STARTUP=1`,
`CHROMA_PERSIST_DIR=/tmp/chroma`, `CHROMA_COLLECTION=kb_main`,
`EMBEDDING_PROVIDER=sentence-transformers`,
`SENTENCE_TRANSFORMER_MODEL=BAAI/bge-small-en-v1.5`,
`EMBEDDING_DEVICE=cpu`, `HITL_ENABLED=1`, `LLM_FALLBACK_ENABLED=1`,
`RATE_LIMIT_ENABLED=1`, `RESPONSE_CACHE_ENABLED=1`,
`ENVIRONMENT=production`.

The Space ingests the baked-in knowledge base fresh into an empty Chroma
collection on first boot; the `BAAI/bge-small-en-v1.5` embedding model
downloads from Hugging Face on first start. The checkpointer is the
in-memory `MemorySaver` (a single-worker free-tier limitation - a paused
HITL thread does not survive a Space restart); the durable Postgres
connection string is left unset. The rate limiter, the provider fallback,
and the response cache are all per-process; do not raise the uvicorn
worker count, because a second worker would not share them.

## Streaming (SSE) and the reverse proxy

The Agent Execution Graph is fed by a server-sent-events (SSE)
streaming mode on `POST /chat` and `POST /chat/resume`: a request that
carries `Accept: text/event-stream` gets a `text/event-stream` body of
per-node execution events instead of the JSON `ChatResponse`. The
streaming design is recorded in
[ADR-0010](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0010-streaming-execution-graph/).

For the live graph to feel live, those events must reach the browser
*incrementally* - as each node runs - rather than being buffered and
delivered as one block at end of turn. The application does its part:
the streaming responses set `Cache-Control: no-cache` and
`X-Accel-Buffering: no`, and the server flushes each SSE record as the
LangGraph `astream` API yields it. `X-Accel-Buffering: no` is, however,
an **nginx-specific hint**. The Hugging Face Spaces edge proxy is not
contractually guaranteed to honour it, so whether SSE actually streams
incrementally on the live Space is a deployment fact that has to be
**verified on the deployed Space**, not assumed.

### The `curl -N` incremental-delivery check

`curl -N` (`--no-buffer`) disables curl's own output buffering, so what
you see arrive is what the proxy delivered. Against the deployed Space,
issue a streaming request:

```bash
curl -N -X POST \
  https://szematpro-ai-agent-eval-harness-healthtech.hf.space/chat \
  -H 'Content-Type: application/json' \
  -H 'Accept: text/event-stream' \
  -d '{"messages":[{"role":"user","content":"What is medication adherence?"}]}'
```

To make the timing explicit, prefix each line with a timestamp:

```bash
curl -N -X POST \
  https://szematpro-ai-agent-eval-harness-healthtech.hf.space/chat \
  -H 'Content-Type: application/json' \
  -H 'Accept: text/event-stream' \
  -d '{"messages":[{"role":"user","content":"What is medication adherence?"}]}' \
  | while IFS= read -r line; do printf '%s  %s\n' "$(date +%T.%N)" "$line"; done
```

- **PASS** - the SSE records arrive incrementally: the `graph_topology`
  event first, then the `node_started` / `node_completed` events spaced
  out across the turn, then `turn_completed`. With the timestamped
  variant the lines carry visibly different times. The proxy did not
  buffer; the live graph is genuinely live.
- **FAIL** - every record lands at once at end of turn (the timestamps
  are all within a few milliseconds of each other). The proxy buffered
  the response; the live graph degrades to a post-turn dump.

A FAIL must be resolved before release: either by a
proxy-configuration fix, or, if the HF edge genuinely cannot be made to
stream, by an honest scope decision recorded before release. A release
must not claim a live execution graph if the live graph is silently a
post-turn dump.

### Recorded result

The streaming code is verified end-to-end: a
`curl -N` request against the deployed Space returns the SSE records
incrementally and the streaming responses carry `Cache-Control:
no-cache` and `X-Accel-Buffering: no`. The release gate required this
check to PASS on the live Space before tagging.

## Rollback

The Space's `main` branch is rebuilt from the GitHub `main` on every deploy
run, so the rollback procedure is asymmetric:

- **If a bad commit landed on the Space but not on GitHub `main`**: delete
  the latest commit on the Space `main` from
  <https://huggingface.co/spaces/SzematPro/ai-agent-eval-harness-healthtech/tree/main>.
  The next push from `main` of the GitHub repo restores the deploy state.
- **If a bad commit landed on GitHub `main`**: revert it on GitHub (a new
  `git revert` commit on `main`); the deploy workflow re-runs and the Space
  picks up the revert.

Never `git push --force` to GitHub `main` to undo a deploy; only the Space
remote tolerates force-pushes (it is a mirror, not a source of truth).

## Test the Docker image locally

The Space runs the same `Dockerfile` the repo ships. To smoke-test it:

```bash
docker build . -t ai-agent-eval-harness:dev
docker run -p 7860:7860 ai-agent-eval-harness:dev
```

Then hit `http://localhost:7860/health` in another terminal. The image:

- runs as a non-root `app` user,
- listens on port 7860 (the HF Spaces default),
- writes only to `/tmp` and to the app virtualenv,
- starts `uvicorn` with the FastAPI app.

The Docker base is `python:3.12-slim`; the runtime stage adds `ca-certificates`
and `curl` only. No GPU is required.

## Trade-offs and known limits

- **Cold start**: 10-30 s after a 48-h idle sleep; HF wakes the Space on the
  first incoming request. For a demonstration platform this is acceptable.
- **Resource ceilings**: 2 vCPU and 16 GB RAM. The agent is single-process
  `uvicorn`; the embedded Chroma store and the baked-in sentence-transformers
  model fit comfortably under this budget.
- **Ephemeral storage**: 50 GB and reset on each rebuild. Anything that needs
  durability (eval reports, traces) goes to GitHub Actions artefacts, not to
  the Space disk.
- **No GPU on the free tier**: the demo deliberately runs CPU-only; LLM calls
  are dispatched to the configured external provider (Groq by default).
- **Free-tier quotas**: HF Spaces does not enforce a per-month quota on
  Docker CPU Basic Spaces; check
  <https://huggingface.co/pricing> for current terms.

## Backup deploy paths

- **Render** (free tier, untested): the same `Dockerfile` should run with
  the service configured to listen on the Render-provided `$PORT`. No
  `render.yaml` is committed and this path has not been exercised; it is
  a documented alternative, not an automated or verified deploy.
- **Local Docker**: the `docker run` command above, useful for local
  development and for sanity-checking the image before a release tag.
