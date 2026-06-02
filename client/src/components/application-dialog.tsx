import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
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
import { apiFetch } from "@/lib/api-base";
import { apiRequest } from "@/lib/queryClient";
import type { ApiJob } from "@/lib/api-types";

type ApplicationField = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "url";
  required?: boolean;
  placeholder?: string;
};

type ApplicationDialogProps = {
  type: "job" | "scholarship";
  referenceId: number;
  title: string;
  trigger: ReactNode;
  job?: ApiJob | null;
  customFields?: ApplicationField[];
};

type UploadedDocument = {
  url: string;
  originalName: string;
  size: number;
  type: string;
};

type EducationEntry = {
  degree: string;
  institution: string;
  graduationDate: string;
};

type ReferenceEntry = {
  name: string;
  relationship: string;
  email: string;
  phone: string;
};

const emptyEducation = (): EducationEntry => ({ degree: "", institution: "", graduationDate: "" });
const emptyReference = (): ReferenceEntry => ({ name: "", relationship: "", email: "", phone: "" });

export default function ApplicationDialog({ type, referenceId, title, trigger, job, customFields = [] }: ApplicationDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [personal, setPersonal] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "",
    nationality: "",
    address: "",
  });
  const [professional, setProfessional] = useState({
    portfolio: "",
    linkedIn: "",
    github: "",
    behance: "",
    website: "",
  });
  const [education, setEducation] = useState<EducationEntry[]>([emptyEducation()]);
  const [experience, setExperience] = useState({
    currentEmployer: "",
    previousEmployers: "",
    achievements: "",
  });
  const [references, setReferences] = useState<ReferenceEntry[]>([emptyReference(), emptyReference(), emptyReference()]);
  const [notes, setNotes] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const draftKey = `mtendere-application-draft-${type}-${referenceId}`;

  const fields = useMemo(() => buildApplicationFields(type, job, customFields), [customFields, job, type]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const raw = localStorage.getItem(draftKey);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as Record<string, any>;
      setPersonal((prev) => ({ ...prev, ...(draft.personal || {}) }));
      setProfessional((prev) => ({ ...prev, ...(draft.professional || {}) }));
      setEducation(Array.isArray(draft.education) && draft.education.length ? draft.education : [emptyEducation()]);
      setExperience((prev) => ({ ...prev, ...(draft.experience || {}) }));
      setReferences(Array.isArray(draft.references) && draft.references.length ? draft.references : [emptyReference(), emptyReference(), emptyReference()]);
      setNotes(draft.notes || "");
      setAnswers(draft.answers || {});
    } catch {
      localStorage.removeItem(draftKey);
    }
  }, [draftKey, open]);

  const resetForm = () => {
    setProfessional({ portfolio: "", linkedIn: "", github: "", behance: "", website: "" });
    setEducation([emptyEducation()]);
    setExperience({ currentEmployer: "", previousEmployers: "", achievements: "" });
    setReferences([emptyReference(), emptyReference(), emptyReference()]);
    setNotes("");
    setAnswers({});
    setCvFile(null);
    setCoverLetterFile(null);
    setPortfolioFile(null);
    setConsent(false);
  };

  const saveDraft = () => {
    localStorage.setItem(
      draftKey,
      JSON.stringify({
        personal,
        professional,
        education,
        experience,
        references,
        notes,
        answers,
        savedAt: new Date().toISOString(),
      }),
    );
    toast({ title: "Draft saved", description: "Your application draft is stored on this device." });
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
      setPersonal((prev) => ({
        ...prev,
        firstName: prev.firstName || user.firstName || "",
        lastName: prev.lastName || user.lastName || "",
        email: prev.email || user.email || "",
        phone: prev.phone || user.phone || "",
      }));
    }

    setOpen(nextOpen);
  };

  const uploadDocuments = async () => {
    const formData = new FormData();
    if (cvFile) formData.append("cv", cvFile);
    if (coverLetterFile) formData.append("coverLetter", coverLetterFile);
    if (portfolioFile) formData.append("portfolio", portfolioFile);

    if (!cvFile && !coverLetterFile && !portfolioFile) {
      return {};
    }

    const token = localStorage.getItem("token");
    const response = await apiFetch("/api/application-assets", {
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
      const filteredEducation = education.filter((item) => item.degree || item.institution || item.graduationDate);
      const filteredReferences = references.filter((item) => item.name || item.email || item.phone);

      await apiRequest("POST", "/api/applications", {
        type,
        referenceId,
        status: "pending",
        notes,
        documents: {
          ...uploadedDocuments,
          source: type === "job" ? "jobs-portal" : "public-application",
          applicant: {
            ...personal,
            fullName: `${personal.firstName} ${personal.lastName}`.trim(),
          },
          professional,
          education: filteredEducation,
          experience,
          references: filteredReferences,
          answers,
          roleContext: job
            ? {
                title: job.title,
                category: job.category,
                department: job.department,
                employmentType: job.employmentType || job.jobType,
                requiredSkills: job.requiredSkills || job.skills || [],
              }
            : null,
          workflow: {
            source: "public",
            draftSaved: Boolean(localStorage.getItem(draftKey)),
            generatedFields: fields.map((field) => field.name),
          },
        },
      });

      await queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      toast({
        title: "Application submitted",
        description: "Your application is now saved in your dashboard.",
      });
      resetForm();
      localStorage.removeItem(draftKey);
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
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Apply for {title}</DialogTitle>
          <DialogDescription>Submit your profile, supporting documents, and opportunity-specific answers.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Section title="Personal information">
            <div className="grid gap-4 md:grid-cols-2">
              <TextInput label="First name" value={personal.firstName} onChange={(firstName) => setPersonal((prev) => ({ ...prev, firstName }))} required />
              <TextInput label="Last name" value={personal.lastName} onChange={(lastName) => setPersonal((prev) => ({ ...prev, lastName }))} required />
              <TextInput label="Email" type="email" value={personal.email} onChange={(email) => setPersonal((prev) => ({ ...prev, email }))} required />
              <TextInput label="Phone" value={personal.phone} onChange={(phone) => setPersonal((prev) => ({ ...prev, phone }))} />
              <TextInput label="Country" value={personal.country} onChange={(country) => setPersonal((prev) => ({ ...prev, country }))} />
              <TextInput label="Nationality" value={personal.nationality} onChange={(nationality) => setPersonal((prev) => ({ ...prev, nationality }))} />
            </div>
            <div className="mt-4">
              <Label>Address</Label>
              <Textarea value={personal.address} onChange={(event) => setPersonal((prev) => ({ ...prev, address: event.target.value }))} rows={2} />
            </div>
          </Section>

          <Section title="Professional profiles">
            <div className="grid gap-4 md:grid-cols-2">
              <TextInput label="Portfolio" type="url" value={professional.portfolio} onChange={(portfolio) => setProfessional((prev) => ({ ...prev, portfolio }))} />
              <TextInput label="LinkedIn" type="url" value={professional.linkedIn} onChange={(linkedIn) => setProfessional((prev) => ({ ...prev, linkedIn }))} />
              <TextInput label="Github" type="url" value={professional.github} onChange={(github) => setProfessional((prev) => ({ ...prev, github }))} />
              <TextInput label="Behance" type="url" value={professional.behance} onChange={(behance) => setProfessional((prev) => ({ ...prev, behance }))} />
              <TextInput label="Personal website" type="url" value={professional.website} onChange={(website) => setProfessional((prev) => ({ ...prev, website }))} />
            </div>
          </Section>

          <Section title="Documents">
            <div className="grid gap-4 md:grid-cols-3">
              <FilePicker id={`application-cv-${type}-${referenceId}`} label="CV or resume" file={cvFile} onChange={setCvFile} />
              <FilePicker id={`application-cover-${type}-${referenceId}`} label="Cover letter" file={coverLetterFile} onChange={setCoverLetterFile} />
              <FilePicker id={`application-portfolio-${type}-${referenceId}`} label="Portfolio file" file={portfolioFile} onChange={setPortfolioFile} />
            </div>
          </Section>

          <Section title="Education">
            <div className="space-y-4">
              {education.map((entry, index) => (
                <div key={index} className="grid gap-3 md:grid-cols-3">
                  <TextInput label={`Degree ${index + 1}`} value={entry.degree} onChange={(degree) => updateEducation(index, { degree })} />
                  <TextInput label="Institution" value={entry.institution} onChange={(institution) => updateEducation(index, { institution })} />
                  <TextInput label="Graduation date" type="month" value={entry.graduationDate} onChange={(graduationDate) => updateEducation(index, { graduationDate })} />
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setEducation((prev) => [...prev, emptyEducation()])}>
                Add education
              </Button>
            </div>
          </Section>

          <Section title="Experience">
            <div className="grid gap-4 md:grid-cols-2">
              <TextInput label="Current employer" value={experience.currentEmployer} onChange={(currentEmployer) => setExperience((prev) => ({ ...prev, currentEmployer }))} />
              <TextInput label="Previous employers" value={experience.previousEmployers} onChange={(previousEmployers) => setExperience((prev) => ({ ...prev, previousEmployers }))} />
            </div>
            <div className="mt-4">
              <Label>Achievements</Label>
              <Textarea value={experience.achievements} onChange={(event) => setExperience((prev) => ({ ...prev, achievements: event.target.value }))} rows={3} />
            </div>
          </Section>

          <Section title="References">
            <div className="space-y-4">
              {references.map((entry, index) => (
                <div key={index} className="grid gap-3 md:grid-cols-4">
                  <TextInput label={`Reference ${index + 1}`} value={entry.name} onChange={(name) => updateReference(index, { name })} />
                  <TextInput label="Relationship" value={entry.relationship} onChange={(relationship) => updateReference(index, { relationship })} />
                  <TextInput label="Email" type="email" value={entry.email} onChange={(email) => updateReference(index, { email })} />
                  <TextInput label="Phone" value={entry.phone} onChange={(phone) => updateReference(index, { phone })} />
                </div>
              ))}
            </div>
          </Section>

          {fields.length > 0 && (
            <Section title="Role-specific questions">
              <div className="space-y-4">
                {fields.map((field) => (
                  <div key={field.name} className="space-y-2">
                    <Label htmlFor={`application-custom-${type}-${referenceId}-${field.name}`}>{field.label}</Label>
                    {field.type === "textarea" ? (
                      <Textarea
                        id={`application-custom-${type}-${referenceId}-${field.name}`}
                        value={answers[field.name] || ""}
                        onChange={(event) => setAnswers((prev) => ({ ...prev, [field.name]: event.target.value }))}
                        required={field.required}
                        placeholder={field.placeholder}
                        rows={3}
                      />
                    ) : (
                      <Input
                        id={`application-custom-${type}-${referenceId}-${field.name}`}
                        value={answers[field.name] || ""}
                        onChange={(event) => setAnswers((prev) => ({ ...prev, [field.name]: event.target.value }))}
                        required={field.required}
                        type={field.type === "url" ? "url" : "text"}
                        placeholder={field.placeholder}
                      />
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          <div className="space-y-2">
            <Label htmlFor={`application-notes-${type}-${referenceId}`}>Application notes</Label>
            <Textarea
              id={`application-notes-${type}-${referenceId}`}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add availability, eligibility context, or anything the team should review."
              className="min-h-[120px]"
            />
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-border/60 p-4">
            <Checkbox id={`application-consent-${type}-${referenceId}`} checked={consent} onCheckedChange={(checked) => setConsent(checked === true)} />
            <Label htmlFor={`application-consent-${type}-${referenceId}`} className="text-sm leading-relaxed text-muted-foreground">
              I confirm this information is accurate and authorize Mtendere to review my application materials for this opportunity.
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={saveDraft} disabled={isSubmitting}>
              Save draft
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isSubmitting}>
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

  function updateEducation(index: number, patch: Partial<EducationEntry>) {
    setEducation((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  function updateReference(index: number, patch: Partial<ReferenceEntry>) {
    setReferences((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border/60 p-4">
      <h3 className="mb-4 text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  const id = `application-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} />
    </div>
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

function buildApplicationFields(type: ApplicationDialogProps["type"], job?: ApiJob | null, customFields: ApplicationField[] = []) {
  const fields: ApplicationField[] = [];
  const normalizedRole = [job?.title, job?.category, job?.department, job?.employmentType, job?.jobType]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (type === "job") {
    if (/(developer|software|engineer|data|technology|it|technical)/.test(normalizedRole)) {
      fields.push(
        { name: "programmingLanguages", label: "Programming languages", required: true },
        { name: "githubProfile", label: "Github profile", type: "url" },
        { name: "stackExperience", label: "Stack experience", type: "textarea", required: true },
        { name: "technicalAssessment", label: "Technical assessment notes", type: "textarea" },
      );
    }

    if (/(marketing|communications|social|brand|campaign)/.test(normalizedRole)) {
      fields.push(
        { name: "campaignExperience", label: "Campaign experience", type: "textarea", required: true },
        { name: "marketingPortfolio", label: "Marketing portfolio", type: "url" },
        { name: "socialMediaExperience", label: "Social media experience", type: "textarea" },
      );
    }

    if (/(scholarship|coordinator|research|academic)/.test(normalizedRole)) {
      fields.push(
        { name: "academicQualifications", label: "Academic qualifications", type: "textarea", required: true },
        { name: "researchExperience", label: "Research experience", type: "textarea" },
        { name: "certifications", label: "Relevant certifications" },
      );
    }

    if (/(lecturer|teacher|faculty|professor|tutor)/.test(normalizedRole)) {
      fields.push(
        { name: "teachingExperience", label: "Teaching experience", type: "textarea", required: true },
        { name: "publications", label: "Publications", type: "textarea" },
        { name: "academicCredentials", label: "Academic credentials", type: "textarea", required: true },
      );
    }
  }

  const adminFields =
    job?.applicationForm?.length || job?.dynamicQuestions?.length
      ? [...(job.applicationForm || []), ...(job.dynamicQuestions || [])].map((field, index) => normalizeAdminField(field, index))
      : [];

  const merged = [...fields, ...adminFields, ...customFields].filter(Boolean);
  const seen = new Set<string>();
  return merged.filter((field) => {
    if (seen.has(field.name)) return false;
    seen.add(field.name);
    return true;
  });
}

function normalizeAdminField(field: Record<string, unknown>, index: number): ApplicationField {
  const label = String(field.label ?? field.question ?? field.name ?? `Question ${index + 1}`);
  const name = String(field.name ?? label.toLowerCase().replace(/[^a-z0-9]+/g, "_"));
  const rawType = String(field.type ?? "").toLowerCase();
  return {
    name,
    label,
    type: rawType === "textarea" || rawType === "long_text" ? "textarea" : rawType === "url" ? "url" : "text",
    required: Boolean(field.required),
    placeholder: typeof field.placeholder === "string" ? field.placeholder : undefined,
  };
}
