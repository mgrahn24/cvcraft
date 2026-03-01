export type FieldType = 'textarea' | 'text' | 'select' | 'multiselect' | 'saved-site';

export interface TemplateSelectOption {
  label: string;
  value: string;
}

export interface TemplateField {
  id: string;
  label: string;
  description?: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  options?: TemplateSelectOption[];
  minRows?: number;
}

export interface TemplateStep {
  id: string;
  title: string;
  description?: string;
  fields: TemplateField[];
}

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  steps: TemplateStep[];
  buildPrompt: (data: Record<string, string | string[]>) => string;
}

// ── CV / Resume template ────────────────────────────────────────────────────

const TONE_LABELS: Record<string, string> = {
  'modern-minimal': 'modern, clean, minimal design with generous white space',
  'creative-bold': 'creative, bold design with strong typography and vibrant color accents',
  'classic-professional': 'classic, conservative professional design with a traditional layout',
  'academic': 'clean academic style focused on credentials, publications, and research',
};

const CV_TEMPLATE: TemplateDefinition = {
  id: 'cv',
  name: 'Professional CV',
  description: 'Tailored CV page built around a specific job opportunity',
  icon: '📄',
  steps: [
    {
      id: 'cv-content',
      title: 'Your CV',
      description: 'Paste in your existing CV or résumé. This becomes the raw material for the page.',
      fields: [
        {
          id: 'cv',
          label: 'CV / Résumé',
          type: 'textarea',
          placeholder:
            'Paste your full CV here — work experience, education, skills, achievements, contact details…',
          required: true,
          minRows: 8,
        },
      ],
    },
    {
      id: 'opportunity',
      title: 'The opportunity',
      description: 'Tell us about the role or opportunity you\'re tailoring this for.',
      fields: [
        {
          id: 'opportunity',
          label: 'Role / Job description',
          type: 'textarea',
          placeholder:
            'Paste the job description, or describe the company and role you\'re applying for…',
          required: true,
          minRows: 6,
        },
      ],
    },
    {
      id: 'style',
      title: 'Style preferences',
      description: 'Choose how you want the page to look and what sections to include.',
      fields: [
        {
          id: 'savedDesign',
          label: 'Base on an existing design',
          description: 'Match the visual style of one of your saved sites (optional). Overrides the style choice below.',
          type: 'saved-site',
        },
        {
          id: 'tone',
          label: 'Visual style',
          type: 'select',
          options: [
            { label: 'Modern & minimal', value: 'modern-minimal' },
            { label: 'Creative & bold', value: 'creative-bold' },
            { label: 'Classic & professional', value: 'classic-professional' },
            { label: 'Academic', value: 'academic' },
          ],
        },
        {
          id: 'sections',
          label: 'Sections to include',
          type: 'multiselect',
          options: [
            { label: 'Summary / Objective', value: 'summary' },
            { label: 'Work experience', value: 'experience' },
            { label: 'Education', value: 'education' },
            { label: 'Skills', value: 'skills' },
            { label: 'Projects', value: 'projects' },
            { label: 'Certifications', value: 'certifications' },
          ],
        },
      ],
    },
  ],
  buildPrompt(data) {
    const cv = (data.cv as string).trim();
    const opportunity = (data.opportunity as string).trim();
    const tone = data.tone as string | undefined;
    const sections = (data.sections as string[] | undefined) ?? [];
    const savedDesignRaw = data.savedDesign as string | undefined;

    let styleDesc: string;
    let savedDesignNote = '';
    if (savedDesignRaw) {
      try {
        const d = JSON.parse(savedDesignRaw) as { daisyTheme: string; fontFamily: string; name: string };
        styleDesc = `the visual style of the saved design "${d.name}"`;
        savedDesignNote = ` Use the "${d.daisyTheme}" DaisyUI theme and ${d.fontFamily} font.`;
      } catch {
        styleDesc = tone ? (TONE_LABELS[tone] ?? tone) : 'clean professional design';
      }
    } else {
      styleDesc = tone ? (TONE_LABELS[tone] ?? tone) : 'clean professional design';
    }

    const sectionsNote =
      sections.length > 0
        ? `Include these sections: ${sections.join(', ')}.`
        : '';

    return `Create a professional CV/résumé page matching ${styleDesc}.${savedDesignNote} ${sectionsNote}

Tailor the content to highlight the most relevant experience and skills for the specific opportunity described below. Lead with the most compelling match between the candidate's background and the role requirements.

--- MY CV ---
${cv}

--- OPPORTUNITY I'M TAILORING THIS FOR ---
${opportunity}`;
  },
};

// ── Exported templates list ─────────────────────────────────────────────────
// Add new templates here. They appear automatically in the wizard picker.

export const TEMPLATES: TemplateDefinition[] = [CV_TEMPLATE];
