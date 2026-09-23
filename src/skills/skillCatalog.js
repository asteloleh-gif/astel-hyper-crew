const SKILLS = Object.freeze([
  {
    id: "crew-orchestration",
    name: "Crew Orchestration",
    domain: "leadership",
    freshness: "evergreen",
    triggers: ["coordinate", "delegate", "workflow", "plan", "команда", "распредели", "кто должен", "что дальше"],
    instructions: [
      "Clarify the desired outcome, constraints and acceptance criteria before routing substantial work.",
      "Use the smallest capable crew; do not involve agents that add no value.",
      "Route by capability, preserve handoff context, and require explicit human approval before external mutation.",
      "Prefer Plan -> Execute -> Verify -> Handoff over open-ended discussion."
    ],
    sourceRefs: ["github/awesome-copilot:ai-team-orchestration"]
  },
  {
    id: "decision-synthesis",
    name: "Decision Synthesis",
    domain: "leadership",
    freshness: "evergreen",
    triggers: ["decide", "choose", "option", "tradeoff", "реши", "выбрать", "вариант", "приоритет"],
    instructions: [
      "Name the decision, alternatives, constraints, reversible vs irreversible parts, and missing evidence.",
      "Separate facts, assumptions and judgment.",
      "Return a clear decision frame and next checkpoint rather than vague pros/cons."
    ],
    sourceRefs: ["alirezarezvani/claude-skills:c-level-agents"]
  },
  {
    id: "project-planning",
    name: "Project Planning",
    domain: "operations",
    freshness: "evergreen",
    triggers: ["roadmap", "sprint", "milestone", "plan", "план", "этап", "дедлайн"],
    instructions: [
      "Break outcomes into dependency-aware milestones with one owner and observable done criteria.",
      "Keep planning proportional to risk and scope; small tasks should stay small.",
      "Record blockers, next action and handoff state."
    ],
    sourceRefs: ["github/awesome-copilot:ai-team-orchestration"]
  },
  {
    id: "web-research",
    name: "Web Research",
    domain: "research",
    freshness: "live",
    triggers: ["latest", "today", "current", "news", "search", "research", "найди", "поищи", "сейчас", "новости", "актуаль"],
    instructions: [
      "Search only when the request needs external or fresh evidence.",
      "Prefer primary/official sources, then reputable secondary sources; preserve dates and scope.",
      "Do not collapse disagreement: record supporting, contradicting, qualifying and missing evidence."
    ],
    sourceRefs: ["github/awesome-copilot:build-evidence-map"]
  },
  {
    id: "evidence-mapping",
    name: "Evidence Mapping",
    domain: "research",
    freshness: "evergreen",
    triggers: ["evidence", "sources", "verify", "proof", "источник", "доказ", "проверь"],
    instructions: [
      "Map each important claim to evidence and confidence.",
      "Distinguish direct evidence, inference, anecdote and unknown.",
      "Expose gaps instead of filling them with plausible text."
    ],
    sourceRefs: ["github/awesome-copilot:build-evidence-map"]
  },
  {
    id: "customer-research",
    name: "Customer Research",
    domain: "research",
    freshness: "30d",
    triggers: ["customer", "audience", "persona", "jtbd", "review", "клиент", "аудитори", "отзыв", "потребност"],
    instructions: [
      "Extract jobs, pains, desired outcomes, objections, switching triggers and exact customer language.",
      "Separate observed voice-of-customer evidence from persona assumptions.",
      "Turn findings into implications for positioning, offer, copy and product."
    ],
    sourceRefs: ["coreyhaines31/marketingskills:customer-research"]
  },
  {
    id: "competitor-research",
    name: "Competitor Profiling",
    domain: "research",
    freshness: "30d",
    triggers: ["competitor", "alternative", "конкурент", "аналог", "рынок"],
    instructions: [
      "Profile audience, positioning, offer, proof, pricing signals, channels and differentiators.",
      "Compare like-for-like and preserve source dates.",
      "Identify gaps/opportunities without assuming competitor success."
    ],
    sourceRefs: ["coreyhaines31/marketingskills:competitor-profiling"]
  },
  {
    id: "positioning",
    name: "Positioning",
    domain: "strategy",
    freshness: "evergreen",
    triggers: ["position", "category", "differentiat", "позициони", "категори", "отстрой"],
    instructions: [
      "Start with best-fit customer, alternatives, unique attributes, value and market category.",
      "Make one primary positioning choice before channel tactics.",
      "Use customer language and evidence; avoid generic adjectives."
    ],
    sourceRefs: ["coreyhaines31/marketingskills:product-marketing", "alirezarezvani/claude-skills:c-level-cmo"]
  },
  {
    id: "content-strategy",
    name: "Content Strategy",
    domain: "strategy",
    freshness: "30d",
    triggers: ["content strategy", "content plan", "контент", "рубри", "темы", "серия"],
    instructions: [
      "Tie content to audience, business objective, funnel stage and repeatable content pillars.",
      "Choose formats that fit the channel instead of cross-posting unchanged.",
      "Balance proven formats with controlled experiments."
    ],
    sourceRefs: ["coreyhaines31/marketingskills:content-strategy"]
  },
  {
    id: "go-to-market",
    name: "Go To Market",
    domain: "strategy",
    freshness: "30d",
    triggers: ["gtm", "launch", "market", "запуск", "рынок", "выход"],
    instructions: [
      "Define ICP, wedge, value proposition, acquisition motion, activation path and feedback loop.",
      "Sequence the smallest test that can invalidate the riskiest assumption.",
      "Do not confuse distribution activity with product-market fit."
    ],
    sourceRefs: ["coreyhaines31/marketingskills:launch", "coreyhaines31/marketingskills:marketing-plan"]
  },
  {
    id: "offer-design",
    name: "Offer Design",
    domain: "strategy",
    freshness: "evergreen",
    triggers: ["offer", "price", "package", "оффер", "цена", "пакет", "гарант"],
    instructions: [
      "Define outcome, scope, proof, risk reversal, constraints and price logic.",
      "Use real scarcity only; never invent urgency.",
      "Separate offer design from copywriting and from pricing architecture."
    ],
    sourceRefs: ["coreyhaines31/marketingskills:offers"]
  },
  {
    id: "scenario-analysis",
    name: "Scenario Analysis",
    domain: "strategy",
    freshness: "evergreen",
    triggers: ["scenario", "what if", "risk", "сценар", "если", "риск"],
    instructions: [
      "Build base, upside and downside scenarios around the few variables that change the decision.",
      "State assumptions explicitly and identify leading indicators.",
      "Prefer reversible experiments when uncertainty is high."
    ],
    sourceRefs: ["alirezarezvani/claude-skills:c-level-agents"]
  },
  {
    id: "copywriting",
    name: "Conversion Copywriting",
    domain: "writing",
    freshness: "evergreen",
    triggers: ["copy", "headline", "cta", "landing", "текст", "заголов", "оффер", "лендинг"],
    instructions: [
      "Write for one audience, one problem, one promise and one next action.",
      "Prefer concrete proof and specificity over hype.",
      "Preserve factual boundaries; persuasive language cannot manufacture evidence."
    ],
    sourceRefs: ["coreyhaines31/marketingskills:copywriting"]
  },
  {
    id: "copy-editing",
    name: "Copy Editing",
    domain: "writing",
    freshness: "evergreen",
    triggers: ["edit", "rewrite", "polish", "shorten", "перепиши", "сократи", "почист", "редакт"],
    instructions: [
      "Preserve intended meaning while improving clarity, rhythm, specificity and platform fit.",
      "Remove repetition, unsupported certainty, filler and generic AI phrasing.",
      "Do not turn editing into a different strategy unless asked."
    ],
    sourceRefs: ["coreyhaines31/marketingskills:copy-editing"]
  },
  {
    id: "social-content",
    name: "Social Content",
    domain: "writing",
    freshness: "30d",
    triggers: ["threads", "instagram", "facebook", "tiktok", "reels", "shorts", "social", "пост", "рилс", "шортс"],
    instructions: [
      "Front-load comprehension: the first line/seconds must make the premise obvious.",
      "Adapt structure, length, CTA and visual rhythm to the platform.",
      "Use hooks as packaging, not as a substitute for substance."
    ],
    sourceRefs: ["coreyhaines31/marketingskills:social"]
  },
  {
    id: "short-form-script",
    name: "Short-form Video Script",
    domain: "writing",
    freshness: "30d",
    triggers: ["script", "video", "hook", "short", "reel", "сценар", "видео", "хук"],
    instructions: [
      "Write visually executable beats: hook, setup, action/proof, payoff, CTA.",
      "Keep spoken language natural and cut anything that does not earn screen time.",
      "Design the first 1-2 seconds for immediate comprehension."
    ],
    sourceRefs: ["coreyhaines31/marketingskills:social"]
  },
  {
    id: "localization",
    name: "Localization",
    domain: "writing",
    freshness: "evergreen",
    triggers: ["translate", "localize", "english", "ukrain", "russian", "перевод", "англ", "украин", "рус"],
    instructions: [
      "Translate intent, register and platform conventions, not word order.",
      "Preserve facts, names and numbers exactly unless localization requires formatting.",
      "Prefer natural native phrasing over literal calques."
    ],
    sourceRefs: ["internal:astel"]
  },
  {
    id: "fact-check",
    name: "Fact Check",
    domain: "quality",
    freshness: "7d",
    triggers: ["fact", "verify", "check", "проверь", "факт", "правда"],
    instructions: [
      "Extract verifiable claims first, then inspect support, contradiction and uncertainty.",
      "Flag claims that need fresh sources instead of silently accepting them.",
      "Differentiate factual error from wording risk."
    ],
    sourceRefs: ["github/awesome-copilot:doublecheck"]
  },
  {
    id: "adversarial-review",
    name: "Adversarial Review",
    domain: "quality",
    freshness: "evergreen",
    triggers: ["review", "qa", "critique", "audit", "ревью", "провер", "аудит"],
    instructions: [
      "Try to falsify the draft: unsupported claims, hidden assumptions, edge cases, ambiguity and execution failure.",
      "Return concrete repair instructions prioritized by severity.",
      "Do not rewrite everything when a surgical fix is enough."
    ],
    sourceRefs: ["github/awesome-copilot:doublecheck", "github/awesome-copilot:agentic-eval"]
  },
  {
    id: "rubric-evaluation",
    name: "Rubric Evaluation",
    domain: "quality",
    freshness: "evergreen",
    triggers: ["score", "rubric", "eval", "benchmark", "оцен", "критер"],
    instructions: [
      "Use explicit observable criteria and evidence for each pass/fail judgment.",
      "Keep subjective taste separate from objective defects.",
      "Prefer repeatable tests over one-off vibes where possible."
    ],
    sourceRefs: ["github/awesome-copilot:agentic-eval", "anthropics/skills:skill-creator"]
  },
  {
    id: "distribution-strategy",
    name: "Distribution Strategy",
    domain: "distribution",
    freshness: "30d",
    triggers: ["distribute", "channel", "publish", "распростран", "канал", "публикац", "постинг"],
    instructions: [
      "Match asset, audience intent and channel behavior before choosing destinations.",
      "Repurpose the idea, not blindly duplicate the artifact.",
      "Separate draft planning from actual publication and preserve approval gates."
    ],
    sourceRefs: ["coreyhaines31/marketingskills:social"]
  },
  {
    id: "content-repurposing",
    name: "Content Repurposing",
    domain: "distribution",
    freshness: "30d",
    triggers: ["repurpose", "reuse", "crosspost", "переупак", "дубл", "из одного"],
    instructions: [
      "Extract the core idea, then rebuild native variants per channel.",
      "Preserve source truth while changing hook, pacing, format and CTA.",
      "Avoid duplicate-looking spam across adjacent channels."
    ],
    sourceRefs: ["coreyhaines31/marketingskills:social"]
  },
  {
    id: "launch-distribution",
    name: "Launch Distribution",
    domain: "distribution",
    freshness: "30d",
    triggers: ["launch", "release", "запуск", "релиз"],
    instructions: [
      "Sequence owned, social, community and partner surfaces around a single conversion objective.",
      "Define pre-launch, launch-day and follow-through assets.",
      "Track learnings and feed them back to strategy/analytics."
    ],
    sourceRefs: ["coreyhaines31/marketingskills:launch"]
  },
  {
    id: "visual-direction",
    name: "Visual Direction",
    domain: "visual",
    freshness: "evergreen",
    triggers: ["visual", "design", "style", "composition", "визуал", "дизайн", "стиль", "композ"],
    instructions: [
      "Define hierarchy, focal point, contrast, composition, typography role and brand constraints before decoration.",
      "Make concepts specific enough to execute and evaluate.",
      "Avoid generic AI gradients/ornaments unless they serve the brief."
    ],
    sourceRefs: ["anthropics/skills:canvas-design"]
  },
  {
    id: "image-prompting",
    name: "Image Prompting",
    domain: "visual",
    freshness: "30d",
    triggers: ["image", "generate", "prompt", "avatar", "thumbnail", "картин", "сгенер", "аватар", "облож"],
    instructions: [
      "Describe subject, framing, environment, lighting, materials, palette and exclusions.",
      "Preserve identity/series consistency explicitly when creating a set.",
      "Optimize for the final crop and small-size readability."
    ],
    sourceRefs: ["coreyhaines31/marketingskills:image"]
  },
  {
    id: "brand-system",
    name: "Brand System",
    domain: "visual",
    freshness: "internal",
    triggers: ["brand", "palette", "logo", "бренд", "палитр", "лого"],
    instructions: [
      "Treat brand rules as constraints: color, typography, spacing, iconography, voice and repeated visual motifs.",
      "Prefer a reusable system over isolated pretty outputs.",
      "Project-specific brand references override generic design taste."
    ],
    sourceRefs: ["anthropics/skills:brand-guidelines", "internal:astel"]
  },
  {
    id: "analytics",
    name: "Product & Marketing Analytics",
    domain: "analytics",
    freshness: "30d",
    triggers: ["analytics", "metrics", "kpi", "funnel", "аналит", "метрик", "воронк", "kpi"],
    instructions: [
      "Start from the business decision, then choose metric definitions and dimensions.",
      "Keep numerator/denominator, time window and population explicit.",
      "Separate descriptive movement from causal explanation."
    ],
    sourceRefs: ["coreyhaines31/marketingskills:analytics"]
  },
  {
    id: "attribution",
    name: "Attribution",
    domain: "analytics",
    freshness: "30d",
    triggers: ["attribution", "cac", "channel revenue", "атрибуц", "канал", "cac"],
    instructions: [
      "Use a source of truth for conversion counts; treat channels as competing explanations, not additive totals.",
      "Know the limits of first-touch, last-touch, multi-touch, MMM and incrementality.",
      "Report confidence and measurement gaps rather than false reconciliation."
    ],
    sourceRefs: ["coreyhaines31/marketingskills:attribution"]
  },
  {
    id: "experiment-design",
    name: "Experiment Design",
    domain: "analytics",
    freshness: "evergreen",
    triggers: ["experiment", "ab test", "test", "эксперимент", "a/b", "тест"],
    instructions: [
      "Write hypothesis, primary metric, guardrails, unit of randomization, sample horizon and stop rule before results.",
      "Change one decision-relevant variable at a time when possible.",
      "Do not call noise a winner."
    ],
    sourceRefs: ["coreyhaines31/marketingskills:ab-testing"]
  },
  {
    id: "trend-analysis",
    name: "Trend Analysis",
    domain: "analytics",
    freshness: "live",
    triggers: ["trend", "viral", "spike", "тренд", "вирус", "скачок"],
    instructions: [
      "Separate level from velocity: a large trend can be falling and a small trend can be accelerating.",
      "Compare against baseline and identify plausible external drivers.",
      "Fresh trend claims require current data."
    ],
    sourceRefs: ["internal:astel"]
  },
  {
    id: "input-parsing",
    name: "Input Parsing",
    domain: "automation",
    freshness: "evergreen",
    triggers: ["parse", "extract", "fields", "парс", "извлеч", "поля"],
    instructions: [
      "Normalize input into explicit fields without changing meaning.",
      "Preserve raw values when normalization is lossy.",
      "Return deterministic structures suitable for downstream automation."
    ],
    sourceRefs: ["internal:astel"]
  },
  {
    id: "routing",
    name: "Cheap Routing",
    domain: "automation",
    freshness: "evergreen",
    triggers: ["route", "classify", "dispatch", "роут", "классиф", "распред"],
    instructions: [
      "Use deterministic rules first, cheap classification second, expensive reasoning last.",
      "Return destination plus confidence/reason; route ambiguous cases to Kevin.",
      "Apply cooldown, dedupe and idempotency before expensive calls."
    ],
    sourceRefs: ["internal:astel"]
  },
  {
    id: "data-normalization",
    name: "Data Normalization",
    domain: "automation",
    freshness: "evergreen",
    triggers: ["normalize", "json", "csv", "schema", "нормализ", "json", "csv", "схем"],
    instructions: [
      "Validate schema, normalize types, canonicalize keys and preserve provenance.",
      "Deduplicate using stable identifiers before fuzzy heuristics.",
      "Fail closed on malformed fields that would change downstream actions."
    ],
    sourceRefs: ["internal:astel"]
  },
  {
    id: "automation-economics",
    name: "Automation Economics",
    domain: "automation",
    freshness: "30d",
    triggers: ["cheap", "cost", "free", "token", "дешев", "стоим", "токен", "free tier"],
    instructions: [
      "Estimate call count, token/tool cost and failure/retry amplification before adding AI.",
      "Cache stable results and batch deterministic work.",
      "Prefer free/local transforms when model reasoning adds no value."
    ],
    sourceRefs: ["internal:astel"]
  }
]);

const SKILL_MAP = new Map(SKILLS.map(skill => [skill.id, skill]));

module.exports = { SKILLS, SKILL_MAP };
