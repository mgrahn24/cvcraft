'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditorStore } from '@/lib/store/editorStore';

interface UploadTarget {
  /** data-blitz-upload value, or empty string if the attribute isn't present */
  hint: string;
  /** src at scan time — used as the fallback match key when hint is absent */
  currentSrc: string;
  componentId: string;
  top: number;
  left: number;
  width: number;
  height: number;
  imgEl: HTMLImageElement;
  /** false = placehold.co placeholder (show prominent overlay) */
  filled: boolean;
}

interface Props {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Replace the src of a specific img tag in the stored HTML string.
 * Matches by data-blitz-upload hint when available; falls back to src.
 */
function replaceImgSrc(html: string, hint: string, currentSrc: string, dataUrl: string): string {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const matches = hint
      ? tag.includes(`data-blitz-upload="${hint}"`)
      : tag.includes(`src="${currentSrc}"`);
    return matches ? tag.replace(/\bsrc="[^"]*"/, `src="${dataUrl}"`) : tag;
  });
}

/** Minimum rendered size (px) to show an overlay — avoids covering tiny icons */
const MIN_SIZE = 32;

/**
 * Resize and center-crop a File to exactly fill slotWidth × slotHeight,
 * matching object-fit: cover semantics. Returns a JPEG data URL.
 * This ensures the stored image always matches the aspect ratio of the slot
 * it was placed into, regardless of the original photo's proportions.
 */
function cropToCover(file: File, slotWidth: number, slotHeight: number): Promise<string> {
  // Render at 2× CSS pixels for sharp display on HiDPI screens, capped for file size
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const canvasW = Math.round(Math.max(slotWidth * dpr, 200));
  const canvasH = Math.round(Math.max(slotHeight * dpr, 200));

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const canvas = document.createElement('canvas');
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('no 2d context')); return; }

      // Scale so the image covers the canvas completely, then center
      const scale = Math.max(canvasW / img.naturalWidth, canvasH / img.naturalHeight);
      const scaledW = img.naturalWidth * scale;
      const scaledH = img.naturalHeight * scale;
      const dx = (canvasW - scaledW) / 2;
      const dy = (canvasH - scaledH) / 2;

      ctx.drawImage(img, dx, dy, scaledW, scaledH);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };

    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('load failed')); };
    img.src = objectUrl;
  });
}

function CameraIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: size, height: size, flexShrink: 0 }}
    >
      <path d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
      <path d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
    </svg>
  );
}

/**
 * Overlay for an image that already has a real src (or any image without a placeholder).
 * Invisible at rest; on hover shows a dark veil + "Replace photo" pill.
 */
function FilledImageButton({
  target: t,
  onPick,
}: {
  target: UploadTarget;
  onPick: (e: React.MouseEvent, t: UploadTarget) => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={(e) => onPick(e, t)}
      className="absolute pointer-events-auto cursor-pointer flex items-center justify-center"
      style={{
        top: t.top,
        left: t.left,
        width: t.width,
        height: t.height,
        backgroundColor: hovered ? 'rgba(0,0,0,0.45)' : 'transparent',
        transition: 'background-color 0.15s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={t.hint ? `Replace: ${t.hint}` : 'Replace photo'}
    >
      {hovered && (
        <span
          className="flex items-center gap-1.5 bg-black/70 text-white text-xs font-medium rounded-full px-3 py-1.5"
          style={{ pointerEvents: 'none', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
        >
          <CameraIcon size={14} />
          Replace photo
        </span>
      )}
    </button>
  );
}

export function ImageUploadOverlay({ containerRef }: Props) {
  const [targets, setTargets] = useState<UploadTarget[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef<UploadTarget | null>(null);

  const canvasRef = useEditorStore((s) => s.canvasRef);
  const componentUpdateTick = useEditorStore((s) => s.componentUpdateTick);
  const page = useEditorStore((s) => s.page);
  const updateComponentHtml = useEditorStore((s) => s.updateComponentHtml);

  const scan = useCallback(() => {
    const canvas = canvasRef?.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // All images in the canvas — every image is potentially replaceable
    const imgs = Array.from(canvas.querySelectorAll('img')) as HTMLImageElement[];
    const cr = container.getBoundingClientRect();

    const next: UploadTarget[] = imgs
      .map((img) => {
        const er = img.getBoundingClientRect();
        const wrapper = img.closest('[data-component-id]') as HTMLElement | null;
        const src = img.getAttribute('src') ?? '';
        return {
          hint: img.dataset.blitzUpload ?? '',
          currentSrc: src,
          componentId: wrapper?.dataset.componentId ?? '',
          top: er.top - cr.top + container.scrollTop,
          left: er.left - cr.left,
          width: er.width,
          height: er.height,
          imgEl: img,
          // Only treat as unfilled (prominent overlay) when it's an explicit placeholder
          filled: !src.startsWith('https://placehold.co'),
        };
      })
      .filter((t) => t.componentId && t.width >= MIN_SIZE && t.height >= MIN_SIZE);

    setTargets(next);
  }, [canvasRef, containerRef]);

  // Scan after every canvas change (rebuild or individual update)
  useEffect(() => {
    const id = requestAnimationFrame(scan);
    return () => cancelAnimationFrame(id);
  }, [page, componentUpdateTick, scan]);

  // Re-scan on scroll so overlays track the correct positions
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('scroll', scan, { passive: true });
    return () => container.removeEventListener('scroll', scan);
  }, [containerRef, scan]);

  const openPicker = (e: React.MouseEvent, target: UploadTarget) => {
    e.stopPropagation();
    pendingRef.current = target;
    fileInputRef.current?.click();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = pendingRef.current;

    // Reset synchronously so the same file can be re-selected if needed
    e.target.value = '';
    pendingRef.current = null;

    if (!file || !target) return;

    cropToCover(file, target.width, target.height).then((dataUrl) => {
      // Immediate DOM feedback — no waiting for React re-render
      target.imgEl.src = dataUrl;

      // Persist into the stored HTML so it survives rebuilds
      const { page } = useEditorStore.getState();
      const component = page?.components.find((c) => c.id === target.componentId);
      if (component) {
        const updated = replaceImgSrc(component.html, target.hint, target.currentSrc, dataUrl);
        updateComponentHtml(target.componentId, updated);
      }

      // Remove immediately so there's no flash; the next scan (triggered by
      // componentUpdateTick) will re-add it as a filled target.
      setTargets((prev) => prev.filter((t) => t !== target));
    });
  };

  if (targets.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10" aria-hidden="true">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      {targets.map((t, i) =>
        t.filled ? (
          // Any real image — invisible until hovered
          <FilledImageButton key={`${t.componentId}-${i}`} target={t} onPick={openPicker} />
        ) : (
          // Explicit placehold.co placeholder — always-visible prominent overlay
          <button
            key={`${t.componentId}-${i}`}
            onClick={(e) => openPicker(e, t)}
            className="absolute pointer-events-auto flex flex-col items-center justify-center gap-1.5 cursor-pointer"
            style={{
              top: t.top,
              left: t.left,
              width: t.width,
              height: t.height,
              backgroundColor: 'rgba(0,0,0,0.42)',
              border: '2px dashed rgba(255,255,255,0.55)',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(0,0,0,0.62)')
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(0,0,0,0.42)')
            }
            title={`Click to upload: ${t.hint || 'image'}`}
          >
            <CameraIcon size={Math.min(40, t.height * 0.25)} />
            {t.height > 60 && (
              <span
                className="text-white text-xs font-medium text-center leading-tight px-2"
                style={{
                  maxWidth: t.width - 16,
                  textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {t.hint || 'Upload photo'}
              </span>
            )}
          </button>
        )
      )}
    </div>
  );
}
