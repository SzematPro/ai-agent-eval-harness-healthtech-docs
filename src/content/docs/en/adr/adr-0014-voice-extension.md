---
title: "ADR-0014: Voice extension (ElevenLabs TTS + STT)"
description: Why voice I/O is added via ElevenLabs on-demand TTS and Scribe STT, off by default, audio never retained, proving the pipeline is channel-agnostic at $0/month.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# ADR-0014: Voice extension (ElevenLabs TTS + STT)

- Status: Accepted
- Date: 2026-05-24
- Decision-makers: Waldemar Szemat

## Context and Problem Statement

The demo is a channel-agnostic medication-adherence agent that
demonstrates how to build LLM-based systems for regulated industries with
verifiable citation, compliance, and cost transparency. A text-only
surface does not exercise the voice modality that regulated workflows
(telehealth, patient hotlines, accessibility) require. Adding voice input
(STT) and voice output (TTS) demonstrates that the agent's processing
pipeline -- retrieval, citation enforcement, refusal logic, audit -- is
genuinely channel-independent, not coupled to a text-only surface.

The extension must respect the constraints the existing ADRs lock:

- Hugging Face Spaces free tier, CPU Basic, $0/month baseline (ADR-0007).
- Groq / Cerebras / Anthropic LLM providers (ADR-0002).
- The `/chat` JSON response contract is frozen; any new surface must not
  break existing consumers.
- Supabase free tier for operational data (ADR-0011, ADR-0016).

The voice layer must be an additive extension: off by default, zero
resource consumption until the user opts in, and cleanly separable from
the text-only path so the agent works identically without it.

How do we add voice I/O to the demo in a way that (a) proves the
processing pipeline is channel-agnostic, (b) keeps the baseline at
$0/month, (c) does not break the locked `/chat` contract, and (d) tracks
cost against the existing Supabase accounting schema?

## Decision Drivers

- **Channel-agnostic proof**: voice must be a first-class surface, not a
  bolted-on afterthought, to demonstrate that the processing pipeline is
  genuinely channel-independent.
- **$0/month baseline**: the text-only demo remains free. Voice
  consumption is opt-in and budgeted separately.
- **Contract stability**: the `/chat` JSON schema is frozen (ADR-0010).
  Voice metadata must ride alongside, not inside, that schema.
- **Cost observability**: per ADR-0011 and ADR-0016, every billable unit
  (LLM tokens, TTS chars, STT seconds) must be tracked in Supabase for
  post-demo cost accounting.
- **Minimal vendor surface**: the project already depends on Groq,
  Cerebras, Anthropic, Hugging Face, and Supabase. Voice should add one
  vendor (ElevenLabs), not two.
- **Latency budget**: the Hugging Face Spaces free tier already has a
  10-30 s cold start. Voice must not add unbounded latency to the
  warm-path chat experience.
- **Privacy**: audio of healthcare-related conversations is sensitive. Raw
  audio must not be persisted; only the transcribed text is logged (after
  guardrails redaction per ADR-0005).

## Considered Options

### TTS (text-to-speech)

- **ElevenLabs `eleven_multilingual_v2`, on-demand (chosen)**: per-request
  TTS triggered by the user clicking a play button on a completed
  assistant turn. Language-appropriate voice mapping: Sarah for es-419,
  Matilda for en-US, Bella for pt-BR.
- **Always-on TTS streaming**: server-push audio on every assistant token.
  Rejected: each streamed turn consumes characters whether the user
  listens or not, blowing through the free-tier quota under light demo
  load and adding latency to the SSE event stream.
- **Browser-native `SpeechSynthesis` API**: no vendor dependency, but
  voice quality is inconsistent across browsers and OSes; the healthcare
  context demands clarity that native TTS cannot guarantee.

### STT (speech-to-text)

- **ElevenLabs Scribe (chosen)**: purpose-built STT from the same vendor,
  one API key, consistent billing surface.
- **Browser-native Web Speech API**: no vendor dependency, but quality is
  too low for healthcare-context utterances (medical terminology, drug
  names, accented Spanish/Portuguese). Errors in transcription would
  propagate into the RAG pipeline and produce unsafe responses.
- **OpenAI Whisper (API)**: high quality, but adds a second vendor
  dependency and a second billing surface. The demo already showcases
  ElevenLabs for TTS; using a different provider for STT fragments the
  narrative.

### Voice agent (full-duplex)

- **Full-duplex voice agent simulation via ElevenLabs Conversational AI**:
  real-time bidirectional audio. Deferred: the cost model is per-minute of
  connected time, the implementation complexity is substantial, and the
  click-to-play + push-to-talk pattern covers the channel-agnostic proof
  of concept. Documented as a future opt-in extension.
- **No voice at all**: rejected. A text-only surface does not exercise the
  voice modality that regulated workflows demand.

## Decision Outcome

Chosen option: **ElevenLabs voice extension with on-demand TTS
(`eleven_multilingual_v2`), ElevenLabs Scribe for STT, click-to-play audio
delivery, and opt-in full-duplex voice agent as a future milestone.**

### TTS: ElevenLabs `eleven_multilingual_v2`, on-demand

Each completed assistant turn is rendered into audio only when the user
clicks the play button on that turn. The TTS request is a background call
to the ElevenLabs API; the resulting audio URL (or base64 blob) is
returned to the app for playback. No audio is generated proactively.

Voice mapping by locale:

| Locale | Voice ID | Name |
|--------|----------|------|
| en-US | `XrExE9yKIg1WjnnlVkGX` | Matilda |
| es-419 | `yoZ06kpGZMiJkInNR0Gt` | Sarah |
| pt-BR | `tiBZYpS5hJTFXbHm5CwK` | Bella |

The mapping is configurable and is overridable by the operator without a
code change.

### STT: ElevenLabs Scribe

The user records audio via the browser's `MediaRecorder` API (microphone
access prompted by the browser). The recorded blob is sent to the backend,
which forwards it to the ElevenLabs Scribe endpoint. The transcribed text
replaces what would have been the typed input and enters the normal
`/chat` pipeline (RAG retrieval, guardrails, LLM generation). The raw
audio blob is discarded after transcription; only the text is logged,
subject to the same guardrail redaction as typed input (ADR-0005).

### Audio metadata transport: SSE sidecar, not schema mutation

The `ChatResponse` JSON schema is frozen. TTS audio metadata (audio URL,
duration, character count) is carried in a dedicated SSE event type
(`voice_audio`) emitted alongside the existing response event. Consumers
that do not opt into voice ignore the event type entirely. The `/chat`
JSON response (when SSE is not negotiated) remains unchanged; audio is
only available over the SSE channel with voice enabled.

This is consistent with the ADR-0010 pattern: new event types extend the
SSE surface without mutating the base JSON contract.

### Cost model and tracking

- ElevenLabs free tier: 10,000 characters/month TTS. Scribe STT has its
  own free-tier allocation.
- For demo loads that exceed the free tier, the operator supplements with
  a paid ElevenLabs key. The baseline demo (text-only) is unaffected.
- Per ADR-0011 and ADR-0016, TTS character counts and STT seconds are
  tracked in the demo turn usage table in Supabase alongside LLM token
  counts. This enables per-session and per-key cost accounting without a
  separate billing system.

### Dependency: ElevenLabs SDK

The ElevenLabs Python SDK (version 2.49.0, already installed in the
project) is the sole new runtime dependency. No additional vendor SDKs are
introduced.

### UI defaults

Voice is off by default in the app. A toggle in the chat UI enables it.
When off, no TTS or STT calls are made, no audio UI is rendered, and the
chat behaves identically to the pre-voice build. This ensures the $0/month
baseline is preserved for every session that does not explicitly opt in.

### Full-duplex voice agent: deferred

A real-time voice agent using ElevenLabs Conversational AI (full-duplex
WebSocket) is architecturally compatible with this extension but is
deferred to a future milestone. The click-to-play TTS and push-to-talk STT
provide sufficient evidence of channel-agnostic processing without the
cost and complexity of a persistent audio WebSocket.

### Confirmation

- The app renders a voice toggle (default OFF) in the chat UI.
- When voice is ON, each assistant turn shows a play button; clicking it
  triggers a TTS call and plays the returned audio.
- When voice is ON, a microphone button records audio and sends it to the
  backend for STT transcription; the transcribed text enters the `/chat`
  pipeline.
- The `ChatResponse` JSON schema is unchanged when SSE is not negotiated.
- SSE consumers see a new `voice_audio` event type; consumers that ignore
  it are unaffected.
- The demo turn usage table in Supabase records TTS characters and STT
  seconds per turn.
- The text-only path (voice OFF) produces zero ElevenLabs API calls.
- The ElevenLabs SDK is the only new runtime dependency.

## Consequences

### Positive

- **Channel-agnostic validation**: voice I/O proves the processing
  pipeline works identically across text and audio surfaces, not just in
  theory but in a runnable demo.
- **$0/month baseline preserved**: voice is off by default; text-only
  sessions cost nothing on the ElevenLabs side.
- **Contract stability**: the `/chat` JSON schema is untouched. Audio
  rides on a separate SSE event type, following the ADR-0010 extension
  pattern.
- **Single new vendor**: ElevenLabs handles both TTS and STT. No second
  voice vendor, no OpenAI dependency for Whisper.
- **Cost observability**: TTS characters and STT seconds are tracked in
  the existing Supabase demo turn usage table, enabling per-session cost
  reporting alongside LLM costs.
- **Privacy by design**: raw audio is processed in transit and discarded.
  Only transcribed text is logged, subject to guardrail redaction
  (ADR-0005).
- **Future-ready**: the on-demand TTS + STT pattern is a stepping stone to
  full-duplex Conversational AI without an architectural rewrite.

### Negative

- **ElevenLabs free-tier ceiling**: 10,000 characters/month TTS is roughly
  2,000 words. Sustained demo use (evaluator sessions, conference
  demonstrations) will exhaust it. The operator must supplement with a
  paid key for high-traffic periods.
- **Latency on first TTS call**: the on-demand TTS request adds 1-3
  seconds of latency per turn. This is acceptable for click-to-play (the
  user expects a wait) but would not be acceptable for always-on
  streaming.
- **New runtime dependency**: the ElevenLabs SDK adds to the dependency
  tree. The SDK is well-maintained and the API surface is narrow (TTS
  generate, STT transcribe), but it is one more package to track for
  security updates.
- **Browser microphone permission**: STT requires the user to grant
  microphone access. Some corporate networks and browsers restrict this;
  the text input fallback is always available.

### Neutral

- A new voice module is added for the ElevenLabs client, TTS rendering, and
  STT transcription.
- The app gains a voice toggle, a play button per turn, and a microphone
  button for input. When voice is OFF, these UI elements are hidden.
- The SSE event stream gains a `voice_audio` event type. Existing SSE
  consumers that do not handle this event type are unaffected
  (forward-compatible by design).

## Pros and Cons of the Options

### ElevenLabs `eleven_multilingual_v2`, on-demand (chosen)

- Good, because click-to-play generates audio only when consumed, keeping
  TTS character usage proportional to actual listens.
- Good, because `eleven_multilingual_v2` handles en-US, es-419, and pt-BR
  with a single model, avoiding per-language model routing.
- Good, because the per-language voice mapping (Sarah, Matilda, Bella)
  provides locale-appropriate tone for the healthcare context.
- Bad, because the free tier (10K chars/month) is easy to exhaust under
  sustained demo load.
- Bad, because on-demand generation adds 1-3 s latency per play action.

### Always-on TTS streaming

- Good, because the user hears audio immediately without an extra click.
- Bad, because every assistant turn generates a full audio render whether
  the user listens or not, multiplying character consumption by the number
  of turns.
- Bad, because streaming audio interleaved with the SSE event stream
  increases the latency budget and the complexity of the client-side event
  handling.
- Bad, because the cost model is unpredictable under demo load.

### Browser-native `SpeechSynthesis`

- Good, because there is no vendor dependency and no quota.
- Bad, because voice quality varies across browsers and OSes;
  healthcare-context clarity is not guaranteed.
- Bad, because it does not exercise the ElevenLabs integration, leaving the
  voice modality unproven.

### ElevenLabs Scribe for STT (chosen)

- Good, because it is purpose-built by the same vendor, one API key, one
  billing surface.
- Good, because it handles medical terminology and multilingual input
  (en-US, es-419, pt-BR) better than browser-native alternatives.
- Bad, because it requires an ElevenLabs API key and consumes the STT
  free-tier quota.

### Browser-native Web Speech API for STT

- Good, because there is no vendor dependency and no quota.
- Bad, because transcription quality is too low for healthcare utterances
  (drug names, conditions, accented multilingual input).
- Bad, because errors propagate into the RAG pipeline and can produce
  unsafe or nonsensical responses.

### OpenAI Whisper (API) for STT

- Good, because Whisper is a well-known, high-quality STT model.
- Bad, because it introduces a second vendor dependency (OpenAI) for a
  single capability, fragmenting the billing surface and the narrative.
- Bad, because it fragments the voice vendor surface: the demo uses
  ElevenLabs for TTS, so STT should come from the same provider to keep the
  billing surface and integration surface unified.

### Full-duplex voice agent (ElevenLabs Conversational AI)

- Good, because it is the most impressive demo of ElevenLabs capabilities.
- Good, because real-time bidirectional audio is the production-grade
  pattern for voice agents.
- Bad, because the cost model is per-minute of connected time, which is
  harder to control under demo load.
- Bad, because the implementation complexity (WebSocket management,
  interruption handling, VAD) is substantial for a reference
  implementation.
- Bad, because the click-to-play + push-to-talk pattern already proves
  channel-agnostic processing at lower cost and complexity.

### No voice at all

- Good, because it adds no cost, no dependency, no complexity.
- Bad, because a text-only surface does not exercise the voice modality,
  leaving the channel-agnostic claim unsupported by runnable evidence.

## More Information

- LLM vendor abstraction: [ADR-0002](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0002-llm-vendor-abstraction/)
- Deployment target and $0/month constraint: [ADR-0007](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0007-deployment/)
- Streaming architecture and SSE extension pattern: [ADR-0010](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0010-streaming-execution-graph/)
- Data layer and cost tracking (Supabase): [ADR-0011](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0011-data-layer-supabase/)
- Continuous improvement and usage storage: [ADR-0016](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0016-continuous-improvement-storage/)
- Guardrails and privacy redaction: [ADR-0005](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0005-guardrails/)
- ElevenLabs API documentation: <https://elevenlabs.io/docs/api-reference>
- ElevenLabs `eleven_multilingual_v2` model: <https://elevenlabs.io/docs/speech-synthesis/models>
- ElevenLabs Scribe STT: <https://elevenlabs.io/docs/capabilities/speech-to-text>
- ElevenLabs pricing and free-tier limits: <https://elevenlabs.io/pricing>
- MADR 4.0.0: <https://adr.github.io/madr/>
