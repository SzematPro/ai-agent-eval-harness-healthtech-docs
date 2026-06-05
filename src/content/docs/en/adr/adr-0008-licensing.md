---
title: "ADR-0008: Code license"
description: Why the code license moved from MIT to Apache 2.0 at v1.0.0 for the explicit patent grant, NOTICE, and trademark clause.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# ADR-0008: Code license - Apache 2.0

- Status: Accepted
- Date: 2026-05-13
- Decision-makers: Waldemar Szemat

## Context and Problem Statement

The project shipped at `v0.1.0` (2026-03-24) under the MIT
License, declared in the license file, the package metadata, the
Hugging Face Spaces card, the README badge and footer, and the
project license posture. The initial choice was MIT because it is the
shortest path to "permissive open source" with the smallest cognitive
footprint; the alternatives were not weighed in writing at that point.

At v1.0.0 the project graduates from a scaffold to a flagship
reference implementation. Two shifts make the license posture worth
re-litigating: (a) the AI patent landscape in 2026 is materially more
aggressive than it was when MIT became the default for permissive code
repositories, and the absence of an explicit patent grant in MIT is
the most-cited practical risk to a downstream adopter who pulls a
repository into a commercial product; (b) the project should not
foreclose the option-value to relicense a downstream fork (for example
Business Source License 1.1 or Elastic License 2.0) if that ever
becomes relevant, and the base license should keep that path open.

How do we pick a code license for v1.0.0 that signals "permissive,
adoption-friendly, enterprise-credible" to the same readers MIT was
chosen for, while adding (i) an explicit patent grant covering both
sides of the adopter relationship, (ii) NOTICE-file attribution that
survives derivative works, and (iii) a trademark clause that
constrains downstream use of the project name and the author's
identity?

## Decision Drivers

- **Patent-grant explicitness.** The 2026 AI patent landscape
  (rising rate of LLM-adjacent NPE filings, public industry letters
  and licensing platforms calling out MIT's patent-grant ambiguity)
  makes an implicit MIT patent grant a load-bearing risk for any
  enterprise adopter who pulls the harness into production. Apache
  2.0 section 3 grants an explicit, royalty-free patent license from
  each contributor and its termination-on-suit clause is a deterrent
  against a downstream contributor who sues over the same code.
- **NOTICE attribution.** Apache 2.0 section 4(d) requires
  distributors of derivative works to include the upstream NOTICE
  file. For a reference implementation whose primary signal is the
  author's name, this preserves the attribution chain when the harness
  is forked into a private product. MIT requires the copyright notice
  but does not pin it to a NOTICE file separate from the source.
- **Trademark protection.** Apache 2.0 section 6 explicitly withholds
  permission to use the licensor's trade names, trademarks, service
  marks, or product names except for descriptive use. This protects
  the project name and the author's identity from being recycled in
  a fork's brand without going through the trademark route. MIT is
  silent on trademarks.
- **Adoption-profile parity with MIT.** Apache 2.0 is in the OSI's
  "popular" tier alongside MIT and BSD-3-Clause and carries
  approximately equivalent permissions: commercial use,
  modification, distribution, private use, sublicensing. A reader
  who would have adopted MIT will adopt Apache 2.0; the project
  signal is unchanged.
- **Optionality for a future re-licensing path.** Relicensing a fork
  to BUSL 1.1 or ELv2 is straightforward from Apache 2.0 because the
  original code stays Apache and only the fork carries any added
  restriction. From MIT the path is equivalent in mechanics but reads
  as a weaker source-side contribution (no NOTICE-attribution chain,
  no patent grant on the base layer).
- **Tone parity with serious AI projects.** Kubernetes, TensorFlow,
  Apache Airflow, Apache Beam, and the bulk of the Apache Software
  Foundation projects ship under Apache 2.0. The license is read by
  a technical evaluator or an enterprise procurement reviewer as a
  signal of "production-grade open source", not "weekend hack
  permissively published". The signal cost is zero relative to MIT
  and the upside is non-trivial for the audience this project is
  written for.
- **License-compatibility with the project's dependency set.** The
  full dependency graph (LangGraph, LangChain adapters, FastAPI,
  Pydantic, Chroma, sentence-transformers, DeepEval, Ragas,
  Phoenix, OpenInference, OpenTelemetry, Langfuse, Promptfoo) is
  either Apache 2.0 or compatible permissive (MIT, BSD). Apache 2.0
  introduces no new compatibility constraint inside the dependency
  set; downstream Apache 2.0 distribution is unconstrained by the
  upstream licenses.

## Considered Options

- **Apache License 2.0** (chosen): permissive, explicit patent
  grant, NOTICE attribution, trademark clause.
- **MIT License** (status-quo): permissive, no explicit patent
  grant, no NOTICE attribution requirement, no trademark clause.
- **Business Source License 1.1 (BUSL)**: source-available, time-
  delayed open source (typically converts to Apache 2.0 after
  four years), commercial-use restriction in the meantime.
- **Elastic License v2 (ELv2)**: source-available, denies hosted-
  managed-service use and prohibits removing licensing or
  warranty notices.
- **GNU AGPL v3**: copyleft, requires source disclosure for
  networked use of derivatives. Strongest user-freedom guarantee.
- **GNU GPL v3**: copyleft for non-network use, requires
  source disclosure of derivatives that are distributed.
- **Dual license (MIT for non-commercial + commercial license)**:
  upstream-friendly for hobbyist forks while reserving paid use.
- **CC-BY-4.0**: creative-commons attribution; meant for content
  and data, not for source code (FSF and OSI advise against it
  for software). Not applicable to the code license question, kept
  in the option list as the foil that anchors why the answer is
  not a CC family license.

## Decision Outcome

Chosen option: **Apache License 2.0**, because it adds the three
properties (explicit patent grant, NOTICE attribution, trademark
clause) without changing the adoption-friendliness signal the initial
MIT choice was optimising for, and because it preserves the
optionality to fork-and-relicense under BUSL 1.1 or ELv2 while keeping
the open base unchanged. The copyleft families (AGPL, GPL) are read as
adoption-hostile for the primary audience (technical evaluators,
enterprise procurement reviewers) and would cap downstream integration
into closed product code. BUSL and ELv2 are correct choices for a
*productised overlay* if and when one ships; they are the wrong choice
for the *reference implementation* whose purpose is to be read, forked,
adapted, and integrated.

### Confirmation

- The license file at the repository root is byte-equivalent to the
  canonical Apache 2.0 text at
  <https://www.apache.org/licenses/LICENSE-2.0.txt> with a pre-filled
  copyright block appended below the APPENDIX.
- A NOTICE file at the repository root carries the project name, the
  2026 copyright line, the attribution-to-author paragraph, and a
  pointer to the license.
- The package metadata declares the `Apache-2.0` SPDX identifier and
  carries the OSI-approved Apache Software License classifier.
- The Hugging Face Spaces card front-matter declares
  `license: apache-2.0`.
- The README badge row carries an Apache-2.0 shield; the license
  section names the new license and points at the license and NOTICE
  files.
- The project license posture names Apache 2.0 and links back to this
  ADR.
- CI is green on the v1.0.0 release (lint + type-check + test suite,
  plus Postgres integration tests skip-gated, against the coverage
  gate).

## Consequences

### Positive

- **Explicit patent grant** reduces the load-bearing risk an
  enterprise adopter inherits when pulling the harness into a
  commercial product.
- **NOTICE attribution** preserves the author's identity through
  forks and derivative works, which is the primary
  signal the project carries.
- **Trademark clause** narrows the surface a fork can exploit to
  ride the project name or the author's identity in a derivative
  brand.
- **License-tone alignment** with Kubernetes, TensorFlow, the
  Apache Software Foundation, and most enterprise-credible OSS
  projects.
- **Keeps a future relicensing option open**: the Apache base layer
  is the standard substrate from which a BUSL 1.1 or ELv2 fork is
  built.
- **Zero adoption-friction delta** vs MIT for the audiences this
  project is written for; downstream contributors can integrate
  Apache 2.0 code into permissive, copyleft, and proprietary code
  with the same mechanics MIT allows.

### Negative

- **Header-comment ceremony.** Apache 2.0's "How to apply" boilerplate
  is conventional but not mandatory at the file level. The project
  leaves the boilerplate to the license and NOTICE files and does not
  retrofit a per-file header, which is consistent with how many
  Apache-2.0 codebases ship.
- **Slightly heavier README footer.** The Apache 2.0 footer pulls
  in a second file (NOTICE) and a longer attribution line than the
  MIT one-liner. Acceptable cost.
- **Newcomer-licensing literacy.** A first-time contributor may
  read the longer license text and assume more friction than there
  is. Mitigated by the project license posture and this ADR being two
  clicks away.

### Neutral

- **NOTICE file becomes part of the repo layout.** A new top-level
  file joins the license, README, security policy, contributing
  guide, and project license posture at the root.
- **SPDX identifier update.** Tooling that reads the package
  `license` field (uv, pip, GitHub's license detection) re-parses
  the new SPDX value `Apache-2.0`; no behavioural change in the
  build.
- **Data-license declarations untouched.** The data statement and the
  synthetic-data documentation continue to describe the synthetic
  data plane under its existing per-source posture (US-government
  public-domain, WHO-EML paraphrased, generated dialogues
  MIT-redistributable). The code-license change does not propagate
  into the data-license declarations because data licensing is a
  separate concern with separate upstream constraints.

## Pros and Cons of the Options

### Apache License 2.0

- Good, because it adds the explicit patent grant MIT lacks.
- Good, because section 4(d) NOTICE attribution preserves the
  signal the project carries in derivative works.
- Good, because the section 6 trademark clause narrows the
  brand-recycling surface.
- Good, because it is OSI-popular tier and reads as
  enterprise-credible.
- Good, because it does not foreclose a future BUSL / ELv2 fork.
- Bad, because the boilerplate "How to apply" header is one more
  ceremony than MIT's three-line copyright block.

### MIT License (status-quo)

- Good, because it is the shortest permissive license and the most
  familiar to a casual reader.
- Bad, because it has no explicit patent grant; downstream patent
  risk inherits the upstream ambiguity.
- Bad, because it has no NOTICE-attribution requirement; an
  attribution chain only survives by convention.
- Bad, because it is silent on trademarks; the project name and
  author identity travel with a fork's brand without contractual
  constraint.

### Business Source License 1.1 (BUSL)

- Good, because it lets the author reserve commercial use for a
  defined window before the source converts to Apache 2.0.
- Bad, because it is source-available, not open source by OSI
  definition; it loses the "permissive open source" adoption
  signal the project depends on.
- Bad, because it is the right license for a productised overlay,
  not for a public reference implementation whose purpose is to be
  read, forked, and reused.

### Elastic License v2 (ELv2)

- Good, because it denies third-party hosted-managed-service use
  of the code.
- Bad, because, like BUSL, it is source-available not open source;
  same audience mismatch.

### GNU AGPL v3

- Good, because it is the strongest copyleft guarantee for users
  of networked derivatives.
- Bad, because it caps adoption by enterprise integrators who
  would have to release their proprietary integrations.
- Bad, because the primary audience reads AGPL as
  procurement-hostile and the README badge carries a chilling
  effect on the audience the project targets.

### GNU GPL v3

- Good, because it is the canonical copyleft license and well
  understood.
- Bad, because the copyleft propagation through derivative works
  caps adoption in closed-source contexts in the same way as
  AGPL, with the additional confusion that GPL applies to
  distribution and AGPL applies to network use.

### Dual license (MIT + commercial)

- Good, because it reserves the commercial revenue path while
  keeping a hobbyist-friendly upstream.
- Bad, because it introduces friction at adoption time
  ("which license applies to me?") and doubles the operational
  surface for the project.

### CC-BY-4.0

- Bad, because Creative Commons families are not designed for
  source code; OSI does not list CC-BY among approved software
  licenses, and FSF advises against using it for code.

## More Information

- Apache License 2.0 canonical text:
  <https://www.apache.org/licenses/LICENSE-2.0>
- Choose a License - Apache 2.0:
  <https://choosealicense.com/licenses/apache-2.0/>
- OSI: Apache License 2.0:
  <https://opensource.org/license/apache-2-0>
- Apache Software Foundation guidance on NOTICE files:
  <https://www.apache.org/legal/src-headers.html>
- Adjacent ADR: [ADR-0007: Deployment target](./adr-0007-deployment.md)
- MADR 4.0.0: <https://adr.github.io/madr/>
