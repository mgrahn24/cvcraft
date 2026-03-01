'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { AgentTurn } from '@/lib/ai/schemas';

interface Props {
  open: boolean;
  onClose: () => void;
  onGenerate: (prompt: string) => void;
}

type Turn = {
  ai: AgentTurn;
  userAnswer?: string;
};

function formatAnswer(turn: AgentTurn, raw: string | string[]): string {
  if (turn.inputType === 'multiselect' && Array.isArray(raw)) {
    return raw.length > 0 ? raw.join(', ') : '—';
  }
  return typeof raw === 'string' ? raw : raw.join(', ');
}

function buildMessages(turns: Turn[]) {
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  for (const t of turns) {
    messages.push({ role: 'assistant', content: t.ai.message });
    if (t.userAnswer !== undefined) {
      messages.push({ role: 'user', content: t.userAnswer });
    }
  }
  return messages;
}

export function AgentChat({ open, onClose, onGenerate }: Props) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [inputValue, setInputValue] = useState<string | string[]>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const fetchNextTurn = useCallback(async (existingTurns: Turn[]) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/agent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: buildMessages(existingTurns) }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as AgentTurn;
      const newTurns = [...existingTurns, { ai: data }];
      setTurns(newTurns);
      // Reset input for next question
      setInputValue(data.inputType === 'multiselect' ? [] : '');
      setTimeout(scrollToBottom, 50);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [scrollToBottom]);

  // Kick off the first question when the dialog opens
  useEffect(() => {
    if (open && turns.length === 0 && !isLoading) {
      fetchNextTurn([]);
    }
  }, [open, turns.length, isLoading, fetchNextTurn]);

  // Focus text input when it appears
  useEffect(() => {
    if (!isLoading && turns.length > 0) {
      const last = turns[turns.length - 1];
      if (!last.ai.done && last.ai.inputType === 'text' && last.userAnswer === undefined) {
        setTimeout(() => textInputRef.current?.focus(), 50);
      }
    }
  }, [isLoading, turns]);

  const handleClose = () => {
    setTurns([]);
    setInputValue('');
    setError(null);
    onClose();
  };

  const submitAnswer = useCallback((answer: string | string[]) => {
    if (isLoading) return;
    const displayAnswer = typeof answer === 'string' ? answer.trim() : answer.join(', ');
    if (!displayAnswer) return;

    const updatedTurns = turns.map((t, i) =>
      i === turns.length - 1 ? { ...t, userAnswer: displayAnswer } : t
    );
    setTurns(updatedTurns);
    setTimeout(scrollToBottom, 30);
    fetchNextTurn(updatedTurns);
  }, [isLoading, turns, scrollToBottom, fetchNextTurn]);

  const handleSelectOption = (option: string) => submitAnswer(option);

  const handleToggleMulti = (option: string) => {
    setInputValue((prev) => {
      const arr = Array.isArray(prev) ? prev : [];
      return arr.includes(option) ? arr.filter((v) => v !== option) : [...arr, option];
    });
  };

  const handleTextSubmit = () => {
    const val = typeof inputValue === 'string' ? inputValue : inputValue.join(', ');
    submitAnswer(val.trim());
  };

  const handleMultiSubmit = () => {
    const arr = Array.isArray(inputValue) ? inputValue : [];
    submitAnswer(arr.length > 0 ? arr : ['No preference']);
  };

  const handleGenerate = () => {
    const last = turns[turns.length - 1];
    if (last?.ai.done && last.ai.generationPrompt) {
      onGenerate(last.ai.generationPrompt);
      handleClose();
    }
  };

  const lastTurn = turns[turns.length - 1];
  const isDone = lastTurn?.ai.done ?? false;
  const showInput = !isDone && !isLoading && lastTurn && lastTurn.userAnswer === undefined;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-[580px] flex flex-col max-h-[85vh] p-0 gap-0">
        <DialogHeader className="flex-shrink-0 px-5 pt-5 pb-3 border-b border-gray-100">
          <DialogTitle className="text-base flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-900 text-white text-[10px]">✦</span>
            AI page assistant
          </DialogTitle>
        </DialogHeader>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0 flex flex-col gap-3">
          {turns.map((turn, i) => (
            <div key={i} className="flex flex-col gap-2">
              {/* AI bubble */}
              <div className="flex items-start gap-2.5 max-w-[88%]">
                <div className="w-6 h-6 rounded-full bg-gray-900 text-white flex-shrink-0 flex items-center justify-center text-[9px] mt-0.5">✦</div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                  <p className="text-sm text-gray-800 leading-relaxed">{turn.ai.message}</p>
                </div>
              </div>

              {/* Select options — shown inline below AI message if this is the current unanswered turn */}
              {!turn.ai.done && turn.userAnswer === undefined && i === turns.length - 1 && turn.ai.inputType === 'select' && (
                <div className="flex flex-wrap gap-1.5 ml-8">
                  {turn.ai.inputOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleSelectOption(opt)}
                      disabled={isLoading}
                      className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:border-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {/* User answer bubble */}
              {turn.userAnswer !== undefined && (
                <div className="flex justify-end">
                  <div className="bg-gray-900 text-white rounded-2xl rounded-tr-sm px-3.5 py-2.5 max-w-[80%]">
                    <p className="text-sm leading-relaxed">{turn.userAnswer}</p>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-gray-900 text-white flex-shrink-0 flex items-center justify-center text-[9px]">✦</div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                <div className="flex gap-1 items-center h-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2">
              <p className="text-xs text-red-600 flex-1">{error}</p>
              <button
                type="button"
                onClick={() => { setError(null); fetchNextTurn(turns); }}
                className="text-xs text-red-500 underline underline-offset-2 flex-shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        {(showInput || isDone) && (
          <div className="flex-shrink-0 border-t border-gray-100 px-5 py-3">
            {isDone ? (
              <div className="flex items-center gap-3">
                <p className="text-xs text-gray-400 flex-1">Ready to build your page</p>
                <Button size="sm" onClick={handleGenerate} className="px-5">
                  Generate →
                </Button>
              </div>
            ) : showInput && lastTurn.ai.inputType === 'multiselect' ? (
              <div className="flex flex-col gap-2.5">
                <div className="flex flex-wrap gap-1.5">
                  {lastTurn.ai.inputOptions.map((opt) => {
                    const selected = Array.isArray(inputValue) && inputValue.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleToggleMulti(opt)}
                        className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                          selected
                            ? 'border-gray-700 bg-gray-700 text-white'
                            : 'border-gray-200 text-gray-600 hover:border-gray-400'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-end">
                  <Button size="sm" onClick={handleMultiSubmit} disabled={isLoading}>
                    Next →
                  </Button>
                </div>
              </div>
            ) : showInput && lastTurn.ai.inputType === 'text' ? (
              <div className="flex gap-2">
                <input
                  ref={textInputRef}
                  type="text"
                  value={typeof inputValue === 'string' ? inputValue : ''}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                  placeholder={lastTurn.ai.inputPlaceholder || 'Type your answer…'}
                  disabled={isLoading}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300 disabled:opacity-50"
                />
                <Button
                  size="sm"
                  onClick={handleTextSubmit}
                  disabled={isLoading || !(typeof inputValue === 'string' && inputValue.trim())}
                >
                  Next →
                </Button>
              </div>
            ) : null}
          </div>
        )}

        {/* Cancel */}
        <div className="flex-shrink-0 px-5 pb-4">
          <button
            type="button"
            onClick={handleClose}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
