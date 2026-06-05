---
title: "ADR-NNNN: Short Title"
description: MADR 4.0.0 template for new architecture decision records in this reference implementation.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# ADR-NNNN: Short Title

- Status: Proposed
- Date: YYYY-MM-DD
- Decision-makers: Waldemar Szemat
- Consulted: (optional)
- Informed: (optional)

## Context and Problem Statement

Describe the architectural context, the forces at play, and the concrete
problem statement in two to four short paragraphs.

A well-phrased problem statement reads as a question: "How do we ...?" Make
the scope explicit; what is in and what is deliberately out.

## Decision Drivers

- Driver 1: a property the chosen option must satisfy
- Driver 2: a constraint we cannot violate (license, free-tier budget,
  regulatory line, latency budget)
- Driver 3: a demonstration / didactic signal we want the reference
  implementation to send
- Driver 4: a downstream evolution that should remain cheap (swap vendor,
  swap store, swap framework)

## Considered Options

- **Option A**: one-line summary
- **Option B**: one-line summary
- **Option C**: one-line summary

## Decision Outcome

Chosen option: **Option X**, because (one paragraph: the single most
load-bearing reason, plus the second-order reasons, plus how the option
preserves the option-value to swap later).

### Confirmation

How will we know the decision was honoured? (e.g. CI job, type-check,
import-test, eval-gate, manual review checklist).

## Consequences

### Positive

- Three to six concrete positive consequences (what becomes easier, what
  becomes cheaper, what the reference implementation now demonstrates)

### Negative

- Three to six honest costs (lock-in pressure, learning curve, ops
  burden, license caveat)

### Neutral

- Three to six things that change but are neither clearly good nor bad
  (new abstraction surface, new dependency in the lockfile)

## Pros and Cons of the Options

### Option A

- Good, because ...
- Good, because ...
- Bad, because ...
- Bad, because ...

### Option B

- Good, because ...
- Bad, because ...

### Option C

- Good, because ...
- Bad, because ...

## More Information

- Upstream documentation: `https://example.com/docs`
- Supporting article: `https://example.com/blog`
- MADR 4.0.0: <https://adr.github.io/madr/>
