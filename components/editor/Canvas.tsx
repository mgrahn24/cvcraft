'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useEditorStore } from '@/lib/store/editorStore';
import { SelectionOverlay } from './SelectionOverlay';
import { ImageUploadOverlay } from './ImageUploadOverlay';
import { IconPickerPanel } from './IconPickerPanel';
import { LinkEditorPanel } from './LinkEditorPanel';
import { VideoEditorPanel } from './VideoEditorPanel';
import { FormEditorPanel } from './FormEditorPanel';
import {
  canvasRebuild,
  canvasRemoveComponent,
  restoreLucideIcons,
} from '@/lib/utils/canvasManager';

declare global {
  interface Window {
    Alpine?: { initTree: (el: Element) => void };
    lucide?: { createIcons: () => void };
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface InlineEdit {
  el: HTMLElement;
  componentId: string;
  originalHtml: string;
}

interface IconPickerState {
  componentId: string;
  iconName: string;
  iconIndex: number; // index among wrapper's [data-lucide] elements — survives createIcons() replacement
  x: number;
  y: number;
}

interface LinkEditorState {
  componentId: string;
  anchorIndex: number;
  href: string;
  newTab: boolean;
  x: number;
  y: number;
}

interface VideoEditorState {
  componentId: string;
  iframeIndex: number;
  src: string;
  x: number;
  y: number;
}

interface FormEditorState {
  componentId: string;
  formIndex: number;
  action: string;
  x: number;
  y: number;
}

interface DisambigOption {
  label: string;
  type: 'link' | 'icon' | 'text';
  onSelect: () => void;
}

interface DisambigState {
  x: number;
  y: number;
  options: DisambigOption[];
}

// ─── Helpers (defined outside component to avoid recreation) ─────────────────

/**
 * Walks up from `target` to `wrapper` and returns the first element that has
 * at least one direct non-whitespace text node — regardless of tag name.
 * This covers p/h1-h6/li/div/span/a/button labels equally.
 * Skips Alpine-bound elements and Lucide icons.
 */
function findEditableEl(target: HTMLElement, wrapper: HTMLElement): HTMLElement | null {
  if (target.closest('svg[data-lucide], i[data-lucide]')) return null;
  let el: HTMLElement | null = target;
  while (el && el !== wrapper) {
    if (
      !el.hasAttribute('x-data') &&
      !el.hasAttribute('x-text') &&
      !el.hasAttribute('x-html') &&
      Array.from(el.childNodes).some(
        (n) => n.nodeType === Node.TEXT_NODE && (n.textContent?.trim().length ?? 0) > 0
      )
    ) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

const DAISYUI_CSS_URL = 'https://cdn.jsdelivr.net/npm/daisyui@4/dist/full.min.css';
const DAISYUI_LINK_ID = 'daisyui-canvas-css';

export function Canvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPageSignatureRef = useRef<string | null>(null);

  // Load DaisyUI CSS only while the canvas is mounted (CV editor page).
  // Keeps all other app pages free of DaisyUI's global style resets.
  useEffect(() => {
    if (!document.getElementById(DAISYUI_LINK_ID)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = DAISYUI_CSS_URL;
      link.id = DAISYUI_LINK_ID;
      document.head.appendChild(link);
    }
    return () => {
      document.getElementById(DAISYUI_LINK_ID)?.remove();
    };
  }, []);

  // Inline text-editing state (ref: no re-render needed while typing)
  const editingRef = useRef<InlineEdit | null>(null);

  // Icon picker (React state: drives UI)
  const [iconPickerState, setIconPickerState] = useState<IconPickerState | null>(null);
  const iconPickerStateRef = useRef<IconPickerState | null>(null);
  iconPickerStateRef.current = iconPickerState;
  const iconPickerTargetRef = useRef<Element | null>(null);

  // Prop editors
  const [linkEditorState, setLinkEditorState] = useState<LinkEditorState | null>(null);
  const [videoEditorState, setVideoEditorState] = useState<VideoEditorState | null>(null);
  const [formEditorState, setFormEditorState] = useState<FormEditorState | null>(null);

  // Disambiguation menu (shown when multiple editable elements overlap)
  const [disambigState, setDisambigState] = useState<DisambigState | null>(null);
  const disambigRef = useRef<HTMLDivElement>(null);

  // Hover-highlight + tooltip for editable text and icons
  const hoveredEditableRef = useRef<HTMLElement | null>(null);
  const hoveredIconRef = useRef<Element | null>(null);
  const [editHint, setEditHint] = useState<{
    type: 'text' | 'icon' | 'link' | 'video' | 'form';
    x: number; y: number; flipped: boolean; elBottom: number;
  } | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Store ──────────────────────────────────────────────────────────────────
  const page = useEditorStore((s) => s.page);
  const isGenerating = useEditorStore((s) => s.isGenerating);
  const isUpdating = useEditorStore((s) => s.isUpdating);
  const selectedIds = useEditorStore((s) => s.selectedComponentIds);
  const selectComponent = useEditorStore((s) => s.selectComponent);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const removeComponent = useEditorStore((s) => s.removeComponent);
  const updateComponentHtml = useEditorStore((s) => s.updateComponentHtml);
  const setSelectionRects = useEditorStore((s) => s.setSelectionRects);
  const addSelectionRect = useEditorStore((s) => s.addSelectionRect);
  const setCanvasRef = useEditorStore((s) => s.setCanvasRef);
  const setContainerRef = useEditorStore((s) => s.setContainerRef);
  const siteComponents = useEditorStore((s) => s.siteComponents);
  const componentUpdateTick = useEditorStore((s) => s.componentUpdateTick);
  const forceRebuild = useEditorStore((s) => s.forceRebuild);
  const pushHistory = useEditorStore((s) => s.pushHistory);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);

  // ── Hover-highlight helpers ────────────────────────────────────────────────

  const clearHoverHighlight = useCallback(() => {
    if (hintTimerRef.current) { clearTimeout(hintTimerRef.current); hintTimerRef.current = null; }
    if (hoveredEditableRef.current?.isConnected) {
      hoveredEditableRef.current.classList.remove('blitz-text-hover');
    }
    hoveredEditableRef.current = null;
    hoveredIconRef.current = null;
    setEditHint(null);
  }, []);

  // ── Inline-editing helpers (ref-pattern to avoid stale closures) ───────────

  const commitEditFn = useRef<() => void>(() => {});
  commitEditFn.current = () => {
    if (!editingRef.current || !canvasRef.current) return;
    const { el, componentId, originalHtml } = editingRef.current;
    el.contentEditable = 'inherit';
    el.style.removeProperty('outline');
    el.style.removeProperty('outline-offset');
    const wrapper = canvasRef.current.querySelector(
      `[data-component-id="${componentId}"]`
    ) as HTMLElement | null;
    if (wrapper) {
      restoreLucideIcons(wrapper);
      const newHtml = wrapper.innerHTML;
      if (newHtml !== originalHtml) {
        pushHistory();
      }
      updateComponentHtml(componentId, newHtml);
      window.lucide?.createIcons();
    }
    editingRef.current = null;
  };

  const cancelEditFn = useRef<() => void>(() => {});
  cancelEditFn.current = () => {
    if (!editingRef.current || !canvasRef.current) return;
    const { el, componentId, originalHtml } = editingRef.current;
    el.contentEditable = 'inherit';
    el.style.removeProperty('outline');
    el.style.removeProperty('outline-offset');
    const wrapper = canvasRef.current.querySelector(
      `[data-component-id="${componentId}"]`
    ) as HTMLElement | null;
    if (wrapper) {
      wrapper.innerHTML = originalHtml;
      window.Alpine?.initTree(wrapper);
      window.lucide?.createIcons();
    }
    editingRef.current = null;
  };

  // ── Shared inline-edit starter (ref-pattern so closures always get latest) ─
  const startInlineEditRef = useRef<(el: HTMLElement, componentId: string, wrapper: HTMLElement) => void>(() => {});
  startInlineEditRef.current = (el: HTMLElement, componentId: string, wrapper: HTMLElement) => {
    if (editingRef.current) commitEditFn.current();
    clearHoverHighlight();
    setDisambigState(null);
    const clone = wrapper.cloneNode(true) as HTMLElement;
    restoreLucideIcons(clone);
    editingRef.current = { el, componentId, originalHtml: clone.innerHTML };
    clearSelection();
    setIconPickerState(null);
    el.contentEditable = 'true';
    el.style.outline = '2px solid #3B82F6';
    el.style.outlineOffset = '2px';
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    el.addEventListener('blur', () => commitEditFn.current(), { once: true });
  };

  // ── Register refs in store ─────────────────────────────────────────────────
  useEffect(() => {
    setCanvasRef(canvasRef);
    setContainerRef(containerRef);
  }, [setCanvasRef, setContainerRef]);

  // ── Clear canvas when page is removed (New page / clearPage) ─────────────
  useEffect(() => {
    if (!page && canvasRef.current) {
      canvasRef.current.innerHTML = '';
      lastPageSignatureRef.current = null;
    }
  }, [page]);

  // ── Canvas rebuild when page structure changes or undo/redo fires ─────────
  useEffect(() => {
    if (!page || !canvasRef.current) return;
    // forceRebuild is incremented on undo/redo; including it ensures a rebuild
    // even when component IDs haven't changed (e.g. text or theme was restored)
    const signature =
      forceRebuild +
      ':' +
      page.title +
      ':' +
      [...page.components]
        .sort((a, b) => a.order - b.order)
        .map((c) => c.id)
        .join(',') +
      ':s:' +
      siteComponents.map((c) => c.id).join(',');
    if (signature !== lastPageSignatureRef.current) {
      lastPageSignatureRef.current = signature;
      // Any hovered element is about to be destroyed — clean up immediately
      clearHoverHighlight();
      canvasRebuild(canvasRef.current, page.components, siteComponents);
    }
  }, [page, forceRebuild, siteComponents, clearHoverHighlight]);

  // ── Selection rect helpers ─────────────────────────────────────────────────
  const refreshSelectionRect = useCallback(
    (id: string) => {
      if (!canvasRef.current || !containerRef.current) return;
      const el = canvasRef.current.querySelector(
        `[data-component-id="${id}"]`
      ) as HTMLElement | null;
      if (!el) return;
      const er = el.getBoundingClientRect();
      const cr = containerRef.current.getBoundingClientRect();
      addSelectionRect({
        id,
        top: er.top - cr.top + containerRef.current.scrollTop,
        left: er.left - cr.left,
        width: er.width,
        height: er.height,
      });
    },
    [addSelectionRect]
  );

  const refreshAllSelectionRects = useCallback(() => {
    setSelectionRects([]);
    selectedIds.forEach(refreshSelectionRect);
  }, [selectedIds, refreshSelectionRect, setSelectionRects]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => refreshAllSelectionRects();
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [refreshAllSelectionRects]);

  // Refresh rects whenever the canvas resizes — covers panel collapse/expand,
  // window resize, and content reflow from AI updates changing section height
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => refreshAllSelectionRects());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [refreshAllSelectionRects]);

  useEffect(() => {
    if (selectedIds.length === 0) { setSelectionRects([]); return; }
    setSelectionRects([]);
    selectedIds.forEach(refreshSelectionRect);
  }, [selectedIds, refreshSelectionRect, setSelectionRects]);

  useEffect(() => {
    if (componentUpdateTick === 0) return;
    refreshAllSelectionRects();
  }, [componentUpdateTick, refreshAllSelectionRects]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement as HTMLElement)?.tagName;
      const inTextField =
        activeTag === 'INPUT' ||
        activeTag === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      if (e.key === 'Escape') {
        if (editingRef.current) { cancelEditFn.current(); return; }
        if (iconPickerStateRef.current) { setIconPickerState(null); return; }
        setDisambigState(null);
        clearSelection();
        return;
      }
      if (e.key === 'Enter' && editingRef.current) {
        const tag = editingRef.current.el.tagName;
        if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(tag)) {
          e.preventDefault();
          commitEditFn.current();
        }
        return;
      }
      // Undo: Ctrl/Cmd+Z (only when not typing in a text field)
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'z' && !inTextField) {
        e.preventDefault();
        undo();
        return;
      }
      // Redo: Ctrl/Cmd+Shift+Z or Ctrl+Y (only when not typing in a text field)
      if (
        !inTextField &&
        (
          ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') ||
          (e.ctrlKey && !e.metaKey && e.key === 'y')
        )
      ) {
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length === 0) return;
        if (inTextField) return;
        pushHistory();
        for (const id of selectedIds) {
          if (canvasRef.current) canvasRemoveComponent(canvasRef.current, id);
          removeComponent(id);
        }
        clearSelection();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearSelection, selectedIds, removeComponent, undo, redo, pushHistory]);

  // ── Hover: highlight editable text + show tooltip ─────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Suppress hints while editing or any picker/editor is open
      if (editingRef.current || iconPickerStateRef.current) {
        clearHoverHighlight();
        return;
      }

      const target = e.target as HTMLElement;
      const wrapper = target.closest('[data-component-id]') as HTMLElement | null;

      // Icons take priority, unless the icon is inside a link
      const iconEl = wrapper
        ? (target.closest('svg[data-lucide], i[data-lucide]') as Element | null)
        : null;
      const iconInLink = iconEl?.closest('a[href]') ?? null;
      const effectiveIconEl = iconEl && !iconInLink ? iconEl : null;
      // Links (including icon-in-link — effectiveIconEl is null in that case)
      const linkEl = !effectiveIconEl && wrapper ? (target.closest('a[href]') as HTMLAnchorElement | null) : null;
      // Iframes
      const iframeEl = !iconEl && !linkEl && wrapper && target.tagName === 'IFRAME'
        ? (target as HTMLIFrameElement)
        : null;
      // Forms (submit button or form background, but not text inputs)
      const isFormTrigger =
        target.tagName === 'FORM' ||
        (target as HTMLButtonElement | HTMLInputElement).type === 'submit';
      const formEl = !iconEl && !linkEl && !iframeEl && wrapper && isFormTrigger
        ? (target.closest('form') as HTMLFormElement | null)
        : null;
      // Editable text — lowest priority
      const textEl = !iconEl && !linkEl && !iframeEl && !formEl && wrapper
        ? findEditableEl(target, wrapper)
        : null;

      // Early exit if nothing changed
      const hoveredSpecialEl = linkEl ?? iframeEl ?? formEl ?? null;
      if (effectiveIconEl && effectiveIconEl === hoveredIconRef.current) return;
      if (!effectiveIconEl && hoveredSpecialEl === hoveredEditableRef.current && textEl === hoveredEditableRef.current) return;
      if (!effectiveIconEl && !hoveredSpecialEl && textEl === hoveredEditableRef.current) return;

      // Clear previous hover state
      if (hoveredEditableRef.current?.isConnected) {
        hoveredEditableRef.current.classList.remove('blitz-text-hover');
      }
      hoveredEditableRef.current = null;
      hoveredIconRef.current = null;
      if (hintTimerRef.current) { clearTimeout(hintTimerRef.current); hintTimerRef.current = null; }
      setEditHint(null);

      const showHint = (el: Element, type: 'icon' | 'link' | 'video' | 'form' | 'text', delay: number) => {
        hintTimerRef.current = setTimeout(() => {
          if (!el.isConnected) return;
          const r = el.getBoundingClientRect();
          const TIP_HALF_W = 90;
          const TIP_H = 30;
          const vw = window.innerWidth;
          const rawX = r.left + r.width / 2;
          const clampedX = Math.max(TIP_HALF_W + 8, Math.min(rawX, vw - TIP_HALF_W - 8));
          const flipped = r.top < TIP_H + 12;
          setEditHint({ type, x: clampedX, y: r.top, flipped, elBottom: r.bottom });
        }, delay);
      };

      if (effectiveIconEl) {
        hoveredIconRef.current = effectiveIconEl;
        showHint(effectiveIconEl, 'icon', 400);
      } else if (linkEl) {
        hoveredEditableRef.current = linkEl;
        showHint(linkEl, 'link', 400);
      } else if (iframeEl) {
        hoveredEditableRef.current = iframeEl;
        showHint(iframeEl, 'video', 400);
      } else if (formEl) {
        hoveredEditableRef.current = formEl;
        showHint(formEl, 'form', 400);
      } else if (textEl) {
        hoveredEditableRef.current = textEl;
        textEl.classList.add('blitz-text-hover');
        showHint(textEl, 'text', 600);
      }
    };

    const handleMouseLeave = () => clearHoverHighlight();

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      clearHoverHighlight();
    };
  }, [clearHoverHighlight]);

  // ── Double-click: inline text editing (3A) ─────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleDblClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const wrapper = target.closest('[data-component-id]') as HTMLElement | null;
      if (!wrapper) return;
      const el = findEditableEl(target, wrapper);
      if (!el) return;
      e.stopPropagation();
      e.preventDefault();
      const componentId = wrapper.dataset.componentId!;
      startInlineEditRef.current(el, componentId, wrapper);
    };

    canvas.addEventListener('dblclick', handleDblClick);
    return () => canvas.removeEventListener('dblclick', handleDblClick);
  }, []);

  // ── Disambiguation menu: close on outside click, Escape, or scroll ────────
  useEffect(() => {
    if (!disambigState) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); setDisambigState(null); }
    };
    const handleMouseDown = (e: MouseEvent) => {
      if (disambigRef.current && !disambigRef.current.contains(e.target as Node)) {
        setDisambigState(null);
      }
    };
    const handleScroll = () => setDisambigState(null);
    const container = containerRef.current;
    document.addEventListener('keydown', handleKey, true);
    document.addEventListener('mousedown', handleMouseDown);
    container?.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      document.removeEventListener('keydown', handleKey, true);
      document.removeEventListener('mousedown', handleMouseDown);
      container?.removeEventListener('scroll', handleScroll);
    };
  }, [disambigState]);

  // ── Click-to-select / icon picker ─────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const checkInteractive = (el: HTMLElement, boundary: Element): boolean => {
      if (el.closest('a, button, input, textarea, select, summary, [role="button"]')) return true;
      let node: HTMLElement | null = el;
      while (node && node !== boundary) {
        for (const attr of Array.from(node.attributes)) {
          if (attr.name.startsWith('@') || attr.name.startsWith('x-on:')) return true;
        }
        node = node.parentElement;
      }
      return false;
    };

    const handleClick = (e: MouseEvent) => {
      const wrapper = (e.target as HTMLElement).closest(
        '[data-component-id]'
      ) as HTMLElement | null;

      if (!wrapper) {
        clearSelection();
        setIconPickerState(null);
        return;
      }

      e.stopPropagation();
      // Always prevent anchor navigation within the editor (we handle it manually)
      if ((e.target as HTMLElement).closest('a')) e.preventDefault();

      const id = wrapper.dataset.componentId!;
      const multi = e.shiftKey;
      const target = e.target as HTMLElement;

      // Alt+click on a link: follow it (test mode) instead of opening the editor
      if (e.altKey) {
        const altAnchor = (target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null;
        if (altAnchor) {
          const href = altAnchor.getAttribute('href') ?? '';
          if (href.startsWith('#')) {
            const fragment = href.slice(1);
            const tildeIdx = fragment.indexOf('~');
            const storeState = useEditorStore.getState();
            if (tildeIdx !== -1) {
              // Cross-page section link: #page-slug~section-id
              const pageSlug = fragment.slice(0, tildeIdx);
              const sectionId = fragment.slice(tildeIdx + 1);
              const targetPage = storeState.pageEntries.find((p) => p.slug === pageSlug);
              if (targetPage) {
                storeState.switchPage(targetPage.id);
                requestAnimationFrame(() => {
                  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
                });
              }
            } else {
              const targetPage = storeState.pageEntries.find((p) => p.slug === fragment);
              if (targetPage) {
                storeState.switchPage(targetPage.id);
              } else {
                document.getElementById(fragment)?.scrollIntoView({ behavior: 'smooth' });
              }
            }
          } else if (href) {
            window.open(href, '_blank', 'noopener noreferrer');
          }
          return;
        }
      }

      // Icon click → open picker (skip if icon is inside a link — let link handler below deal with it)
      const iconEl = target.closest('svg[data-lucide], i[data-lucide]');
      const iconInLink = iconEl?.closest('a[href]');
      if (iconEl && !iconInLink) {
        const iconName = iconEl.getAttribute('data-lucide') || '';
        if (iconName) {
          iconPickerTargetRef.current = iconEl;
          // Compute index now — createIcons() in IconPickerPanel replaces SVG nodes,
          // invalidating the stored ref. The index stays valid since replacement is in-place.
          const allIcons = Array.from(wrapper.querySelectorAll('svg[data-lucide], i[data-lucide]'));
          const iconIndex = allIcons.indexOf(iconEl as Element);
          const rect = iconEl.getBoundingClientRect();
          setIconPickerState({ componentId: id, iconName, iconIndex, x: rect.left, y: rect.bottom });
          if (!selectedIds.includes(id)) {
            selectComponent(id, false);
            requestAnimationFrame(() => refreshSelectionRect(id));
          }
          return;
        }
      }

      setIconPickerState(null);

      // Link click — open editor on first click (also selects the component)
      const anchorEl = (target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null;
      if (anchorEl) {
        if (!selectedIds.includes(id)) {
          selectComponent(id, multi);
          requestAnimationFrame(() => refreshSelectionRect(id));
        }
        const allAnchors = Array.from(wrapper.querySelectorAll('a[href]'));
        const anchorIndex = allAnchors.indexOf(anchorEl);
        const rect = anchorEl.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.bottom;

        const openLinkEditor = () => {
          setLinkEditorState({
            componentId: id,
            anchorIndex,
            href: anchorEl.getAttribute('href') ?? '',
            newTab: anchorEl.getAttribute('target') === '_blank',
            x: rect.left,
            y: rect.bottom,
          });
          setVideoEditorState(null);
          setFormEditorState(null);
        };

        if (iconEl && iconInLink) {
          // Icon inside a link — offer "Edit link" vs "Change icon"
          const capturedIconEl = iconEl as Element;
          const capturedId = id;
          const capturedWrapper = wrapper;
          setDisambigState({
            x: cx, y: cy,
            options: [
              { label: 'Edit link', type: 'link', onSelect: () => { setDisambigState(null); openLinkEditor(); } },
              {
                label: 'Change icon', type: 'icon',
                onSelect: () => {
                  setDisambigState(null);
                  const iconName = capturedIconEl.getAttribute('data-lucide') || '';
                  if (iconName) {
                    iconPickerTargetRef.current = capturedIconEl;
                    const allIcons = Array.from(capturedWrapper.querySelectorAll('svg[data-lucide], i[data-lucide]'));
                    const iconIdx = allIcons.indexOf(capturedIconEl);
                    const iconRect = capturedIconEl.getBoundingClientRect();
                    setIconPickerState({ componentId: capturedId, iconName, iconIndex: iconIdx, x: iconRect.left, y: iconRect.bottom });
                  }
                },
              },
            ],
          });
          return;
        }

        const textEl = findEditableEl(target, wrapper);
        if (textEl && anchorEl.contains(textEl)) {
          // Text inside a link — offer "Edit link" vs "Edit text"
          const capturedTextEl = textEl;
          const capturedId = id;
          const capturedWrapper = wrapper;
          setDisambigState({
            x: cx, y: cy,
            options: [
              { label: 'Edit link', type: 'link', onSelect: () => { setDisambigState(null); openLinkEditor(); } },
              {
                label: 'Edit text', type: 'text',
                onSelect: () => { setDisambigState(null); startInlineEditRef.current(capturedTextEl, capturedId, capturedWrapper); },
              },
            ],
          });
          return;
        }

        openLinkEditor();
        return;
      }

      // Iframe click — open editor on first click
      if ((target as HTMLElement).tagName === 'IFRAME') {
        const iframeEl = target as HTMLIFrameElement;
        if (!selectedIds.includes(id)) {
          selectComponent(id, multi);
          requestAnimationFrame(() => refreshSelectionRect(id));
        }
        const allIframes = Array.from(wrapper.querySelectorAll('iframe'));
        const iframeIndex = allIframes.indexOf(iframeEl);
        const rect = iframeEl.getBoundingClientRect();
        setVideoEditorState({
          componentId: id,
          iframeIndex,
          src: iframeEl.getAttribute('src') ?? '',
          x: rect.left,
          y: rect.bottom,
        });
        setLinkEditorState(null);
        setFormEditorState(null);
        return;
      }

      // Form submit button click — open editor on first click
      const isSubmit =
        ((target as HTMLButtonElement).type === 'submit' && (target as HTMLElement).closest('form') !== null) ||
        ((target as HTMLInputElement).type === 'submit');
      if (isSubmit) {
        const formEl = (target as HTMLElement).closest('form') as HTMLFormElement | null;
        if (formEl) {
          if (!selectedIds.includes(id)) {
            selectComponent(id, multi);
            requestAnimationFrame(() => refreshSelectionRect(id));
          }
          const allForms = Array.from(wrapper.querySelectorAll('form'));
          const formIndex = allForms.indexOf(formEl);
          const rect = formEl.getBoundingClientRect();
          setFormEditorState({
            componentId: id,
            formIndex,
            action: formEl.getAttribute('action') ?? '',
            x: rect.left,
            y: rect.bottom,
          });
          setLinkEditorState(null);
          setVideoEditorState(null);
          return;
        }
      }

      const interactive = checkInteractive(target, wrapper);
      if (interactive) {
        if (!selectedIds.includes(id)) {
          selectComponent(id, multi);
          requestAnimationFrame(() => refreshSelectionRect(id));
        }
        return;
      }

      if (!multi && selectedIds.length === 1 && selectedIds[0] === id) {
        clearSelection();
        return;
      }

      selectComponent(id, multi);
      requestAnimationFrame(() => refreshSelectionRect(id));
    };

    canvas.addEventListener('click', handleClick);
    return () => canvas.removeEventListener('click', handleClick);
  }, [selectComponent, clearSelection, refreshSelectionRect, selectedIds]);

  // ── Icon selection callback ────────────────────────────────────────────────
  const handleIconSelect = useCallback(
    (newName: string) => {
      const state = iconPickerStateRef.current;
      if (!state || !canvasRef.current) { setIconPickerState(null); return; }

      const { componentId, iconIndex } = state;
      const wrapper = canvasRef.current.querySelector(
        `[data-component-id="${componentId}"]`
      ) as HTMLElement | null;

      // Find current target by index (robust: createIcons() in IconPickerPanel replaces SVG
      // nodes with fresh ones, disconnecting the stored iconPickerTargetRef reference).
      const allIcons = wrapper?.querySelectorAll('svg[data-lucide], i[data-lucide]');
      const target =
        (allIcons && iconIndex >= 0 && iconIndex < allIcons.length ? allIcons[iconIndex] : null) ??
        (iconPickerTargetRef.current?.isConnected ? iconPickerTargetRef.current : null);

      if (wrapper && target) {
        // Preserve size/color classes; strip Lucide-generated ones (lucide, lucide-*)
        const classes = Array.from(target.classList)
          .filter((c) => !c.startsWith('lucide'))
          .join(' ');
        const newI = document.createElement('i');
        newI.setAttribute('data-lucide', newName);
        if (classes) newI.className = classes;
        target.parentNode?.replaceChild(newI, target);
        // Normalize all remaining SVGs in the wrapper to canonical <i> form
        restoreLucideIcons(wrapper);
        pushHistory();
        updateComponentHtml(componentId, wrapper.innerHTML);
        // Re-render all <i data-lucide> in the document (including the new one)
        window.lucide?.createIcons();
      }

      setIconPickerState(null);
    },
    [updateComponentHtml, pushHistory]
  );

  // ── Prop editor save callbacks ─────────────────────────────────────────────

  const handleLinkSave = useCallback(
    (href: string, newTab: boolean) => {
      if (!linkEditorState || !canvasRef.current) { setLinkEditorState(null); return; }
      const { componentId, anchorIndex } = linkEditorState;
      const wrapper = canvasRef.current.querySelector(
        `[data-component-id="${componentId}"]`
      ) as HTMLElement | null;
      if (wrapper) {
        const anchor = wrapper.querySelectorAll('a[href]')[anchorIndex] as HTMLAnchorElement | null;
        if (anchor) {
          // Normalize external URLs: bare domains like "google.com" must get a protocol
          // or the browser treats them as relative paths (e.g. /p/slug/google.com).
          const normalizedHref =
            href && !href.startsWith('#') && !href.startsWith('/') &&
            !/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(href)
              ? `https://${href}`
              : href;
          anchor.setAttribute('href', normalizedHref);
          if (newTab) {
            anchor.setAttribute('target', '_blank');
            anchor.setAttribute('rel', 'noopener noreferrer');
          } else {
            anchor.removeAttribute('target');
            anchor.removeAttribute('rel');
          }
          pushHistory();
          updateComponentHtml(componentId, wrapper.innerHTML);
        }
      }
      setLinkEditorState(null);
    },
    [linkEditorState, pushHistory, updateComponentHtml]
  );

  const handleVideoSave = useCallback(
    (embedSrc: string) => {
      if (!videoEditorState || !canvasRef.current) { setVideoEditorState(null); return; }
      const { componentId, iframeIndex } = videoEditorState;
      const wrapper = canvasRef.current.querySelector(
        `[data-component-id="${componentId}"]`
      ) as HTMLElement | null;
      if (wrapper) {
        const iframe = wrapper.querySelectorAll('iframe')[iframeIndex] as HTMLIFrameElement | null;
        if (iframe) {
          iframe.setAttribute('src', embedSrc);
          pushHistory();
          updateComponentHtml(componentId, wrapper.innerHTML);
        }
      }
      setVideoEditorState(null);
    },
    [videoEditorState, pushHistory, updateComponentHtml]
  );

  const handleFormSave = useCallback(
    (action: string) => {
      if (!formEditorState || !canvasRef.current) { setFormEditorState(null); return; }
      const { componentId, formIndex } = formEditorState;
      const wrapper = canvasRef.current.querySelector(
        `[data-component-id="${componentId}"]`
      ) as HTMLElement | null;
      if (wrapper) {
        const form = wrapper.querySelectorAll('form')[formIndex] as HTMLFormElement | null;
        if (form) {
          form.setAttribute('action', action);
          pushHistory();
          updateComponentHtml(componentId, wrapper.innerHTML);
        }
      }
      setFormEditorState(null);
    },
    [formEditorState, pushHistory, updateComponentHtml]
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-y-auto"
      style={{
        backgroundColor: '#eef0f3',
        backgroundImage: 'radial-gradient(circle, #c8ccd4 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
      onClick={() => clearSelection()}
    >
      <div
        ref={canvasRef}
        id="cv-canvas-root"
        data-theme={page?.theme.daisyTheme ?? 'light'}
        className="min-h-full"
        style={{
          fontFamily: page?.theme.fontFamily
            ? `'${page.theme.fontFamily}', sans-serif`
            : undefined,
        }}
      />

      <SelectionOverlay containerRef={containerRef} />
      <ImageUploadOverlay containerRef={containerRef} />

      {iconPickerState && (
        <IconPickerPanel
          currentIcon={iconPickerState.iconName}
          x={iconPickerState.x}
          y={iconPickerState.y}
          onSelect={handleIconSelect}
          onClose={() => setIconPickerState(null)}
        />
      )}

      {linkEditorState && (
        <LinkEditorPanel
          href={linkEditorState.href}
          newTab={linkEditorState.newTab}
          x={linkEditorState.x}
          y={linkEditorState.y}
          onSave={handleLinkSave}
          onClose={() => setLinkEditorState(null)}
        />
      )}

      {videoEditorState && (
        <VideoEditorPanel
          src={videoEditorState.src}
          x={videoEditorState.x}
          y={videoEditorState.y}
          onSave={handleVideoSave}
          onClose={() => setVideoEditorState(null)}
        />
      )}

      {formEditorState && (
        <FormEditorPanel
          action={formEditorState.action}
          x={formEditorState.x}
          y={formEditorState.y}
          onSave={handleFormSave}
          onClose={() => setFormEditorState(null)}
        />
      )}

      {/* Disambiguation menu */}
      {disambigState && (
        <div
          ref={disambigRef}
          className="fixed z-[250] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl"
          style={{ left: disambigState.x, top: disambigState.y + 6, transform: 'translateX(-50%)' }}
        >
          {disambigState.options.map((opt) => (
            <button
              key={opt.label}
              onMouseDown={(e) => { e.preventDefault(); opt.onSelect(); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors whitespace-nowrap"
            >
              {opt.type === 'link' && (
                <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              )}
              {opt.type === 'icon' && (
                <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              )}
              {opt.type === 'text' && (
                <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              )}
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Edit tooltip */}
      {editHint && (
        <div
          className="pointer-events-none fixed z-[200]"
          style={{
            left: editHint.x,
            top: editHint.flipped ? editHint.elBottom + 6 : editHint.y - 6,
            transform: editHint.flipped ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
          }}
        >
          {/* Caret above pill when flipped */}
          {editHint.flipped && (
            <div className="mx-auto w-fit">
              <div className="border-x-[5px] border-b-[5px] border-x-transparent border-b-gray-900/90" />
            </div>
          )}
          <div className="flex items-center gap-1 rounded-md bg-gray-900/90 px-2 py-1 text-[11px] font-medium text-white shadow-lg whitespace-nowrap">
            {editHint.type === 'icon' ? (
              <>
                <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
                Click to change icon
              </>
            ) : editHint.type === 'link' ? (
              <>
                <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                Click to edit link
                <span className="opacity-50 font-normal">• Alt+click to follow</span>
              </>
            ) : editHint.type === 'video' ? (
              <>
                <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
                Click to set video
              </>
            ) : editHint.type === 'form' ? (
              <>
                <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                Click to set form action
              </>
            ) : (
              <>
                <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Double-click to edit
              </>
            )}
          </div>
          {/* Caret below pill when normal */}
          {!editHint.flipped && (
            <div className="mx-auto w-fit">
              <div className="border-x-[5px] border-t-[5px] border-x-transparent border-t-gray-900/90" />
            </div>
          )}
        </div>
      )}

      {isGenerating && (
        <div className="absolute top-0 left-0 right-0 h-0.5 z-30 overflow-hidden pointer-events-none">
          <div
            className="absolute h-full bg-blue-500 rounded-full"
            style={{ animation: 'blitz-progress-slide 1.6s ease-in-out infinite' }}
          />
        </div>
      )}

      {isUpdating && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-white/95 shadow-lg border border-gray-200 rounded-full px-4 py-2 pointer-events-none">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <span className="text-sm text-gray-600 font-medium whitespace-nowrap">Updating…</span>
        </div>
      )}
    </div>
  );
}
