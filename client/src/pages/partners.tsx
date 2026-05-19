import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ExpandingNav from "@/components/expanding-nav";
import Footer from "@/components/footer";
import GovernedImage from "@/components/governed-image";
import type { ApiPartner } from "@/lib/api-types";
import { getGovernedBackgroundImage } from "@/lib/image-governance";
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
  BookOpen
} from "lucide-react";

type Partner = ApiPartner;

export default function Partners() {
  const { data: partners, isLoading } = useQuery<Partner[]>({
    queryKey: ["/api/partners"],
  });

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
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 drop-shadow-2xl">
              Our Trusted Education Partners
            </h1>
            <p className="text-xl md:text-2xl mb-8 opacity-95 drop-shadow-lg font-semibold">
              We've partnered with leading educational institutions worldwide to provide you with the best opportunities for your academic and career advancement
            </p>
            <div className="flex justify-center space-x-8 text-sm opacity-95 drop-shadow-lg">
              <div className="bg-card/10 backdrop-blur rounded-xl p-6">
                <div className="text-3xl font-bold">200+</div>
                <div className="font-semibold">Universities</div>
              </div>
              <div className="bg-card/10 backdrop-blur rounded-xl p-6">
                <div className="text-3xl font-bold">50+</div>
                <div className="font-semibold">Countries</div>
              </div>
              <div className="bg-card/10 backdrop-blur rounded-xl p-6">
                <div className="text-3xl font-bold">10K+</div>
                <div className="font-semibold">Students Placed</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        {/* Featured Partners */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-mtendere-blue mb-4">
              Featured Partners
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our flagship partnerships with world-renowned institutions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {/* GBS */}
            <Card className="text-center hover:shadow-xl transition-shadow duration-300 border-2 border-mtendere-blue">
              <CardHeader className="pb-4">
                <GovernedImage
                  module="partner"
                  src="partners/gbs-dubai.webp"
                  title="Global Business School"
                  variant="logo"
                  aspectRatio="1 / 1"
                  fit="contain"
                  className="mx-auto mb-4 h-24 w-24"
                  wrapperClassName="h-full rounded-full bg-mtendere-blue p-3 shadow-none"
                />
                <CardTitle className="text-2xl text-mtendere-blue">
                  Global Business School
                </CardTitle>
                <CardDescription className="text-base">
                  Premier business education with international recognition and industry connections
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Users className="w-5 h-5 text-mtendere-blue mr-1" />
                    </div>
                    <div className="text-2xl font-bold text-mtendere-blue">5K+</div>
                    <div className="text-sm text-muted-foreground">Students</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Trophy className="w-5 h-5 text-mtendere-orange mr-1" />
                    </div>
                    <div className="text-2xl font-bold text-mtendere-orange">Top 50</div>
                    <div className="text-sm text-muted-foreground">Global Ranking</div>
                  </div>
                </div>
                <div className="space-y-2 mb-6">
                  <Badge className="bg-mtendere-blue text-white">MBA Programs</Badge>
                  <Badge className="bg-mtendere-green text-white">Executive Education</Badge>
                  <Badge className="bg-mtendere-orange text-white">Research Programs</Badge>
                </div>
                <Button asChild className="w-full bg-mtendere-blue hover:bg-mtendere-blue/90">
                  <Link href="/partners">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Learn More
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Chandigarh University */}
            <Card className="text-center hover:shadow-xl transition-shadow duration-300 border-2 border-mtendere-green">
              <CardHeader className="pb-4">
                <GovernedImage
                  module="partner"
                  src="partners/cu-logo-white.webp"
                  title="Chandigarh University"
                  variant="logo"
                  aspectRatio="1 / 1"
                  fit="contain"
                  className="mx-auto mb-4 h-24 w-24"
                  wrapperClassName="h-full rounded-full bg-mtendere-green p-3 shadow-none"
                />
                <CardTitle className="text-2xl text-mtendere-blue">
                  Chandigarh University
                </CardTitle>
                <CardDescription className="text-base">
                  Leading university offering diverse programs with excellent placement records
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Users className="w-5 h-5 text-mtendere-green mr-1" />
                    </div>
                    <div className="text-2xl font-bold text-mtendere-green">30K+</div>
                    <div className="text-sm text-muted-foreground">Students</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Award className="w-5 h-5 text-mtendere-orange mr-1" />
                    </div>
                    <div className="text-2xl font-bold text-mtendere-orange">NAAC A+</div>
                    <div className="text-sm text-muted-foreground">Accreditation</div>
                  </div>
                </div>
                <div className="space-y-2 mb-6">
                  <Badge className="bg-mtendere-green text-white">Engineering</Badge>
                  <Badge className="bg-mtendere-blue text-white">Management</Badge>
                  <Badge className="bg-mtendere-orange text-white">Technology</Badge>
                </div>
                <Button asChild className="w-full bg-mtendere-green hover:bg-mtendere-green/90">
                  <Link href="/partners">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Learn More
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* International Partners */}
            <Card className="text-center hover:shadow-xl transition-shadow duration-300 border-2 border-mtendere-orange">
              <CardHeader className="pb-4">
                <GovernedImage
                  module="partner"
                  title="International Network"
                  variant="logo"
                  aspectRatio="1 / 1"
                  className="mx-auto mb-4 h-24 w-24"
                  wrapperClassName="h-full rounded-full shadow-none"
                />
                <CardTitle className="text-2xl text-mtendere-blue">
                  International Network
                </CardTitle>
                <CardDescription className="text-base">
                  Global network of universities and institutions for diverse educational opportunities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Globe className="w-5 h-5 text-mtendere-orange mr-1" />
                    </div>
                    <div className="text-2xl font-bold text-mtendere-orange">50+</div>
                    <div className="text-sm text-muted-foreground">Countries</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <GraduationCap className="w-5 h-5 text-mtendere-blue mr-1" />
                    </div>
                    <div className="text-2xl font-bold text-mtendere-blue">200+</div>
                    <div className="text-sm text-muted-foreground">Universities</div>
                  </div>
                </div>
                <div className="space-y-2 mb-6">
                  <Badge className="bg-mtendere-orange text-white">Study Abroad</Badge>
                  <Badge className="bg-mtendere-blue text-white">Exchange Programs</Badge>
                  <Badge className="bg-mtendere-green text-white">Joint Degrees</Badge>
                </div>
                <Button asChild className="w-full bg-mtendere-orange hover:bg-mtendere-orange/90">
                  <Link href="/partners">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Explore Network
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* All Partners */}
        <section>
          <div className="text-center mb-12">
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
              {partners?.map((partner, idx) => {
                return (
                <Card key={partner.id} className="hover:shadow-2xl transition-all duration-500 overflow-hidden group border-none bg-card shadow-md flex flex-col">
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
                      {partner.description}
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

          {partners?.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <Building className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-muted-foreground mb-2">
                No partners found
              </h3>
              <p className="text-muted-foreground">
                We're continuously expanding our network. Check back soon for new partnerships.
              </p>
            </div>
          )}
        </section>

        {/* Partnership Benefits */}
        <section className="mt-16 bg-mtendere-gray rounded-2xl p-8">
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



