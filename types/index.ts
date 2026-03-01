// ── Canvas / editor types (kept for Canvas, canvasManager, storage compatibility) ──

export type ComponentType =
  | 'navbar'
  | 'hero'
  | 'features'
  | 'content'
  | 'pricing'
  | 'testimonials'
  | 'cta'
  | 'contact'
  | 'footer'
  | 'layout'
  | 'custom';

export const COMPONENT_TYPES = [
  'navbar', 'hero', 'features', 'content', 'pricing',
  'testimonials', 'cta', 'contact', 'footer', 'layout', 'custom',
] as const satisfies readonly ComponentType[];

export const DAISY_THEMES = [
  // Light / neutral
  'light', 'cupcake', 'bumblebee', 'emerald', 'corporate', 'retro',
  'valentine', 'garden', 'aqua', 'lofi', 'pastel', 'fantasy',
  'wireframe', 'cmyk', 'autumn', 'acid', 'lemonade', 'winter', 'nord',
  // Dark
  'dark', 'synthwave', 'cyberpunk', 'halloween', 'forest', 'black',
  'luxury', 'dracula', 'business', 'night', 'coffee', 'dim', 'sunset',
] as const;

export type DaisyTheme = typeof DAISY_THEMES[number];

export const FONT_FAMILIES = [
  // Sans-serif — professional & UI
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'DM Sans',
  // Sans-serif — friendly & modern
  'Poppins', 'Nunito', 'Outfit', 'Quicksand',
  // Display / bold
  'Montserrat', 'Oswald', 'Space Grotesk', 'Raleway',
  // Serif
  'Playfair Display', 'Merriweather', 'Lora',
  // Monospace
  'JetBrains Mono', 'Space Mono',
  // Decorative
  'Pacifico',
] as const;

export type FontFamily = typeof FONT_FAMILIES[number];

export interface Component {
  id: string;
  type: ComponentType;
  label: string;
  html: string;           // '' for layout type
  order: number;
  columns?: Component[][];  // layout containers only: array of columns, each = array of child components
}

export interface Theme {
  daisyTheme: DaisyTheme;
  fontFamily: FontFamily;
}

export interface PageState {
  title: string;
  description: string;
  components: Component[];
  theme: Theme;
}

export interface SelectionRect {
  id: string;
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface PageEntry {
  id: string;
  name: string;   // Display name
  slug: string;   // Router key
  content: PageState;
}

export interface SavedPage {
  id: string;
  name: string;
  timestamp: string;
  entries: PageEntry[];
  activePageId: string | null;
  appName?: string;
  publishedSlug?: string | null;
  publishedPrivate?: boolean;
  /** @deprecated Legacy single-page save — kept for migration only */
  page?: PageState;
}

// ── CV domain types ──────────────────────────────────────────────────────────

export type ProfileSectionType =
  | 'experience'
  | 'education'
  | 'skills'
  | 'certifications'
  | 'projects'
  | 'languages'
  | 'publications';

export interface ProfileEntry {
  id: string;
  // Generic fields — each section type uses a subset
  title?: string;         // job title, degree, cert name, project name
  organisation?: string;  // company, university, issuer
  location?: string;
  startDate?: string;
  endDate?: string;       // 'Present' or ISO date or null
  description?: string;  // free text, markdown-friendly
  skills?: string[];      // for skills section
  level?: string;         // e.g. 'Fluent', 'Native', 'Advanced'
  url?: string;
}

export interface ProfileSection {
  id: string;
  consultantId: string;
  type: ProfileSectionType;
  entries: ProfileEntry[];
  order: number;
}

export interface Consultant {
  id: string;
  name: string;
  headline?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConsultantWithSections extends Consultant {
  sections: ProfileSection[];
}

export interface Opportunity {
  id: string;
  clientName: string;
  roleTitle: string;
  description: string;
  requirements?: string;
  deadline?: string;
  createdAt: string;
}

export interface ConsultantGuidance {
  id: string;
  opportunityId: string;
  consultantId: string;
  guidance: string;
}

export interface CVTemplate {
  id: string;
  name: string;
  category: string;
  components: Component[];  // canvas-compatible HTML section components
  isBuiltIn: boolean;
  theme?: Theme;
}

export interface Ruleset {
  id: string;
  name: string;
  rules: string[];
}

export interface CVVersion {
  id: string;
  consultantId: string;
  templateId?: string;
  opportunityId?: string;
  rulesetIds?: string[];
  components: Component[];  // canvas-compatible CV sections
  theme: Theme;
  createdAt: string;
  parentVersionId?: string;
}
