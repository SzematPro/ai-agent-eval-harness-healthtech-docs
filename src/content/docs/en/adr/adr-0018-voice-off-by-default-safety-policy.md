---
title: "ADR-0018: Voice OFF by Default Safety Policy"
description: Why the optional voice mode ships OFF by default, gated behind explicit consent, with audio never retained.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# ADR-0018: Voice OFF by Default — Safety Policy

- Status: Accepted
- Date: 2026-05-27 (retroactive — voice shipped in v2.0.0)
- Decision-makers: Waldemar Szemat

## Context and Problem Statement

[ADR-0014](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0014-voice-extension/) added voice (TTS via ElevenLabs
`eleven_multilingual_v2`, STT via ElevenLabs Scribe) as an extension to
the demo SPA. That ADR captures the design but does not codify the safety
stance for the default state of the voice toggle.

Voice in a regulated-adjacent demo introduces a different consent and
risk surface than text:

- **Impersonation / deepfake**: a synthesised voice can be
  misinterpreted as a recording of a real person.
- **Privacy**: STT audio is processed in-flight even when the demo
  does not retain it; the consent burden is higher than for text.
- **Audio-cue authority**: a voice that sounds clinical can be heard
  as instruction even when the text frames a refusal.

The decision is: what is the default state of the voice toggle for
a first-time visitor?

## Decision Drivers

- **Consent-first posture**: regulated-adjacent demos demonstrate
  consent, they do not assume it.
- **Deepfake exposure**: defaulting voice ON puts a synthetic voice in
  every visitor's ears as the first impression. That is the wrong
  signal.
- **Locale parity**: the default must be uniform across en / es-419 /
  pt-BR. A locale that defaults differently would be hard to defend.
- **Reversibility**: opt-in must be revocable any time without losing
  the text experience.

## Considered Options

- **Option A**: Voice ON by default; the toggle is a "mute"
  affordance.
- **Option B**: Voice OFF by default; the toggle is an "enable"
  affordance. Persistence in `localStorage`.
- **Option C**: Voice gated behind an explicit privacy modal at every
  session (no persistence).

## Decision Outcome

Chosen option: **Option B** — Voice OFF by default, opt-in via toggle,
opt-in persisted to `localStorage` per device. The load-bearing reason
is consent-first posture: a regulated-adjacent demo that talks the
moment a visitor opens it has chosen the wrong default. Persistence
respects the user's earlier consent without nagging at every session;
the explicit footer notice "Audio NOT retained" is shown regardless of
toggle state, so the consent context never disappears.

### Confirmation

- The voice toggle in the demo SPA defaults to unchecked.
- The toggle reads and writes a `voice_enabled` flag in `localStorage`;
  its default value is `false`.
- A one-time-per-device voice disclosure modal is the consent gate that
  flips the toggle ON.
- The deepfake-and-consent governance note documents the policy and
  references this ADR (see [voice consent and deepfake
  policy](/ai-agent-eval-harness-healthtech-docs/en/governance/voice-consent-deepfake/)).
- Locale parity: the toggle is OFF by default in en, es-419, pt-BR;
  the disclosure modal is fully translated in all three.

## Consequences

### Positive

- First-visit experience is silent. The consent decision is the
  user's, not the demo's.
- Deepfake exposure is bounded to users who explicitly enabled voice.
- The "Audio NOT retained" footer notice carries the consent context
  visibly at all times.
- Locale parity is enforced.

### Negative

- One extra click for users who actively want voice. Small UX cost.

### Neutral

- The `localStorage` persistence is per-device. A user on two devices
  configures voice independently per device. That is acceptable for a
  demo; a production deployment would migrate to a server-side
  preference if it ever shipped voice.

## Pros and Cons of the Options

### Option A: Voice ON by default

- Good, because zero-friction discovery of the voice feature.
- Bad, because a synthetic voice plays on first visit — consent is
  retroactive, not prior.
- Bad, because deepfake exposure for every visitor.
- Bad, because hard to defend to a clinical reviewer.

### Option B (chosen): Voice OFF by default + persisted opt-in

- Good, because consent-first.
- Good, because deepfake exposure is bounded to opted-in users.
- Good, because the disclosure modal carries the explicit voice +
  privacy framing.
- Bad, because one extra click for users who want voice.

### Option C: Modal every session

- Good, because consent is re-affirmed each session.
- Bad, because nag-pattern UX. Drives consent fatigue.
- Bad, because a user who consented yesterday is asked again today
  for no operational gain.

## More Information

- [ADR-0014](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0014-voice-extension/) — voice extension design
- [Voice consent and deepfake policy](/ai-agent-eval-harness-healthtech-docs/en/governance/voice-consent-deepfake/)
- MADR 4.0.0: <https://adr.github.io/madr/>
