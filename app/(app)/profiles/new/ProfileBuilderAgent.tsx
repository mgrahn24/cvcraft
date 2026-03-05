'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, Loader2, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { applyPatchOps, calculateCompleteness, defaultProfileBuilderState, defaultProfileBuilderTargetState, normalizePatchPath, type PatchOp, type ProfileBuilderMessage, type ProfileBuilderState, type ProfileBuilderTargetState } from '@/lib/profile-builder/state';

type AgentTurnResponse = {
  question: string;
  inputType: 'text'|'single'|'multi';
  options: string[];
  placeholder: string;
  profilePatch: PatchOp[];
  targetPatch: PatchOp[];
  completeness: { overall: number; components: Record<string, number> };
  nextFocus: string;
  debug?: {
    systemPrompt: string;
    prompt: string;
    response: unknown;
    usage?: { inputTokens: number | null; outputTokens: number | null; totalTokens: number | null };
    durationMs: number;
  };
};
type SectionId = 'basics'|'target'|'experience'|'education'|'skills'|'projects'|'certifications'|'languages'|'publications';
type ChangeLogItem = { id: string; at: string; details: { section: SectionId; path: string; summary: string }[]; inverseProfilePatch: PatchOp[]; inverseTargetPatch: PatchOp[] };
const INPUT = 'w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring';
const SECTIONS = ['experience','education','skills','certifications','projects','languages','publications'] as const;
const BASICS = ['name','headline','email','phone','location','summary'] as const;
const OPEN0: Record<SectionId, boolean> = { basics:true, target:true, experience:true, education:false, skills:true, projects:false, certifications:false, languages:false, publications:false };
const uid = () => crypto.randomUUID();
const label = (s: string) => s.replace(/([A-Z])/g,' $1').replace(/^./, m => m.toUpperCase());
const pcolor = (n:number) => n>=80?'bg-emerald-500':n>=50?'bg-amber-500':'bg-rose-500';
const emptyBase = () => ({ id: uid(), title:'', organisation:'', location:'', startDate:'', endDate:'', description:'', url:'' });
const byPath = (src: unknown, path: string) => normalizePatchPath(path).split('.').filter(Boolean).reduce<unknown>((c, p) => (c && typeof c === 'object') ? (c as Record<string, unknown>)[p] : undefined, src);
const pv = (v: unknown) => v === undefined ? '(empty)' : v === null ? '(null)' : Array.isArray(v) ? `[${v.length} items]` : typeof v === 'string' ? (v.trim()||'(empty)') : String(v);
const sectionOf = (path: string, tgt = false): SectionId => tgt ? 'target' : ((normalizePatchPath(path).split('.')[0] as SectionId) || 'basics');

export function ProfileBuilderAgent({ consultantId }: { consultantId?: string }) {
  const router = useRouter();
  const [builderStarted, setBuilderStarted] = useState(!!consultantId);
  const [startMode, setStartMode] = useState<'choose'|'import'>('choose');
  const [importMethod, setImportMethod] = useState<'text'|'file'>('text');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importError, setImportError] = useState('');
  const [hasInitialized, setHasInitialized] = useState(false);
  const [profileState, setProfileState] = useState<ProfileBuilderState>(defaultProfileBuilderState);
  const [targetState, setTargetState] = useState<ProfileBuilderTargetState>(defaultProfileBuilderTargetState);
  const [messages, setMessages] = useState<ProfileBuilderMessage[]>([]);
  const [turn, setTurn] = useState<AgentTurnResponse | null>(null);
  const [textInput, setTextInput] = useState('');
  const [multiSelection, setMultiSelection] = useState<string[]>([]);
  const [isLoadingTurn, setIsLoadingTurn] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [seedCvText, setSeedCvText] = useState('');
  const [showSeedInput, setShowSeedInput] = useState(false);
  const [error, setError] = useState('');
  const [completeness, setCompleteness] = useState<{ overall: number; components: Record<string, number> }>({ overall:0, components:{} });
  const [nextFocus, setNextFocus] = useState('basics');
  const [changeLog, setChangeLog] = useState<ChangeLogItem[]>([]);
  const [llmDebugHistory, setLlmDebugHistory] = useState<Array<{ at: string; debug: NonNullable<AgentTurnResponse['debug']> }>>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [open, setOpen] = useState<Record<SectionId, boolean>>(OPEN0);
  const [highlightSection, setHighlightSection] = useState<SectionId | null>(null);
  const [highlightPath, setHighlightPath] = useState<string | null>(null);
  const chatRef = useRef<HTMLDivElement | null>(null);
  const refs = useRef<Partial<Record<SectionId, HTMLDivElement | null>>>({});
  const profilePaneRef = useRef<HTMLDivElement | null>(null);
  const fetchTurnRef = useRef<((nextMessages: ProfileBuilderMessage[], nextProfile: ProfileBuilderState, nextTarget: ProfileBuilderTargetState) => Promise<void>) | null>(null);

  const skillsText = useMemo(() => profileState.skills.map(s => s.name).filter(Boolean).join(', '), [profileState.skills]);
  const inCls = (path: string) => `${INPUT} ${highlightPath===path?'ring-2 ring-primary bg-primary/5':''}`;

  const jump = (section: SectionId, path?: string) => {
    setOpen(p => ({...p, [section]: true}));
    setHighlightSection(section); setHighlightPath(path ?? null);
    const el = refs.current[section];
    const pane = profilePaneRef.current;
    if (el && pane) {
      const top = el.offsetTop - pane.offsetTop - 56;
      pane.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }
    setTimeout(() => { setHighlightSection(s => s===section?null:s); if (path) setHighlightPath(p => p===path?null:p); }, 2200);
  };

  const fetchTurn = async (nextMessages: ProfileBuilderMessage[], nextProfile: ProfileBuilderState, nextTarget: ProfileBuilderTargetState) => {
    setIsLoadingTurn(true); setError('');
    try {
      const res = await fetch('/api/profile-builder-turn', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ messages: nextMessages, profileState: nextProfile, targetState: nextTarget, debug: true }) });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as AgentTurnResponse;
      const normalizedProfilePatch = data.profilePatch.map((op) => ({ ...op, path: normalizePatchPath(op.path) }));
      const normalizedTargetPatch = data.targetPatch.map((op) => ({ ...op, path: normalizePatchPath(op.path) }));
      const invP = normalizedProfilePatch.map(op => ({ path: op.path, value: byPath(nextProfile, op.path) }));
      const invT = normalizedTargetPatch.map(op => ({ path: op.path, value: byPath(nextTarget, op.path) }));
      const details = [
        ...normalizedProfilePatch.map(op => ({ section: sectionOf(op.path), path: op.path, summary: `${label(op.path.replace(/\./g,' > '))}: ${pv(byPath(nextProfile, op.path))} -> ${pv(op.value)}` })),
        ...normalizedTargetPatch.map(op => ({ section: sectionOf(op.path, true), path: `target.${op.path}`, summary: `${label(`target > ${op.path}`)}: ${pv(byPath(nextTarget, op.path))} -> ${pv(op.value)}` })),
      ].slice(0,10);
      const pp = applyPatchOps(nextProfile as unknown as Record<string, unknown>, normalizedProfilePatch) as unknown as ProfileBuilderState;
      const pt = applyPatchOps(nextTarget as unknown as Record<string, unknown>, normalizedTargetPatch) as unknown as ProfileBuilderTargetState;
      setProfileState(pp); setTargetState(pt); setTurn(data); setMessages([...nextMessages, { role:'assistant', content:data.question }]); setTextInput(''); setMultiSelection([]); setCompleteness(data.completeness); setNextFocus(data.nextFocus);
      if (data.debug) {
        setLlmDebugHistory((prev) => [{ at: new Date().toISOString(), debug: data.debug as NonNullable<AgentTurnResponse['debug']> }, ...prev].slice(0, 20));
      }
      if (details.length) { setChangeLog(prev => [{ id: uid(), at: new Date().toISOString(), details, inverseProfilePatch: invP, inverseTargetPatch: invT }, ...prev].slice(0,10)); jump(details[0].section, details[0].path.startsWith('target.') ? undefined : details[0].path); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Agent failed'); }
    finally { setIsLoadingTurn(false); }
  };

  useEffect(() => { fetchTurnRef.current = fetchTurn; });
  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (!builderStarted || hasInitialized) return;
      if (consultantId) {
        try {
          const res = await fetch(`/api/profile-builder-state/${consultantId}`);
          if (res.ok) {
            const data = await res.json() as { profileState: ProfileBuilderState; targetState?: ProfileBuilderTargetState };
            if (cancelled) return;
            const profile = data.profileState;
            const target = data.targetState ?? defaultProfileBuilderTargetState;
            setProfileState(profile);
            setTargetState(target);
            setShowSeedInput(false);
            const seeded = [{ role:'assistant' as const, content:'Profile loaded. I will help improve and complete it.' }];
            setMessages(seeded);
            await fetchTurnRef.current?.(seeded, profile, target);
            if (!cancelled) setHasInitialized(true);
            return;
          }
        } catch {
          // fall through to default start
        }
      }
      if (!cancelled) {
        await fetchTurnRef.current?.([], defaultProfileBuilderState, defaultProfileBuilderTargetState);
        setHasInitialized(true);
      }
    }
    init();
    return () => { cancelled = true; };
  }, [consultantId, builderStarted, hasInitialized]);
  useEffect(() => { const c = calculateCompleteness(profileState, targetState); setCompleteness({ overall:c.overall, components:c.components }); setNextFocus(c.nextFocus); }, [profileState, targetState]);
  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [messages, isLoadingTurn]);

  const updateBasics = (f: keyof ProfileBuilderState['basics'], v: string) => setProfileState(p => ({ ...p, basics: { ...p.basics, [f]: v } }));
  const updateSkillsText = (v: string) => { const n = v.split(',').map(s=>s.trim()).filter(Boolean); setProfileState(p => ({ ...p, skills: n.map((name,i)=>({ id: p.skills[i]?.id ?? uid(), name, level: p.skills[i]?.level ?? '' })) })); };
  const updateArr = <K extends keyof ProfileBuilderState>(k: K, i: number, patch: Partial<ProfileBuilderState[K] extends Array<infer T> ? T : never>) => setProfileState(p => ({ ...p, [k]: (p[k] as Array<Record<string, unknown>>).map((e,ix)=>ix===i?{...e,...patch}:e) } as ProfileBuilderState));
  const remArr = <K extends keyof ProfileBuilderState>(k: K, i: number) => setProfileState(p => ({ ...p, [k]: (p[k] as unknown[]).filter((_,ix)=>ix!==i) } as ProfileBuilderState));
  const add = (s: 'experience'|'education'|'certifications'|'projects'|'publications'|'languages'|'skills') => {
    if (s==='languages') return setProfileState(p => ({ ...p, languages:[...p.languages, { id:uid(), language:'', level:'' }] }));
    if (s==='skills') return setProfileState(p => ({ ...p, skills:[...p.skills, { id:uid(), name:'', level:'' }] }));
    if (s==='projects') return setProfileState(p => ({ ...p, projects:[...p.projects, { ...emptyBase(), skills:[] }] }));
    if (s==='experience') return setProfileState(p => ({ ...p, experience:[...p.experience, { ...emptyBase(), skills:[] }] }));
    if (s==='education') return setProfileState(p => ({ ...p, education:[...p.education, emptyBase()] }));
    if (s==='certifications') return setProfileState(p => ({ ...p, certifications:[...p.certifications, emptyBase()] }));
    return setProfileState(p => ({ ...p, publications:[...p.publications, emptyBase()] }));
  };
  const toggleTargetSection = (s: typeof SECTIONS[number]) => setTargetState(p => ({ ...p, prioritySections: p.prioritySections.includes(s) ? p.prioritySections.filter(x=>x!==s) : [...p.prioritySections, s] }));
  const toggleTargetBasic = (f: typeof BASICS[number]) => setTargetState(p => ({ ...p, requiredBasics: p.requiredBasics.includes(f) ? p.requiredBasics.filter(x=>x!==f) : [...p.requiredBasics, f] }));
  const submit = async (a: string) => { const next = [...messages, { role:'user' as const, content:a }]; setMessages(next); await fetchTurn(next, profileState, targetState); };
  const startFromScratch = () => {
    setBuilderStarted(true);
    setHasInitialized(false);
    setShowSeedInput(false);
    setImportError('');
  };
  const streamImportFromCv = async (cvText: string) => {
    if (!cvText.trim()) return;
    setBuilderStarted(true);
    setHasInitialized(true);
    setShowSeedInput(false);
    setIsSeeding(true);
    setImportError('');
    setProfileState(defaultProfileBuilderState);
    setTargetState(defaultProfileBuilderTargetState);
    const importingMsg: ProfileBuilderMessage = { role: 'assistant', content: 'Importing CV and populating profile...' };
    setMessages([importingMsg]);
    setChangeLog([]);
    try {
      const res = await fetch('/api/extract-profile-state/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText }),
      });
      if (!res.ok || !res.body) throw new Error(await res.text());
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let workingProfile = defaultProfileBuilderState;
      let workingTarget = defaultProfileBuilderTargetState;
      const handleEvent = (evt: {
        type: 'status'|'patch'|'done'|'error';
        message?: string;
        patch?: PatchOp[];
        completeness?: { overall: number; components: Record<string, number> };
        profileState?: ProfileBuilderState;
        targetState?: ProfileBuilderTargetState;
      }) => {
        if (evt.type === 'status' && evt.message) {
          setMessages((prev) => [...prev, { role: 'assistant', content: evt.message }]);
        }
        if (evt.type === 'patch' && evt.patch) {
          const beforeProfile = workingProfile;
          const normalizedPatch = evt.patch.map((op) => ({ ...op, path: normalizePatchPath(op.path) }));
          const details = normalizedPatch.map((op) => ({
            section: sectionOf(op.path),
            path: op.path,
            summary: `${label(op.path.replace(/\./g, ' > '))}: ${pv(byPath(beforeProfile, op.path))} -> ${pv(op.value)}`,
          })).slice(0, 10);
          const inverseProfilePatch = normalizedPatch.map((op) => ({ path: op.path, value: byPath(beforeProfile, op.path) }));

          workingProfile = applyPatchOps(workingProfile as unknown as Record<string, unknown>, normalizedPatch) as unknown as ProfileBuilderState;
          setProfileState(workingProfile);
          if (evt.completeness) setCompleteness(evt.completeness);
          if (details.length) {
            setChangeLog((prev) => [{
              id: uid(),
              at: new Date().toISOString(),
              details,
              inverseProfilePatch,
              inverseTargetPatch: [],
            }, ...prev].slice(0, 10));
            jump(details[0].section, details[0].path);
          }
        }
        if (evt.type === 'done') {
          if (evt.profileState) {
            workingProfile = evt.profileState;
            setProfileState(workingProfile);
          }
          if (evt.targetState) {
            workingTarget = evt.targetState;
            setTargetState(workingTarget);
          }
          setMessages((prev) => [...prev, { role: 'assistant', content: 'Import complete. I will now ask targeted follow-up questions.' }]);
        }
        if (evt.type === 'error') {
          throw new Error(evt.message || 'Import failed');
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: true });
        if (done) {
          buffer += decoder.decode();
        }
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() ?? '';
        for (const chunk of chunks) {
          const dataLine = chunk.split('\n').find((line) => line.startsWith('data:'));
          if (!dataLine) continue;
          const payload = dataLine.slice(5).trim();
          if (!payload) continue;
          handleEvent(JSON.parse(payload));
        }
        if (done) break;
      }
      const seeded = [{ role:'assistant' as const, content:'CV imported. I will now fill missing profile details.' }];
      setMessages(seeded);
      jump('experience');
      await fetchTurn(seeded, workingProfile, workingTarget);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Failed to import CV');
      setBuilderStarted(false);
      setHasInitialized(false);
    } finally {
      setIsSeeding(false);
    }
  };
  const importFromSelectedFile = async () => {
    if (!importFile) return;
    try {
      const form = new FormData();
      form.append('file', importFile);
      const res = await fetch('/api/extract-text-file', {
        method: 'POST',
        body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      const { text } = await res.json() as { text: string };
      await streamImportFromCv(text);
    } catch {
      setImportError('Could not extract text from that file. Try a cleaner export or paste CV text directly.');
    }
  };
  const seedFromCv = async () => {
    if (!seedCvText.trim()) return; setIsSeeding(true); setError('');
    try {
      const res = await fetch('/api/extract-profile-state', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ cvText: seedCvText }) });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as { profileState: ProfileBuilderState };
      setProfileState(data.profileState); setSeedCvText(''); setShowSeedInput(false);
      const seeded = [{ role:'assistant' as const, content:'CV imported. I will now fill missing profile details.' }];
      setMessages(seeded); jump('experience'); await fetchTurn(seeded, data.profileState, targetState);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to parse CV text'); } finally { setIsSeeding(false); }
  };
  const undo = () => { if (!changeLog.length) return; const [last, ...rest] = changeLog; setProfileState(applyPatchOps(profileState as unknown as Record<string, unknown>, last.inverseProfilePatch) as unknown as ProfileBuilderState); setTargetState(applyPatchOps(targetState as unknown as Record<string, unknown>, last.inverseTargetPatch) as unknown as ProfileBuilderTargetState); setChangeLog(rest); };
  const save = async () => { setIsSaving(true); setError(''); try { const res = await fetch('/api/create-profile-from-state', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ profileState, consultantId }) }); if (!res.ok) throw new Error(await res.text()); const { id } = await res.json() as { id: string }; router.push(`/profiles/${id}`); } catch (e) { setError(e instanceof Error ? e.message : 'Failed to save profile'); setIsSaving(false); } };

  if (!consultantId && !builderStarted) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold">How do you want to start?</h3>
          {startMode === 'choose' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={startFromScratch}
                className="rounded-lg border border-border bg-background p-4 text-left cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <p className="text-sm font-medium">Start from scratch</p>
                <p className="text-xs text-muted-foreground mt-1">Build profile progressively with guided questions.</p>
              </button>
              <button
                type="button"
                onClick={() => setStartMode('import')}
                className="rounded-lg border border-border bg-background p-4 text-left cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <p className="text-sm font-medium">Import from CV</p>
                <p className="text-xs text-muted-foreground mt-1">Paste text or upload a file and stream profile population.</p>
              </button>
            </div>
          )}
          {startMode === 'import' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button type="button" size="xs" variant={importMethod === 'text' ? 'default' : 'outline'} onClick={() => setImportMethod('text')}>Paste text</Button>
                <Button type="button" size="xs" variant={importMethod === 'file' ? 'default' : 'outline'} onClick={() => setImportMethod('file')}>Upload file</Button>
              </div>
              {importMethod === 'text' ? (
                <div className="space-y-2">
                  <textarea value={seedCvText} onChange={(e) => setSeedCvText(e.target.value)} rows={8} className={`${INPUT} resize-none`} placeholder="Paste CV text" />
                  <div className="flex justify-between">
                    <Button type="button" size="xs" variant="ghost" onClick={() => setStartMode('choose')}>Back</Button>
                    <Button type="button" size="xs" onClick={() => streamImportFromCv(seedCvText)} disabled={isSeeding || !seedCvText.trim()}>
                      {isSeeding ? 'Importing...' : 'Start import'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <input type="file" accept=".txt,.md,.rtf,.csv,.log,.text,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} className={INPUT} />
                  <p className="text-[11px] text-muted-foreground">Supports TXT, PDF and DOCX.</p>
                  <div className="flex justify-between">
                    <Button type="button" size="xs" variant="ghost" onClick={() => setStartMode('choose')}>Back</Button>
                    <Button type="button" size="xs" onClick={importFromSelectedFile} disabled={isSeeding || !importFile}>
                      {isSeeding ? 'Importing...' : 'Start import'}
                    </Button>
                  </div>
                </div>
              )}
              {importError && <p className="text-xs text-destructive">{importError}</p>}
            </div>
          )}
        </div>
      </div>
    );
  }

  return <div className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.35fr] 2xl:grid-cols-[1.05fr_1.55fr] gap-4 xl:gap-5 h-[calc(100vh-140px)] min-h-[620px]">
    <section className="rounded-lg border border-border bg-card p-3 md:p-4 space-y-3 h-full min-h-0 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Agent Chat</h3><span className="text-xs text-muted-foreground">Next focus: {label(nextFocus || 'basics')}</span></div>
      {showSeedInput ? <div className="rounded-md border border-border/80 p-2.5 bg-muted/20"><p className="text-xs font-medium mb-1">Seed profile from CV text</p><textarea value={seedCvText} onChange={(e)=>setSeedCvText(e.target.value)} rows={4} placeholder="Paste CV text" className={`${INPUT} resize-none`} /><div className="flex justify-between mt-2"><Button type="button" size="xs" variant="ghost" onClick={()=>setShowSeedInput(false)}>Hide</Button><Button type="button" size="xs" variant="outline" onClick={seedFromCv} disabled={isSeeding || !seedCvText.trim()}>{isSeeding?'Seeding...':'Seed From CV'}</Button></div></div> : <div className="rounded-md border border-border/80 p-2.5 bg-muted/20 flex items-center justify-between"><p className="text-xs text-muted-foreground">CV input hidden to maximize chat space.</p><Button type="button" size="xs" variant="outline" onClick={()=>setShowSeedInput(true)}>Show input</Button></div>}
      <div ref={chatRef} className="flex-1 min-h-0 overflow-y-auto rounded-md border border-border/70 bg-background p-3 space-y-2">{messages.map((m,i)=><div key={i} className={m.role==='assistant'?'text-sm':'text-sm text-right'}><span className={m.role==='assistant'?'inline-block rounded-md bg-muted px-2.5 py-1.5':'inline-block rounded-md bg-primary text-primary-foreground px-2.5 py-1.5'}>{m.content}</span></div>)}{isLoadingTurn && <div className="text-xs text-muted-foreground inline-flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Thinking...</div>}</div>
      {turn && <div className="space-y-2">{turn.inputType==='single' && <div className="flex flex-wrap gap-2">{turn.options.map(o=><Button key={o} type="button" variant="outline" size="xs" onClick={()=>submit(o)} disabled={isLoadingTurn}>{o}</Button>)}</div>}{turn.inputType==='multi' && <div className="space-y-2"><div className="flex flex-wrap gap-2">{turn.options.map(o=><Button key={o} type="button" size="xs" variant={multiSelection.includes(o)?'default':'outline'} onClick={()=>setMultiSelection(p=>p.includes(o)?p.filter(x=>x!==o):[...p,o])}>{o}</Button>)}</div><Button type="button" size="xs" onClick={()=>submit(multiSelection.join(', '))} disabled={isLoadingTurn || !multiSelection.length}>Send selection</Button></div>}<form onSubmit={(e)=>{e.preventDefault(); if (textInput.trim()) submit(textInput.trim());}} className="flex gap-2"><input value={textInput} onChange={(e)=>setTextInput(e.target.value)} placeholder={turn.placeholder || 'Type your answer'} className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" /><Button type="submit" disabled={isLoadingTurn || !textInput.trim()}>Send</Button></form></div>}
      <div className="rounded-md border border-border p-2.5 space-y-2 max-h-[34%] overflow-y-auto"><div className="flex items-center justify-between"><p className="text-xs font-medium">Agent-applied changes</p><Button type="button" size="xs" variant="outline" onClick={undo} disabled={!changeLog.length}><RotateCcw size={11} /> Undo last</Button></div>{!changeLog.length && <p className="text-xs text-muted-foreground">No agent changes yet.</p>}{changeLog.slice(0,2).map(item=><div key={item.id} className="rounded border border-border/70 p-2 space-y-1.5"><p className="text-[11px] text-muted-foreground">{new Date(item.at).toLocaleTimeString()}</p>{item.details.slice(0,5).map((d,i)=><div key={`${item.id}-${i}`} className="text-xs rounded bg-muted/40 p-1.5"><p>{d.summary}</p><div className="flex justify-end mt-1"><Button type="button" size="xs" variant="ghost" onClick={()=>jump(d.section, d.path.startsWith('target.') ? undefined : d.path)}>View</Button></div></div>)}</div>)}</div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </section>
    <section ref={profilePaneRef} className="rounded-lg border border-border bg-card h-full min-h-0 overflow-y-auto relative">
      <div className="sticky top-0 z-40 bg-card px-4 pt-4 pb-2 border-b border-border/70 shadow-sm space-y-2"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Profile Completeness</h3><span className="text-xs font-medium">{completeness.overall}%</span></div><div className="h-2 rounded-full bg-muted overflow-hidden"><div className={`h-full transition-all ${pcolor(completeness.overall)}`} style={{ width: `${completeness.overall}%` }} /></div><div className="grid grid-cols-2 xl:grid-cols-4 gap-2">{Object.entries(completeness.components).filter(([k])=>k!=='profileTarget').map(([k,v])=><div key={k} className="rounded border border-border/70 p-1.5"><div className="flex items-center justify-between text-[11px] mb-1"><span>{label(k)}</span><span>{v}%</span></div><div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className={`h-full transition-all ${pcolor(v)}`} style={{ width: `${v}%` }} /></div></div>)}</div><div className="flex flex-wrap gap-1.5 pt-1">{(['basics','target','experience','education','skills','projects','certifications','languages','publications'] as SectionId[]).map(s=><Button key={s} type="button" size="xs" variant="outline" onClick={()=>jump(s)}>{label(s)}</Button>)}</div></div>
      <div className="px-4 pb-4 pt-3 space-y-3">
      <Accordion title="Basic Details" open={open.basics} setRef={(el)=>{refs.current.basics = el;}} highlighted={highlightSection==='basics'} onToggle={()=>setOpen(p=>({...p, basics:!p.basics}))}><div className="grid grid-cols-2 gap-2"><input value={profileState.basics.name} onChange={(e)=>updateBasics('name', e.target.value)} placeholder="Name" className={inCls('basics.name')} /><input value={profileState.basics.headline} onChange={(e)=>updateBasics('headline', e.target.value)} placeholder="Headline" className={inCls('basics.headline')} /><input value={profileState.basics.email} onChange={(e)=>updateBasics('email', e.target.value)} placeholder="Email" className={inCls('basics.email')} /><input value={profileState.basics.phone} onChange={(e)=>updateBasics('phone', e.target.value)} placeholder="Phone" className={inCls('basics.phone')} /><input value={profileState.basics.location} onChange={(e)=>updateBasics('location', e.target.value)} placeholder="Location" className={`col-span-2 ${inCls('basics.location')}`} /><textarea value={profileState.basics.summary} onChange={(e)=>updateBasics('summary', e.target.value)} rows={3} placeholder="Professional summary" className={`col-span-2 ${inCls('basics.summary')} resize-none`} /></div></Accordion>
      <Accordion title="Profile Target Goals" open={open.target} setRef={(el)=>{refs.current.target = el;}} highlighted={highlightSection==='target'} onToggle={()=>setOpen(p=>({...p, target:!p.target}))}><div className="grid grid-cols-2 xl:grid-cols-4 gap-2"><NumberField label="Min experience" value={targetState.minExperienceEntries} onChange={(v)=>setTargetState(p=>({...p, minExperienceEntries:v}))} /><NumberField label="Min education" value={targetState.minEducationEntries} onChange={(v)=>setTargetState(p=>({...p, minEducationEntries:v}))} /><NumberField label="Min projects" value={targetState.minProjectEntries} onChange={(v)=>setTargetState(p=>({...p, minProjectEntries:v}))} /><NumberField label="Min skills" value={targetState.minSkillCount} onChange={(v)=>setTargetState(p=>({...p, minSkillCount:v}))} /></div><div className="flex flex-wrap gap-1.5">{BASICS.map(f=><Button key={f} type="button" size="xs" variant={targetState.requiredBasics.includes(f)?'default':'outline'} onClick={()=>toggleTargetBasic(f)}>{label(f)}</Button>)}</div><div className="flex flex-wrap gap-1.5">{SECTIONS.map(s=><Button key={s} type="button" size="xs" variant={targetState.prioritySections.includes(s)?'default':'outline'} onClick={()=>toggleTargetSection(s)}>{label(s)}</Button>)}</div><textarea value={targetState.notes} onChange={(e)=>setTargetState(p=>({...p, notes:e.target.value}))} rows={2} placeholder="Target notes" className={`${INPUT} resize-none`} /></Accordion>
      <Section title="Experience" open={open.experience} highlighted={highlightSection==='experience'} setRef={(el)=>{refs.current.experience = el;}} onToggle={()=>setOpen(p=>({...p, experience:!p.experience}))} onAdd={()=>add('experience')}>{profileState.experience.map((e,i)=><GenericEntry key={e.id} entry={e} withSkills highlight={!!highlightPath?.startsWith(`experience.${i}`)} onChange={(patch)=>updateArr('experience', i, patch)} onRemove={()=>remArr('experience', i)} />)}</Section>
      <Section title="Education" open={open.education} highlighted={highlightSection==='education'} setRef={(el)=>{refs.current.education = el;}} onToggle={()=>setOpen(p=>({...p, education:!p.education}))} onAdd={()=>add('education')}>{profileState.education.map((e,i)=><GenericEntry key={e.id} entry={e} highlight={!!highlightPath?.startsWith(`education.${i}`)} onChange={(patch)=>updateArr('education', i, patch)} onRemove={()=>remArr('education', i)} />)}</Section>
      <Section title="Skills" open={open.skills} highlighted={highlightSection==='skills'} setRef={(el)=>{refs.current.skills = el;}} onToggle={()=>setOpen(p=>({...p, skills:!p.skills}))} onAdd={()=>add('skills')}><input value={skillsText} onChange={(e)=>updateSkillsText(e.target.value)} className={INPUT} placeholder="Comma-separated quick edit" />{profileState.skills.map((e,i)=><div key={e.id} className={`rounded border p-2 grid grid-cols-[1fr_140px_36px] gap-2 ${highlightPath?.startsWith(`skills.${i}`)?'border-primary ring-1 ring-primary/40':'border-border/70'}`}><input value={e.name} onChange={(x)=>updateArr('skills', i, { name:x.target.value })} placeholder="Skill" className={INPUT} /><input value={e.level} onChange={(x)=>updateArr('skills', i, { level:x.target.value })} placeholder="Level" className={INPUT} /><Button type="button" size="icon-xs" variant="ghost" className="hover:text-destructive" onClick={()=>remArr('skills', i)}><Trash2 size={13} /></Button></div>)}</Section>
      <Section title="Projects" open={open.projects} highlighted={highlightSection==='projects'} setRef={(el)=>{refs.current.projects = el;}} onToggle={()=>setOpen(p=>({...p, projects:!p.projects}))} onAdd={()=>add('projects')}>{profileState.projects.map((e,i)=><GenericEntry key={e.id} entry={e} withSkills highlight={!!highlightPath?.startsWith(`projects.${i}`)} onChange={(patch)=>updateArr('projects', i, patch)} onRemove={()=>remArr('projects', i)} />)}</Section>
      <Section title="Certifications" open={open.certifications} highlighted={highlightSection==='certifications'} setRef={(el)=>{refs.current.certifications = el;}} onToggle={()=>setOpen(p=>({...p, certifications:!p.certifications}))} onAdd={()=>add('certifications')}>{profileState.certifications.map((e,i)=><GenericEntry key={e.id} entry={e} highlight={!!highlightPath?.startsWith(`certifications.${i}`)} onChange={(patch)=>updateArr('certifications', i, patch)} onRemove={()=>remArr('certifications', i)} />)}</Section>
      <Section title="Languages" open={open.languages} highlighted={highlightSection==='languages'} setRef={(el)=>{refs.current.languages = el;}} onToggle={()=>setOpen(p=>({...p, languages:!p.languages}))} onAdd={()=>add('languages')}>{profileState.languages.map((e,i)=><div key={e.id} className={`rounded border p-2 grid grid-cols-[1fr_180px_36px] gap-2 ${highlightPath?.startsWith(`languages.${i}`)?'border-primary ring-1 ring-primary/40':'border-border/70'}`}><input value={e.language} onChange={(x)=>updateArr('languages', i, { language:x.target.value })} placeholder="Language" className={INPUT} /><input value={e.level} onChange={(x)=>updateArr('languages', i, { level:x.target.value })} placeholder="Level" className={INPUT} /><Button type="button" size="icon-xs" variant="ghost" className="hover:text-destructive" onClick={()=>remArr('languages', i)}><Trash2 size={13} /></Button></div>)}</Section>
      <Section title="Publications" open={open.publications} highlighted={highlightSection==='publications'} setRef={(el)=>{refs.current.publications = el;}} onToggle={()=>setOpen(p=>({...p, publications:!p.publications}))} onAdd={()=>add('publications')}>{profileState.publications.map((e,i)=><GenericEntry key={e.id} entry={e} highlight={!!highlightPath?.startsWith(`publications.${i}`)} onChange={(patch)=>updateArr('publications', i, patch)} onRemove={()=>remArr('publications', i)} />)}</Section>
      <div className="flex justify-end"><Button type="button" onClick={save} disabled={isSaving || !profileState.basics.name.trim()}>{isSaving ? 'Saving...' : consultantId ? 'Save Improvements' : 'Create Profile'}</Button></div>
      <details className="rounded-md border border-border p-2">
        <summary className="text-xs cursor-pointer" onClick={() => setShowDebug((p) => !p)}>Builder LLM Log</summary>
        {showDebug && (
          <div className="mt-2 space-y-3">
            <p className="text-[11px] text-muted-foreground">Full prompt input and model response history (latest first).</p>
            {llmDebugHistory.length === 0 && <p className="text-xs text-muted-foreground">No turns logged yet.</p>}
            {llmDebugHistory.map((item, idx) => (
              <div key={`${item.at}-${idx}`} className="rounded border border-border/70 p-2 space-y-2 bg-muted/20">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <span>{new Date(item.at).toLocaleTimeString()} | {item.debug.durationMs}ms</span>
                  <span>in: {item.debug.usage?.inputTokens ?? 'n/a'}</span>
                  <span>out: {item.debug.usage?.outputTokens ?? 'n/a'}</span>
                  <span>total: {item.debug.usage?.totalTokens ?? 'n/a'}</span>
                </div>
                <details className="rounded border border-border/70 bg-background">
                  <summary className="cursor-pointer text-xs font-medium px-2 py-1.5">System Prompt</summary>
                  <CodeBlock value={item.debug.systemPrompt} rows={8} />
                </details>
                <details className="rounded border border-border/70 bg-background">
                  <summary className="cursor-pointer text-xs font-medium px-2 py-1.5">Prompt Input</summary>
                  <CodeBlock value={item.debug.prompt} rows={12} />
                </details>
                <details className="rounded border border-border/70 bg-background" open>
                  <summary className="cursor-pointer text-xs font-medium px-2 py-1.5">Model Response JSON</summary>
                  <CodeBlock value={JSON.stringify(item.debug.response, null, 2)} rows={12} />
                </details>
              </div>
            ))}
          </div>
        )}
      </details>
      </div>
    </section>
  </div>;
}

function Accordion({ title, open, onToggle, highlighted, setRef, children }: { title: string; open: boolean; onToggle: () => void; highlighted: boolean; setRef: (el: HTMLDivElement | null) => void; children: React.ReactNode }) {
  return <section ref={setRef} className={`rounded-md border ${highlighted?'border-primary ring-1 ring-primary/40 bg-primary/5':'border-border/70'}`}><button type="button" onClick={onToggle} className="w-full flex items-center gap-1 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}{title}</button>{open && <div className="px-3 pb-3 space-y-2">{children}</div>}</section>;
}

function Section({ title, open, onToggle, highlighted, setRef, onAdd, children }: { title: string; open: boolean; onToggle: () => void; highlighted: boolean; setRef: (el: HTMLDivElement | null) => void; onAdd: () => void; children: React.ReactNode }) {
  return <section ref={setRef} className={`rounded-md border ${highlighted?'border-primary ring-1 ring-primary/40 bg-primary/5':'border-border/70'}`}><div className="w-full flex items-center justify-between px-3 py-2"><button type="button" onClick={onToggle} className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}{title}</button><Button type="button" size="xs" variant="outline" onClick={onAdd}><Plus size={11} /> Add</Button></div>{open && <div className="px-3 pb-3 space-y-2">{children}</div>}</section>;
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return <div><label className="block text-xs text-muted-foreground mb-1">{label}</label><input type="number" min={0} value={value} onChange={(e)=>onChange(Math.max(0, Number(e.target.value || 0)))} className={INPUT} /></div>;
}

function CodeBlock({ value, rows = 10 }: { value: string; rows?: number }) {
  return <pre className="m-0 px-2 py-2 text-[11px] leading-5 font-mono overflow-auto border-t border-border/70 whitespace-pre-wrap break-words" style={{ maxHeight: `${rows * 1.35}rem` }}>{value}</pre>;
}

type Entry = { title: string; organisation: string; location: string; startDate: string; endDate: string; description: string; url: string; skills?: string[] };
function GenericEntry({ entry, withSkills=false, highlight=false, onChange, onRemove }: { entry: Entry; withSkills?: boolean; highlight?: boolean; onChange: (patch: Partial<Entry>) => void; onRemove: () => void }) {
  return <div className={`rounded border p-2 space-y-2 ${highlight?'border-primary ring-1 ring-primary/40':'border-border/70'}`}><div className="grid grid-cols-[1fr_1fr_36px] gap-2"><input value={entry.title} onChange={(e)=>onChange({ title:e.target.value })} placeholder="Title" className={INPUT} /><input value={entry.organisation} onChange={(e)=>onChange({ organisation:e.target.value })} placeholder="Organisation" className={INPUT} /><Button type="button" size="icon-xs" variant="ghost" className="hover:text-destructive" onClick={onRemove}><Trash2 size={13} /></Button></div><div className="grid grid-cols-3 gap-2"><input value={entry.startDate} onChange={(e)=>onChange({ startDate:e.target.value })} placeholder="Start date" className={INPUT} /><input value={entry.endDate} onChange={(e)=>onChange({ endDate:e.target.value })} placeholder="End date" className={INPUT} /><input value={entry.location} onChange={(e)=>onChange({ location:e.target.value })} placeholder="Location" className={INPUT} /></div>{withSkills && <input value={entry.skills?.join(', ') ?? ''} onChange={(e)=>onChange({ skills: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) })} placeholder="Skills (comma-separated)" className={INPUT} />}<input value={entry.url} onChange={(e)=>onChange({ url:e.target.value })} placeholder="URL" className={INPUT} /><textarea value={entry.description} onChange={(e)=>onChange({ description:e.target.value })} rows={3} placeholder="Description" className={`${INPUT} resize-none`} /></div>;
}
