import { z } from 'zod';
import { DAISY_THEMES, FONT_FAMILIES, COMPONENT_TYPES } from '@/types';

// ── CV domain schemas ────────────────────────────────────────────────────────

const profileEntrySchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  organisation: z.string().optional(),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().optional(),
  skills: z.array(z.string()).optional(),
  level: z.string().optional(),
  url: z.string().optional(),
});

const profileSectionExtractionSchema = z.object({
  type: z.enum(['experience', 'education', 'skills', 'certifications', 'projects', 'languages', 'publications']),
  entries: z.array(profileEntrySchema),
});

export const profileExtractionSchema = z.object({
  name: z.string().describe('Full name of the consultant'),
  headline: z.string().optional().describe('Professional headline or job title'),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  summary: z.string().optional().describe('Professional summary paragraph'),
  sections: z.array(profileSectionExtractionSchema),
});

export const contentSelectionSchema = z.object({
  selectedSections: z.array(
    z.object({
      sectionType: z.string(),
      selectedEntryIds: z.array(z.string()),
      rationale: z.string().optional(),
    })
  ),
  focusPoints: z.array(z.string()).describe('Key points to emphasise in the CV'),
  suggestedHeadline: z.string().optional(),
  suggestedSummary: z.string().describe('Tailored professional summary for this opportunity'),
});

export const cvComponentSchema = z.object({
  id: z.string().describe('Kebab-case section ID, e.g. "cv-header", "cv-experience"'),
  label: z.string().describe('Human-readable section name'),
  html: z.string().describe('Complete self-contained HTML section using Tailwind + DaisyUI classes. No <html>/<head>/<body> tags.'),
  order: z.number(),
});

export const cvGenerationSchema = z.object({
  components: z.array(cvComponentSchema),
  daisyTheme: z.string().describe('DaisyUI theme that suits this CV style'),
  fontFamily: z.string().describe('Google Font for the CV'),
});

export type ProfileExtractionSchema = z.infer<typeof profileExtractionSchema>;
export type ContentSelectionSchema = z.infer<typeof contentSelectionSchema>;
export type CVGenerationSchema = z.infer<typeof cvGenerationSchema>;

// COMPONENT_TYPES is a const tuple — z.enum accepts it directly
export const componentTypeEnum = z.enum(COMPONENT_TYPES);

export const daisyThemeEnum = z.enum(DAISY_THEMES);

export const fontFamilyEnum = z.enum(FONT_FAMILIES);

export const themeSchema = z.object({
  daisyTheme: daisyThemeEnum.describe(
    'DaisyUI theme name that best fits the product. Choose from the available options.'
  ),
  fontFamily: fontFamilyEnum.describe(
    'Google Font to use for the page. Choose one that suits the brand personality.'
  ),
});

// Used in /api/generate — streams the full page
export const generateSchema = z.object({
  theme: themeSchema,
  title: z.string().describe('Page title for the browser tab'),
  components: z.array(
    z.object({
      id: z.string().describe('Kebab-case unique ID e.g. "hero-1", "nav-1", "pricing-1"'),
      type: componentTypeEnum,
      label: z.string().describe('Human-readable name shown in the editor e.g. "Main Hero"'),
      html: z.string().describe(
        'Complete self-contained HTML section. No <html>, <head>, <body> tags. No body/html/:root CSS rules.'
      ),
    })
  ),
});

// Used in /api/update and /api/refine — returns only changed components.
// Groq requires ALL object properties to be listed in "required", so we use
// nullable instead of optional. null = no change for that field.
export const updateSchema = z.object({
  themeChange: z
    .object({
      daisyTheme: daisyThemeEnum.nullable().describe('null if the theme should not change'),
      fontFamily: fontFamilyEnum.nullable().describe('null if the font should not change'),
    })
    .nullable()
    .describe('null if no theme changes are needed; otherwise specify which fields to change'),
  updates: z.array(
    z.object({
      id: z.string().describe('ID of the component being updated — must match an existing component ID'),
      html: z.string().describe('Complete updated HTML for this component'),
    })
  ),
  removals: z
    .array(z.string())
    .nullable()
    .describe('null if no sections should be removed; otherwise list of component IDs to delete'),
});

// Used in /api/add — generates a single new section
export const addSchema = z.object({
  id: z.string().describe('Unique kebab-case ID for the new component'),
  type: componentTypeEnum,
  label: z.string(),
  html: z.string().describe(
    'Complete self-contained HTML section. No <html>, <head>, <body> tags. No body/html/:root CSS rules.'
  ),
});

// Used in /api/suggest — returns quick-action labels for the selected component
export const suggestSchema = z.object({
  suggestions: z
    .array(z.string().describe('Short actionable instruction, max 7 words, fits on a button'))
    .min(3)
    .max(6),
});

export type GenerateSchema = z.infer<typeof generateSchema>;
export type UpdateSchema = z.infer<typeof updateSchema>;
export type AddSchema = z.infer<typeof addSchema>;
export type SuggestSchema = z.infer<typeof suggestSchema>;

// ── Agent chat — used in /api/agent-chat ──────────────────────────────────
// Flat schema (no nested unions) for reliable structured output from Groq.

export const agentTurnSchema = z.object({
  message: z.string().describe(
    'Your question or message to the user. 1–2 sentences, warm tone, exactly ONE question.'
  ),
  done: z.boolean().describe(
    'Set to true when you have collected enough information to generate an excellent page. false while still gathering info.'
  ),
  generationPrompt: z.string().describe(
    'Comprehensive page generation instructions. Non-empty only when done=true; use empty string otherwise.'
  ),
  inputType: z.enum(['text', 'select', 'multiselect']).describe(
    "How the user will respond. Use 'text' when done=true (will be ignored)."
  ),
  inputPlaceholder: z.string().describe(
    'Hint shown inside text inputs. Empty string for select/multiselect.'
  ),
  inputOptions: z.array(z.string()).describe(
    'Choices for select/multiselect. Empty array for text and when done=true.'
  ),
});

export type AgentTurn = z.infer<typeof agentTurnSchema>;
