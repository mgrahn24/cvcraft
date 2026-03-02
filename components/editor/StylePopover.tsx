'use client';

import { useRef, useState } from 'react';
import { useEditorStore } from '@/lib/store/editorStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DAISY_THEMES, FONT_FAMILIES } from '@/types';
import type { DaisyTheme, FontFamily } from '@/types';
import { Paintbrush, ChevronDown, Wand2 } from 'lucide-react';

export function StylePopover() {
  const page = useEditorStore((s) => s.page);
  const canvasRef = useEditorStore((s) => s.canvasRef);
  const setDaisyTheme = useEditorStore((s) => s.setDaisyTheme);
  const setFontFamily = useEditorStore((s) => s.setFontFamily);
  const pushHistory = useEditorStore((s) => s.pushHistory);

  const [isSuggestingTheme, setIsSuggestingTheme] = useState(false);
  const [isSuggestingFont, setIsSuggestingFont] = useState(false);

  const themeBeforeOpenRef = useRef<string | null>(null);
  const themeSelectedRef = useRef(false);
  const fontBeforeOpenRef = useRef<string | null>(null);
  const fontSelectedRef = useRef(false);

  const applyThemePreview = (theme: string) => {
    if (canvasRef?.current) canvasRef.current.dataset.theme = theme;
  };

  const applyFontPreview = (font: string) => {
    if (canvasRef?.current) canvasRef.current.style.fontFamily = `'${font}', sans-serif`;
  };

  async function handleSuggestTheme() {
    if (!page || isSuggestingTheme) return;
    setIsSuggestingTheme(true);
    try {
      const res = await fetch('/api/suggest-theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName: page.title ?? 'CV',
          currentTheme: page.theme.daisyTheme,
          currentFont: page.theme.fontFamily,
          target: 'theme',
        }),
      });
      if (!res.ok) return;
      const { daisyTheme } = await res.json() as { daisyTheme: DaisyTheme; fontFamily: FontFamily };
      pushHistory();
      setDaisyTheme(daisyTheme);
      applyThemePreview(daisyTheme);
    } catch {
      // ignore
    } finally {
      setIsSuggestingTheme(false);
    }
  }

  async function handleSuggestFont() {
    if (!page || isSuggestingFont) return;
    setIsSuggestingFont(true);
    try {
      const res = await fetch('/api/suggest-theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName: page.title ?? 'CV',
          currentTheme: page.theme.daisyTheme,
          currentFont: page.theme.fontFamily,
          target: 'font',
        }),
      });
      if (!res.ok) return;
      const { fontFamily } = await res.json() as { daisyTheme: DaisyTheme; fontFamily: FontFamily };
      pushHistory();
      setFontFamily(fontFamily);
      applyFontPreview(fontFamily);
    } catch {
      // ignore
    } finally {
      setIsSuggestingFont(false);
    }
  }

  if (!page) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="h-8 px-2.5 rounded text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors flex items-center gap-1.5 flex-shrink-0">
          <Paintbrush className="w-3.5 h-3.5" />
          Style
          <ChevronDown className="w-3 h-3 opacity-40" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 p-4">
        <div className="space-y-4">
          {/* Theme */}
          <div>
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Theme</div>
            <div className="flex items-center gap-1.5">
              <Select
                value={page.theme.daisyTheme}
                onOpenChange={(open) => {
                  if (open) {
                    themeBeforeOpenRef.current = page.theme.daisyTheme;
                    themeSelectedRef.current = false;
                  } else if (!themeSelectedRef.current && themeBeforeOpenRef.current) {
                    applyThemePreview(themeBeforeOpenRef.current);
                  }
                }}
                onValueChange={(v) => {
                  themeSelectedRef.current = true;
                  pushHistory();
                  setDaisyTheme(v as DaisyTheme);
                  applyThemePreview(v);
                }}
              >
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  onMouseLeave={() => {
                    if (themeBeforeOpenRef.current) applyThemePreview(themeBeforeOpenRef.current);
                  }}
                >
                  {DAISY_THEMES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize text-xs" onMouseEnter={() => applyThemePreview(t)}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                onClick={handleSuggestTheme}
                disabled={isSuggestingTheme}
                title="Suggest a theme"
                className="h-8 w-8 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition-colors flex-shrink-0"
              >
                <Wand2 className={`w-3.5 h-3.5${isSuggestingTheme ? ' animate-pulse' : ''}`} />
              </button>
            </div>
          </div>

          {/* Font */}
          <div>
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Font</div>
            <div className="flex items-center gap-1.5">
              <Select
                value={page.theme.fontFamily}
                onOpenChange={(open) => {
                  if (open) {
                    fontBeforeOpenRef.current = page.theme.fontFamily;
                    fontSelectedRef.current = false;
                  } else if (!fontSelectedRef.current && fontBeforeOpenRef.current) {
                    applyFontPreview(fontBeforeOpenRef.current);
                  }
                }}
                onValueChange={(v) => {
                  fontSelectedRef.current = true;
                  pushHistory();
                  setFontFamily(v as FontFamily);
                  applyFontPreview(v);
                }}
              >
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  onMouseLeave={() => {
                    if (fontBeforeOpenRef.current) applyFontPreview(fontBeforeOpenRef.current);
                  }}
                >
                  {FONT_FAMILIES.map((f) => (
                    <SelectItem key={f} value={f} className="text-xs" onMouseEnter={() => applyFontPreview(f)}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                onClick={handleSuggestFont}
                disabled={isSuggestingFont}
                title="Suggest a font"
                className="h-8 w-8 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition-colors flex-shrink-0"
              >
                <Wand2 className={`w-3.5 h-3.5${isSuggestingFont ? ' animate-pulse' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
