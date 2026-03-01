import type { Component } from '@/types';

declare global {
  interface Window {
    Alpine?: {
      initTree: (el: Element) => void;
    };
    lucide?: {
      createIcons: () => void;
    };
  }
}

function wrapComponent(c: Component): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.id = c.id; // enables #id anchor links and hash-routing to components
  wrapper.dataset.componentId = c.id;
  wrapper.dataset.componentType = c.type;
  if (c.type === 'layout' && c.columns) {
    const grid = document.createElement('div');
    grid.className = 'grid gap-4';
    grid.style.gridTemplateColumns = `repeat(${c.columns.length}, minmax(0, 1fr))`;
    for (const col of c.columns) {
      const colDiv = document.createElement('div');
      colDiv.className = 'flex flex-col gap-4';
      for (const child of col) {
        const childWrapper = document.createElement('div');
        childWrapper.dataset.componentId = child.id;
        childWrapper.dataset.componentType = child.type;
        childWrapper.innerHTML = child.html;
        colDiv.appendChild(childWrapper);
      }
      grid.appendChild(colDiv);
    }
    wrapper.appendChild(grid);
  } else {
    wrapper.innerHTML = c.html;
  }
  return wrapper;
}

function initAlpine(el: Element): void {
  // Safety net: Alpine v3 auto-detects via MutationObserver,
  // but explicitly init just in case the tree is added synchronously
  // before Alpine's observer fires.
  if (window.Alpine?.initTree) {
    window.Alpine.initTree(el);
  }
}

function initLucide(): void {
  // Scans the whole document for <i data-lucide="…"> elements and replaces them
  // with the corresponding SVG. Already-converted <svg> elements are skipped.
  window.lucide?.createIcons();
}

export function canvasAddComponent(
  canvas: HTMLDivElement,
  component: Component,
  afterId?: string
): void {
  const wrapper = wrapComponent(component);
  wrapper.classList.add('blitz-component-enter');

  if (afterId) {
    const anchor = canvas.querySelector(`[data-component-id="${afterId}"]`);
    if (anchor?.nextSibling) {
      canvas.insertBefore(wrapper, anchor.nextSibling);
    } else if (anchor) {
      anchor.parentNode?.appendChild(wrapper);
    } else {
      canvas.appendChild(wrapper);
    }
  } else {
    canvas.appendChild(wrapper);
  }

  initAlpine(wrapper);
  initLucide();
}

export function canvasUpdateComponent(
  canvas: HTMLDivElement,
  id: string,
  html: string
): void {
  const wrapper = canvas.querySelector(`[data-component-id="${id}"]`) as HTMLElement | null;
  if (!wrapper) return;
  wrapper.innerHTML = html;
  initAlpine(wrapper);
  initLucide();
}

export function canvasRemoveComponent(canvas: HTMLDivElement, id: string): void {
  canvas.querySelector(`[data-component-id="${id}"]`)?.remove();
}

export function canvasDuplicateComponent(
  canvas: HTMLDivElement,
  id: string,
  newId: string
): void {
  const original = canvas.querySelector(`[data-component-id="${id}"]`) as HTMLElement | null;
  if (!original) return;

  const clone = original.cloneNode(true) as HTMLElement;
  clone.id = newId;
  clone.dataset.componentId = newId;
  original.insertAdjacentElement('afterend', clone);
  initAlpine(clone);
  initLucide();
}

/**
 * Converts Lucide-generated SVGs back to <i data-lucide="…"> elements so the
 * stored HTML stays canonical.  Strips Lucide-added classes (lucide, lucide-*)
 * but preserves every other class (w-5, text-primary, …).
 */
export function restoreLucideIcons(wrapper: HTMLElement): void {
  const svgs = wrapper.querySelectorAll('svg[data-lucide]');
  svgs.forEach((svg) => {
    const name = svg.getAttribute('data-lucide');
    if (!name) return;
    const classes = Array.from(svg.classList)
      .filter((c) => !c.startsWith('lucide'))
      .join(' ');
    const i = document.createElement('i');
    i.setAttribute('data-lucide', name);
    if (classes) i.className = classes;
    svg.parentNode?.replaceChild(i, svg);
  });
}

/**
 * Rebuild the canvas from page components + optional site-wide components.
 * Site non-footer components render before page content; footers render after.
 */
export function canvasRebuild(
  canvas: HTMLDivElement,
  components: Component[],
  siteComponents: Component[] = []
): void {
  const sorted = [...components].sort((a, b) => a.order - b.order);
  const siteHeader = siteComponents.filter((c) => c.type !== 'footer');
  const siteFooter = siteComponents.filter((c) => c.type === 'footer');

  canvas.innerHTML = '';
  [...siteHeader, ...sorted, ...siteFooter].forEach((c) => canvas.appendChild(wrapComponent(c)));

  initAlpine(canvas);
  initLucide();
}
