'use client';

import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { TEMPLATES, type TemplateDefinition } from '@/lib/templates';
import { loadSaves } from '@/lib/utils/storage';
import type { SavedPage } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onGenerate: (description: string) => void;
}

type WizardState =
  | { mode: 'pick' }
  | { mode: 'template'; template: TemplateDefinition; step: number }
  | { mode: 'saved-pick' }
  | { mode: 'saved-describe'; site: SavedPage };

export function TemplateWizard({ open, onClose, onGenerate }: Props) {
  const [state, setState] = useState<WizardState>({ mode: 'pick' });
  const [fieldData, setFieldData] = useState<Record<string, string | string[]>>({});
  const [savedDescription, setSavedDescription] = useState('');

  const saves: SavedPage[] = typeof window !== 'undefined' ? loadSaves() : [];

  const reset = useCallback(() => {
    setState({ mode: 'pick' });
    setFieldData({});
    setSavedDescription('');
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  // ── Template mode helpers ─────────────────────────────────────────────────

  function setField(id: string, value: string | string[]) {
    setFieldData((prev) => ({ ...prev, [id]: value }));
  }

  function toggleMulti(id: string, value: string) {
    setFieldData((prev) => {
      const current = (prev[id] as string[] | undefined) ?? [];
      return {
        ...prev,
        [id]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
      };
    });
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  function back() {
    if (state.mode === 'template') {
      if (state.step === 0) {
        setState({ mode: 'pick' });
      } else {
        setState({ ...state, step: state.step - 1 });
      }
    } else if (state.mode === 'saved-pick') {
      setState({ mode: 'pick' });
    } else if (state.mode === 'saved-describe') {
      setState({ mode: 'saved-pick' });
    }
  }

  function next() {
    if (state.mode === 'template') {
      const totalSteps = state.template.steps.length;
      if (state.step < totalSteps - 1) {
        setState({ ...state, step: state.step + 1 });
      } else {
        // Last step — generate
        const prompt = state.template.buildPrompt(fieldData);
        onGenerate(prompt);
        reset();
      }
    } else if (state.mode === 'saved-describe') {
      const site = state.site;
      const theme = site.entries[0]?.content.theme;
      const styleHint = theme
        ? `Use the "${theme.daisyTheme}" DaisyUI theme and ${theme.fontFamily} font to match the style of the existing site "${site.appName || site.name}". `
        : '';
      onGenerate(`${styleHint}${savedDescription}`);
      reset();
    }
  }

  // ── Can advance? ──────────────────────────────────────────────────────────

  function canAdvance(): boolean {
    if (state.mode === 'template') {
      const currentStep = state.template.steps[state.step];
      return currentStep.fields.every((f) => {
        if (!f.required) return true;
        const val = fieldData[f.id];
        if (typeof val === 'string') return val.trim().length > 0;
        return true;
      });
    }
    if (state.mode === 'saved-describe') {
      return savedDescription.trim().length > 0;
    }
    return false;
  }

  const isLastStep =
    state.mode === 'template'
      ? state.step === state.template.steps.length - 1
      : state.mode === 'saved-describe';

  // ── Progress bar ─────────────────────────────────────────────────────────

  function renderProgress() {
    if (state.mode === 'template') {
      const total = state.template.steps.length;
      const current = state.step + 1;
      const pct = Math.round((current / total) * 100);
      return (
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gray-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[10px] text-gray-400 flex-shrink-0">
            {current} / {total}
          </span>
        </div>
      );
    }
    if (state.mode === 'saved-describe') {
      return (
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gray-400 rounded-full" style={{ width: '100%' }} />
          </div>
          <span className="text-[10px] text-gray-400 flex-shrink-0">1 / 1</span>
        </div>
      );
    }
    return null;
  }

  // ── Render body ───────────────────────────────────────────────────────────

  function renderBody() {
    // Template picker
    if (state.mode === 'pick') {
      return (
        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => setState({ mode: 'template', template: tpl, step: 0 })}
                className="flex items-start gap-3 rounded-lg border border-gray-200 px-3.5 py-3 text-left hover:border-gray-400 hover:bg-gray-50 transition-colors"
              >
                <span className="text-xl leading-none mt-0.5">{tpl.icon}</span>
                <div>
                  <p className="text-sm font-medium text-gray-800">{tpl.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{tpl.description}</p>
                </div>
              </button>
            ))}
          </div>

          {saves.length > 0 && (
            <>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-[10px] text-gray-400 uppercase tracking-wide">or</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Start from a saved site</p>
                <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto">
                  {saves.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setState({ mode: 'saved-describe', site: s })}
                      className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5 text-left hover:border-gray-400 hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800 leading-tight">{s.appName || s.name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {s.entries.length} {s.entries.length === 1 ? 'page' : 'pages'} ·{' '}
                          {new Date(s.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                      <svg className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      );
    }

    // Template step fields
    if (state.mode === 'template') {
      const step = state.template.steps[state.step];
      return (
        <div className="flex flex-col gap-4">
          {step.description && (
            <p className="text-xs text-gray-400">{step.description}</p>
          )}
          {step.fields.map((field) => (
            <div key={field.id} className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-gray-700">{field.label}</Label>
              {field.description && (
                <p className="text-[10px] text-gray-400">{field.description}</p>
              )}

              {field.type === 'textarea' && (
                <Textarea
                  value={(fieldData[field.id] as string) ?? ''}
                  onChange={(e) => setField(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  className="resize-none text-sm"
                  style={{ minHeight: `${(field.minRows ?? 4) * 1.5}rem` }}
                />
              )}

              {field.type === 'text' && (
                <input
                  type="text"
                  value={(fieldData[field.id] as string) ?? ''}
                  onChange={(e) => setField(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                />
              )}

              {field.type === 'select' && field.options && (
                <Select
                  value={(fieldData[field.id] as string) ?? ''}
                  onValueChange={(v) => setField(field.id, v)}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Choose one…" />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {field.type === 'multiselect' && field.options && (
                <div className="flex flex-wrap gap-1.5">
                  {field.options.map((opt) => {
                    const selected = ((fieldData[field.id] as string[]) ?? []).includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleMulti(field.id, opt.value)}
                        className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                          selected
                            ? 'border-gray-700 bg-gray-700 text-white'
                            : 'border-gray-200 text-gray-600 hover:border-gray-400'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {field.type === 'saved-site' && (() => {
                if (saves.length === 0) return null;
                let selectedId: string | null = null;
                const raw = fieldData[field.id] as string | undefined;
                if (raw) {
                  try { selectedId = (JSON.parse(raw) as { id: string }).id; } catch { /* ignore */ }
                }
                return (
                  <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                    {saves.map((s) => {
                      const isSelected = selectedId === s.id;
                      const theme = s.entries[0]?.content.theme;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setField(field.id, '');
                            } else if (theme) {
                              setField(field.id, JSON.stringify({
                                id: s.id,
                                daisyTheme: theme.daisyTheme,
                                fontFamily: theme.fontFamily,
                                name: s.appName || s.name,
                              }));
                            }
                          }}
                          className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${
                            isSelected
                              ? 'border-gray-700 bg-gray-700 text-white'
                              : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                          }`}
                        >
                          <div>
                            <p className={`text-xs font-medium leading-tight ${isSelected ? 'text-white' : 'text-gray-800'}`}>
                              {s.appName || s.name}
                            </p>
                            <p className={`text-[10px] mt-0.5 ${isSelected ? 'text-gray-300' : 'text-gray-400'}`}>
                              {theme ? `${theme.daisyTheme} · ${theme.fontFamily}` : ''} · {new Date(s.timestamp).toLocaleDateString()}
                            </p>
                          </div>
                          {isSelected && (
                            <svg className="w-3.5 h-3.5 text-white flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      );
    }

    // Saved-site: describe new content
    if (state.mode === 'saved-describe') {
      return (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5">
            <span className="text-sm">🗂</span>
            <div>
              <p className="text-xs font-medium text-gray-700 leading-tight">
                {state.site.appName || state.site.name}
              </p>
              <p className="text-[10px] text-gray-400">
                Style & theme will match this saved site
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-gray-700">What do you want to generate?</Label>
            <Textarea
              value={savedDescription}
              onChange={(e) => setSavedDescription(e.target.value)}
              placeholder="Describe the new page or site content…"
              className="resize-none text-sm min-h-[120px]"
            />
          </div>
        </div>
      );
    }

    return null;
  }

  // ── Dialog title ──────────────────────────────────────────────────────────

  function dialogTitle() {
    if (state.mode === 'pick') return 'Choose a template';
    if (state.mode === 'template') return state.template.steps[state.step].title;
    if (state.mode === 'saved-pick') return 'Saved sites';
    if (state.mode === 'saved-describe') return 'Describe new content';
    return 'Template';
  }

  const showBack = state.mode !== 'pick';
  const showNext = state.mode === 'template' || state.mode === 'saved-describe';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-[640px] flex flex-col max-h-[90vh]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-base">{dialogTitle()}</DialogTitle>
          {renderProgress()}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-1 min-h-0">{renderBody()}</div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" size="sm" onClick={showBack ? back : handleClose}>
            {showBack ? '← Back' : 'Cancel'}
          </Button>
          {showNext && (
            <Button size="sm" onClick={next} disabled={!canAdvance()}>
              {isLastStep ? 'Generate →' : 'Next →'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
