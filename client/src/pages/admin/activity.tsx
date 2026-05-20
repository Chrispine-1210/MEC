import ActivityTracker from "@/components/admin/ActivityTracker";

export default function ActivityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Activity & Achievements</h1>
        <p className="text-muted-foreground">Track your contributions and celebrate your achievements</p>
      </div>
      <ActivityTracker />
    </div>
  );
}

