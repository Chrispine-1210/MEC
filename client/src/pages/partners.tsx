import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import ExpandingNav from "@/components/expanding-nav";
import Footer from "@/components/footer";
import GovernedImage from "@/components/governed-image";
import type { ApiPartner } from "@/lib/api-types";
import { getGovernedBackgroundImage } from "@/lib/image-governance";
import { publicContentQueryOptions } from "@/lib/realtime-content";
import { truncateRichText } from "@/lib/rich-text";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { 
  Users, 
  Trophy, 
  Award, 
  MapPin, 
  Globe, 
  GraduationCap,
  ExternalLink,
  Building,
  Star,
  Calendar,
  BookOpen,
  Search,
  X
} from "lucide-react";

type Partner = ApiPartner;

export default function Partners() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebouncedValue(searchQuery.trim().toLowerCase(), 300);
  const { data: partners, isLoading } = useQuery<Partner[]>({
    queryKey: ["/api/partners"],
    ...publicContentQueryOptions,
  });

  const filteredPartners = useMemo(() => {
    const items = partners || [];
    if (!debouncedSearchQuery) return items;

    return items.filter((partner) => {
      const haystack = [
        partner.name,
        partner.description,
        partner.country,
        partner.partnershipType,
        partner.ranking,
        partner.website,
        partner.videoTitle,
      ].filter(Boolean).join(" ").toLowerCase();

      return debouncedSearchQuery.split(/\s+/).every((token) => haystack.includes(token));
    });
  }, [debouncedSearchQuery, partners]);

  const featuredPartners = [...filteredPartners]
    .filter((partner) => partner.isActive !== false)
    .sort((a, b) => Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured)))
    .slice(0, 3);

  const formatStudentCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(0)}K+`;
    }
    return count.toString();
  };

  return (
    <div className="min-h-screen bg-background">
      <ExpandingNav />
      
      {/* Header Section */}
      <section 
        className="relative py-24 text-white overflow-hidden"
        style={ {
          backgroundImage: getGovernedBackgroundImage({
            module: "partner",
            title: "Education partners",
            category: "business",
            variant: "hero",
          }),
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        } }
      >
        <div className="absolute inset-0 bg-gradient-to-r from-mtendere-blue/90 to-mtendere-green/90 z-0" />
        <div className="container relative z-10 mx-auto px-4">
          <div className="hero-panel hero-safe-copy mx-auto max-w-4xl rounded-3xl p-7 text-center md:p-10">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 drop-shadow-2xl">
              Our Trusted Education Partners
            </h1>
            <p className="text-xl md:text-2xl mb-8 opacity-95 drop-shadow-lg font-semibold">
              We've partnered with leading educational institutions worldwide to provide you with the best opportunities for your academic and career advancement
            </p>
            <div className="relative mx-auto mb-8 max-w-2xl">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/70" />
              <Input
                type="text"
                placeholder="Search partners by university, country, category, video, or website..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="rounded-xl border-0 bg-card py-6 pl-12 pr-12 text-lg text-foreground shadow-2xl"
              />
              {searchQuery && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 h-9 w-9 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear partner search"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 text-sm opacity-95 drop-shadow-lg sm:grid-cols-3">
              <div className="rounded-xl border border-white/15 bg-card/10 p-5 shadow-lg backdrop-blur">
                <div className="text-3xl font-bold">200+</div>
                <div className="font-semibold">Universities</div>
              </div>
              <div className="rounded-xl border border-white/15 bg-card/10 p-5 shadow-lg backdrop-blur">
                <div className="text-3xl font-bold">50+</div>
                <div className="font-semibold">Countries</div>
              </div>
              <div className="rounded-xl border border-white/15 bg-card/10 p-5 shadow-lg backdrop-blur">
                <div className="text-3xl font-bold">10K+</div>
                <div className="font-semibold">Students Placed</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        {featuredPartners.length > 0 && (
          <section className="mb-16">
            <div className="section-heading mx-auto mb-12 text-center">
              <h2 className="text-3xl font-bold text-mtendere-blue mb-4">
                Featured Partners
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Highlighted institutions and organizations managed directly from Admin
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              {featuredPartners.map((partner, idx) => (
                <Card key={partner.id} className="premium-card text-center transition-all duration-300">
                  <CardHeader className="pb-4">
                    <GovernedImage
                      module="partner"
                      src={partner.logoUrl}
                      title={partner.name}
                      variant="logo"
                      aspectRatio="1 / 1"
                      fit="contain"
                      index={idx}
                      className="mx-auto mb-4 h-24 w-24"
                      wrapperClassName="h-full rounded-full bg-mtendere-blue p-3 shadow-none"
                    />
                    <CardTitle className="text-2xl text-mtendere-blue">
                      {partner.name}
                    </CardTitle>
                    <CardDescription className="text-base line-clamp-3">
                      {truncateRichText(partner.description, 170)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-2">
                          <Users className="w-5 h-5 text-mtendere-blue mr-1" />
                        </div>
                        <div className="text-2xl font-bold text-mtendere-blue">
                          {partner.studentCount ? formatStudentCount(partner.studentCount) : "-"}
                        </div>
                        <div className="text-sm text-muted-foreground">Students</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-2">
                          <Trophy className="w-5 h-5 text-mtendere-orange mr-1" />
                        </div>
                        <div className="text-2xl font-bold text-mtendere-orange">
                          {partner.ranking || partner.partnershipType || "Partner"}
                        </div>
                        <div className="text-sm text-muted-foreground">Profile</div>
                      </div>
                    </div>
                    <div className="space-y-2 mb-6">
                      {partner.country && <Badge className="bg-mtendere-blue text-white">{partner.country}</Badge>}
                      {partner.videoUrl && <Badge className="bg-mtendere-green text-white">Video</Badge>}
                      {partner.isFeatured && <Badge className="bg-mtendere-orange text-white">Featured</Badge>}
                    </div>
                    <Button asChild className="w-full bg-mtendere-blue hover:bg-mtendere-blue/90">
                      <Link href={`/partners/${partner.id}`}>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Learn More
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* All Partners */}
        <section>
          <div className="section-heading mx-auto mb-12 text-center">
            <h2 className="text-3xl font-bold text-mtendere-blue mb-4">
              All Partners
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover our complete network of educational institutions and organizations
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-16 w-16 rounded-full mx-auto" />
                    <Skeleton className="h-4 w-3/4 mx-auto" />
                    <Skeleton className="h-3 w-1/2 mx-auto" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full mb-4" />
                    <Skeleton className="h-8 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPartners?.map((partner, idx) => {
                return (
                <Card key={partner.id} className="premium-card group flex flex-col overflow-hidden border-none bg-card transition-all duration-500">
                  <div className="relative h-44 overflow-hidden">
                    <GovernedImage
                      module="partner"
                      src={partner.logoUrl}
                      title={partner.name}
                      category={partner.country}
                      index={idx}
                      variant="card"
                      aspectRatio="auto"
                      className="h-full"
                      wrapperClassName="h-full rounded-none shadow-none"
                      imageClassName="group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="text-white font-bold text-base drop-shadow line-clamp-1">{partner.name}</div>
                      <div className="text-white/80 text-xs flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />{partner.country}
                      </div>
                    </div>
                    {partner.ranking && (
                      <div className="absolute top-3 right-3">
                        <span className="bg-mtendere-orange text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                          <Star className="w-3 h-3 fill-white" />{partner.ranking}
                        </span>
                      </div>
                    )}
                  </div>

                  <CardContent className="pt-4 flex-1 flex flex-col">
                    <p className="text-muted-foreground mb-4 line-clamp-3 text-sm leading-relaxed flex-1">
                      {truncateRichText(partner.description, 170)}
                    </p>
                    
                    {partner.studentCount && (
                      <div className="flex items-center gap-2 mb-4 text-sm">
                        <Users className="w-4 h-4 text-mtendere-blue" />
                        <span className="font-bold text-mtendere-blue">{formatStudentCount(partner.studentCount)}</span>
                        <span className="text-muted-foreground">students enrolled</span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button asChild className="flex-1 bg-mtendere-blue hover:bg-mtendere-blue/90 text-white font-bold" size="sm">
                        <Link href={`/partners/${partner.id}`}>
                          <BookOpen className="w-4 h-4 mr-2" />
                          View Programs
                        </Link>
                      </Button>
                      {partner.website && (
                        <a href={partner.website} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="border-mtendere-blue text-mtendere-blue hover:bg-mtendere-blue hover:text-white">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
                );
              })}
            </div>
          )}

          {filteredPartners?.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <Building className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-muted-foreground mb-2">
                No partners found
              </h3>
              <p className="text-muted-foreground">
                {debouncedSearchQuery ? "Try another partner, country, category, or video search." : "We're continuously expanding our network. Check back soon for new partnerships."}
              </p>
            </div>
          )}
        </section>

        {/* Partnership Benefits */}
        <section className="premium-card mt-16 rounded-2xl bg-mtendere-gray p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-mtendere-blue mb-4">
              Partnership Benefits
            </h2>
            <p className="text-muted-foreground">
              What our partnerships mean for you
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-mtendere-blue rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-mtendere-blue mb-2">Direct Admission</h3>
              <p className="text-sm text-muted-foreground">
                Fast-track admission process with our partner institutions
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-mtendere-green rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-mtendere-blue mb-2">Special Discounts</h3>
              <p className="text-sm text-muted-foreground">
                Exclusive scholarships and fee waivers for Mtendere students
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-mtendere-orange rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-mtendere-blue mb-2">Priority Support</h3>
              <p className="text-sm text-muted-foreground">
                Dedicated support throughout your application and enrollment process
              </p>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}



