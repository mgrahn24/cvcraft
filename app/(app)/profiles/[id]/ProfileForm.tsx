'use client';

import { useState, useTransition, useRef } from 'react';
import { updateConsultant, deleteConsultant } from '@/lib/actions/consultants';
import type { ConsultantRow } from '@/lib/db/schema';
import { User, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ProfileForm({ consultant }: { consultant: ConsultantRow }) {
  const [isPending, startTransition] = useTransition();
  const [photoUrl, setPhotoUrl] = useState(consultant.photoUrl ?? '');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload-photo', { method: 'POST', body: fd });
      if (!res.ok) throw new Error(await res.text());
      const { url } = await res.json() as { url: string };
      setPhotoUrl(url);
    } catch (err) {
      console.error('Photo upload failed:', err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      action={(fd) => startTransition(() => updateConsultant(consultant.id, fd))}
      className="space-y-4"
    >
      {/* Photo upload */}
      <div className="flex items-center gap-4">
        <div className="relative group">
          <div
            className="w-20 h-20 rounded-full border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="Headshot" className="w-full h-full object-cover" />
            ) : (
              <User size={32} className="text-muted-foreground" />
            )}
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploading ? (
                <span className="text-white text-xs">Uploading…</span>
              ) : (
                <Upload size={18} className="text-white" />
              )}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>
        <div className="flex-1">
          <p className="text-xs font-medium">Profile photo</p>
          <p className="text-xs text-muted-foreground mt-0.5">Used as headshot in generated CVs</p>
          {photoUrl && (
            <Button
              type="button"
              variant="link"
              size="xs"
              className="mt-1 text-destructive hover:text-destructive px-0"
              onClick={() => setPhotoUrl('')}
            >
              <X size={11} /> Remove photo
            </Button>
          )}
        </div>
        <input type="hidden" name="photoUrl" value={photoUrl} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1">Full name *</label>
          <input name="name" required defaultValue={consultant.name} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Headline</label>
          <input name="headline" defaultValue={consultant.headline ?? ''} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1">Email</label>
          <input name="email" type="email" defaultValue={consultant.email ?? ''} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Phone</label>
          <input name="phone" defaultValue={consultant.phone ?? ''} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Location</label>
        <input name="location" defaultValue={consultant.location ?? ''} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Professional summary</label>
        <textarea name="summary" rows={3} defaultValue={consultant.summary ?? ''} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
      </div>
      <div className="flex items-center justify-between pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => {
            if (confirm(`Delete ${consultant.name}? This cannot be undone.`)) {
              startTransition(() => deleteConsultant(consultant.id));
            }
          }}
        >
          Delete profile
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
