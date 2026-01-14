import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ExpandingNav from "@/components/expanding-nav";
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

interface Partner {
  id: number;
  name: string;
  description: string;
  logoUrl?: string;
  website?: string;
  country: string;
  studentCount?: number;
  ranking?: string;
  isActive: boolean;
}

export default function Partners() {
  const { data: partners, isLoading } = useQuery({
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
      <section className="bg-gradient-to-r from-mtendere-blue to-mtendere-green text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Our Trusted Education Partners
            </h1>
            <p className="text-xl mb-8 opacity-90">
              We've partnered with leading educational institutions worldwide to provide you with the best opportunities for your academic and career advancement
            </p>
            <div className="flex justify-center space-x-8 text-sm opacity-80">
              <div className="text-center">
                <div className="text-2xl font-bold">200+</div>
                <div>Universities</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">50+</div>
                <div>Countries</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">10K+</div>
                <div>Students Placed</div>
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
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our flagship partnerships with world-renowned institutions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {/* GBS */}
            <Card className="text-center hover:shadow-xl transition-shadow duration-300 border-2 border-mtendere-blue">
              <CardHeader className="pb-4">
                <div className="w-24 h-24 bg-mtendere-blue rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-3xl font-bold">GBS</span>
                </div>
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
                    <div className="text-sm text-gray-600">Students</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Trophy className="w-5 h-5 text-mtendere-orange mr-1" />
                    </div>
                    <div className="text-2xl font-bold text-mtendere-orange">Top 50</div>
                    <div className="text-sm text-gray-600">Global Ranking</div>
                  </div>
                </div>
                <div className="space-y-2 mb-6">
                  <Badge className="bg-mtendere-blue text-white">MBA Programs</Badge>
                  <Badge className="bg-mtendere-green text-white">Executive Education</Badge>
                  <Badge className="bg-mtendere-orange text-white">Research Programs</Badge>
                </div>
                <Button className="w-full bg-mtendere-blue hover:bg-blue-700">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Learn More
                </Button>
              </CardContent>
            </Card>

            {/* Chandigarh University */}
            <Card className="text-center hover:shadow-xl transition-shadow duration-300 border-2 border-mtendere-green">
              <CardHeader className="pb-4">
                <div className="w-24 h-24 bg-mtendere-green rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl font-bold">CU</span>
                </div>
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
                    <div className="text-sm text-gray-600">Students</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Award className="w-5 h-5 text-mtendere-orange mr-1" />
                    </div>
                    <div className="text-2xl font-bold text-mtendere-orange">NAAC A+</div>
                    <div className="text-sm text-gray-600">Accreditation</div>
                  </div>
                </div>
                <div className="space-y-2 mb-6">
                  <Badge className="bg-mtendere-green text-white">Engineering</Badge>
                  <Badge className="bg-mtendere-blue text-white">Management</Badge>
                  <Badge className="bg-mtendere-orange text-white">Technology</Badge>
                </div>
                <Button className="w-full bg-mtendere-green hover:bg-green-700">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Learn More
                </Button>
              </CardContent>
            </Card>

            {/* International Partners */}
            <Card className="text-center hover:shadow-xl transition-shadow duration-300 border-2 border-mtendere-orange">
              <CardHeader className="pb-4">
                <div className="w-24 h-24 bg-mtendere-orange rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-12 h-12 text-white" />
                </div>
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
                    <div className="text-sm text-gray-600">Countries</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <GraduationCap className="w-5 h-5 text-mtendere-blue mr-1" />
                    </div>
                    <div className="text-2xl font-bold text-mtendere-blue">200+</div>
                    <div className="text-sm text-gray-600">Universities</div>
                  </div>
                </div>
                <div className="space-y-2 mb-6">
                  <Badge className="bg-mtendere-orange text-white">Study Abroad</Badge>
                  <Badge className="bg-mtendere-blue text-white">Exchange Programs</Badge>
                  <Badge className="bg-mtendere-green text-white">Joint Degrees</Badge>
                </div>
                <Button className="w-full bg-mtendere-orange hover:bg-orange-600">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Explore Network
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
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
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
              {partners?.map((partner) => (
                <Card key={partner.id} className="hover:shadow-lg transition-shadow duration-300">
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-mtendere-blue to-mtendere-green rounded-full flex items-center justify-center mx-auto mb-4">
                      {partner.logoUrl ? (
                        <img 
                          src={partner.logoUrl} 
                          alt={partner.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <Building className="w-8 h-8 text-white" />
                      )}
                    </div>
                    <CardTitle className="text-lg text-mtendere-blue">
                      {partner.name}
                    </CardTitle>
                    <CardDescription className="flex items-center justify-center space-x-1">
                      <MapPin className="w-4 h-4" />
                      <span>{partner.country}</span>
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <p className="text-gray-600 mb-4 line-clamp-3">
                      {partner.description}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      {partner.studentCount && (
                        <div className="text-center">
                          <div className="text-lg font-bold text-mtendere-blue">
                            {formatStudentCount(partner.studentCount)}
                          </div>
                          <div className="text-xs text-gray-500">Students</div>
                        </div>
                      )}
                      
                      {partner.ranking && (
                        <div className="text-center">
                          <div className="text-lg font-bold text-mtendere-orange">
                            <Star className="w-4 h-4 inline mr-1" />
                            {partner.ranking}
                          </div>
                          <div className="text-xs text-gray-500">Ranking</div>
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      <Button 
                        className="flex-1 bg-mtendere-blue hover:bg-blue-700"
                        size="sm"
                      >
                        <BookOpen className="w-4 h-4 mr-2" />
                        Programs
                      </Button>
                      
                      {partner.website && (
                        <Button variant="outline" size="sm">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {partners?.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <Building className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                No partners found
              </h3>
              <p className="text-gray-500">
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
            <p className="text-gray-600">
              What our partnerships mean for you
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-mtendere-blue rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-mtendere-blue mb-2">Direct Admission</h3>
              <p className="text-sm text-gray-600">
                Fast-track admission process with our partner institutions
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-mtendere-green rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-mtendere-blue mb-2">Special Discounts</h3>
              <p className="text-sm text-gray-600">
                Exclusive scholarships and fee waivers for Mtendere students
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-mtendere-orange rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-mtendere-blue mb-2">Priority Support</h3>
              <p className="text-sm text-gray-600">
                Dedicated support throughout your application and enrollment process
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
