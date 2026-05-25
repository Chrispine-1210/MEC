import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import ExpandingNav from "@/components/expanding-nav";
import Footer from "@/components/footer";
import ApplicationDialog from "@/components/application-dialog";
import GovernedImage from "@/components/governed-image";
import type { ApiScholarship } from "@/lib/api-types";
import { getGovernedBackgroundImage } from "@/lib/image-governance";
import { publicContentQueryOptions } from "@/lib/realtime-content";
import { truncateRichText } from "@/lib/rich-text";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { 
  Search, 
  Filter, 
  MapPin, 
  Calendar, 
  DollarSign, 
  GraduationCap,
  ExternalLink,
  BookOpen,
  Globe,
  Clock,
  X
} from "lucide-react";

type Scholarship = ApiScholarship;

const videoSources = [
  {
    url: "https://assets.mixkit.co/videos/preview/mixkit-group-of-students-working-in-a-university-library-40040-large.mp4",
    title: "Collaborative Learning",
    description: "Study together with peers from around the world",
  },
  {
    url: "https://assets.mixkit.co/videos/preview/mixkit-students-walking-on-a-university-campus-40038-large.mp4",
    title: "Campus Excellence",
    description: "Experience top-tier educational facilities",
  },
  {
    url: "https://assets.mixkit.co/videos/preview/mixkit-young-woman-working-on-a-laptop-in-a-library-40041-large.mp4",
    title: "Academic Success",
    description: "Achieve your educational goals",
  },
];

export default function Scholarships() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [currentVideo, setCurrentVideo] = useState(0);
  const [isPlayingVideo, setIsPlayingVideo] = useState(true);
  const debouncedSearchQuery = useDebouncedValue(searchQuery.trim(), 300);

  const { data: scholarships, isLoading } = useQuery<Scholarship[]>({
    queryKey: ["/api/scholarships"],
    ...publicContentQueryOptions,
  });

  const { data: searchResults, isLoading: isSearching } = useQuery<Scholarship[]>({
    queryKey: ["/api/scholarships/search", { q: debouncedSearchQuery }],
    enabled: debouncedSearchQuery.length >= 2,
    ...publicContentQueryOptions,
  });

  const handleNextVideo = () => {
    setCurrentVideo((prev) => (prev + 1) % videoSources.length);
  };

  const displayScholarships = debouncedSearchQuery.length >= 2 ? searchResults : scholarships;
  const categories = [...new Set(scholarships?.map(s => s.category) || [])];

  const filteredScholarships = displayScholarships?.filter(scholarship => 
    !selectedCategory || scholarship.category === selectedCategory
  );

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isDeadlineApproaching = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  };

  return (
    <div className="min-h-screen bg-background">
      <ExpandingNav />
      
      {/* Header Section */}
      <section 
        className="relative py-24 text-white overflow-hidden"
        style={ {
          backgroundImage: getGovernedBackgroundImage({
            module: "scholarship",
            title: "Scholarship opportunities",
            category: "scholarships",
            variant: "hero",
          }),
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        } }
      >
        <div className="absolute inset-0 bg-gradient-to-r from-mtendere-blue/90 to-mtendere-green/90 z-0" />
        <div className="container relative z-10 mx-auto px-4">
          <div className="hero-panel hero-safe-copy mx-auto max-w-3xl rounded-3xl p-7 text-center md:p-10">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 drop-shadow-2xl">
              Find Your Perfect Scholarship
            </h1>
            <p className="text-xl md:text-2xl mb-8 opacity-95 drop-shadow-lg">
              Discover funding opportunities from top institutions worldwide and make your educational dreams a reality
            </p>
            
            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto drop-shadow-2xl">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground/70 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search scholarships by title, institution, or country..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-6 text-lg bg-card text-foreground border-0 rounded-xl shadow-2xl focus-visible:ring-primary"
              />
              {isSearching && (
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <div className="loading-spinner"></div>
                </div>
              )}
              {searchQuery && !isSearching && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 h-9 w-9 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear scholarship search"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section className="section-shell bg-mtendere-gray py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="media-depth mb-8 overflow-hidden rounded-2xl border border-border/60 bg-card">
              <video
                src={videoSources[currentVideo].url}
                className="w-full h-96 object-cover"
                autoPlay
                muted
                loop
                key={currentVideo}
              />
            </div>
            <div className="premium-card rounded-xl p-8">
              <h3 className="text-2xl font-bold text-mtendere-blue mb-2">
                {videoSources[currentVideo].title}
              </h3>
              <p className="text-muted-foreground mb-6">
                {videoSources[currentVideo].description}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground font-medium">
                  Video {currentVideo + 1} of {videoSources.length}
                </span>
                <Button 
                  onClick={handleNextVideo}
                  className="bg-mtendere-blue hover:bg-mtendere-blue/90 text-white font-bold"
                >
                  Next Video
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16">
        {/* Filters Section with Background */}
        <div className="premium-card mb-12 rounded-2xl bg-gradient-to-r from-mtendere-blue/5 to-mtendere-green/5 p-8">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-mtendere-blue font-bold" />
              <span className="font-bold text-mtendere-blue">Filter by category:</span>
            </div>
            <Button
              variant={selectedCategory === "" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("")}
              className={selectedCategory === "" ? "bg-mtendere-blue text-white font-bold hover:bg-mtendere-blue/90" : "border-mtendere-blue text-mtendere-blue hover:bg-mtendere-blue hover:text-white"}
            >
              All Categories
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={selectedCategory === category ? "bg-mtendere-blue text-white font-bold hover:bg-mtendere-blue/90" : "border-mtendere-blue text-mtendere-blue hover:bg-mtendere-blue hover:text-white"}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-muted-foreground">
            Showing {filteredScholarships?.length || 0} scholarship{filteredScholarships?.length !== 1 ? 's' : ''}
            {debouncedSearchQuery && ` for "${debouncedSearchQuery}"`}
            {selectedCategory && ` in ${selectedCategory}`}
          </p>
        </div>

        {/* Scholarships Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full mb-4" />
                  <Skeleton className="h-3 w-full mb-2" />
                  <Skeleton className="h-3 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredScholarships?.map((scholarship, index) => (
              <Card key={scholarship.id} className="premium-card group flex flex-col overflow-hidden border-none bg-card transition-all duration-500">
                <div className="relative h-48 overflow-hidden">
                  <GovernedImage
                    module="scholarship"
                    src={scholarship.imageUrl}
                    title={scholarship.title}
                    category={scholarship.category}
                    index={index}
                    variant="card"
                    aspectRatio="auto"
                    className="h-full"
                    wrapperClassName="h-full rounded-none shadow-none"
                    imageClassName="group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <Badge className="bg-mtendere-green text-white font-bold text-xs">{scholarship.category}</Badge>
                    {isDeadlineApproaching(scholarship.deadline) && (
                      <Badge variant="destructive" className="animate-pulse text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        Urgent
                      </Badge>
                    )}
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <span className="text-white text-sm font-bold drop-shadow flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />{scholarship.country}
                    </span>
                  </div>
                </div>
                <CardHeader className="pt-4">
                  <CardTitle className="text-lg text-mtendere-blue line-clamp-2 font-bold group-hover:text-mtendere-green transition-colors">
                    {scholarship.title}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 text-sm flex-wrap">
                    <span className="flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-mtendere-blue" />
                      {scholarship.institution}
                    </span>
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <p className="text-muted-foreground mb-4 line-clamp-3">
                    {truncateRichText(scholarship.description, 180)}
                  </p>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center text-sm text-muted-foreground">
                        <DollarSign className="w-4 h-4 mr-1" />
                        Award Amount
                      </span>
                      <span className="font-semibold text-mtendere-green">
                        {scholarship.amount ? formatCurrency(scholarship.amount, scholarship.currency || 'USD') : 'Full Coverage'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4 mr-1" />
                        Deadline
                      </span>
                      <span className={`font-semibold ${isDeadlineApproaching(scholarship.deadline) ? 'text-destructive' : 'text-foreground/80'}`}>
                        {formatDate(scholarship.deadline)}
                      </span>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <ApplicationDialog
                      type="scholarship"
                      referenceId={scholarship.id}
                      title={scholarship.title}
                      trigger={
                        <Button className="flex-1 bg-mtendere-blue hover:bg-mtendere-blue/90 text-white font-bold shadow-md">
                          <BookOpen className="w-4 h-4 mr-2" />
                          Apply Now
                        </Button>
                      }
                    />
                    
                    <Button asChild variant="outline" size="icon" className="border-mtendere-blue text-mtendere-blue hover:bg-mtendere-blue hover:text-white shadow-sm" aria-label={`View ${scholarship.title}`}>
                      <Link href={`/scholarships/${scholarship.id}`}>
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {filteredScholarships?.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <GraduationCap className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">
              No scholarships found
            </h3>
            <p className="text-muted-foreground mb-6">
              Try adjusting your search criteria or check back later for new opportunities.
            </p>
            <Button 
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("");
              }}
              variant="outline"
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}




