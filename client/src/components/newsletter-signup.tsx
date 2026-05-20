import { FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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
  const [website, setWebsite] = useState("");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () =>
      apiRequest("POST", "/api/subscribers", {
        email,
        source,
        preferences: ["scholarships", "jobs", "study-abroad"],
        website,
      }),
    onSuccess: async (response) => {
      const payload = await response.json();
      toast({
        title: "Confirm your subscription",
        description: payload.message || "Check your inbox to confirm your email.",
      });
      setEmail("");
      setWebsite("");
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
    if (!email.trim()) return;
    mutation.mutate();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex w-full flex-col gap-3 sm:flex-row", compact ? "max-w-md" : "max-w-xl", className)}
    >
      <input
        tabIndex={-1}
        autoComplete="off"
        value={website}
        onChange={(event) => setWebsite(event.target.value)}
        className="hidden"
        aria-hidden="true"
      />
      <Input
        type="email"
        placeholder="Enter your email address"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
        disabled={mutation.isPending}
        className={cn(
          "min-h-12 flex-1 rounded-lg",
          inverse && "border-white/30 bg-white/10 text-white placeholder:text-white/65 focus-visible:ring-white",
        )}
      />
      <Button
        type="submit"
        disabled={mutation.isPending}
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
    </form>
  );
}
