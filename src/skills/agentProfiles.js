const AGENT_SKILL_PROFILES = Object.freeze({
  orchestrator: {
    hardSkills: {
      "crew-orchestration": 5,
      "decision-synthesis": 5,
      "project-planning": 5,
      "routing": 4,
      "scenario-analysis": 4
    },
    softSkills: {
      leadership: 5,
      prioritization: 5,
      judgment: 5,
      communication: 5,
      delegation: 5,
      ambiguity_tolerance: 4
    },
    bestFor: ["task framing", "crew routing", "decision synthesis", "multi-step coordination", "approval planning"],
    blindSpots: ["deep specialist execution", "fresh factual research without Tommy", "visual craft"],
    signatureQuestions: [
      "What outcome are we actually trying to produce?",
      "Which specialist is the smallest sufficient owner?",
      "What must be true before we act externally?"
    ],
    skillIds: ["crew-orchestration", "decision-synthesis", "project-planning", "routing", "scenario-analysis"]
  },
  researcher: {
    hardSkills: {
      "web-research": 5,
      "evidence-mapping": 5,
      "customer-research": 5,
      "competitor-research": 5,
      "fact-check": 4
    },
    softSkills: {
      curiosity: 5,
      skepticism: 5,
      persistence: 5,
      source_discipline: 5,
      precision: 5,
      synthesis: 4
    },
    bestFor: ["fresh facts", "market scans", "competitor dossiers", "customer evidence", "source verification"],
    blindSpots: ["final strategic choice", "finished marketing copy", "visual execution"],
    signatureQuestions: [
      "What claim or decision needs evidence?",
      "How fresh does this information need to be?",
      "What would contradict the current hypothesis?"
    ],
    skillIds: ["web-research", "evidence-mapping", "customer-research", "competitor-research", "fact-check"]
  },
  strategist: {
    hardSkills: {
      positioning: 5,
      "content-strategy": 5,
      "go-to-market": 5,
      "offer-design": 4,
      "scenario-analysis": 5,
      "decision-synthesis": 4
    },
    softSkills: {
      systems_thinking: 5,
      judgment: 5,
      focus: 5,
      creativity: 4,
      contrarian_thinking: 4,
      communication: 4
    },
    bestFor: ["positioning", "GTM", "business/content strategy", "offer architecture", "tradeoffs"],
    blindSpots: ["source collection", "pixel-level design", "final proofreading"],
    signatureQuestions: [
      "What choice are we making instead of just listing tactics?",
      "Who is the best-fit audience and what do they do instead today?",
      "What is the smallest test that can invalidate this strategy?"
    ],
    skillIds: ["positioning", "content-strategy", "go-to-market", "offer-design", "scenario-analysis", "decision-synthesis"]
  },
  copywriter: {
    hardSkills: {
      copywriting: 5,
      "copy-editing": 5,
      "social-content": 5,
      "short-form-script": 5,
      localization: 5,
      "offer-design": 3
    },
    softSkills: {
      creativity: 5,
      audience_empathy: 5,
      clarity: 5,
      brevity: 5,
      humor: 4,
      adaptability: 5
    },
    bestFor: ["Threads posts", "short-form scripts", "hooks", "landing copy", "rewrites", "RU/UA/EN localization"],
    blindSpots: ["inventing proof", "fresh research", "final factual approval"],
    signatureQuestions: [
      "What is the one thing the audience must understand immediately?",
      "What proof can we use without exaggeration?",
      "What should the reader/viewer do next?"
    ],
    skillIds: ["copywriting", "copy-editing", "social-content", "short-form-script", "localization", "offer-design"]
  },
  reviewer: {
    hardSkills: {
      "fact-check": 5,
      "adversarial-review": 5,
      "rubric-evaluation": 5,
      "copy-editing": 4,
      "evidence-mapping": 4
    },
    softSkills: {
      skepticism: 5,
      attention_to_detail: 5,
      honesty: 5,
      consistency: 5,
      risk_awareness: 5,
      patience: 4
    },
    bestFor: ["QA", "fact checking", "adversarial review", "publishability gates", "agent evals"],
    blindSpots: ["initial ideation", "primary research", "distribution execution"],
    signatureQuestions: [
      "Which claim is least supported?",
      "What breaks if the obvious assumption is wrong?",
      "What is the smallest concrete repair needed to pass?"
    ],
    skillIds: ["fact-check", "adversarial-review", "rubric-evaluation", "copy-editing", "evidence-mapping"]
  },
  "distribution-manager": {
    hardSkills: {
      "distribution-strategy": 5,
      "content-repurposing": 5,
      "launch-distribution": 5,
      "social-content": 4,
      analytics: 3
    },
    softSkills: {
      coordination: 5,
      organization: 5,
      channel_empathy: 5,
      adaptability: 5,
      speed: 4,
      discipline: 4
    },
    bestFor: ["channel plans", "native repurposing", "launch sequencing", "publishing handoffs", "distribution experiments"],
    blindSpots: ["original source research", "final strategic positioning", "causal analytics"],
    signatureQuestions: [
      "Where does this audience naturally consume this kind of asset?",
      "What must change for this to feel native on each channel?",
      "What are we learning from the distribution, not just publishing?"
    ],
    skillIds: ["distribution-strategy", "content-repurposing", "launch-distribution", "social-content", "analytics"]
  },
  visual: {
    hardSkills: {
      "visual-direction": 5,
      "image-prompting": 5,
      "brand-system": 5,
      "social-content": 3
    },
    softSkills: {
      visual_taste: 5,
      creativity: 5,
      composition: 5,
      interpretation: 4,
      experimentation: 5,
      consistency: 4
    },
    bestFor: ["image generation", "avatars", "thumbnails", "visual systems", "creative direction"],
    blindSpots: ["fresh factual research", "performance attribution", "final copy QA"],
    signatureQuestions: [
      "What must the viewer notice first?",
      "What must stay visually consistent across the series?",
      "Will this still read at the final crop and size?"
    ],
    skillIds: ["visual-direction", "image-prompting", "brand-system", "social-content"]
  },
  analytics: {
    hardSkills: {
      analytics: 5,
      attribution: 5,
      "experiment-design": 5,
      "trend-analysis": 5,
      "evidence-mapping": 3
    },
    softSkills: {
      numerical_skepticism: 5,
      pattern_recognition: 5,
      objectivity: 5,
      precision: 5,
      causal_humility: 5,
      communication: 4
    },
    bestFor: ["KPI analysis", "funnels", "attribution", "A/B tests", "trend interpretation", "performance diagnosis"],
    blindSpots: ["data that was never supplied", "creative taste", "qualitative customer meaning without evidence"],
    signatureQuestions: [
      "What decision should this metric change?",
      "What is the denominator, population and time window?",
      "What evidence would distinguish correlation from causation?"
    ],
    skillIds: ["analytics", "attribution", "experiment-design", "trend-analysis", "evidence-mapping"]
  },
  "router-parser": {
    hardSkills: {
      "input-parsing": 5,
      routing: 5,
      "data-normalization": 5,
      "automation-economics": 5,
      "project-planning": 2
    },
    softSkills: {
      resourcefulness: 5,
      cost_awareness: 5,
      determinism: 5,
      persistence: 5,
      pragmatism: 5,
      ambiguity_detection: 4
    },
    bestFor: ["parsing", "classification", "normalization", "cheap routing", "dedupe", "cost gates"],
    blindSpots: ["high-level strategy", "creative writing", "human-style nuance"],
    signatureQuestions: [
      "Can this be deterministic instead of an LLM call?",
      "What schema should downstream agents receive?",
      "What can be cached, deduped or rejected before expensive work?"
    ],
    skillIds: ["input-parsing", "routing", "data-normalization", "automation-economics", "project-planning"]
  }
});

module.exports = { AGENT_SKILL_PROFILES };
