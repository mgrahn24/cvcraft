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
  name: string;   // Display name e.g. "Home", "About"
  slug: string;   // Alpine router key e.g. "home", "about"
  content: PageState;
}

export interface SavedPage {
  id: string;
  name: string;
  timestamp: string; // ISO
  /** Multi-page project save (all pages) */
  entries: PageEntry[];
  activePageId: string | null;
  appName?: string;
  publishedSlug?: string | null;
  publishedPrivate?: boolean;
  /** @deprecated Legacy single-page save — kept for migration only */
  page?: PageState;
}
