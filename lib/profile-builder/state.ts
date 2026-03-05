import { z } from 'zod';

export const profileBuilderMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

const baseEntrySchema = z.object({
  id: z.string().default(''),
  title: z.string().default(''),
  organisation: z.string().default(''),
  location: z.string().default(''),
  startDate: z.string().default(''),
  endDate: z.string().default(''),
  description: z.string().default(''),
  url: z.string().default(''),
});

const languageEntrySchema = z.object({
  id: z.string().default(''),
  language: z.string().default(''),
  level: z.string().default(''),
});

const skillEntrySchema = z.object({
  id: z.string().default(''),
  name: z.string().default(''),
  level: z.string().default(''),
});

export const profileBuilderStateSchema = z.object({
  basics: z.object({
    name: z.string().default(''),
    headline: z.string().default(''),
    email: z.string().default(''),
    phone: z.string().default(''),
    location: z.string().default(''),
    linkedin: z.string().default(''),
    summary: z.string().default(''),
  }),
  experience: z.array(
    baseEntrySchema.extend({
      skills: z.array(z.string()).default([]),
    })
  ).default([]),
  education: z.array(baseEntrySchema).default([]),
  skills: z.array(skillEntrySchema).default([]),
  certifications: z.array(baseEntrySchema).default([]),
  projects: z.array(
    baseEntrySchema.extend({
      skills: z.array(z.string()).default([]),
    })
  ).default([]),
  languages: z.array(languageEntrySchema).default([]),
  publications: z.array(baseEntrySchema).default([]),
});

export const profileBuilderTargetStateSchema = z.object({
  requiredBasics: z.array(z.enum(['name', 'headline', 'email', 'phone', 'location', 'linkedin', 'summary'])),
  minExperienceEntries: z.number().int().min(0).max(20),
  minEducationEntries: z.number().int().min(0).max(10),
  minProjectEntries: z.number().int().min(0).max(20),
  minSkillCount: z.number().int().min(0).max(100),
  minCertificationEntries: z.number().int().min(0).max(20),
  minLanguageEntries: z.number().int().min(0).max(20),
  prioritySections: z.array(z.enum(['experience', 'education', 'skills', 'certifications', 'projects', 'languages', 'publications'])),
  notes: z.string(),
});

export const profileBuilderTurnRequestSchema = z.object({
  messages: z.array(profileBuilderMessageSchema),
  profileState: profileBuilderStateSchema,
  targetState: profileBuilderTargetStateSchema,
});

export type ProfileBuilderState = z.infer<typeof profileBuilderStateSchema>;
export type ProfileBuilderTargetState = z.infer<typeof profileBuilderTargetStateSchema>;
export type ProfileBuilderMessage = z.infer<typeof profileBuilderMessageSchema>;

export const patchOpSchema = z.object({
  path: z.string(),
  value: z.unknown(),
});

export const profileBuilderAgentOutputSchema = z.object({
  profilePatch: z.array(patchOpSchema),
  targetPatch: z.array(patchOpSchema),
  question: z.string(),
  inputType: z.enum(['text', 'single', 'multi']),
  options: z.array(z.string()),
  placeholder: z.string(),
});

export const defaultProfileBuilderState: ProfileBuilderState = {
  basics: {
    name: '',
    headline: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    summary: '',
  },
  experience: [],
  education: [],
  skills: [],
  certifications: [],
  projects: [],
  languages: [],
  publications: [],
};

export const defaultProfileBuilderTargetState: ProfileBuilderTargetState = {
  requiredBasics: ['name', 'headline', 'email', 'location', 'summary'],
  minExperienceEntries: 3,
  minEducationEntries: 1,
  minProjectEntries: 1,
  minSkillCount: 8,
  minCertificationEntries: 0,
  minLanguageEntries: 0,
  prioritySections: ['experience', 'skills', 'education'],
  notes: '',
};

export type PatchOp = {
  path: string;
  value: unknown;
};

export function normalizePatchPath(path: string): string {
  return path
    .replace(/\\/g, '/')
    .replace(/^\//, '')
    .replace(/^profileState\//, '')
    .replace(/^profileState\./, '')
    .replace(/^targetState\//, '')
    .replace(/^targetState\./, '')
    .replace(/\[(\d+)\]/g, '.$1')
    .replace(/\//g, '.')
    .replace(/\.+/g, '.')
    .replace(/^\./, '')
    .replace(/\.$/, '');
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function diffState(before: unknown, after: unknown, prefix = ''): PatchOp[] {
  if (Array.isArray(before) || Array.isArray(after)) {
    return JSON.stringify(before) === JSON.stringify(after) ? [] : [{ path: prefix, value: after }];
  }

  if (isObject(before) && isObject(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    const ops: PatchOp[] = [];
    for (const key of keys) {
      const nextPath = prefix ? `${prefix}.${key}` : key;
      ops.push(...diffState(before[key], after[key], nextPath));
    }
    return ops;
  }

  return before === after ? [] : [{ path: prefix, value: after }];
}

function setByPath(target: Record<string, unknown>, path: string, value: unknown) {
  const normalized = normalizePatchPath(path);
  const parts = normalized.split('.').filter(Boolean);
  if (!parts.length) return;
  let cursor: unknown = target;
  const isIndex = (s: string) => /^\d+$/.test(s);

  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    const nextPart = parts[i + 1];

    if (isIndex(part)) {
      if (!Array.isArray(cursor)) return;
      const idx = Number(part);
      const curr = cursor[idx];
      if (curr === undefined || curr === null || (typeof curr !== 'object')) {
        cursor[idx] = isIndex(nextPart) ? [] : {};
      }
      cursor = cursor[idx];
      continue;
    }

    if (!isObject(cursor)) return;
    const curr = cursor[part];
    if (curr === undefined || curr === null || (typeof curr !== 'object')) {
      cursor[part] = isIndex(nextPart) ? [] : {};
    }
    cursor = cursor[part];
  }

  const last = parts[parts.length - 1];
  if (isIndex(last)) {
    if (!Array.isArray(cursor)) return;
    cursor[Number(last)] = value;
    return;
  }

  if (!isObject(cursor)) return;
  cursor[last] = value;
}

export function applyPatchOps<T extends Record<string, unknown>>(state: T, ops: PatchOp[]): T {
  const next = structuredClone(state);
  for (const op of ops) {
    if (!op.path) continue;
    setByPath(next, op.path, op.value);
  }
  return next;
}

type ComponentScores = {
  basics: number;
  experience: number;
  education: number;
  skills: number;
  certifications: number;
  projects: number;
  languages: number;
  publications: number;
  profileTarget: number;
};

type Completeness = {
  overall: number;
  components: ComponentScores;
  nextFocus: keyof ComponentScores;
};

function filled(value: string) {
  return value.trim().length > 0 ? 1 : 0;
}

function scoreBasics(state: ProfileBuilderState) {
  const b = state.basics;
  const total =
    filled(b.name) +
    filled(b.headline) +
    filled(b.email) +
    filled(b.phone) +
    filled(b.location) +
    filled(b.linkedin) +
    filled(b.summary);
  return Math.min(Math.round((total / 7) * 100), 95);
}

function scoreEntryArray(
  entries: Array<Record<string, unknown>> | unknown,
  requiredFields: string[],
  targetCount: number
) {
  if (!Array.isArray(entries)) return 0;
  if (entries.length === 0) return 0;
  const perEntry = entries.map((entry) => {
    const c = requiredFields.reduce((acc, field) => {
      const value = entry[field];
      if (typeof value === 'string') return acc + filled(value);
      if (Array.isArray(value)) return acc + (value.length > 0 ? 1 : 0);
      return acc;
    }, 0);
    return c / requiredFields.length;
  });
  const detail = perEntry.reduce((a, b) => a + b, 0) / perEntry.length;
  const coverage = Math.min(entries.length / targetCount, 1);
  return Math.min(Math.round((detail * 0.72 + coverage * 0.28) * 100), 95);
}

function scoreSkills(state: ProfileBuilderState) {
  const count = state.skills.filter((s) => s.name.trim()).length;
  if (count === 0) return 0;
  if (count < 4) return 35;
  if (count < 7) return 55;
  if (count < 10) return 72;
  if (count < 14) return 86;
  return 95;
}

function scoreTarget(profile: ProfileBuilderState, target: ProfileBuilderTargetState) {
  const activeScores: number[] = [];

  if (target.requiredBasics.length > 0) {
    const basicsHit =
      target.requiredBasics.filter((field) => filled(profile.basics[field]) > 0).length /
      target.requiredBasics.length;
    activeScores.push(basicsHit);
  }
  if (target.minExperienceEntries > 0) {
    activeScores.push(Math.min(profile.experience.length / target.minExperienceEntries, 1));
  }
  if (target.minEducationEntries > 0) {
    activeScores.push(Math.min(profile.education.length / target.minEducationEntries, 1));
  }
  if (target.minProjectEntries > 0) {
    activeScores.push(Math.min(profile.projects.length / target.minProjectEntries, 1));
  }
  if (target.minSkillCount > 0) {
    activeScores.push(
      Math.min(
        profile.skills.filter((s) => s.name.trim()).length / target.minSkillCount,
        1
      )
    );
  }
  if (target.minCertificationEntries > 0) {
    activeScores.push(
      Math.min(
        profile.certifications.length / target.minCertificationEntries,
        1
      )
    );
  }
  if (target.minLanguageEntries > 0) {
    activeScores.push(Math.min(profile.languages.length / target.minLanguageEntries, 1));
  }

  if (activeScores.length === 0) return 100;
  return Math.min(Math.round((activeScores.reduce((a, b) => a + b, 0) / activeScores.length) * 100), 92);
}

const WEIGHTS: Record<keyof ComponentScores, number> = {
  basics: 18,
  experience: 28,
  education: 12,
  skills: 14,
  certifications: 5,
  projects: 8,
  languages: 4,
  publications: 3,
  profileTarget: 8,
};

export function calculateCompleteness(
  profileState: ProfileBuilderState,
  targetState: ProfileBuilderTargetState
): Completeness {
  const components: ComponentScores = {
    basics: scoreBasics(profileState),
    experience: scoreEntryArray(profileState.experience, ['title', 'organisation', 'startDate', 'endDate', 'description'], 3),
    education: scoreEntryArray(profileState.education, ['title', 'organisation', 'startDate'], 2),
    skills: scoreSkills(profileState),
    certifications: scoreEntryArray(profileState.certifications, ['title', 'organisation'], 2),
    projects: scoreEntryArray(profileState.projects, ['title', 'description'], 2),
    languages: scoreEntryArray(profileState.languages as unknown as Array<Record<string, unknown>>, ['language', 'level'], 2),
    publications: scoreEntryArray(profileState.publications, ['title'], 2),
    profileTarget: scoreTarget(profileState, targetState),
  };

  const overallRaw = (Object.keys(components) as Array<keyof ComponentScores>).reduce(
    (sum, key) => sum + components[key] * WEIGHTS[key],
    0
  );
  let overall = Math.round(overallRaw / 100);
  const advancedReady =
    profileState.experience.length >= 4 &&
    profileState.skills.filter((s) => s.name.trim()).length >= 12 &&
    profileState.education.length >= 1 &&
    profileState.projects.length >= 2 &&
    profileState.languages.length >= 2 &&
    profileState.publications.length >= 1 &&
    profileState.basics.summary.trim().length >= 200;
  if (!advancedReady) overall = Math.min(overall, 96);
  if (advancedReady && overall < 98) overall = 98;
  const focusCandidates = (Object.entries(components) as Array<[keyof ComponentScores, number]>)
    .filter(([key]) => key !== 'profileTarget')
    .filter(([key]) => {
      if (key === 'publications') {
        return targetState.prioritySections.includes('publications');
      }
      if (key === 'languages') {
        return (
          targetState.minLanguageEntries > 0 ||
          targetState.prioritySections.includes('languages') ||
          profileState.languages.length > 0
        );
      }
      if (key === 'certifications') {
        return (
          targetState.minCertificationEntries > 0 ||
          targetState.prioritySections.includes('certifications') ||
          profileState.certifications.length > 0
        );
      }
      return true;
    });
  const ranked = (focusCandidates.length > 0
    ? focusCandidates
    : (Object.entries(components) as Array<[keyof ComponentScores, number]>).filter(([key]) => key !== 'profileTarget'))
    .sort((a, b) => a[1] - b[1]);
  const nextFocus = ranked[0][0];

  return { overall, components, nextFocus };
}
