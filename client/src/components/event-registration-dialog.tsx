import { useState } from "react";
import { CalendarCheck, Download, Loader2, Ticket, X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ApiEvent, ApiEventRegistration } from "@/lib/api-types";

type EventRegistrationDialogProps = {
  event: ApiEvent;
  trigger?: React.ReactNode;
};

type RegistrationResponse = {
  registration: ApiEventRegistration;
  ticketUrl: string;
};

export default function EventRegistrationDialog({ event, trigger }: EventRegistrationDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [ticketUrl, setTicketUrl] = useState("");
  const [formData, setFormData] = useState({
    fullName: user ? `${user.firstName} ${user.lastName}` : "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    organization: "",
    notes: "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/events/${event.id}/registrations`, {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone || null,
        organization: formData.organization || null,
        answers: formData.notes ? { notes: formData.notes } : null,
        reminderOptIn: true,
      });
      return (await response.json()) as RegistrationResponse;
    },
    onSuccess: (payload) => {
      setTicketUrl(payload.ticketUrl);
      toast({
        title: payload.registration.status === "waitlisted" ? "Added to waitlist" : "Registration received",
        description:
          payload.registration.status === "approved"
            ? "Your event confirmation is ready."
            : "Mtendere will follow up with your registration status.",
      });
    },
    onError: (error) => {
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const isClosed = event.runtimeStatus === "past" || event.status === "archived" || event.status === "cancelled";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="bg-mtendere-orange font-bold text-white hover:bg-mtendere-orange/90">
            <Ticket className="mr-2 h-4 w-4" />
            Register
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl text-mtendere-blue">Register for {event.title}</DialogTitle>
          <DialogDescription>
            {event.requiresApproval ? "This event requires admin approval after registration." : "Submit your details to reserve your place."}
          </DialogDescription>
        </DialogHeader>

        {ticketUrl ? (
          <div className="space-y-5">
            <div className="rounded-lg border border-mtendere-green/20 bg-mtendere-green/10 p-5">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-mtendere-green text-white">
                <CalendarCheck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-mtendere-blue">You are registered</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Download or open your confirmation ticket. Keep the ticket code available for event check-in.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="bg-mtendere-blue hover:bg-mtendere-blue/90">
                <a href={ticketUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-4 w-4" />
                  Open ticket
                </a>
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>
                <X className="mr-2 h-4 w-4" />
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor={`event-name-${event.id}`}>Full name</Label>
                <Input
                  id={`event-name-${event.id}`}
                  value={formData.fullName}
                  onChange={(event) => setFormData((prev) => ({ ...prev, fullName: event.target.value }))}
                  placeholder="Your full name"
                />
              </div>
              <div>
                <Label htmlFor={`event-email-${event.id}`}>Email</Label>
                <Input
                  id={`event-email-${event.id}`}
                  type="email"
                  value={formData.email}
                  onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor={`event-phone-${event.id}`}>Phone</Label>
                <Input
                  id={`event-phone-${event.id}`}
                  value={formData.phone}
                  onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
                  placeholder="+265..."
                />
              </div>
              <div>
                <Label htmlFor={`event-org-${event.id}`}>Organization</Label>
                <Input
                  id={`event-org-${event.id}`}
                  value={formData.organization}
                  onChange={(event) => setFormData((prev) => ({ ...prev, organization: event.target.value }))}
                  placeholder="School, company, or institution"
                />
              </div>
            </div>

            <div>
              <Label htmlFor={`event-notes-${event.id}`}>Notes</Label>
              <Textarea
                id={`event-notes-${event.id}`}
                value={formData.notes}
                onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder="Anything the team should know?"
                rows={3}
              />
            </div>

            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || isClosed || !formData.fullName || !formData.email}
              className="w-full bg-mtendere-orange font-bold text-white hover:bg-mtendere-orange/90"
            >
              {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ticket className="mr-2 h-4 w-4" />}
              {isClosed ? "Registration closed" : "Confirm registration"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
