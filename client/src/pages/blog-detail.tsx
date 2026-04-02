import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { type BlogPost, type BlogComment } from "@shared/schema";
import { Calendar, Heart, MessageSquare, ChevronLeft, Send, Share2, Clock, BookOpen, Twitter, Facebook, Linkedin, ArrowRight } from "lucide-react";
import { useState } from "react";
import ExpandingNav from "@/components/expanding-nav";
import Footer from "@/components/footer";

function formatContent(content: string): string[] {
  return content.split("\n").filter((line) => line.trim() !== "");
}

function renderLine(line: string, index: number) {
  if (line.startsWith("## ")) {
    return (
      <h2 key={index} className="text-2xl font-bold text-mtendere-blue mt-10 mb-4 pt-6 border-t border-gray-100">
        {line.replace("## ", "")}
      </h2>
    );
  }
  if (line.startsWith("# ")) {
    return (
      <h1 key={index} className="text-3xl font-black text-mtendere-blue mt-8 mb-4">
        {line.replace("# ", "")}
      </h1>
    );
  }
  if (line.startsWith("**") && line.endsWith("**")) {
    return (
      <p key={index} className="font-bold text-gray-800 mb-3">
        {line.replace(/\*\*/g, "")}
      </p>
    );
  }
  if (line.startsWith("- ") || line.match(/^\d+\. /)) {
    return (
      <li key={index} className="ml-6 mb-2 text-gray-700 leading-relaxed list-disc">
        {line.replace(/^- |^\d+\. /, "")}
      </li>
    );
  }
  return (
    <p key={index} className="text-gray-700 leading-relaxed mb-4 text-lg">
      {line}
    </p>
  );
}

export default function BlogDetail() {
  const [, params] = useRoute("/blog/:id");
  const id = parseInt(params?.id || "0");
  const { toast } = useToast();
  const [comment, setComment] = useState("");

  const { data: post, isLoading: postLoading } = useQuery<BlogPost>({
    queryKey: [`/api/blog-posts/${id}`],
  });

  const { data: comments, isLoading: commentsLoading } = useQuery<BlogComment[]>({
    queryKey: [`/api/blog-posts/${id}/comments`],
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/blog-posts/${id}/like`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/blog-posts/${id}`] });
      toast({ title: "Post liked!" });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/blog-posts/${id}/comments`, { content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/blog-posts/${id}/comments`] });
      setComment("");
      toast({ title: "Comment added!" });
    },
  });

  const readingTime = post ? Math.ceil(post.content.split(" ").length / 200) : 0;

  if (postLoading) {
    return (
      <div className="min-h-screen bg-white">
        <ExpandingNav />
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <Skeleton className="h-10 w-32 mb-8" />
          <Skeleton className="h-64 w-full rounded-xl mb-8" />
          <Skeleton className="h-8 w-3/4 mb-4" />
          <Skeleton className="h-4 w-full mb-3" />
          <Skeleton className="h-4 w-full mb-3" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white">
        <ExpandingNav />
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-bold text-gray-600 mb-4">Post not found</h1>
          <Button asChild>
            <Link href="/blog">Back to Blog</Link>
          </Button>
        </div>
      </div>
    );
  }

  const lines = formatContent(post.content);

  return (
    <div className="min-h-screen bg-white">
      <ExpandingNav />

      {/* Article Header */}
      <header className="bg-gradient-to-br from-mtendere-blue to-mtendere-green text-white py-16 mt-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <Link href="/blog">
            <Button variant="ghost" className="text-white hover:text-white hover:bg-white/20 mb-6 -ml-3">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back to Blog
            </Button>
          </Link>

          {post.category && (
            <Badge className="bg-mtendere-orange text-white font-bold mb-4">{post.category}</Badge>
          )}

          <h1 className="text-3xl md:text-4xl font-black mb-6 leading-tight">{post.title}</h1>

          <div className="flex flex-wrap items-center gap-4 text-white/80 text-sm">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {new Date(post.createdAt!).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {readingTime} min read
            </span>
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" />
              {post.content.split(" ").length} words
            </span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 max-w-3xl">
        {/* Cover Image */}
        <div className="-mt-8 mb-10">
          <img
            src={post.imageUrl || "https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=2070&auto=format&fit=crop"}
            alt={post.title}
            className="w-full h-64 md:h-80 object-cover rounded-2xl shadow-2xl"
          />
        </div>

        {/* Social + Like Bar */}
        <div className="flex items-center justify-between mb-10 pb-6 border-b border-gray-100">
          <Button
            variant="ghost"
            className="flex items-center gap-2 text-gray-600 hover:text-red-500 hover:bg-red-50"
            onClick={() => likeMutation.mutate()}
            disabled={likeMutation.isPending}
          >
            <Heart className={`h-5 w-5 ${post.likes ? "text-red-500 fill-red-500" : ""}`} />
            <span className="font-semibold">{post.likes || 0}</span>
            <span className="text-sm">Likes</span>
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400 mr-1">Share:</span>
            {[
              { icon: Facebook, color: "hover:text-blue-600" },
              { icon: Twitter, color: "hover:text-sky-500" },
              { icon: Linkedin, color: "hover:text-blue-700" },
            ].map(({ icon: Icon, color }, i) => (
              <button key={i} className={`w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 ${color} transition-colors`}>
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>

        {/* Article Content */}
        <article className="mb-16">
          <div className="prose-custom">
            {lines.map((line, i) => renderLine(line, i))}
          </div>
        </article>

        {/* Tags */}
        {post.tags && Array.isArray(post.tags) && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-10 pb-10 border-b border-gray-100">
            {post.tags.map((tag: string) => (
              <Badge key={tag} variant="outline" className="text-mtendere-blue border-mtendere-blue/30">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="bg-gradient-to-r from-mtendere-blue to-mtendere-green text-white rounded-2xl p-8 mb-12 text-center">
          <h3 className="text-xl font-bold mb-2">Ready to Start Your Journey?</h3>
          <p className="text-white/80 mb-5 text-sm">Book a free consultation with our education experts today.</p>
          <Button asChild className="bg-mtendere-orange hover:bg-orange-500 text-white font-bold">
            <Link href="/contact">
              Book Free Consultation <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </div>

        {/* Comments */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2 text-mtendere-blue">
            <MessageSquare className="h-6 w-6" />
            Discussion ({comments?.length || 0})
          </h2>

          <div className="mb-8">
            <div className="space-y-3">
              <Textarea
                placeholder="Share your thoughts on this article..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[100px] border-gray-200 focus-visible:ring-mtendere-blue resize-none"
              />
              <Button
                onClick={() => commentMutation.mutate(comment)}
                disabled={!comment.trim() || commentMutation.isPending}
                className="bg-mtendere-blue hover:bg-blue-700 text-white font-bold"
              >
                <Send className="mr-2 h-4 w-4" />
                Post Comment
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            {commentsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-1/4 mb-2" />
                      <Skeleton className="h-16 w-full rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>
            ) : comments?.length === 0 ? (
              <p className="text-gray-400 italic text-center py-8">
                No comments yet. Be the first to start the conversation!
              </p>
            ) : (
              comments?.map((c) => (
                <div key={c.id} className="flex gap-4 group">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-mtendere-blue to-mtendere-green flex items-center justify-center text-white font-bold shrink-0 text-sm">
                    U
                  </div>
                  <div className="flex-1">
                    <div className="bg-gray-50 rounded-2xl px-5 py-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-mtendere-blue text-sm">Reader</span>
                        <span className="text-xs text-gray-400">
                          {new Date(c.createdAt!).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                      <p className="text-gray-700 leading-relaxed text-sm">{c.content}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
