import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { ApiBlogComment, ApiBlogPost } from "@/lib/api-types";
import ExpandingNav from "@/components/expanding-nav";
import Footer from "@/components/footer";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  Copy,
  Facebook,
  Heart,
  Linkedin,
  MessageSquare,
  Send,
  Share2,
  Sparkles,
  Twitter,
  Users,
} from "lucide-react";

type ContentBlock =
  | { type: "h1"; text: string; slug: string }
  | { type: "h2"; text: string; slug: string }
  | { type: "paragraph"; text: string }
  | { type: "callout"; text: string }
  | { type: "list"; items: string[]; ordered: boolean };

type ArticleGuide = {
  audience: string;
  purpose: string;
  timing: string;
  nextStepLabel: string;
  nextStepHref: string;
  actionNotes: string[];
  keyQuestions: string[];
  resources: { label: string; href: string }[];
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=2070&auto=format&fit=crop";

const DEFAULT_GUIDE: ArticleGuide = {
  audience: "Readers looking for practical guidance they can turn into action.",
  purpose: "Use the article to clarify your next move and avoid leaving the insight at the reading stage.",
  timing: "Best used when you are deciding what to do next and want a clearer first action.",
  nextStepLabel: "Talk to an advisor",
  nextStepHref: "/contact",
  actionNotes: [
    "Pull out the section that matters most to your current stage.",
    "Convert one recommendation into a task you can finish this week.",
    "Use the article as preparation for your next advisor conversation.",
  ],
  keyQuestions: [
    "What should I do immediately after reading this?",
    "Which part of the advice applies most directly to me?",
    "What still needs clarification before I act?",
  ],
  resources: [
    { label: "Talk to an advisor", href: "/contact" },
    { label: "Explore our services", href: "/about" },
  ],
};

const ARTICLE_GUIDES: Record<string, ArticleGuide> = {
  Scholarships: {
    audience: "Students comparing funding routes and trying to avoid rushed scholarship applications.",
    purpose: "Use the article to understand fit, requirements, and the strongest next step before deadlines tighten.",
    timing: "Best read while you are building a shortlist and before you draft essays or statements.",
    nextStepLabel: "Browse scholarships",
    nextStepHref: "/scholarships",
    actionNotes: [
      "Check eligibility and deadlines before drafting anything.",
      "Lead with the strongest evidence in your academic story.",
      "Get feedback before you submit a competitive application.",
    ],
    keyQuestions: [
      "Am I targeting the right scholarships for my profile?",
      "Which documents will matter most here?",
      "What should I prepare first to avoid last-minute pressure?",
    ],
    resources: [
      { label: "Browse scholarships", href: "/scholarships" },
      { label: "Plan your application", href: "/university-applications" },
    ],
  },
  "Study Abroad": {
    audience: "Students comparing destinations, institutions, and practical next steps for studying overseas.",
    purpose: "Use it to move from broad interest into a more realistic shortlist and preparation plan.",
    timing: "Most useful before you commit to a country, school, or application route.",
    nextStepLabel: "Explore study abroad",
    nextStepHref: "/study-abroad",
    actionNotes: [
      "Compare destination, budget, and support needs together.",
      "Note paperwork or visa steps that could slow you down later.",
      "Turn the article into a shortlist and timeline quickly.",
    ],
    keyQuestions: [
      "What makes this path realistic, not just attractive?",
      "What trade-offs should I understand now?",
      "What needs to be prepared early if I continue?",
    ],
    resources: [
      { label: "Explore study abroad", href: "/study-abroad" },
      { label: "Talk to an advisor", href: "/contact" },
    ],
  },
  Career: {
    audience: "Students and graduates sharpening their employability, positioning, and job search decisions.",
    purpose: "Translate the article into a focused plan for resumes, interviews, and job targeting.",
    timing: "Best used while updating your CV or preparing for interviews.",
    nextStepLabel: "Build your resume",
    nextStepHref: "/resume-building",
    actionNotes: [
      "Make one strong improvement to your CV or interview prep immediately.",
      "Use evidence and results, not broad claims.",
      "Keep the next action specific enough to finish this week.",
    ],
    keyQuestions: [
      "What change would strengthen my positioning first?",
      "How do I show evidence instead of general claims?",
      "Where would feedback help most?",
    ],
    resources: [
      { label: "Build your resume", href: "/resume-building" },
      { label: "Browse jobs", href: "/jobs" },
    ],
  },
  Visa: {
    audience: "Students preparing for documentation, embassy steps, and compliance-sensitive parts of the journey.",
    purpose: "Focus on timing, document quality, and avoiding preventable omissions.",
    timing: "Most useful before you are in a last-minute paperwork rush.",
    nextStepLabel: "Plan your application",
    nextStepHref: "/university-applications",
    actionNotes: [
      "Double-check dates, names, and document consistency.",
      "Use a checklist so you can track every requirement clearly.",
      "Do not leave country-specific paperwork to the final week.",
    ],
    keyQuestions: [
      "What paperwork needs to be gathered first?",
      "Which mistakes would create avoidable delays?",
      "How early should I begin to stay ahead?",
    ],
    resources: [
      { label: "Plan your application", href: "/university-applications" },
      { label: "Talk to an advisor", href: "/contact" },
    ],
  },
};

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}

function parseContent(content: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  let currentList: { items: string[]; ordered: boolean } | null = null;

  const flushList = () => {
    if (!currentList) return;
    blocks.push({ type: "list", items: currentList.items, ordered: currentList.ordered });
    currentList = null;
  };

  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return flushList();

    const isOrdered = /^\d+\.\s/.test(trimmed);
    const isUnordered = trimmed.startsWith("- ");
    if (isOrdered || isUnordered) {
      const nextItem = trimmed.replace(/^\d+\.\s|^-\s/, "");
      if (!currentList || currentList.ordered !== isOrdered) {
        flushList();
        currentList = { items: [], ordered: isOrdered };
      }
      currentList.items.push(nextItem);
      return;
    }

    flushList();
    if (trimmed.startsWith("## ")) return blocks.push({ type: "h2", text: trimmed.slice(3), slug: slugify(trimmed.slice(3)) });
    if (trimmed.startsWith("# ")) return blocks.push({ type: "h1", text: trimmed.slice(2), slug: slugify(trimmed.slice(2)) });
    if (trimmed.startsWith("**") && trimmed.endsWith("**")) return blocks.push({ type: "callout", text: trimmed.replace(/\*\*/g, "") });
    blocks.push({ type: "paragraph", text: trimmed });
  });

  flushList();
  return blocks;
}

function formatDate(value?: string | null) {
  if (!value) return "Recently published";
  return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default function BlogDetail() {
  const [, params] = useRoute("/blog/:id");
  const id = Number(params?.id || 0);
  const { toast } = useToast();
  const [comment, setComment] = useState("");

  const { data: post, isLoading: postLoading } = useQuery<ApiBlogPost>({
    queryKey: [`/api/blog-posts/${id}`],
    enabled: Number.isFinite(id) && id > 0,
  });
  const { data: posts } = useQuery<ApiBlogPost[]>({ queryKey: ["/api/blog-posts"] });
  const { data: comments, isLoading: commentsLoading } = useQuery<ApiBlogComment[]>({
    queryKey: [`/api/blog-posts/${id}/comments`],
    enabled: Number.isFinite(id) && id > 0,
  });

  const likeMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/blog-posts/${id}/like`)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/blog-posts/${id}`] });
      toast({ title: "Post liked!" });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (content: string) =>
      (await apiRequest("POST", `/api/blog-posts/${id}/comments`, { content })).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/blog-posts/${id}/comments`] });
      setComment("");
      toast({ title: "Comment added!" });
    },
  });

  if (postLoading) {
    return (
      <div className="min-h-screen bg-background">
        <ExpandingNav />
        <div className="container mx-auto max-w-6xl px-4 py-8">
          <Skeleton className="mb-8 h-10 w-32" />
          <Skeleton className="mb-8 h-96 w-full rounded-3xl" />
          <Skeleton className="mb-4 h-8 w-3/4" />
          <Skeleton className="mb-3 h-4 w-full" />
          <Skeleton className="mb-3 h-4 w-full" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <ExpandingNav />
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="mb-4 text-2xl font-bold text-muted-foreground">Post not found</h1>
          <Button asChild>
            <Link href="/blog">Back to Blog</Link>
          </Button>
        </div>
      </div>
    );
  }

  const blocks = parseContent(post.content);
  const headings = blocks.filter((block): block is Extract<ContentBlock, { type: "h2" }> => block.type === "h2");
  const paragraphs = blocks.filter((block): block is Extract<ContentBlock, { type: "paragraph" }> => block.type === "paragraph");
  const callout = blocks.find((block): block is Extract<ContentBlock, { type: "callout" }> => block.type === "callout");
  const tags = Array.isArray(post.tags) ? post.tags : [];
  const wordCount = post.content.split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));
  const guide = ARTICLE_GUIDES[post.category] || DEFAULT_GUIDE;
  const excerpt =
    post.excerpt ||
    paragraphs[0]?.text ||
    "A practical Mtendere insight designed to help you move from reading into better decisions.";
  const relatedPosts = (posts || [])
    .filter((item) => item.id !== post.id)
    .sort((left, right) => Number(right.category === post.category) - Number(left.category === post.category))
    .slice(0, 3);

  const openShareWindow = (platform: "facebook" | "twitter" | "linkedin") => {
    if (typeof window === "undefined") return;
    const articleUrl = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(post.title);
    const shareUrls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${articleUrl}`,
      twitter: `https://twitter.com/intent/tweet?url=${articleUrl}&text=${title}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${articleUrl}`,
    };
    window.open(shareUrls[platform], "_blank", "noopener,noreferrer,width=640,height=720");
  };

  const handleCopyLink = async () => {
    if (typeof window === "undefined" || !navigator.clipboard) {
      toast({
        title: "Copy not available",
        description: "Your browser could not copy the article link automatically.",
        variant: "destructive",
      });
      return;
    }
    await navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link copied", description: "You can paste the article link anywhere now." });
  };

  return (
    <div className="min-h-screen bg-background">
      <ExpandingNav />

      <section className="relative mt-16 overflow-hidden py-20 text-white">
        <div className="absolute inset-0">
          <img src={post.imageUrl || FALLBACK_IMAGE} alt={post.title} className="h-full w-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-mtendere-blue/95 via-mtendere-blue/88 to-mtendere-green/82" />
        <div className="container relative z-10 mx-auto max-w-6xl px-4">
          <Button asChild variant="ghost" className="mb-6 -ml-3 text-white hover:bg-card/20">
            <Link href="/blog">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Blog
            </Link>
          </Button>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_390px] lg:items-end">
            <div className="max-w-4xl">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <Badge className="bg-mtendere-orange font-bold text-white">{post.category}</Badge>
                <Badge variant="outline" className="border-white/30 bg-white/10 text-white">
                  <Clock className="mr-1 h-3 w-3" />
                  {readingTime} min read
                </Badge>
                <Badge variant="outline" className="border-white/30 bg-white/10 text-white">
                  <MessageSquare className="mr-1 h-3 w-3" />
                  {comments?.length || 0} comments
                </Badge>
              </div>

              <h1 className="mb-6 text-4xl font-bold leading-tight md:text-6xl">{post.title}</h1>
              <p className="max-w-3xl text-base leading-relaxed text-white/85 md:text-lg">{excerpt}</p>

              <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-white/80">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(post.createdAt)}
                </span>
                <span className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  {wordCount} words
                </span>
                <span className="flex items-center gap-2">
                  <Heart className={`h-4 w-4 ${post.likes ? "fill-white" : ""}`} />
                  {post.likes || 0} likes
                </span>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  className="bg-mtendere-orange font-bold text-white hover:bg-mtendere-orange/90"
                  onClick={() => likeMutation.mutate()}
                  disabled={likeMutation.isPending}
                >
                  <Heart className={`mr-2 h-4 w-4 ${post.likes ? "fill-white" : ""}`} />
                  {likeMutation.isPending ? "Saving..." : "Like this article"}
                </Button>
                <Button
                  variant="outline"
                  className="border-white/30 bg-white/10 text-white hover:bg-white hover:text-mtendere-blue"
                  onClick={handleCopyLink}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy link
                </Button>
              </div>
            </div>

            <Card className="border-white/15 bg-white/10 text-white shadow-2xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl text-white">Reader brief</CardTitle>
                <CardDescription className="text-white/75">
                  A better article page should make the next action obvious.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-white/15 bg-white/12 p-4 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/60">Best for</p>
                  <p className="mt-2 text-sm font-semibold leading-relaxed">{guide.audience}</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/12 p-4 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/60">Use it to</p>
                  <p className="mt-2 text-sm font-semibold leading-relaxed">{guide.purpose}</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/12 p-4 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/60">Read it when</p>
                  <p className="mt-2 text-sm font-semibold leading-relaxed">{guide.timing}</p>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.slice(0, 5).map((tag) => (
                      <Badge key={tag} variant="outline" className="border-white/25 bg-white/10 text-white">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-6xl px-4 py-14">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-10">
            <section className="grid gap-5 md:grid-cols-3">
              {[
                {
                  title: "Who this is for",
                  body: guide.audience,
                  icon: Users,
                  tone: "bg-mtendere-blue/10 text-mtendere-blue",
                },
                {
                  title: "How to use it",
                  body: guide.purpose,
                  icon: Sparkles,
                  tone: "bg-mtendere-green/10 text-mtendere-green",
                },
                {
                  title: "Best moment to read",
                  body: guide.timing,
                  icon: Clock,
                  tone: "bg-mtendere-orange/10 text-mtendere-orange",
                },
              ].map(({ title, body, icon: Icon, tone }) => (
                <Card key={title} className="border border-border/60 shadow-sm">
                  <CardHeader className="pb-3">
                    <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-full ${tone}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg text-foreground">{title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="leading-relaxed text-muted-foreground">{body}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </section>

            <section>
              <Badge variant="outline" className="border-mtendere-blue/20 text-mtendere-blue">
                Read for action
              </Badge>
              <h2 className="mt-3 text-2xl font-bold text-mtendere-blue md:text-3xl">
                Three ways to get more value from this article
              </h2>
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                {guide.actionNotes.map((item, index) => (
                  <Card key={item} className="border border-border/60">
                    <CardHeader className="pb-2">
                      <Badge variant="outline" className="w-fit border-mtendere-green/30 text-mtendere-green">
                        Step {index + 1}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed text-foreground/80">{item}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
              <Card className="border border-border/60 bg-gradient-to-br from-mtendere-blue/5 via-card to-mtendere-green/5">
                <CardHeader>
                  <CardTitle className="text-xl text-mtendere-blue">
                    What this article is helping you think through
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-base leading-relaxed text-muted-foreground">
                  {(paragraphs.slice(0, 2).length ? paragraphs.slice(0, 2) : [{ text: excerpt }]).map((paragraph) => (
                    <p key={paragraph.text}>{paragraph.text}</p>
                  ))}
                </CardContent>
              </Card>

              <Card className="border border-border/60">
                <CardHeader>
                  <CardTitle className="text-lg text-foreground">Questions to keep in view</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {guide.keyQuestions.map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <CheckCircle className="mt-0.5 h-4 w-4 text-mtendere-blue" />
                      <p className="text-sm leading-relaxed text-foreground/80">{item}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>

            {callout && (
              <section className="rounded-3xl bg-mtendere-blue p-8 text-white">
                <p className="text-sm uppercase tracking-[0.25em] text-white/65">Key insight</p>
                <p className="mt-3 max-w-3xl text-2xl font-semibold leading-relaxed">"{callout.text}"</p>
              </section>
            )}

            <article className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm md:p-10">
              <div className="space-y-6">
                {blocks.map((block, index) => {
                  if (block.type === "h1") {
                    return (
                      <h2 key={`${block.slug}-${index}`} id={block.slug} className="text-3xl font-bold text-mtendere-blue">
                        {block.text}
                      </h2>
                    );
                  }

                  if (block.type === "h2") {
                    return (
                      <h3
                        key={`${block.slug}-${index}`}
                        id={block.slug}
                        className="border-t border-border/40 pt-8 text-2xl font-bold text-mtendere-blue"
                      >
                        {block.text}
                      </h3>
                    );
                  }

                  if (block.type === "callout") {
                    return (
                      <div key={`${block.text}-${index}`} className="rounded-2xl bg-mtendere-blue/5 p-5">
                        <p className="font-semibold leading-relaxed text-foreground">{block.text}</p>
                      </div>
                    );
                  }

                  if (block.type === "list") {
                    const ListTag = block.ordered ? "ol" : "ul";
                    return (
                      <ListTag
                        key={`${block.items[0]}-${index}`}
                        className={
                          block.ordered
                            ? "ml-5 list-decimal space-y-3 text-base leading-8 text-foreground/80"
                            : "ml-5 list-disc space-y-3 text-base leading-8 text-foreground/80"
                        }
                      >
                        {block.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ListTag>
                    );
                  }

                  return (
                    <p key={`${block.text}-${index}`} className="text-base leading-8 text-foreground/80 md:text-lg">
                      {block.text}
                    </p>
                  );
                })}
              </div>
            </article>
            <section className="grid gap-5 md:grid-cols-2">
              <Card className="border border-border/60">
                <CardHeader>
                  <CardTitle className="text-lg text-foreground">Turn the insight into a next step</CardTitle>
                  <CardDescription>{guide.purpose}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="bg-mtendere-blue font-bold hover:bg-mtendere-blue/90">
                    <Link href={guide.nextStepHref}>
                      {guide.nextStepLabel}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="border border-border/60">
                <CardHeader>
                  <CardTitle className="text-lg text-foreground">Helpful next resources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {guide.resources.map((resource) => (
                    <Button
                      key={resource.label}
                      asChild
                      variant="outline"
                      className="w-full justify-between border-mtendere-blue/20 text-mtendere-blue hover:bg-mtendere-blue hover:text-white"
                    >
                      <Link href={resource.href}>
                        {resource.label}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </section>

            <section className="space-y-6">
              <h2 className="text-2xl font-bold text-mtendere-blue">Discussion ({comments?.length || 0})</h2>
              <Card className="border border-border/60">
                <CardContent className="space-y-3 p-6">
                  <Textarea
                    placeholder="Share your thoughts on this article..."
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    className="min-h-[110px] resize-none border-border/60 focus-visible:ring-mtendere-blue"
                  />
                  <Button
                    onClick={() => commentMutation.mutate(comment)}
                    disabled={!comment.trim() || commentMutation.isPending}
                    className="bg-mtendere-blue font-bold hover:bg-mtendere-blue/90"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {commentMutation.isPending ? "Posting..." : "Post comment"}
                  </Button>
                </CardContent>
              </Card>

              <div className="space-y-4">
                {commentsLoading ? (
                  [...Array(3)].map((_, index) => (
                    <div key={index} className="flex gap-4 rounded-2xl border border-border/60 p-5">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="mb-2 h-4 w-32" />
                        <Skeleton className="h-16 w-full rounded-xl" />
                      </div>
                    </div>
                  ))
                ) : comments?.length ? (
                  comments.map((entry) => (
                    <Card key={entry.id} className="border border-border/60">
                      <CardContent className="flex gap-4 p-5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-mtendere-blue to-mtendere-green text-sm font-bold text-white">
                          U
                        </div>
                        <div className="flex-1">
                          <div className="mb-2 flex items-center justify-between gap-4">
                            <span className="font-semibold text-mtendere-blue">Reader</span>
                            <span className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</span>
                          </div>
                          <p className="text-sm leading-relaxed text-foreground/80">{entry.content}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card className="border border-dashed border-border/60">
                    <CardContent className="py-10 text-center">
                      <p className="text-muted-foreground">
                        No comments yet. Be the first to keep the conversation going.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </section>
          </div>

          <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <Card className="border-0 bg-card shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl text-mtendere-blue">Article snapshot</CardTitle>
                <CardDescription>Use the sidebar to move faster through the parts that matter most.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Published</span>
                    <span className="text-right font-semibold text-foreground/80">{formatDate(post.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Reading time</span>
                    <span className="font-semibold text-foreground/80">{readingTime} min</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Category</span>
                    <span className="font-semibold text-foreground/80">{post.category}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="border-mtendere-blue/20 text-mtendere-blue hover:bg-mtendere-blue hover:text-white"
                    onClick={() => likeMutation.mutate()}
                    disabled={likeMutation.isPending}
                  >
                    <Heart className="mr-2 h-4 w-4" />
                    {post.likes || 0}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-mtendere-blue/20 text-mtendere-blue hover:bg-mtendere-blue hover:text-white"
                    onClick={handleCopyLink}
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                </div>
              </CardContent>
            </Card>

            {headings.length > 0 && (
              <Card className="border border-border/60">
                <CardHeader>
                  <CardTitle className="text-lg text-foreground">Jump to a section</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {headings.map((heading) => (
                    <a
                      key={heading.slug}
                      href={`#${heading.slug}`}
                      className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-muted/40"
                    >
                      <span>{heading.text}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </a>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card className="border border-border/60 bg-gradient-to-br from-mtendere-green/5 via-card to-mtendere-orange/10">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Use this article well</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {guide.actionNotes.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <Sparkles className="mt-0.5 h-4 w-4 text-mtendere-orange" />
                    <p className="text-sm leading-relaxed text-foreground/80">{item}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border border-border/60">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Questions to keep in view</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {guide.keyQuestions.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-xl border border-border/60 p-3">
                    <CheckCircle className="mt-0.5 h-4 w-4 text-mtendere-green" />
                    <p className="text-sm leading-relaxed text-foreground/80">{item}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-gradient-to-br from-mtendere-green/5 via-card to-mtendere-orange/10">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Share this article</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-3">
                <Button variant="outline" size="icon" onClick={() => openShareWindow("facebook")}>
                  <Facebook className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => openShareWindow("twitter")}>
                  <Twitter className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => openShareWindow("linkedin")}>
                  <Linkedin className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {relatedPosts.length > 0 && (
              <Card className="border border-border/60">
                <CardHeader>
                  <CardTitle className="text-lg text-foreground">Continue reading</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {relatedPosts.map((item) => (
                    <Link key={item.id} href={`/blog/${item.id}`}>
                      <div className="rounded-xl border border-border/60 p-3 transition-colors hover:bg-muted/40">
                        <Badge variant="outline" className="mb-2 border-mtendere-blue/20 text-mtendere-blue">
                          {item.category}
                        </Badge>
                        <p className="line-clamp-2 text-sm font-semibold text-foreground">{item.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card className="border border-border/60 bg-mtendere-blue text-white">
              <CardHeader>
                <CardTitle className="text-lg text-white">Need help turning insight into action?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed text-white/85">
                  Mtendere can help you turn articles like this into a real plan for scholarships, admissions,
                  applications, or career preparation.
                </p>
                <Button asChild className="w-full bg-mtendere-orange font-bold text-white hover:bg-mtendere-orange/90">
                  <Link href="/contact">
                    Talk to an advisor
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
