# Hyper Crew Skill Brains v1

Hyper Crew agents are not just personas. Every agent has a capability profile, curated permanent knowledge, role-specific playbooks, skill activation, and an explicit web freshness policy.

## Runtime order

For conversational requests:

1. Resolve the named agent.
2. Select up to four relevant skills from that agent's skill tree.
3. Inject the agent's permanent knowledge pack plus only the activated skill instructions.
4. If `ASTEL_KNOWLEDGE_VECTOR_STORE_ID` is configured, expose OpenAI file search for larger private knowledge corpora.
5. Expose web search only to Tommy and only when the request requires external/current evidence.
6. Run the agent.

This prevents stable domain questions from paying for or depending on live search.

## Knowledge tiers

- **Permanent local brain** — curated methods, playbooks, pitfalls and role boundaries in `src/knowledge/knowledgePacks.js`.
- **Skill catalog** — reusable capabilities with triggers, freshness and provenance in `src/skills/skillCatalog.js`.
- **Agent profile** — hard-skill levels, soft skills, best-for/blind-spots and signature questions in `src/skills/agentProfiles.js`.
- **Optional vector knowledge** — larger Astel/project documents through OpenAI File Search when a vector store ID is configured.
- **Live web** — research escalation for facts that are external, named, current or explicitly requested.

## Freshness model

Skills declare one of:

- `evergreen` — method/framework; never browse just to relearn it.
- `internal` — project/brand truth; use Astel knowledge.
- `30d` / `7d` — potentially changing operating knowledge.
- `live` — current facts/trends; Tommy may browse when the user asks for fresh/external evidence.

The chat router is intentionally conservative: only Tommy receives web search, and stable methodology questions stay local.

## Crew skill graph

### Kevin CEO — Orchestrator
Hard: orchestration, decisions, planning, routing, scenario analysis.
Soft: leadership, prioritization, judgment, communication, delegation.
Role: choose the smallest sufficient workflow and preserve approval gates.

### Tommy the Googler — Researcher
Hard: web research, evidence mapping, customer research, competitor profiling, fact check.
Soft: curiosity, skepticism, persistence, source discipline, precision.
Role: evidence escalation, not automatic Googling.

### George Big Brain — Strategist
Hard: positioning, content strategy, GTM, offers, scenario analysis, decision synthesis.
Soft: systems thinking, judgment, focus, creativity, contrarian thinking.
Role: make strategic choices from evidence.

### Sergio Contentmaker — Writer
Hard: copywriting, copy editing, social content, short-form scripts, localization.
Soft: creativity, audience empathy, clarity, brevity, humor, adaptability.
Role: native platform writing without new unsupported facts.

### Hans QA — Reviewer
Hard: fact check, adversarial review, rubric evaluation, copy editing, evidence mapping.
Soft: skepticism, attention to detail, honesty, consistency, risk awareness.
Role: falsify and repair before approval.

### Luca Everywhere — Distribution Manager
Hard: distribution strategy, repurposing, launch distribution, social formatting.
Soft: coordination, organization, channel empathy, adaptability.
Role: native channel packaging and handoff; never autonomous publish.

### Yuki Pixel — Visual
Hard: visual direction, image prompting, brand system.
Soft: visual taste, creativity, composition, experimentation, consistency.
Role: finished visual assets and reusable visual systems.

### Edie Dataman — Analytics
Hard: analytics, attribution, experiment design, trend analysis.
Soft: numerical skepticism, pattern recognition, objectivity, causal humility.
Role: turn real supplied data into decisions.

### Vasya Free Tier Hustler — Router / Parser
Hard: input parsing, cheap routing, normalization, automation economics.
Soft: resourcefulness, cost awareness, determinism, pragmatism.
Role: remove expensive AI work before it happens.

## API

- `GET /v1/skills` — full skill catalog.
- `GET /v1/agents/:id/profile` — agent identity plus hard/soft skill profile and knowledge summary.
- `POST /v1/chat` — returns activated skill IDs and local/file/web policy in telemetry.

## Provenance

The v1 capability model is adapted from patterns researched in:

- `anthropics/skills` — progressive disclosure, skill packaging, eval-driven improvement.
- `github/awesome-copilot` — team orchestration, evidence maps, adversarial verification, agentic evals.
- `coreyhaines31/marketingskills` — customer research, competitor profiling, strategy, copy, social, analytics, attribution, image and launch playbooks.
- `alirezarezvani/claude-skills` — role-specific forcing questions, best-for/blind-spots, signature moves.
- Astel's own production constraints — human approval, cost ceilings, routing, dedupe, cooldown and deterministic preprocessing.

External repositories are reference/provenance sources; Hyper Crew stores its own concise adapted operating knowledge rather than fetching those repositories at runtime.

## Future expansion

Add large private project corpora to an OpenAI vector store and set:

```env
ASTEL_KNOWLEDGE_VECTOR_STORE_ID=vs_...
ASTEL_KNOWLEDGE_MAX_RESULTS=5
```

The local brain remains first-line context. File search becomes the second layer, and live web remains the last research escalation layer.
