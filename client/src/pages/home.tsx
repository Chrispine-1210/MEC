import VideoHeader from "@/components/video-header";
import InteractiveCarousel from "@/components/interactive-carousel";
import ExpandingNav from "@/components/expanding-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  GraduationCap, 
  Briefcase, 
  Globe, 
  Bus, 
  Handshake, 
  BarChart3,
  Users,
  Trophy,
  Award,
  MapPin,
  Phone,
  Mail,
  Facebook,
  Twitter,
  Linkedin,
  Instagram
} from "lucide-react";

export default function Home() {
  const { data: scholarships } = useQuery({
    queryKey: ["/api/scholarships"],
  });

  const { data: jobs } = useQuery({
    queryKey: ["/api/jobs"],
  });

  const { data: partners } = useQuery({
    queryKey: ["/api/partners"],
  });

  const { data: testimonials } = useQuery({
    queryKey: ["/api/testimonials"],
  });

  return (
    <div className="min-h-screen bg-background">
      <ExpandingNav />
      
      <VideoHeader />

      {/* Featured Content Carousel */}
      <section className="py-16 bg-mtendere-gray">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-mtendere-blue mb-4">
              Featured Opportunities
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Discover the latest scholarships, job openings, and success stories from our community
            </p>
          </div>
          
          <InteractiveCarousel 
            scholarships={scholarships || []}
            jobs={jobs || []}
            testimonials={testimonials || []}
          />
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-mtendere-blue mb-4">
              Our Services
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Comprehensive education and career consulting services tailored to your needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="text-4xl text-mtendere-blue mb-4">
                  <GraduationCap />
                </div>
                <CardTitle className="text-xl text-mtendere-blue">
                  Scholarship Guidance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  Expert guidance to help you find and secure scholarships from top institutions worldwide.
                </CardDescription>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>• Scholarship search and matching</li>
                  <li>• Application assistance</li>
                  <li>• Essay writing support</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="text-4xl text-mtendere-green mb-4">
                  <Briefcase />
                </div>
                <CardTitle className="text-xl text-mtendere-blue">
                  Career Placement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  Connect with leading employers and find your dream job through our extensive network.
                </CardDescription>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>• Job matching services</li>
                  <li>• Interview preparation</li>
                  <li>• Career counseling</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="text-4xl text-mtendere-orange mb-4">
                  <Globe />
                </div>
                <CardTitle className="text-xl text-mtendere-blue">
                  Study Abroad
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  Complete support for international education including visa assistance and cultural preparation.
                </CardDescription>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>• University selection</li>
                  <li>• Visa processing</li>
                  <li>• Pre-departure training</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="text-4xl text-mtendere-blue mb-4">
                  <Bus />
                </div>
                <CardTitle className="text-xl text-mtendere-blue">
                  Professional Development
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  Enhance your skills and advance your career with our professional development programs.
                </CardDescription>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>• Skill assessment</li>
                  <li>• Training programs</li>
                  <li>• Certification guidance</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="text-4xl text-mtendere-green mb-4">
                  <Handshake />
                </div>
                <CardTitle className="text-xl text-mtendere-blue">
                  Partnership Programs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  Exclusive partnerships with leading institutions like GBS and Chandigarh University.
                </CardDescription>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>• Direct admission programs</li>
                  <li>• Special discounts</li>
                  <li>• Fast-track processing</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="text-4xl text-mtendere-orange mb-4">
                  <BarChart3 />
                </div>
                <CardTitle className="text-xl text-mtendere-blue">
                  Analytics & Tracking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  Track your applications and progress with our comprehensive analytics dashboard.
                </CardDescription>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>• Application tracking</li>
                  <li>• Progress monitoring</li>
                  <li>• Performance insights</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="py-16 bg-mtendere-gray">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-mtendere-blue mb-4">
              Our Partners
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Trusted partnerships with leading educational institutions worldwide
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="w-20 h-20 bg-mtendere-blue rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl font-bold">GBS</span>
                </div>
                <CardTitle className="text-xl text-mtendere-blue">
                  Global Business School
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  Premier business education with international recognition and industry connections.
                </CardDescription>
                <div className="flex justify-center space-x-4 text-sm text-gray-500">
                  <span className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    5000+ Students
                  </span>
                  <span className="flex items-center">
                    <Trophy className="w-4 h-4 mr-1" />
                    Top Rankings
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="w-20 h-20 bg-mtendere-green rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-lg font-bold">CU</span>
                </div>
                <CardTitle className="text-xl text-mtendere-blue">
                  Chandigarh University
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  Leading university offering diverse programs with excellent placement records.
                </CardDescription>
                <div className="flex justify-center space-x-4 text-sm text-gray-500">
                  <span className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    30,000+ Students
                  </span>
                  <span className="flex items-center">
                    <Award className="w-4 h-4 mr-1" />
                    NAAC A+
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="w-20 h-20 bg-mtendere-orange rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-lg font-bold">IP</span>
                </div>
                <CardTitle className="text-xl text-mtendere-blue">
                  International Partners
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  Network of global universities and institutions for diverse educational opportunities.
                </CardDescription>
                <div className="flex justify-center space-x-4 text-sm text-gray-500">
                  <span className="flex items-center">
                    <Globe className="w-4 h-4 mr-1" />
                    50+ Countries
                  </span>
                  <span className="flex items-center">
                    <GraduationCap className="w-4 h-4 mr-1" />
                    200+ Unis
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-mtendere-blue to-mtendere-green text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Start Your Journey?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of students who have transformed their careers with Mtendere
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-mtendere-orange hover:bg-orange-600">
              <Link href="/scholarships">
                Explore Scholarships
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-mtendere-blue">
              <Link href="/jobs">
                Find Jobs
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-mtendere-dark text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="font-bold text-2xl mb-4">
                Mtendere <span className="text-mtendere-orange">Education</span>
              </div>
              <p className="text-gray-400 mb-4">
                Your trusted partner in education and career development. Connecting dreams with opportunities worldwide.
              </p>
              <div className="flex space-x-4">
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-mtendere-blue">
                  <Facebook className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-mtendere-blue">
                  <Twitter className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-mtendere-blue">
                  <Linkedin className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-mtendere-blue">
                  <Instagram className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-4">Quick Links</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/" className="hover:text-mtendere-blue transition-colors">Home</Link></li>
                <li><Link href="/about" className="hover:text-mtendere-blue transition-colors">About Us</Link></li>
                <li><Link href="/scholarships" className="hover:text-mtendere-blue transition-colors">Scholarships</Link></li>
                <li><Link href="/jobs" className="hover:text-mtendere-blue transition-colors">Jobs</Link></li>
                <li><Link href="/partners" className="hover:text-mtendere-blue transition-colors">Partners</Link></li>
                <li><Link href="/contact" className="hover:text-mtendere-blue transition-colors">Contact</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-4">Services</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/scholarships" className="hover:text-mtendere-blue transition-colors">Scholarships</Link></li>
                <li><Link href="/jobs" className="hover:text-mtendere-blue transition-colors">Job Portal</Link></li>
                <li><Link href="/about" className="hover:text-mtendere-blue transition-colors">Study Abroad</Link></li>
                <li><Link href="/about" className="hover:text-mtendere-blue transition-colors">Career Counseling</Link></li>
                <li><Link href="/about" className="hover:text-mtendere-blue transition-colors">Professional Development</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-4">Contact Info</h3>
              <div className="space-y-3 text-gray-400">
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-mtendere-blue" />
                  <span>123 Education Street, City, Country</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-mtendere-blue" />
                  <span>+1 (555) 123-4567</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-mtendere-blue" />
                  <span>info@mtendere.com</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Mtendere Education Consultants. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
