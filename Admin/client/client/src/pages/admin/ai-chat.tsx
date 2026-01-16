import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle } from "lucide-react";

export default function AiChatPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/ai-chat"],
    queryFn: () => `/api/admin/ai-chat`,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <MessageCircle className="h-8 w-8" />
        <h1 className="text-3xl font-bold">AI Chat Management</h1>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Active Conversations</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">42</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Total Messages</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">1,892</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Avg Response Time</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">1.2s</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Conversations</CardTitle></CardHeader>
        <CardContent>
          <p className="text-gray-600">No conversations available</p>
        </CardContent>
      </Card>
    </div>
  );
}
