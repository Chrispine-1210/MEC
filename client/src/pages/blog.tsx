import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import ExpandingNav from "@/components/expanding-nav";
import Footer from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { type BlogPost } from "@shared/schema";
import { Search, Calendar, Heart, ArrowRight, BookOpen, Tag } from "lucide-react";

const CATEGORIES = ["All", "Scholarships", "Study Abroad", "Career", "Tips & Guides", "Visa"];

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&q=80&w=800",
];

export default function Blog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const { data: posts, isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog-posts"],
  });

  const { data: searchResults, isLoading: isSearching } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog-posts/search", searchQuery],
    enabled: searchQuery.length > 2,
  });

  const displayPosts = searchQuery.length > 2 ? searchResults : posts;

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
          backgroundImage: `url('https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=2000')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-mtendere-blue/92 to-mtendere-green/85 z-0" />
        <div className="container relative z-10 mx-auto px-4 text-center">
          <Badge className="mb-4 bg-white/20 text-white border-white/30 px-4 py-1 text-sm font-bold uppercase tracking-widest">
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
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-6 text-lg bg-white text-gray-900 border-0 rounded-xl shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* Category Tabs */}
      <section className="bg-white border-b sticky top-16 z-30 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex space-x-1 overflow-x-auto py-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-bold transition-all ${
                  selectedCategory === cat
                    ? "bg-mtendere-blue text-white shadow-md"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16">
        {isLoading ? (
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
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No articles found</h3>
            <p className="text-gray-500 mb-6">Try a different search term or category.</p>
            <Button onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }}
              className="bg-mtendere-blue text-white font-bold hover:bg-blue-700">
              Clear Filters
            </Button>
          </div>
        ) : (
          <>
            {/* Featured Article */}
            {featured && (
              <Link href={`/blog/${featured.id}`}>
                <div className="mb-14 group cursor-pointer rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 bg-white border">
                  <div className="md:flex">
                    <div className="md:w-1/2 h-72 md:h-auto overflow-hidden">
                      <img
                        src={featured.imageUrl || PLACEHOLDER_IMAGES[0]}
                        alt={featured.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    </div>
                    <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
                      <div className="flex items-center gap-3 mb-4">
                        <Badge className="bg-mtendere-blue text-white font-bold">{featured.category}</Badge>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(featured.createdAt!).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                      <h2 className="text-2xl md:text-3xl font-extrabold text-mtendere-blue mb-4 group-hover:text-mtendere-green transition-colors">
                        {featured.title}
                      </h2>
                      <p className="text-gray-600 leading-relaxed mb-6 line-clamp-3">
                        {featured.excerpt || featured.content.substring(0, 200) + "..."}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-semibold text-mtendere-blue group-hover:text-mtendere-green transition-colors">
                          Read Full Story <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-400">
                          <Heart className="w-4 h-4 text-red-500 fill-red-500" />
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
                    <Card className="group h-full flex flex-col cursor-pointer hover:shadow-2xl transition-all duration-500 overflow-hidden border-none bg-gray-50">
                      <div className="relative h-52 overflow-hidden">
                        <img
                          src={post.imageUrl || PLACEHOLDER_IMAGES[i % PLACEHOLDER_IMAGES.length]}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <Badge className="absolute top-4 left-4 bg-mtendere-blue text-white text-xs font-bold">
                          {post.category}
                        </Badge>
                      </div>
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(post.createdAt!).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                        <CardTitle className="text-lg font-bold text-mtendere-blue line-clamp-2 group-hover:text-mtendere-green transition-colors leading-snug">
                          {post.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col">
                        <CardDescription className="text-gray-600 line-clamp-3 leading-relaxed mb-4">
                          {post.excerpt || post.content.substring(0, 130) + "..."}
                        </CardDescription>
                        <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-100">
                          <span className="text-sm font-bold text-mtendere-blue flex items-center gap-1 group-hover:text-mtendere-green transition-colors">
                            Read More <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                          </span>
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
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
          backgroundImage: `url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&q=80&w=2000')`,
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
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="Enter your email address"
              className="bg-white text-gray-900 border-0 rounded-xl py-6 text-base"
            />
            <Button className="bg-mtendere-orange hover:bg-orange-600 text-white font-bold px-8 py-6 rounded-xl whitespace-nowrap shadow-xl">
              Subscribe
            </Button>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
