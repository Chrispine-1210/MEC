import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import ExpandingNav from "@/components/expanding-nav";
import Footer from "@/components/footer";
import GovernedImage from "@/components/governed-image";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Award,
  Briefcase,
  CheckCircle2,
  Download,
  FileText,
  GraduationCap,
  Languages,
  Link as LinkIcon,
  Printer,
  Share2,
  Sparkles,
  Wand2,
} from "lucide-react";

type CvTemplate = "Modern" | "Corporate" | "Executive" | "Academic" | "Creative" | "ATS-Friendly";

type CvData = {
  template: CvTemplate;
  name: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  role: string;
  industry: string;
  level: string;
  summary: string;
  experience: string;
  education: string;
  certifications: string;
  skills: string;
  languages: string;
  awards: string;
  projects: string;
  publications: string;
  references: string;
};

const templates: CvTemplate[] = ["Modern", "Corporate", "Executive", "Academic", "Creative", "ATS-Friendly"];

const defaultCv: CvData = {
  template: "ATS-Friendly",
  name: "",
  headline: "",
  email: "",
  phone: "",
  location: "",
  website: "",
  role: "Scholarship Coordinator",
  industry: "Education",
  level: "Graduate",
  summary: "",
  experience: "",
  education: "",
  certifications: "",
  skills: "",
  languages: "",
  awards: "",
  projects: "",
  publications: "",
  references: "",
};

export default function ResumeBuilding() {
  const [cv, setCv] = useState<CvData>(defaultCv);
  const [achievementInput, setAchievementInput] = useState("Worked in sales");
  const [generatedAchievement, setGeneratedAchievement] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const encoded = hash.get("cv");
    if (!encoded) return;
    try {
      const parsed = JSON.parse(decodeURIComponent(escape(window.atob(encoded)))) as CvData;
      setCv({ ...defaultCv, ...parsed });
    } catch {
      toast({ title: "Share link could not be opened", variant: "destructive" });
    }
  }, [toast]);

  const suggestedSkills = useMemo(() => suggestSkills(cv.role, cv.industry, cv.level), [cv.industry, cv.level, cv.role]);
  const atsScore = useMemo(() => calculateAtsScore(cv), [cv]);
  const missingSections = useMemo(() => getMissingSections(cv), [cv]);

  const updateCv = (patch: Partial<CvData>) => setCv((prev) => ({ ...prev, ...patch }));

  const generateSummary = () => {
    const summary = buildSummary(cv);
    updateCv({ summary });
    toast({ title: "Summary generated", description: "A tailored professional summary was added." });
  };

  const generateAchievement = () => {
    const next = improveAchievement(achievementInput, cv.role, cv.industry);
    setGeneratedAchievement(next);
    updateCv({ experience: [cv.experience, next].filter(Boolean).join("\n") });
  };

  const addSkillSuggestions = () => {
    const existing = splitList(cv.skills);
    const merged = Array.from(new Set([...existing, ...suggestedSkills])).slice(0, 18);
    updateCv({ skills: merged.join(", ") });
  };

  const optimizeForAts = () => {
    updateCv({
      template: "ATS-Friendly",
      summary: cv.summary || buildSummary(cv),
      skills: Array.from(new Set([...splitList(cv.skills), ...suggestedSkills])).slice(0, 18).join(", "),
      experience: normalizeBullets(cv.experience),
      education: cv.education || "Degree or qualification, Institution, Graduation year",
    });
    toast({ title: "ATS optimization applied", description: "Structure, skills, and bullet formatting were improved." });
  };

  const printCv = () => window.print();

  const exportDocx = () => {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(cv.name || "Mtendere CV")}</title></head><body>${buildCvHtml(cv)}</body></html>`;
    const blob = new Blob([html], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    downloadBlob(blob, `${slugify(cv.name || "mtendere-cv")}.doc`);
  };

  const shareLink = async () => {
    const encoded = window.btoa(unescape(encodeURIComponent(JSON.stringify(cv))));
    const url = `${window.location.origin}${window.location.pathname}#cv=${encoded}`;
    await navigator.clipboard?.writeText(url);
    toast({ title: "Share link copied", description: "The CV builder link is ready to paste." });
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title="AI CV Builder" description="Build, optimize, print, export, and share an ATS-ready CV." />
      <ExpandingNav />

      <main className="pt-24">
        <section className="section-shell border-b bg-card py-8">
          <div className="container mx-auto max-w-7xl px-4">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
              <div>
                <Badge className="mb-3 bg-mtendere-blue text-white">Jobs Portal CV Builder</Badge>
                <h1 className="text-3xl font-bold text-mtendere-blue md:text-5xl">Create an ATS-ready CV</h1>
                <p className="mt-3 max-w-3xl text-muted-foreground">
                  Build a complete CV for jobs, scholarships, academic roles, and graduate opportunities.
                </p>
              </div>
              <GovernedImage
                module="job"
                title="Professional CV preparation"
                category="career"
                variant="card"
                aspectRatio="16 / 9"
                wrapperClassName="rounded-lg shadow-none"
              />
            </div>
          </div>
        </section>

        <section className="section-shell py-8">
          <div className="container mx-auto grid max-w-7xl gap-6 px-4 xl:grid-cols-[minmax(0,1fr)_430px]">
            <div className="space-y-6">
              <Card className="border border-border/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-mtendere-blue">
                    <FileText className="h-5 w-5" />
                    CV Builder
                  </CardTitle>
                  <CardDescription>Choose a template, enter your details, then optimize before exporting.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="profile" className="space-y-5">
                    <TabsList className="grid h-auto grid-cols-2 md:grid-cols-5">
                      <TabsTrigger value="profile">Profile</TabsTrigger>
                      <TabsTrigger value="sections">Sections</TabsTrigger>
                      <TabsTrigger value="ai">AI</TabsTrigger>
                      <TabsTrigger value="ats">ATS</TabsTrigger>
                      <TabsTrigger value="export">Export</TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile" className="space-y-5">
                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <Label>Template</Label>
                          <Select value={cv.template} onValueChange={(template) => updateCv({ template: template as CvTemplate })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {templates.map((template) => <SelectItem key={template} value={template}>{template}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <Field label="Target role" value={cv.role} onChange={(role) => updateCv({ role })} />
                        <Field label="Industry" value={cv.industry} onChange={(industry) => updateCv({ industry })} />
                        <Field label="Experience level" value={cv.level} onChange={(level) => updateCv({ level })} />
                        <Field label="Full name" value={cv.name} onChange={(name) => updateCv({ name })} />
                        <Field label="Headline" value={cv.headline} onChange={(headline) => updateCv({ headline })} />
                        <Field label="Email" type="email" value={cv.email} onChange={(email) => updateCv({ email })} />
                        <Field label="Phone" value={cv.phone} onChange={(phone) => updateCv({ phone })} />
                        <Field label="Location" value={cv.location} onChange={(location) => updateCv({ location })} />
                        <Field label="Portfolio or LinkedIn" value={cv.website} onChange={(website) => updateCv({ website })} />
                      </div>
                      <div>
                        <Label>Professional summary</Label>
                        <Textarea value={cv.summary} onChange={(event) => updateCv({ summary: event.target.value })} rows={5} />
                      </div>
                    </TabsContent>

                    <TabsContent value="sections" className="space-y-5">
                      <SectionEditor icon={Briefcase} label="Experience" value={cv.experience} onChange={(experience) => updateCv({ experience })} />
                      <SectionEditor icon={GraduationCap} label="Education" value={cv.education} onChange={(education) => updateCv({ education })} />
                      <SectionEditor icon={CheckCircle2} label="Certifications" value={cv.certifications} onChange={(certifications) => updateCv({ certifications })} />
                      <SectionEditor icon={Sparkles} label="Skills" value={cv.skills} onChange={(skills) => updateCv({ skills })} />
                      <SectionEditor icon={Languages} label="Languages" value={cv.languages} onChange={(languages) => updateCv({ languages })} />
                      <SectionEditor icon={Award} label="Awards" value={cv.awards} onChange={(awards) => updateCv({ awards })} />
                      <SectionEditor icon={Briefcase} label="Projects" value={cv.projects} onChange={(projects) => updateCv({ projects })} />
                      <SectionEditor icon={FileText} label="Publications" value={cv.publications} onChange={(publications) => updateCv({ publications })} />
                      <SectionEditor icon={LinkIcon} label="References" value={cv.references} onChange={(references) => updateCv({ references })} />
                    </TabsContent>

                    <TabsContent value="ai" className="space-y-5">
                      <div className="grid gap-4 lg:grid-cols-2">
                        <Card className="border border-border/60">
                          <CardHeader>
                            <CardTitle className="text-lg">AI Summary Generator</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Button onClick={generateSummary} className="bg-mtendere-blue hover:bg-mtendere-blue/90">
                              <Wand2 className="mr-2 h-4 w-4" />
                              Generate summary
                            </Button>
                          </CardContent>
                        </Card>
                        <Card className="border border-border/60">
                          <CardHeader>
                            <CardTitle className="text-lg">AI Achievement Generator</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <Input value={achievementInput} onChange={(event) => setAchievementInput(event.target.value)} />
                            <Button onClick={generateAchievement} variant="outline">
                              <Sparkles className="mr-2 h-4 w-4" />
                              Improve achievement
                            </Button>
                            {generatedAchievement && <p className="rounded-lg bg-muted p-3 text-sm text-foreground/80">{generatedAchievement}</p>}
                          </CardContent>
                        </Card>
                      </div>
                      <Card className="border border-border/60">
                        <CardHeader>
                          <CardTitle className="text-lg">AI Skill Suggestions</CardTitle>
                          <CardDescription>{cv.role} - {cv.industry} - {cv.level}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex flex-wrap gap-2">
                            {suggestedSkills.map((skill) => <Badge key={skill} variant="outline">{skill}</Badge>)}
                          </div>
                          <Button onClick={addSkillSuggestions}>Add suggestions</Button>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="ats" className="space-y-5">
                      <Card className="border border-border/60">
                        <CardHeader>
                          <CardTitle className="text-lg">ATS Optimization</CardTitle>
                          <CardDescription>Structure score based on essential CV sections and scan-friendly formatting.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <div className="mb-2 flex items-center justify-between text-sm">
                              <span className="font-medium">ATS score</span>
                              <span className="font-bold text-mtendere-blue">{atsScore}%</span>
                            </div>
                            <Progress value={atsScore} />
                          </div>
                          {missingSections.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {missingSections.map((item) => <Badge key={item} variant="outline" className="text-warning">{item}</Badge>)}
                            </div>
                          )}
                          <Button onClick={optimizeForAts} className="bg-mtendere-green hover:bg-mtendere-green/90">
                            Optimize CV
                          </Button>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="export" className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-4">
                        <Button onClick={printCv} className="bg-mtendere-blue hover:bg-mtendere-blue/90">
                          <Printer className="mr-2 h-4 w-4" />
                          Print / PDF
                        </Button>
                        <Button onClick={exportDocx} variant="outline">
                          <Download className="mr-2 h-4 w-4" />
                          DOCX
                        </Button>
                        <Button onClick={shareLink} variant="outline">
                          <Share2 className="mr-2 h-4 w-4" />
                          Share link
                        </Button>
                        <Button asChild variant="outline">
                          <Link href="/jobs">
                            <Briefcase className="mr-2 h-4 w-4" />
                            Browse jobs
                          </Link>
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            <aside className="space-y-6">
              <Card className="sticky top-24 border border-border/60">
                <CardHeader>
                  <CardTitle className="text-mtendere-blue">Live CV Preview</CardTitle>
                  <CardDescription>{cv.template} template</CardDescription>
                </CardHeader>
                <CardContent>
                  <div id="cv-preview" className={`cv-preview cv-template-${cv.template.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
                    <div className="border-b border-border pb-4">
                      <h2 className="text-2xl font-bold text-foreground">{cv.name || "Your Name"}</h2>
                      <p className="font-semibold text-mtendere-blue">{cv.headline || cv.role}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {[cv.email, cv.phone, cv.location, cv.website].filter(Boolean).join(" | ") || "email | phone | location | portfolio"}
                      </p>
                    </div>
                    <PreviewSection title="Summary" value={cv.summary} />
                    <PreviewSection title="Experience" value={cv.experience} />
                    <PreviewSection title="Education" value={cv.education} />
                    <PreviewSection title="Certifications" value={cv.certifications} />
                    <PreviewSection title="Skills" value={cv.skills} inline />
                    <PreviewSection title="Languages" value={cv.languages} inline />
                    <PreviewSection title="Awards" value={cv.awards} />
                    <PreviewSection title="Projects" value={cv.projects} />
                    <PreviewSection title="Publications" value={cv.publications} />
                    <PreviewSection title="References" value={cv.references} />
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function SectionEditor({ icon: Icon, label, value, onChange }: { icon: any; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-mtendere-blue" />
        {label}
      </Label>
      <Textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} placeholder={`Add ${label.toLowerCase()} details...`} />
    </div>
  );
}

function PreviewSection({ title, value, inline = false }: { title: string; value: string; inline?: boolean }) {
  if (!value.trim()) return null;
  const items = inline ? splitList(value) : value.split("\n").map((item) => item.trim()).filter(Boolean);
  return (
    <section className="mt-4">
      <h3 className="text-xs font-bold uppercase tracking-wide text-mtendere-blue">{title}</h3>
      {inline ? (
        <p className="mt-1 text-sm text-foreground/80">{items.join(", ")}</p>
      ) : (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-foreground/80">
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      )}
    </section>
  );
}

function buildSummary(cv: CvData) {
  const level = cv.level || "motivated";
  const role = cv.role || "professional";
  const industry = cv.industry || "target industry";
  const skills = suggestSkills(role, industry, level).slice(0, 4).join(", ");
  return `${level} ${role} with a strong foundation in ${industry.toLowerCase()} and practical capability across ${skills}. Brings organized execution, clear communication, and evidence-based problem solving to support measurable outcomes.`;
}

function improveAchievement(value: string, role: string, industry: string) {
  const normalized = value.trim().replace(/\.$/, "");
  if (!normalized) return "";
  if (/sales/i.test(normalized)) {
    return "Increased sales performance through strategic customer engagement, relationship management, and consistent follow-up with qualified prospects.";
  }
  if (/teach|lecture|training/i.test(normalized)) {
    return "Improved learner outcomes by designing structured lessons, assessing progress, and adapting support to student needs.";
  }
  if (/manage|coordinat/i.test(normalized)) {
    return `Coordinated ${industry.toLowerCase()} activities by aligning stakeholders, tracking deliverables, and improving execution quality.`;
  }
  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)} while applying ${role.toLowerCase()} judgment, measurable follow-through, and clear stakeholder communication.`;
}

function suggestSkills(role: string, industry: string, level: string) {
  const text = `${role} ${industry} ${level}`.toLowerCase();
  const skills = new Set<string>(["Communication", "Problem Solving", "Stakeholder Management", "Microsoft Office"]);

  if (/developer|software|data|technology|it/.test(text)) {
    ["JavaScript", "TypeScript", "React", "API Integration", "SQL", "Git", "Testing"].forEach((skill) => skills.add(skill));
  }
  if (/marketing|communications|brand|social/.test(text)) {
    ["Campaign Planning", "Content Strategy", "Analytics", "SEO", "Social Media Management", "Copywriting"].forEach((skill) => skills.add(skill));
  }
  if (/scholarship|education|admission|academic/.test(text)) {
    ["Student Advising", "Application Review", "Research", "Academic Writing", "Program Coordination"].forEach((skill) => skills.add(skill));
  }
  if (/lecturer|teacher|faculty|professor/.test(text)) {
    ["Curriculum Design", "Assessment", "Student Mentorship", "Research Methods", "Publication Writing"].forEach((skill) => skills.add(skill));
  }
  if (/executive|senior|manager/.test(text)) {
    ["Leadership", "Strategic Planning", "Budgeting", "Performance Management"].forEach((skill) => skills.add(skill));
  }

  return Array.from(skills).slice(0, 14);
}

function calculateAtsScore(cv: CvData) {
  const checks = [
    cv.name,
    cv.email,
    cv.phone,
    cv.summary,
    cv.experience,
    cv.education,
    cv.skills,
    cv.template === "ATS-Friendly" || cv.template === "Corporate",
    splitList(cv.skills).length >= 6,
    cv.experience.includes("\n") || cv.experience.includes("-"),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function getMissingSections(cv: CvData) {
  return [
    ["Name", cv.name],
    ["Email", cv.email],
    ["Phone", cv.phone],
    ["Summary", cv.summary],
    ["Experience", cv.experience],
    ["Education", cv.education],
    ["Skills", cv.skills],
  ]
    .filter(([, value]) => !value)
    .map(([label]) => String(label));
}

function splitList(value: string) {
  return value.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean);
}

function normalizeBullets(value: string) {
  const items = value.split("\n").map((item) => item.trim().replace(/^[-*]\s*/, "")).filter(Boolean);
  return items.map((item) => `- ${item}`).join("\n");
}

function buildCvHtml(cv: CvData) {
  const section = (title: string, value: string) => value ? `<h2>${escapeHtml(title)}</h2><p>${escapeHtml(value).replace(/\n/g, "<br>")}</p>` : "";
  return `
    <h1>${escapeHtml(cv.name || "Your Name")}</h1>
    <p><strong>${escapeHtml(cv.headline || cv.role)}</strong></p>
    <p>${escapeHtml([cv.email, cv.phone, cv.location, cv.website].filter(Boolean).join(" | "))}</p>
    ${section("Professional Summary", cv.summary)}
    ${section("Experience", cv.experience)}
    ${section("Education", cv.education)}
    ${section("Certifications", cv.certifications)}
    ${section("Skills", cv.skills)}
    ${section("Languages", cv.languages)}
    ${section("Awards", cv.awards)}
    ${section("Projects", cv.projects)}
    ${section("Publications", cv.publications)}
    ${section("References", cv.references)}
  `;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const replacements: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return replacements[character] || character;
  });
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "cv";
}
