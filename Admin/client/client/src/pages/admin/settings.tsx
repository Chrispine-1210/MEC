import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, Save } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <SettingsIcon className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Platform Settings</h1>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>General Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Platform Name</label>
              <input type="text" defaultValue="Mtendere Education Platform" className="w-full mt-1 px-3 py-2 border rounded" />
            </div>
            <div>
              <label className="text-sm font-medium">Support Email</label>
              <input type="email" defaultValue="support@mtendere.com" className="w-full mt-1 px-3 py-2 border rounded" />
            </div>
            <Button><Save className="h-4 w-4 mr-2" />Save Changes</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Security Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Session Timeout (minutes)</label>
              <input type="number" defaultValue="30" className="w-full mt-1 px-3 py-2 border rounded" />
            </div>
            <div>
              <label className="text-sm font-medium">Max Login Attempts</label>
              <input type="number" defaultValue="5" className="w-full mt-1 px-3 py-2 border rounded" />
            </div>
            <Button><Save className="h-4 w-4 mr-2" />Save Changes</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
