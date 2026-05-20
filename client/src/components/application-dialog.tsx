import { FormEvent, ReactNode, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileText, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

type ApplicationDialogProps = {
  type: "job" | "scholarship";
  referenceId: number;
  title: string;
  trigger: ReactNode;
};

type UploadedDocument = {
  url: string;
  originalName: string;
  size: number;
  type: string;
};

export default function ApplicationDialog({ type, referenceId, title, trigger }: ApplicationDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);

  const resetForm = () => {
    setPortfolioUrl("");
    setNotes("");
    setCvFile(null);
    setCoverLetterFile(null);
    setConsent(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && !user) {
      toast({
        title: "Login required",
        description: `Please log in to apply for this ${type}.`,
        variant: "destructive",
      });
      return;
    }

    if (nextOpen && user) {
      setFullName(`${user.firstName} ${user.lastName}`.trim());
      setEmail(user.email);
      setPhone(user.phone || "");
    }

    setOpen(nextOpen);
  };

  const uploadDocuments = async () => {
    const formData = new FormData();
    if (cvFile) formData.append("cv", cvFile);
    if (coverLetterFile) formData.append("coverLetter", coverLetterFile);

    if (!cvFile && !coverLetterFile) {
      return {};
    }

    const token = localStorage.getItem("token");
    const response = await fetch("/api/application-assets", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
      credentials: "include",
    });

    if (!response.ok) {
      const message = (await response.text()) || "Document upload failed";
      throw new Error(message);
    }

    const payload = (await response.json()) as { documents: Record<string, UploadedDocument> };
    return payload.documents;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!consent) {
      toast({
        title: "Consent required",
        description: "Please confirm that your information is accurate before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const uploadedDocuments = await uploadDocuments();
      await apiRequest("POST", "/api/applications", {
        type,
        referenceId,
        status: "pending",
        notes,
        documents: {
          ...uploadedDocuments,
          portfolioUrl: portfolioUrl || null,
          applicant: {
            fullName,
            email,
            phone,
          },
        },
      });

      await queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      toast({
        title: "Application submitted",
        description: "Your application is now saved in your dashboard.",
      });
      resetForm();
      setOpen(false);
    } catch (error) {
      toast({
        title: "Application failed",
        description: error instanceof Error ? error.message : "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Apply for {title}</DialogTitle>
          <DialogDescription>
            Submit your application details and supporting documents. You can track status from your dashboard.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`application-name-${type}-${referenceId}`}>Full name</Label>
              <Input
                id={`application-name-${type}-${referenceId}`}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`application-email-${type}-${referenceId}`}>Email</Label>
              <Input
                id={`application-email-${type}-${referenceId}`}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`application-phone-${type}-${referenceId}`}>Phone</Label>
              <Input
                id={`application-phone-${type}-${referenceId}`}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+265 ..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`application-portfolio-${type}-${referenceId}`}>Portfolio or LinkedIn</Label>
              <Input
                id={`application-portfolio-${type}-${referenceId}`}
                type="url"
                value={portfolioUrl}
                onChange={(event) => setPortfolioUrl(event.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FilePicker
              id={`application-cv-${type}-${referenceId}`}
              label="CV or resume"
              file={cvFile}
              onChange={setCvFile}
            />
            <FilePicker
              id={`application-cover-${type}-${referenceId}`}
              label="Cover letter"
              file={coverLetterFile}
              onChange={setCoverLetterFile}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`application-notes-${type}-${referenceId}`}>Application notes</Label>
            <Textarea
              id={`application-notes-${type}-${referenceId}`}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add a short note, availability, eligibility context, or anything the team should review."
              className="min-h-[120px]"
            />
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-border/60 p-4">
            <Checkbox
              id={`application-consent-${type}-${referenceId}`}
              checked={consent}
              onCheckedChange={(checked) => setConsent(checked === true)}
            />
            <Label
              htmlFor={`application-consent-${type}-${referenceId}`}
              className="text-sm leading-relaxed text-muted-foreground"
            >
              I confirm this information is accurate and authorize Mtendere to review my application materials for this
              opportunity.
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" className="bg-mtendere-blue font-bold hover:bg-mtendere-blue/90" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Submit application
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FilePicker({
  id,
  label,
  file,
  onChange,
}: {
  id: string;
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <label
        htmlFor={id}
        className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center transition-colors hover:bg-muted/50"
      >
        {file ? (
          <>
            <FileText className="mb-2 h-5 w-5 text-mtendere-blue" />
            <span className="max-w-full truncate text-sm font-medium">{file.name}</span>
            <span className="text-xs text-muted-foreground">Click to replace</span>
          </>
        ) : (
          <>
            <Upload className="mb-2 h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">Upload file</span>
            <span className="text-xs text-muted-foreground">PDF, DOC, DOCX, JPG, PNG, WEBP</span>
          </>
        )}
      </label>
      <Input
        id={id}
        type="file"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
        className="sr-only"
        onChange={(event) => onChange(event.target.files?.[0] || null)}
      />
    </div>
  );
}
