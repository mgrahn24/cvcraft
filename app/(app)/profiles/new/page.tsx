import { ProfileBuilderAgent } from './ProfileBuilderAgent';

export default function NewProfilePage() {
  return (
    <div className="p-6 max-w-[1500px] mx-auto">
      <h1 className="text-2xl font-semibold mb-1">New Profile</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Build the consultant profile with guided questions and live editing.
      </p>

      <ProfileBuilderAgent />
    </div>
  );
}
