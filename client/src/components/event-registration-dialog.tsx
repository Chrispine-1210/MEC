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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { buildBotDefenseSubmission } from "@/lib/bot-defense";
import { apiRequest } from "@/lib/queryClient";
import { getRecaptchaToken } from "@/lib/recaptcha";
import type { ApiEvent, ApiEventRegistration } from "@/lib/api-types";

type EventRegistrationDialogProps = {
  event: ApiEvent;
  trigger?: React.ReactNode;
};

type RegistrationResponse = {
  registration: ApiEventRegistration;
  ticketUrl: string;
  delivery?: {
    acceptedByProvider?: boolean;
    mailboxDeliveryConfirmed?: boolean;
    confirmationPending?: boolean;
  };
};

export default function EventRegistrationDialog({ event, trigger }: EventRegistrationDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [ticketUrl, setTicketUrl] = useState("");
  const [formStartedAt, setFormStartedAt] = useState<number | null>(null);
  const [website, setWebsite] = useState("");
  const [company, setCompany] = useState("");
  const [homepage, setHomepage] = useState("");
  const ticketTypes = getTicketTypes(event);
  const customFields = getCustomFields(event);
  const [formData, setFormData] = useState({
    fullName: user ? `${user.firstName} ${user.lastName}` : "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    organization: "",
    ticketType: ticketTypes[0]?.name ?? "",
    notes: "",
  });
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const missingRequiredField = customFields.some((field) => field.required && !String(customAnswers[field.key] ?? "").trim());
  const markFormStarted = () => setFormStartedAt((current) => current ?? Date.now());

  const mutation = useMutation({
    mutationFn: async () => {
      const recaptchaToken = await getRecaptchaToken("event_registration");
      const security = await buildBotDefenseSubmission({
        flow: "event_registration",
        startedAt: formStartedAt,
        website,
        company,
        homepage,
        recaptchaToken,
      });
      const response = await apiRequest("POST", `/api/events/${event.id}/registrations`, {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone || null,
        organization: formData.organization || null,
        ticketType: formData.ticketType || null,
        source: "public_event_page",
        answers: buildAnswers(formData.notes, customAnswers),
        reminderOptIn: true,
        ...security,
      });
      return (await response.json()) as RegistrationResponse;
    },
    onSuccess: (payload) => {
      setTicketUrl(payload.ticketUrl);
      toast({
        title: payload.registration.status === "waitlisted" ? "Added to waitlist" : "Registration received",
        description:
          payload.registration.status === "approved"
            ? payload.delivery?.acceptedByProvider
              ? "Your ticket is ready. The confirmation email was accepted by our email provider."
              : "Your ticket is ready. If the confirmation email is delayed, keep the ticket link shown here."
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
          <div
            className="space-y-4"
            onPointerDownCapture={markFormStarted}
            onFocusCapture={markFormStarted}
          >
            <input
              tabIndex={-1}
              autoComplete="off"
              name="website"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
              className="hidden"
              aria-hidden="true"
            />
            <input
              tabIndex={-1}
              autoComplete="off"
              name="company"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              className="hidden"
              aria-hidden="true"
            />
            <input
              tabIndex={-1}
              autoComplete="off"
              name="homepage"
              value={homepage}
              onChange={(event) => setHomepage(event.target.value)}
              className="hidden"
              aria-hidden="true"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor={`event-name-${event.id}`}>Full name</Label>
                <Input
                  id={`event-name-${event.id}`}
                  value={formData.fullName}
                  onChange={(event) => {
                    markFormStarted();
                    setFormData((prev) => ({ ...prev, fullName: event.target.value }));
                  }}
                  placeholder="Your full name"
                />
              </div>
              <div>
                <Label htmlFor={`event-email-${event.id}`}>Email</Label>
                <Input
                  id={`event-email-${event.id}`}
                  type="email"
                  value={formData.email}
                  onChange={(event) => {
                    markFormStarted();
                    setFormData((prev) => ({ ...prev, email: event.target.value }));
                  }}
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
                  onChange={(event) => {
                    markFormStarted();
                    setFormData((prev) => ({ ...prev, phone: event.target.value }));
                  }}
                  placeholder="+265..."
                />
              </div>
              <div>
                <Label htmlFor={`event-org-${event.id}`}>Organization</Label>
                <Input
                  id={`event-org-${event.id}`}
                  value={formData.organization}
                  onChange={(event) => {
                    markFormStarted();
                    setFormData((prev) => ({ ...prev, organization: event.target.value }));
                  }}
                  placeholder="School, company, or institution"
                />
              </div>
            </div>

            {ticketTypes.length > 0 && (
              <div>
                <Label>Ticket type</Label>
                <Select
                  value={formData.ticketType}
                  onValueChange={(ticketType) => {
                    markFormStarted();
                    setFormData((prev) => ({ ...prev, ticketType }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select ticket type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ticketTypes.map((ticket) => (
                      <SelectItem key={ticket.name} value={ticket.name}>
                        {ticket.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {customFields.length > 0 && (
              <div className="space-y-4 rounded-lg border border-border/70 bg-muted/20 p-4">
                {customFields.map((field) => (
                  <DynamicField
                    key={field.key}
                    field={field}
                    value={customAnswers[field.key] ?? ""}
                    onChange={(value) => {
                      markFormStarted();
                      setCustomAnswers((prev) => ({ ...prev, [field.key]: value }));
                    }}
                  />
                ))}
              </div>
            )}

            <div>
              <Label htmlFor={`event-notes-${event.id}`}>Notes</Label>
              <Textarea
                id={`event-notes-${event.id}`}
                value={formData.notes}
                onChange={(event) => {
                  markFormStarted();
                  setFormData((prev) => ({ ...prev, notes: event.target.value }));
                }}
                placeholder="Anything the team should know?"
                rows={3}
              />
            </div>

            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || isClosed || !formData.fullName || !formData.email || missingRequiredField}
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

type NormalizedTicket = {
  name: string;
  label: string;
};

type NormalizedCustomField = {
  key: string;
  label: string;
  type: string;
  required: boolean;
  options: string[];
};

function getTicketTypes(event: ApiEvent): NormalizedTicket[] {
  return (event.ticketTypes ?? [])
    .map((ticket, index) => {
      const name = String(ticket.name ?? ticket.id ?? ticket.label ?? `ticket-${index + 1}`).trim();
      if (!name) return null;
      const price = ticket.price ?? ticket.amount ?? ticket.priceAmount;
      const currency = String(ticket.currency ?? event.currency ?? "").trim();
      const labelParts = [String(ticket.label ?? ticket.title ?? name)];
      if (price !== undefined && price !== null && String(price) !== "") {
        labelParts.push(`${currency} ${price}`.trim());
      }
      return { name, label: labelParts.join(" - ") };
    })
    .filter(Boolean) as NormalizedTicket[];
}

function getCustomFields(event: ApiEvent): NormalizedCustomField[] {
  return (event.customFields ?? [])
    .map((field, index) => {
      const key = String(field.name ?? field.key ?? field.id ?? `field-${index + 1}`).trim();
      if (!key) return null;
      const rawOptions = field.options;
      const options = Array.isArray(rawOptions)
        ? rawOptions.map((item) => String(item)).filter(Boolean)
        : String(rawOptions ?? "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
      return {
        key,
        label: String(field.label ?? field.title ?? key),
        type: String(field.type ?? (options.length ? "select" : "text")).toLowerCase(),
        required: Boolean(field.required),
        options,
      };
    })
    .filter(Boolean) as NormalizedCustomField[];
}

function DynamicField({
  field,
  value,
  onChange,
}: {
  field: NormalizedCustomField;
  value: string;
  onChange: (value: string) => void;
}) {
  const label = `${field.label}${field.required ? " *" : ""}`;
  if (field.type === "select" && field.options.length > 0) {
    return (
      <div>
        <Label>{label}</Label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (field.type === "textarea" || field.type === "long_text") {
    return (
      <div>
        <Label>{label}</Label>
        <Textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} />
      </div>
    );
  }

  if (field.type === "checkbox" || field.type === "boolean") {
    return (
      <label className="flex items-center gap-3 rounded-md border bg-card p-3 text-sm font-medium">
        <input type="checkbox" checked={value === "yes"} onChange={(event) => onChange(event.target.checked ? "yes" : "no")} />
        {label}
      </label>
    );
  }

  return (
    <div>
      <Label>{label}</Label>
      <Input type={field.type === "number" ? "number" : field.type === "email" ? "email" : "text"} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function buildAnswers(notes: string, customAnswers: Record<string, string>) {
  const answers: Record<string, string> = {};
  if (notes.trim()) answers.notes = notes.trim();
  Object.entries(customAnswers).forEach(([key, value]) => {
    if (String(value).trim()) answers[key] = String(value).trim();
  });
  return Object.keys(answers).length ? answers : null;
}
