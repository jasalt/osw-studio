import type { InterviewTemplate } from './types';

/** Built-in interview templates. The format is data, so user-authored templates can slot in later. */

const UNDERSTAND_COMPANY: InterviewTemplate = {
  id: 'understand-company',
  title: 'Understand a company',
  description: 'Build a profile of a company — what it does, who it serves, and its brand — to inform later work.',
  artifacts: [{ path: '/.interviews/company-profile.md', description: 'The company profile' }],
  items: [
    {
      id: 'identity',
      elicit: "The company's name and a one-line description of what it does.",
      completion: [{ type: 'judge', criteria: 'The /.interviews/company-profile.md artifact states the company name and a clear description of what it does.', description: 'Name and description recorded' }],
    },
    {
      id: 'audience',
      elicit: 'Who the company serves — its target customers or audience.',
      completion: [{ type: 'judge', criteria: 'The company-profile artifact describes the target audience or customers.', description: 'Audience recorded' }],
    },
    {
      id: 'offerings',
      elicit: 'The main products or services the company offers.',
      completion: [{ type: 'judge', criteria: 'The company-profile artifact lists the main products or services.', description: 'Offerings recorded' }],
    },
    {
      id: 'brand',
      elicit: "The brand's tone and any visual identity (colors, fonts). If they have a logo, ask them to add it to the project, then confirm it with ls.",
      completion: [{ type: 'judge', criteria: 'The company-profile artifact describes the brand tone or visual identity, and notes the logo status (present at a path, or none).', description: 'Brand and logo status recorded' }],
    },
    {
      id: 'assets',
      required: false,
      elicit: 'Any existing assets already in the project (logo, images, copy) — check with ls and note what is present.',
      completion: [{ type: 'judge', criteria: 'The company-profile artifact notes any existing project assets (or states there are none).', description: 'Existing assets noted' }],
    },
  ],
  handoff: {
    label: 'Build a site from this',
    prompt: 'Build a website for this company using the profile in /.interviews/company-profile.md.',
    mode: 'code',
  },
};

const PLAN_FEATURE: InterviewTemplate = {
  id: 'plan-feature',
  title: 'Plan a feature',
  description: 'Turn a feature idea into a clear, buildable spec through a few focused questions.',
  artifacts: [{ path: '/.interviews/feature-plan.md', description: 'The feature spec' }],
  items: [
    {
      id: 'summary',
      elicit: 'What the feature is and the problem it solves.',
      completion: [{ type: 'judge', criteria: 'The /.interviews/feature-plan.md artifact describes what the feature is and the problem it solves.', description: 'Feature and problem recorded' }],
    },
    {
      id: 'users',
      elicit: 'Who uses the feature and the primary user flow.',
      completion: [{ type: 'judge', criteria: 'The feature-plan artifact describes who uses it and the primary user flow.', description: 'Users and flow recorded' }],
    },
    {
      id: 'scope',
      elicit: "What's in scope for a first version and what is explicitly out of scope.",
      completion: [{ type: 'judge', criteria: 'The feature-plan artifact states both what is in scope for v1 and what is out of scope.', description: 'Scope recorded' }],
    },
    {
      id: 'acceptance',
      elicit: "Acceptance criteria — how you'll know the feature is done.",
      completion: [{ type: 'judge', criteria: 'The feature-plan artifact lists concrete acceptance criteria.', description: 'Acceptance criteria recorded' }],
    },
  ],
  handoff: {
    label: 'Implement this plan',
    prompt: 'Implement the feature spec in /.interviews/feature-plan.md.',
    mode: 'code',
  },
};

const PLAN_WEBSITE: InterviewTemplate = {
  id: 'plan-website',
  title: 'Plan a website',
  description: 'Turn an idea into a buildable plan for a site — its purpose, audience, pages, and the action it should drive.',
  artifacts: [{ path: '/.interviews/site-plan.md', description: 'The site plan' }],
  items: [
    {
      id: 'purpose',
      elicit: "The site's purpose — what it's for, and the single most important thing a visitor should do or take away. (Glance at the project first; if something already exists, plan around it.)",
      completion: [{ type: 'judge', criteria: 'The /.interviews/site-plan.md artifact states the purpose of the site and its primary goal.', description: 'Purpose recorded' }],
    },
    {
      id: 'audience',
      elicit: 'Who the site is for — its primary visitors.',
      completion: [{ type: 'judge', criteria: 'The site-plan artifact describes the target audience or visitors.', description: 'Audience recorded' }],
    },
    {
      id: 'pages',
      elicit: 'The pages or main sections the site needs (for example: home, about, services, contact).',
      completion: [{ type: 'judge', criteria: 'The site-plan artifact lists the pages or main sections the site needs.', description: 'Pages recorded' }],
    },
    {
      id: 'action',
      elicit: 'The primary action you want visitors to take — the main call-to-action or conversion.',
      completion: [{ type: 'judge', criteria: 'The site-plan artifact states the primary call-to-action or conversion goal.', description: 'Primary action recorded' }],
    },
    {
      id: 'content',
      required: false,
      elicit: 'Any content, copy, or assets you already have — check the project with ls — and what still needs to be created.',
      completion: [{ type: 'judge', criteria: 'The site-plan artifact notes existing content/assets in the project and what still needs creating (or states there is none yet).', description: 'Content/assets noted' }],
    },
  ],
  handoff: {
    label: 'Build this site',
    prompt: 'Build the website described in /.interviews/site-plan.md.',
    mode: 'code',
  },
};

const PREPARE_PUBLISH: InterviewTemplate = {
  id: 'prepare-publish',
  title: 'Get ready to publish',
  description: 'Check a site over before going live — domain, SEO basics, and readiness — grounded in what is actually in the project.',
  artifacts: [{ path: '/.interviews/publish-checklist.md', description: 'The publish checklist' }],
  items: [
    {
      id: 'destination',
      elicit: 'Where this will live — a custom domain, or the default hosting URL. Note it even if undecided.',
      completion: [{ type: 'judge', criteria: 'The /.interviews/publish-checklist.md artifact records the intended domain or hosting URL (or notes it is undecided).', description: 'Destination recorded' }],
    },
    {
      id: 'identity',
      elicit: 'The site title and a one-line description for search engines and link previews.',
      completion: [{ type: 'judge', criteria: 'The publish-checklist artifact records the site title and a meta description.', description: 'Title and description recorded' }],
    },
    {
      id: 'seo-basics',
      elicit: 'Check the SEO basics: read the HTML and verify there is a <title>, a meta description, and a favicon. Note what is present and what is missing.',
      completion: [{ type: 'judge', criteria: 'The publish-checklist artifact reports the state of the page title, meta description, and favicon based on the actual project files.', description: 'SEO basics checked against the project' }],
    },
    {
      id: 'audience-keywords',
      required: false,
      elicit: 'Who the site targets and any keywords or search terms it should rank for.',
      completion: [{ type: 'judge', criteria: 'The publish-checklist artifact notes the target audience and any keywords (or states there are none).', description: 'Audience/keywords noted' }],
    },
    {
      id: 'readiness',
      elicit: 'Look for obvious gaps before publishing — read the project for broken internal links, placeholder content, or empty pages — and list anything to fix.',
      completion: [{ type: 'judge', criteria: 'The publish-checklist artifact lists publish-readiness gaps found by inspecting the project (broken links, placeholder content, empty pages), or confirms there are none.', description: 'Readiness gaps listed from the project' }],
    },
  ],
  handoff: {
    label: 'Fix and prepare for publish',
    prompt: 'Apply the publish-readiness fixes listed in /.interviews/publish-checklist.md — SEO title and meta description, favicon, and any gaps noted.',
    mode: 'code',
  },
};

export const BUILT_IN_INTERVIEWS: InterviewTemplate[] = [UNDERSTAND_COMPANY, PLAN_WEBSITE, PLAN_FEATURE, PREPARE_PUBLISH];

export function isBuiltInInterviewTemplateId(id: string): boolean {
  return BUILT_IN_INTERVIEWS.some(t => t.id === id);
}

export function listInterviewTemplates(): InterviewTemplate[] {
  return BUILT_IN_INTERVIEWS;
}

export function getInterviewTemplate(id: string): InterviewTemplate | undefined {
  return BUILT_IN_INTERVIEWS.find(t => t.id === id);
}

/** Filters templates by a case-insensitive match on title or description. Empty query returns all. */
export function filterInterviewTemplates(templates: InterviewTemplate[], query: string): InterviewTemplate[] {
  const q = query.trim().toLowerCase();
  if (!q) return templates;
  return templates.filter(
    t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
  );
}
