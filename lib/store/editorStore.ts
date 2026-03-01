'use client';

import { create } from 'zustand';
import type { Component, ComponentType, FontFamily, DaisyTheme, PageState, PageEntry, SelectionRect, Theme } from '@/types';

// Stable empty arrays — returned when values are absent to avoid new reference on every call
const EMPTY_COMPONENTS: Component[] = [];
const EMPTY_SITE: Component[] = [];
const EMPTY_IDS: string[] = [];
const EMPTY_RECTS: SelectionRect[] = [];
const EMPTY_ENTRIES: PageEntry[] = [];
const HISTORY_LIMIT = 50;

/** Sort a components array by order in-place and return it */
function sortedComponents(components: Component[]): Component[] {
  return [...components].sort((a, b) => a.order - b.order);
}

// ── Nested component tree helpers ─────────────────────────────────────────────

/** Find a component by ID anywhere in the tree (top-level or nested child) */
export function findInTree(components: Component[], id: string): Component | null {
  for (const c of components) {
    if (c.id === id) return c;
    if (c.columns) {
      for (const col of c.columns) {
        const found = findInTree(col, id);
        if (found) return found;
      }
    }
  }
  return null;
}

/** Immutably apply an updater to a component anywhere in the tree */
function updateInTree(
  components: Component[],
  id: string,
  updater: (c: Component) => Component
): Component[] {
  return components.map((c) => {
    if (c.id === id) return updater(c);
    if (c.columns) {
      return { ...c, columns: c.columns.map((col) => updateInTree(col, id, updater)) };
    }
    return c;
  });
}

/** Immutably remove a component by ID from anywhere in the tree */
function removeFromTree(components: Component[], id: string): Component[] {
  return components
    .filter((c) => c.id !== id)
    .map((c) =>
      c.columns ? { ...c, columns: c.columns.map((col) => removeFromTree(col, id)) } : c
    );
}

/** Create a slug from a display name */
function nameToSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'page';
}

interface EditorStore {
  page: PageState | null;
  past: PageState[];
  future: PageState[];
  /** Incremented on undo/redo to force canvas rebuild even when component IDs are unchanged */
  forceRebuild: number;
  selectedComponentIds: string[];
  selectionRects: SelectionRect[];
  isGenerating: boolean;
  isUpdating: boolean;
  isAdding: boolean;
  componentUpdateTick: number;
  canvasRef: React.RefObject<HTMLDivElement | null> | null;
  containerRef: React.RefObject<HTMLDivElement | null> | null;

  /** All pages in the project */
  pageEntries: PageEntry[];
  /** ID of the page currently loaded in the editor */
  activePageId: string | null;
  /** App/site name shown in the TopBar */
  appName: string;
  /** Slug of the last published version — null if never published */
  publishedSlug: string | null;
  /** Whether the last published version was private */
  publishedPrivate: boolean;
  /**
   * Site-wide components (navbar, footer, etc.) shared across all pages.
   * Rendered before/after page-specific content on every page.
   */
  siteComponents: Component[];

  setPage: (page: PageState) => void;
  clearPage: () => void;
  setTheme: (theme: Theme) => void;
  setDaisyTheme: (daisyTheme: DaisyTheme) => void;
  setFontFamily: (fontFamily: FontFamily) => void;
  setAppName: (name: string) => void;
  setPublishedSlug: (slug: string | null) => void;
  setPublishedPrivate: (isPrivate: boolean) => void;

  /** Push current page onto the undo stack (call before a user mutation) */
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  addComponent: (component: Component) => void;
  /** Update HTML — checks siteComponents first, then page components */
  updateComponentHtml: (id: string, html: string) => void;
  /** Remove — checks siteComponents first, then page components */
  removeComponent: (id: string) => void;
  duplicateComponent: (id: string, newId: string) => void;
  moveComponent: (id: string, direction: 'up' | 'down') => void;
  reorderComponents: (newOrderIds: string[]) => void;

  /** Replace all site-wide components (used after generation) */
  setSiteComponents: (components: Component[]) => void;
  /** Add a single site-wide component */
  addSiteComponent: (component: Component) => void;
  /** Reorder site components by new ID order */
  reorderSiteComponents: (newOrderIds: string[]) => void;

  selectComponent: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  setSelectionRects: (rects: SelectionRect[]) => void;
  addSelectionRect: (rect: SelectionRect) => void;

  setIsGenerating: (v: boolean) => void;
  setIsUpdating: (v: boolean) => void;
  setIsAdding: (v: boolean) => void;

  setCanvasRef: (ref: React.RefObject<HTMLDivElement | null>) => void;
  setContainerRef: (ref: React.RefObject<HTMLDivElement | null>) => void;

  // ── Multi-page actions ────────────────────────────────────────────
  /** Switch to a different page, saving the current page state first */
  switchPage: (id: string) => void;
  /** Add a new blank page entry and switch to it */
  addPage: (name: string) => void;
  /** Remove a page by id (not allowed if it's the only page) */
  removePage: (id: string) => void;
  /** Rename a page entry */
  renamePageEntry: (id: string, name: string) => void;
  /** Bulk-set all pages (used after multi-page generation) */
  setProject: (entries: PageEntry[], appName?: string, siteComponents?: Component[]) => void;
  /** Sync the live page into pageEntries[activePageId] — call before export */
  syncActivePageToEntries: () => PageEntry[];
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  page: null,
  past: [],
  future: [],
  forceRebuild: 0,
  selectedComponentIds: EMPTY_IDS,
  selectionRects: EMPTY_RECTS,
  isGenerating: false,
  isUpdating: false,
  isAdding: false,
  componentUpdateTick: 0,
  canvasRef: null,
  containerRef: null,
  pageEntries: EMPTY_ENTRIES,
  activePageId: null,
  appName: '',
  publishedSlug: null,
  publishedPrivate: false,
  siteComponents: EMPTY_SITE,

  // ── Page ─────────────────────────────────────────────────────────
  setPage: (page) =>
    set((state) => {
      const sorted: PageState = { ...page, components: sortedComponents(page.components) };

      if (state.activePageId === null) {
        const id = `page-${Date.now()}`;
        const slug = nameToSlug(page.title || 'Home');
        const entry: PageEntry = { id, name: page.title || 'Home', slug, content: sorted };
        return { page: sorted, pageEntries: [entry], activePageId: id, past: [], future: [] };
      }

      const pageEntries = state.pageEntries.map((e) =>
        e.id === state.activePageId ? { ...e, content: sorted } : e
      );
      return { page: sorted, pageEntries, past: [], future: [] };
    }),

  clearPage: () =>
    set({
      page: null,
      past: [],
      future: [],
      selectedComponentIds: EMPTY_IDS,
      selectionRects: EMPTY_RECTS,
      pageEntries: EMPTY_ENTRIES,
      activePageId: null,
      appName: '',
      publishedSlug: null,
      publishedPrivate: false,
      siteComponents: EMPTY_SITE,
    }),

  setTheme: (theme) =>
    set((state) => {
      if (!state.page) return {};
      const pageEntries = state.pageEntries.map((e) => ({ ...e, content: { ...e.content, theme } }));
      return { page: { ...state.page, theme }, pageEntries };
    }),

  setDaisyTheme: (daisyTheme) =>
    set((state) => {
      if (!state.page) return {};
      const newTheme = { ...state.page.theme, daisyTheme };
      const pageEntries = state.pageEntries.map((e) => ({ ...e, content: { ...e.content, theme: newTheme } }));
      return { page: { ...state.page, theme: newTheme }, pageEntries };
    }),

  setFontFamily: (fontFamily) =>
    set((state) => {
      if (!state.page) return {};
      const newTheme = { ...state.page.theme, fontFamily };
      const pageEntries = state.pageEntries.map((e) => ({ ...e, content: { ...e.content, theme: newTheme } }));
      return { page: { ...state.page, theme: newTheme }, pageEntries };
    }),

  setAppName: (name) => set({ appName: name }),
  setPublishedSlug: (slug) => set({ publishedSlug: slug }),
  setPublishedPrivate: (isPrivate) => set({ publishedPrivate: isPrivate }),

  // ── History ───────────────────────────────────────────────────────
  pushHistory: () =>
    set((state) => {
      if (!state.page) return {};
      return { past: [...state.past, state.page].slice(-HISTORY_LIMIT), future: [] };
    }),

  undo: () =>
    set((state) => {
      if (!state.page || state.past.length === 0) return {};
      const past = [...state.past];
      const prev = past.pop()!;
      return {
        page: { ...prev, components: sortedComponents(prev.components) },
        past,
        future: [state.page, ...state.future].slice(0, HISTORY_LIMIT),
        forceRebuild: state.forceRebuild + 1,
      };
    }),

  redo: () =>
    set((state) => {
      if (!state.page || state.future.length === 0) return {};
      const future = [...state.future];
      const next = future.shift()!;
      return {
        page: { ...next, components: sortedComponents(next.components) },
        past: [...state.past, state.page].slice(-HISTORY_LIMIT),
        future,
        forceRebuild: state.forceRebuild + 1,
      };
    }),

  // ── Components ────────────────────────────────────────────────────
  addComponent: (component) =>
    set((state) => {
      if (!state.page) return {};
      const components = sortedComponents([...state.page.components, component]);
      return { page: { ...state.page, components } };
    }),

  updateComponentHtml: (id, html) =>
    set((state) => {
      // Site components take priority
      if (state.siteComponents.some((c) => c.id === id)) {
        return {
          componentUpdateTick: state.componentUpdateTick + 1,
          siteComponents: updateInTree(state.siteComponents, id, (c) => ({ ...c, html })),
        };
      }
      if (!state.page) return {};
      return {
        componentUpdateTick: state.componentUpdateTick + 1,
        page: { ...state.page, components: updateInTree(state.page.components, id, (c) => ({ ...c, html })) },
      };
    }),

  removeComponent: (id) =>
    set((state) => {
      // Site components take priority
      if (state.siteComponents.some((c) => c.id === id)) {
        return {
          siteComponents: state.siteComponents.filter((c) => c.id !== id),
          selectedComponentIds: state.selectedComponentIds.filter((sid) => sid !== id),
          selectionRects: state.selectionRects.filter((r) => r.id !== id),
        };
      }
      if (!state.page) return {};
      const components = removeFromTree(state.page.components, id).map((c, i) => ({ ...c, order: i }));
      return {
        page: { ...state.page, components },
        selectedComponentIds: state.selectedComponentIds.filter((sid) => sid !== id),
        selectionRects: state.selectionRects.filter((r) => r.id !== id),
      };
    }),

  duplicateComponent: (id, newId) =>
    set((state) => {
      if (!state.page) return {};
      const idx = state.page.components.findIndex((c) => c.id === id);
      if (idx === -1) return {};
      const original = state.page.components[idx];
      const duplicate: Component = { ...original, id: newId, order: idx + 0.5 };
      const components = sortedComponents([...state.page.components, duplicate]).map((c, i) => ({ ...c, order: i }));
      return { page: { ...state.page, components } };
    }),

  moveComponent: (id, direction) =>
    set((state) => {
      if (!state.page) return {};
      const sorted = [...state.page.components];
      const idx = sorted.findIndex((c) => c.id === id);
      if (idx === -1) return {};
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= sorted.length) return {};
      [sorted[idx], sorted[newIdx]] = [sorted[newIdx], sorted[idx]];
      const components = sorted.map((c, i) => ({ ...c, order: i }));
      return { page: { ...state.page, components } };
    }),

  reorderComponents: (newOrderIds) =>
    set((state) => {
      if (!state.page) return {};
      const map = new Map(state.page.components.map((c) => [c.id, c]));
      const components = newOrderIds
        .map((id, i) => { const c = map.get(id); return c ? { ...c, order: i } : null; })
        .filter(Boolean) as Component[];
      return { page: { ...state.page, components } };
    }),

  // ── Site Components ───────────────────────────────────────────────
  setSiteComponents: (components) => set({ siteComponents: components }),

  addSiteComponent: (component) =>
    set((state) => ({ siteComponents: [...state.siteComponents, component] })),

  reorderSiteComponents: (newOrderIds) =>
    set((state) => {
      const map = new Map(state.siteComponents.map((c) => [c.id, c]));
      const siteComponents = newOrderIds
        .map((id, i) => { const c = map.get(id); return c ? { ...c, order: i } : null; })
        .filter(Boolean) as Component[];
      return { siteComponents };
    }),

  // ── Selection ─────────────────────────────────────────────────────
  selectComponent: (id, multi = false) =>
    set((state) => {
      if (multi) {
        const already = state.selectedComponentIds.includes(id);
        return {
          selectedComponentIds: already
            ? state.selectedComponentIds.filter((sid) => sid !== id)
            : [...state.selectedComponentIds, id],
        };
      }
      return { selectedComponentIds: [id] };
    }),

  clearSelection: () => set({ selectedComponentIds: EMPTY_IDS, selectionRects: EMPTY_RECTS }),

  setSelectionRects: (rects) => set({ selectionRects: rects }),

  addSelectionRect: (rect) =>
    set((state) => ({
      selectionRects: [...state.selectionRects.filter((r) => r.id !== rect.id), rect],
    })),

  // ── Loading ───────────────────────────────────────────────────────
  setIsGenerating: (v) => set({ isGenerating: v }),
  setIsUpdating: (v) => set({ isUpdating: v }),
  setIsAdding: (v) => set({ isAdding: v }),

  // ── Refs ──────────────────────────────────────────────────────────
  setCanvasRef: (ref) => set({ canvasRef: ref }),
  setContainerRef: (ref) => set({ containerRef: ref }),

  // ── Multi-page ────────────────────────────────────────────────────
  switchPage: (id) =>
    set((state) => {
      if (id === state.activePageId) return {};
      const target = state.pageEntries.find((e) => e.id === id);
      if (!target) return {};
      const pageEntries = state.pageEntries.map((e) =>
        e.id === state.activePageId && state.page ? { ...e, content: state.page } : e
      );
      const sorted = { ...target.content, components: sortedComponents(target.content.components) };
      return {
        page: sorted, pageEntries, activePageId: id,
        past: [], future: [],
        selectedComponentIds: EMPTY_IDS, selectionRects: EMPTY_RECTS,
        forceRebuild: state.forceRebuild + 1,
      };
    }),

  addPage: (name) =>
    set((state) => {
      const id = `page-${Date.now()}`;
      const slug = nameToSlug(name);
      const pageEntries = [
        ...state.pageEntries.map((e) =>
          e.id === state.activePageId && state.page ? { ...e, content: state.page } : e
        ),
        {
          id, name, slug,
          content: {
            title: name, description: '', components: [],
            theme: state.page?.theme ?? { daisyTheme: 'light', fontFamily: 'Inter' },
          },
        } satisfies PageEntry,
      ];
      return {
        page: null,
        pageEntries, activePageId: id,
        past: [], future: [],
        selectedComponentIds: EMPTY_IDS, selectionRects: EMPTY_RECTS,
        forceRebuild: state.forceRebuild + 1,
      };
    }),

  removePage: (id) =>
    set((state) => {
      if (state.pageEntries.length <= 1) return {};
      const newEntries = state.pageEntries.filter((e) => e.id !== id);
      if (id !== state.activePageId) return { pageEntries: newEntries };
      const removedIdx = state.pageEntries.findIndex((e) => e.id === id);
      const nextEntry = newEntries[Math.min(removedIdx, newEntries.length - 1)];
      const sorted = { ...nextEntry.content, components: sortedComponents(nextEntry.content.components) };
      return {
        page: sorted, pageEntries: newEntries, activePageId: nextEntry.id,
        past: [], future: [],
        selectedComponentIds: EMPTY_IDS, selectionRects: EMPTY_RECTS,
        forceRebuild: state.forceRebuild + 1,
      };
    }),

  renamePageEntry: (id, name) =>
    set((state) => {
      const slug = nameToSlug(name);
      return { pageEntries: state.pageEntries.map((e) => e.id === id ? { ...e, name, slug } : e) };
    }),

  setProject: (entries, appName, siteComponents) =>
    set((state) => {
      if (entries.length === 0) return {};
      const first = entries[0];
      return {
        page: { ...first.content, components: sortedComponents(first.content.components) },
        pageEntries: entries,
        activePageId: first.id,
        appName: appName ?? state.appName,
        siteComponents: siteComponents ?? state.siteComponents,
        past: [], future: [],
        selectedComponentIds: EMPTY_IDS, selectionRects: EMPTY_RECTS,
        forceRebuild: state.forceRebuild + 1,
      };
    }),

  syncActivePageToEntries: () => {
    const state = get();
    if (!state.page || !state.activePageId) return state.pageEntries;
    return state.pageEntries.map((e) =>
      e.id === state.activePageId ? { ...e, content: state.page! } : e
    );
  },
}));

// ── Stable selectors (no new object creation) ──────────────────────────────
export const selectSortedComponents = (s: EditorStore): Component[] =>
  s.page?.components ?? EMPTY_COMPONENTS;

export const selectSelectedIds = (s: EditorStore): string[] =>
  s.selectedComponentIds;

export const selectSiteComponents = (s: EditorStore): Component[] =>
  s.siteComponents.length > 0 ? s.siteComponents : EMPTY_SITE;

/** Checks siteComponents first, then page components */
export const selectFirstSelectedComponent = (s: EditorStore): Component | undefined => {
  if (s.selectedComponentIds.length === 0) return undefined;
  const id = s.selectedComponentIds[0];
  const siteComp = s.siteComponents.find((c) => c.id === id);
  if (siteComp) return siteComp;
  if (!s.page) return undefined;
  return findInTree(s.page.components, id) ?? undefined;
};

/** Checks siteComponents first, then page components for each selected ID */
export const selectSelectedComponents = (s: EditorStore): Component[] => {
  if (s.selectedComponentIds.length === 0) return EMPTY_COMPONENTS;
  return s.selectedComponentIds
    .map((id) => {
      const siteComp = s.siteComponents.find((c) => c.id === id);
      if (siteComp) return siteComp;
      if (!s.page) return null;
      return findInTree(s.page.components, id);
    })
    .filter(Boolean) as Component[];
};

export const selectCanUndo = (s: EditorStore): boolean => s.past.length > 0;
export const selectCanRedo = (s: EditorStore): boolean => s.future.length > 0;

export const selectPageEntries = (s: EditorStore): PageEntry[] =>
  s.pageEntries.length > 0 ? s.pageEntries : EMPTY_ENTRIES;

export const selectActivePageId = (s: EditorStore): string | null => s.activePageId;
