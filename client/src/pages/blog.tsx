import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import ExpandingNav from "@/components/expanding-nav";
import Footer from "@/components/footer";
import GovernedImage from "@/components/governed-image";
import NewsletterSignup from "@/components/newsletter-signup";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApiBlogPost } from "@/lib/api-types";
import { getGovernedBackgroundImage } from "@/lib/image-governance";
import { publicContentQueryOptions } from "@/lib/realtime-content";
import { richTextToPlainText, truncateRichText } from "@/lib/rich-text";
import { Search, Calendar, Heart, ArrowRight, BookOpen } from "lucide-react";

const getReadingTime = (content: string) =>
  Math.max(1, Math.ceil(richTextToPlainText(content).split(/\s+/).filter(Boolean).length / 200));

export default function Blog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const { data: posts, isLoading } = useQuery<ApiBlogPost[]>({
    queryKey: ["/api/blog-posts"],
    ...publicContentQueryOptions,
  });

  const { data: searchResults, isLoading: isSearching } = useQuery<ApiBlogPost[]>({
    queryKey: ["/api/blog-posts/search", { q: searchQuery }],
    enabled: searchQuery.length > 2,
    ...publicContentQueryOptions,
  });

  const displayPosts = searchQuery.length > 2 ? searchResults : posts;
  const categoryOptions = [
    "All",
    ...Array.from(new Set((posts || []).map((post) => post.category).filter(Boolean))).sort(),
  ];

  const filtered = displayPosts?.filter(post =>
    selectedCategory === "All" || post.category === selectedCategory
  ) || [];

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <div className="min-h-screen bg-background">
      <ExpandingNav />

      {/* Hero */}
      <section
        className="relative py-28 text-white overflow-hidden"
        style={{
          backgroundImage: getGovernedBackgroundImage({
            module: "blog",
            title: "Mtendere blog insights",
            category: "general",
            variant: "hero",
          }),
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-mtendere-blue/92 to-mtendere-green/85 z-0" />
        <div className="container relative z-10 mx-auto px-4 text-center">
          <Badge className="mb-4 bg-card/20 text-white border-white/30 px-4 py-1 text-sm font-bold uppercase tracking-widest">
            Insights & Updates
          </Badge>
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 drop-shadow-2xl">
            Our Blog
          </h1>
          <p className="text-xl md:text-2xl mb-10 opacity-95 drop-shadow-lg max-w-2xl mx-auto font-semibold">
            Expert guides, scholarship updates, and success stories from the Mtendere community
          </p>

          {/* Search */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/70 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-6 text-lg bg-card text-foreground border-0 rounded-xl shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* Category Tabs */}
      <section className="bg-card border-b sticky top-16 z-30 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex space-x-1 overflow-x-auto py-3">
            {categoryOptions.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-bold transition-all ${
                  selectedCategory === cat
                    ? "bg-mtendere-blue text-white shadow-md"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16">
        {isLoading || isSearching ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <Skeleton className="h-56 w-full rounded-t-lg" />
                <CardHeader>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-6 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">No articles found</h3>
            <p className="text-muted-foreground mb-6">Try a different search term or category.</p>
            <Button onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }}
              className="bg-mtendere-blue text-white font-bold hover:bg-mtendere-blue/90">
              Clear Filters
            </Button>
          </div>
        ) : (
          <>
            {/* Featured Article */}
            {featured && (
              <Link href={`/blog/${featured.id}`}>
                <div className="mb-14 group cursor-pointer rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 bg-card border">
                  <div className="md:flex">
                    <div className="md:w-1/2 h-72 md:h-auto overflow-hidden">
                      <GovernedImage
                        module="blog"
                        src={featured.imageUrl}
                        title={featured.title}
                        category={featured.category}
                        tags={featured.tags || []}
                        variant="hero"
                        priority
                        aspectRatio="auto"
                        className="h-full"
                        wrapperClassName="h-full rounded-none shadow-none"
                        imageClassName="group-hover:scale-105"
                      />
                    </div>
                    <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
                      <div className="flex items-center gap-3 mb-4">
                        <Badge className="bg-mtendere-blue text-white font-bold">{featured.category}</Badge>
                        <span className="text-xs text-muted-foreground/70 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(featured.createdAt!).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                        </span>
                        <Badge variant="outline" className="border-mtendere-blue/20 text-mtendere-blue">
                          {getReadingTime(featured.content)} min read
                        </Badge>
                      </div>
                      <h2 className="text-2xl md:text-3xl font-extrabold text-mtendere-blue mb-4 group-hover:text-mtendere-green transition-colors">
                        {featured.title}
                      </h2>
                      <p className="text-muted-foreground leading-relaxed mb-6 line-clamp-3">
                        {featured.excerpt || truncateRichText(featured.content, 200)}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-semibold text-mtendere-blue group-hover:text-mtendere-green transition-colors">
                          Read Full Story <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground/70">
                          <Heart className="w-4 h-4 text-destructive fill-destructive" />
                          {featured.likes || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {/* Other Articles Grid */}
            {rest.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {rest.map((post, i) => (
                  <Link key={post.id} href={`/blog/${post.id}`}>
                    <Card className="group h-full flex flex-col cursor-pointer hover:shadow-2xl transition-all duration-500 overflow-hidden border-none bg-muted/40">
                      <div className="relative h-52 overflow-hidden">
                        <GovernedImage
                          module="blog"
                          src={post.imageUrl}
                          title={post.title}
                          category={post.category}
                          tags={post.tags || []}
                          index={i}
                          variant="card"
                          aspectRatio="auto"
                          className="h-full"
                          wrapperClassName="h-full rounded-none shadow-none"
                          imageClassName="group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <Badge className="absolute top-4 left-4 bg-mtendere-blue text-white text-xs font-bold">
                          {post.category}
                        </Badge>
                      </div>
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground/70 mb-2">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(post.createdAt!).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          <span className="mx-1 h-1 w-1 rounded-full bg-muted-foreground/40" />
                          <span>{getReadingTime(post.content)} min read</span>
                        </div>
                        <CardTitle className="text-lg font-bold text-mtendere-blue line-clamp-2 group-hover:text-mtendere-green transition-colors leading-snug">
                          {post.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col">
                        <CardDescription className="text-muted-foreground line-clamp-3 leading-relaxed mb-4">
                          {post.excerpt || truncateRichText(post.content, 130)}
                        </CardDescription>
                        <div className="mt-auto flex items-center justify-between pt-3 border-t border-border/40">
                          <span className="text-sm font-bold text-mtendere-blue flex items-center gap-1 group-hover:text-mtendere-green transition-colors">
                            Read More <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                          </span>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
                            <Heart className="w-3.5 h-3.5 text-destructive fill-destructive" />
                            {post.likes || 0}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Newsletter CTA */}
      <section
        className="py-20 text-white text-center relative overflow-hidden"
        style={{
          backgroundImage: getGovernedBackgroundImage({
            module: "blog",
            title: "Mtendere newsletter and community updates",
            category: "education",
            variant: "hero",
          }),
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-mtendere-blue/85 z-0" />
        <div className="container relative z-10 mx-auto px-4 max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 drop-shadow-lg">Stay Updated</h2>
          <p className="text-lg mb-8 opacity-90">
            Get the latest scholarship opportunities, career tips, and success stories delivered to your inbox.
          </p>
          <NewsletterSignup source="blog" compact className="mx-auto" />
        </div>
      </section>
      <Footer />
    </div>
  );
}




