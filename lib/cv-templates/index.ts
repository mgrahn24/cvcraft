import type { CVTemplate, Component, Theme } from '@/types';

/** Placeholder data used in template previews */
const PLACEHOLDER = {
  name: 'Alex Johnson',
  headline: 'Senior Software Engineer',
  email: 'alex.johnson@email.com',
  phone: '+44 7700 900123',
  location: 'London, UK',
  summary: 'Experienced software engineer with 8+ years building scalable web applications and leading cross-functional teams. Passionate about clean architecture and developer experience.',
};

// ── Modern Minimal ────────────────────────────────────────────────────────────

const modernMinimalComponents: Component[] = [
  {
    id: 'cv-header',
    type: 'custom',
    label: 'CV Header',
    order: 0,
    html: `<div class="flex items-start gap-8 px-10 py-8 border-b border-base-300">
  <div class="flex-1">
    <h1 class="text-3xl font-bold text-base-content">${PLACEHOLDER.name}</h1>
    <p class="text-lg text-primary font-medium mt-1">${PLACEHOLDER.headline}</p>
    <div class="flex flex-wrap gap-4 mt-3 text-sm text-base-content/70">
      <span class="flex items-center gap-1"><i data-lucide="mail" class="w-3.5 h-3.5"></i>${PLACEHOLDER.email}</span>
      <span class="flex items-center gap-1"><i data-lucide="phone" class="w-3.5 h-3.5"></i>${PLACEHOLDER.phone}</span>
      <span class="flex items-center gap-1"><i data-lucide="map-pin" class="w-3.5 h-3.5"></i>${PLACEHOLDER.location}</span>
    </div>
  </div>
</div>`,
  },
  {
    id: 'cv-summary',
    type: 'custom',
    label: 'Professional Summary',
    order: 1,
    html: `<div class="px-10 py-6 border-b border-base-300">
  <h2 class="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Profile</h2>
  <p class="text-sm text-base-content/80 leading-relaxed">${PLACEHOLDER.summary}</p>
</div>`,
  },
  {
    id: 'cv-experience',
    type: 'custom',
    label: 'Experience',
    order: 2,
    html: `<div class="px-10 py-6 border-b border-base-300">
  <h2 class="text-xs font-semibold uppercase tracking-widest text-primary mb-4">Experience</h2>
  <div class="space-y-5">
    <div>
      <div class="flex items-start justify-between">
        <div>
          <h3 class="text-sm font-semibold text-base-content">Lead Software Engineer</h3>
          <p class="text-sm text-base-content/70">Acme Corp · London, UK</p>
        </div>
        <span class="text-xs text-base-content/50 whitespace-nowrap">Jan 2020 – Present</span>
      </div>
      <p class="text-sm text-base-content/70 mt-2 leading-relaxed">Led a team of 6 engineers to deliver a microservices platform serving 2M+ daily users. Reduced deployment time by 60% through CI/CD improvements.</p>
    </div>
    <div>
      <div class="flex items-start justify-between">
        <div>
          <h3 class="text-sm font-semibold text-base-content">Software Engineer</h3>
          <p class="text-sm text-base-content/70">TechStart Ltd · London, UK</p>
        </div>
        <span class="text-xs text-base-content/50 whitespace-nowrap">Mar 2017 – Dec 2019</span>
      </div>
      <p class="text-sm text-base-content/70 mt-2 leading-relaxed">Built and maintained React/Node.js applications for fintech clients. Introduced TypeScript across the codebase, reducing runtime errors by 40%.</p>
    </div>
  </div>
</div>`,
  },
  {
    id: 'cv-education',
    type: 'custom',
    label: 'Education',
    order: 3,
    html: `<div class="px-10 py-6 border-b border-base-300">
  <h2 class="text-xs font-semibold uppercase tracking-widest text-primary mb-4">Education</h2>
  <div>
    <div class="flex items-start justify-between">
      <div>
        <h3 class="text-sm font-semibold text-base-content">BSc Computer Science</h3>
        <p class="text-sm text-base-content/70">University of Bristol</p>
      </div>
      <span class="text-xs text-base-content/50">2013 – 2016</span>
    </div>
  </div>
</div>`,
  },
  {
    id: 'cv-skills',
    type: 'custom',
    label: 'Skills',
    order: 4,
    html: `<div class="px-10 py-6">
  <h2 class="text-xs font-semibold uppercase tracking-widest text-primary mb-4">Skills</h2>
  <div class="flex flex-wrap gap-2">
    <span class="badge badge-outline text-xs">TypeScript</span>
    <span class="badge badge-outline text-xs">React</span>
    <span class="badge badge-outline text-xs">Node.js</span>
    <span class="badge badge-outline text-xs">PostgreSQL</span>
    <span class="badge badge-outline text-xs">AWS</span>
    <span class="badge badge-outline text-xs">Docker</span>
    <span class="badge badge-outline text-xs">Kubernetes</span>
    <span class="badge badge-outline text-xs">GraphQL</span>
  </div>
</div>`,
  },
];

// ── Classic Professional ──────────────────────────────────────────────────────

const classicProfessionalComponents: Component[] = [
  {
    id: 'cv-header',
    type: 'custom',
    label: 'CV Header',
    order: 0,
    html: `<div class="bg-base-200 px-10 py-8">
  <h1 class="text-4xl font-bold text-base-content">${PLACEHOLDER.name}</h1>
  <p class="text-base text-base-content/70 mt-1 font-medium">${PLACEHOLDER.headline}</p>
  <div class="flex flex-wrap gap-5 mt-4 text-sm text-base-content/60">
    <span>${PLACEHOLDER.email}</span>
    <span>·</span>
    <span>${PLACEHOLDER.phone}</span>
    <span>·</span>
    <span>${PLACEHOLDER.location}</span>
  </div>
</div>`,
  },
  {
    id: 'cv-body',
    type: 'custom',
    label: 'CV Body (two-column)',
    order: 1,
    html: `<div class="grid grid-cols-3 gap-0 px-0">
  <!-- Main column -->
  <div class="col-span-2 px-10 py-6 border-r border-base-300 space-y-6">
    <div>
      <h2 class="text-sm font-bold uppercase tracking-wider text-base-content border-b border-base-300 pb-1.5 mb-3">Professional Summary</h2>
      <p class="text-sm text-base-content/80 leading-relaxed">${PLACEHOLDER.summary}</p>
    </div>
    <div>
      <h2 class="text-sm font-bold uppercase tracking-wider text-base-content border-b border-base-300 pb-1.5 mb-3">Experience</h2>
      <div class="space-y-4">
        <div>
          <div class="flex justify-between items-baseline">
            <h3 class="text-sm font-semibold">Lead Software Engineer</h3>
            <span class="text-xs text-base-content/50">Jan 2020 – Present</span>
          </div>
          <p class="text-xs text-base-content/60 mb-1.5">Acme Corp, London</p>
          <p class="text-sm text-base-content/75 leading-relaxed">Led a team of 6 engineers to deliver a microservices platform serving 2M+ daily users.</p>
        </div>
        <div>
          <div class="flex justify-between items-baseline">
            <h3 class="text-sm font-semibold">Software Engineer</h3>
            <span class="text-xs text-base-content/50">Mar 2017 – Dec 2019</span>
          </div>
          <p class="text-xs text-base-content/60 mb-1.5">TechStart Ltd, London</p>
          <p class="text-sm text-base-content/75 leading-relaxed">Built React/Node.js applications for fintech clients. Introduced TypeScript across the codebase.</p>
        </div>
      </div>
    </div>
  </div>
  <!-- Sidebar -->
  <div class="col-span-1 px-6 py-6 bg-base-50 space-y-6">
    <div>
      <h2 class="text-sm font-bold uppercase tracking-wider text-base-content border-b border-base-300 pb-1.5 mb-3">Skills</h2>
      <ul class="text-sm text-base-content/75 space-y-1">
        <li>TypeScript / JavaScript</li>
        <li>React &amp; Next.js</li>
        <li>Node.js / Express</li>
        <li>PostgreSQL / Redis</li>
        <li>AWS / Docker</li>
      </ul>
    </div>
    <div>
      <h2 class="text-sm font-bold uppercase tracking-wider text-base-content border-b border-base-300 pb-1.5 mb-3">Education</h2>
      <p class="text-sm font-medium">BSc Computer Science</p>
      <p class="text-xs text-base-content/60">University of Bristol · 2013–2016</p>
    </div>
  </div>
</div>`,
  },
];

// ── Bold Creative ─────────────────────────────────────────────────────────────

const boldCreativeComponents: Component[] = [
  {
    id: 'cv-header',
    type: 'custom',
    label: 'CV Header',
    order: 0,
    html: `<div class="bg-primary text-primary-content px-10 py-10">
  <h1 class="text-4xl font-extrabold tracking-tight">${PLACEHOLDER.name}</h1>
  <p class="text-lg font-medium opacity-85 mt-1">${PLACEHOLDER.headline}</p>
  <div class="flex flex-wrap gap-4 mt-4 text-sm opacity-75">
    <span class="flex items-center gap-1.5"><i data-lucide="mail" class="w-4 h-4"></i>${PLACEHOLDER.email}</span>
    <span class="flex items-center gap-1.5"><i data-lucide="phone" class="w-4 h-4"></i>${PLACEHOLDER.phone}</span>
    <span class="flex items-center gap-1.5"><i data-lucide="map-pin" class="w-4 h-4"></i>${PLACEHOLDER.location}</span>
  </div>
</div>`,
  },
  {
    id: 'cv-summary',
    type: 'custom',
    label: 'Professional Summary',
    order: 1,
    html: `<div class="px-10 py-6 bg-base-200">
  <p class="text-sm text-base-content/80 leading-relaxed max-w-2xl">${PLACEHOLDER.summary}</p>
</div>`,
  },
  {
    id: 'cv-experience',
    type: 'custom',
    label: 'Experience',
    order: 2,
    html: `<div class="px-10 py-6 border-b border-base-300">
  <h2 class="text-base font-bold text-primary mb-4">Experience</h2>
  <div class="space-y-5">
    <div class="pl-4 border-l-2 border-primary">
      <div class="flex items-start justify-between gap-2">
        <div>
          <h3 class="text-sm font-bold text-base-content">Lead Software Engineer</h3>
          <p class="text-sm text-base-content/60">Acme Corp · London</p>
        </div>
        <span class="badge badge-primary badge-sm whitespace-nowrap">2020 – Present</span>
      </div>
      <p class="text-sm text-base-content/75 mt-2 leading-relaxed">Led a team of 6 engineers to deliver a microservices platform serving 2M+ daily users. Reduced deployment time by 60%.</p>
    </div>
    <div class="pl-4 border-l-2 border-base-300">
      <div class="flex items-start justify-between gap-2">
        <div>
          <h3 class="text-sm font-bold text-base-content">Software Engineer</h3>
          <p class="text-sm text-base-content/60">TechStart Ltd · London</p>
        </div>
        <span class="badge badge-outline badge-sm whitespace-nowrap">2017 – 2019</span>
      </div>
      <p class="text-sm text-base-content/75 mt-2 leading-relaxed">Built React/Node.js fintech applications. Introduced TypeScript, reducing runtime errors by 40%.</p>
    </div>
  </div>
</div>`,
  },
  {
    id: 'cv-skills',
    type: 'custom',
    label: 'Skills',
    order: 3,
    html: `<div class="px-10 py-6 border-b border-base-300">
  <h2 class="text-base font-bold text-primary mb-4">Skills</h2>
  <div class="flex flex-wrap gap-2">
    <span class="badge badge-primary text-xs">TypeScript</span>
    <span class="badge badge-primary text-xs">React</span>
    <span class="badge badge-primary text-xs">Node.js</span>
    <span class="badge badge-secondary text-xs">PostgreSQL</span>
    <span class="badge badge-secondary text-xs">AWS</span>
    <span class="badge badge-secondary text-xs">Docker</span>
    <span class="badge badge-accent text-xs">Kubernetes</span>
    <span class="badge badge-accent text-xs">GraphQL</span>
  </div>
</div>`,
  },
  {
    id: 'cv-education',
    type: 'custom',
    label: 'Education',
    order: 4,
    html: `<div class="px-10 py-6">
  <h2 class="text-base font-bold text-primary mb-4">Education</h2>
  <div class="pl-4 border-l-2 border-primary">
    <h3 class="text-sm font-bold">BSc Computer Science</h3>
    <p class="text-sm text-base-content/60">University of Bristol · 2013 – 2016</p>
  </div>
</div>`,
  },
];

// ── Exported template definitions ─────────────────────────────────────────────

export const BUILT_IN_TEMPLATES: Omit<CVTemplate, 'isBuiltIn'>[] = [
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    category: 'modern',
    components: modernMinimalComponents,
    theme: { daisyTheme: 'light', fontFamily: 'Inter' },
  },
  {
    id: 'classic-professional',
    name: 'Classic Professional',
    category: 'classic',
    components: classicProfessionalComponents,
    theme: { daisyTheme: 'corporate', fontFamily: 'Merriweather' },
  },
  {
    id: 'bold-creative',
    name: 'Bold Creative',
    category: 'creative',
    components: boldCreativeComponents,
    theme: { daisyTheme: 'dark', fontFamily: 'Poppins' },
  },
];
