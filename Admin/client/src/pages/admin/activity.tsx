import ActivityTracker from "@/components/admin/ActivityTracker";

export default function ActivityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Activity & Achievements</h1>
        <p className="text-gray-600">Track your contributions and celebrate your achievements</p>
      </div>
      <ActivityTracker />
    </div>
  );
}
