import { FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { trackConversionEvent } from "@/lib/conversion-tracking";
import { getRecaptchaToken } from "@/lib/recaptcha";
import { cn } from "@/lib/utils";

type NewsletterSignupProps = {
  source?: string;
  compact?: boolean;
  inverse?: boolean;
  className?: string;
};

export default function NewsletterSignup({
  source = "website",
  compact = false,
  inverse = false,
  className,
}: NewsletterSignupProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [preferences, setPreferences] = useState(["scholarships", "jobs", "study-abroad"]);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [hasTrackedStart, setHasTrackedStart] = useState(false);
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      const recaptchaToken = await getRecaptchaToken("newsletter");
      return apiRequest("POST", "/api/subscribers", {
        email,
        name: name.trim() || undefined,
        source,
        preferences,
        website,
        consentAccepted,
        recaptchaToken,
      });
    },
    onSuccess: async (response) => {
      const payload = await response.json();
      trackConversionEvent("newsletter_signup_completed", { source, preferences });
      toast({
        title: "Confirm your subscription",
        description: payload.message || "Check your inbox to confirm your email.",
      });
      setEmail("");
      setName("");
      setWebsite("");
      setConsentAccepted(false);
      setHasTrackedStart(false);
    },
    onError: (error) => {
      toast({
        title: "Subscription failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !consentAccepted || preferences.length === 0) return;
    mutation.mutate();
  };

  const togglePreference = (preference: string) => {
    setPreferences((current) =>
      current.includes(preference)
        ? current.filter((item) => item !== preference)
        : [...current, preference],
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex w-full flex-col gap-3", compact ? "max-w-md" : "max-w-xl", className)}
    >
      <input
        tabIndex={-1}
        autoComplete="off"
        value={website}
        onChange={(event) => setWebsite(event.target.value)}
        className="hidden"
        aria-hidden="true"
      />
      <div className="flex flex-col gap-3 sm:flex-row">
        {!compact && (
          <Input
            type="text"
            placeholder="Your name"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={mutation.isPending}
            className={cn(
              "min-h-12 flex-1 rounded-lg",
              inverse && "border-white/30 bg-white/10 text-white placeholder:text-white/65 focus-visible:ring-white",
            )}
          />
        )}
        <Input
          type="email"
          autoComplete="email"
          placeholder="Enter your email address"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (!hasTrackedStart) {
              setHasTrackedStart(true);
              trackConversionEvent("newsletter_signup_started", { source });
            }
          }}
          required
          disabled={mutation.isPending}
          className={cn(
            "min-h-12 flex-1 rounded-lg",
            inverse && "border-white/30 bg-white/10 text-white placeholder:text-white/65 focus-visible:ring-white",
          )}
        />
        <Button
          type="submit"
          disabled={mutation.isPending || !consentAccepted || preferences.length === 0}
          className="min-h-12 shrink-0 bg-mtendere-orange px-6 font-bold text-white hover:bg-mtendere-orange/90"
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending
            </>
          ) : (
            <>
              Subscribe
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
      <div className={cn("flex flex-wrap gap-3 text-xs", inverse ? "text-white/80" : "text-muted-foreground")}>
        {[
          ["scholarships", "Scholarships"],
          ["jobs", "Jobs"],
          ["study-abroad", "Study abroad"],
        ].map(([value, label]) => (
          <label key={value} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={preferences.includes(value)}
              onChange={() => togglePreference(value)}
              disabled={mutation.isPending}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <label className={cn("flex items-start gap-2 text-xs", inverse ? "text-white/80" : "text-muted-foreground")}>
        <input
          type="checkbox"
          checked={consentAccepted}
          onChange={(event) => setConsentAccepted(event.target.checked)}
          disabled={mutation.isPending}
          required
        />
        <span>I agree to receive Mtendere updates and can unsubscribe at any time.</span>
      </label>
    </form>
  );
}
