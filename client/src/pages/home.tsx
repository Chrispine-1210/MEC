import VideoHeader from "@/components/video-header";
import InteractiveCarousel from "@/components/interactive-carousel";
import ExpandingNav from "@/components/expanding-nav";
import Footer from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
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
  Instagram,
  Calendar,
  Heart,
  Star
} from "lucide-react";
import type {
  ApiScholarship,
  ApiJob,
  ApiPartner,
  ApiTestimonial,
  ApiTeamMember,
  ApiBlogPost,
} from "@/lib/api-types";

import logoImg from "@assets/mtendere-logo.svg";

export default function Home() {
  const { data: scholarships } = useQuery<ApiScholarship[]>({
    queryKey: ["/api/scholarships"],
  });

  const { data: jobs } = useQuery<ApiJob[]>({
    queryKey: ["/api/jobs"],
  });

  const { data: partners } = useQuery<ApiPartner[]>({
    queryKey: ["/api/partners"],
  });

  const { data: testimonials } = useQuery<ApiTestimonial[]>({
    queryKey: ["/api/testimonials"],
    initialData: [],
  });

  const { data: teamMembers } = useQuery<ApiTeamMember[]>({
    queryKey: ["/api/team-members"],
    initialData: [],
  });

  const { data: blogPosts } = useQuery<ApiBlogPost[]>({
    queryKey: ["/api/blog-posts"],
    initialData: [],
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

      {/* Blog Section */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-mtendere-blue/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-mtendere-green/5 rounded-full -ml-48 -mb-48 blur-3xl" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 text-mtendere-blue border-mtendere-blue px-4 py-1 uppercase tracking-wider text-xs font-bold">
              Insights & Updates
            </Badge>
            <h2 className="text-4xl md:text-5xl font-extrabold text-mtendere-blue mb-6 tracking-tight">
              Latest from our <span className="text-mtendere-green">Blog</span>
            </h2>
            <div className="w-24 h-1.5 bg-mtendere-orange mx-auto mb-8 rounded-full" />
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Expert insights, industry news, and comprehensive guides for your educational and career journey
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {blogPosts?.slice(0, 3).map((post: any) => (
              <Card key={post.id} className="group flex flex-col h-full hover:shadow-2xl transition-all duration-500 overflow-hidden border-none bg-mtendere-gray/30 backdrop-blur-sm">
                <div className="relative h-64 overflow-hidden">
                  <div 
                    className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-700"
                    style={ { backgroundImage: `url(${post.imageUrl || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=800'})` } }
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
                <CardHeader className="relative -mt-12 mx-6 bg-white rounded-xl shadow-lg group-hover:-mt-16 transition-all duration-500 z-20">
                  <div className="flex items-center justify-between mb-3">
                    <Badge className="bg-mtendere-blue hover:bg-mtendere-blue/90">
                      {post.category}
                    </Badge>
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                      <Calendar className="h-3.5 w-3.5 text-mtendere-orange" />
                      {new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  <CardTitle className="text-xl font-bold text-mtendere-blue line-clamp-2 group-hover:text-mtendere-green transition-colors leading-snug">
                    {post.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-8 pt-6 pb-4 flex-1">
                  <CardDescription className="text-gray-600 line-clamp-3 leading-relaxed text-base">
                    {post.excerpt || (post.content ? post.content.substring(0, 150) + '...' : 'No content available')}
                  </CardDescription>
                </CardContent>
                <div className="px-8 pb-8 mt-auto">
                  <div className="h-px bg-gray-100 w-full mb-6" />
                  <div className="flex items-center justify-between">
                    <Button asChild variant="link" className="p-0 text-mtendere-blue font-bold h-auto hover:text-mtendere-green transition-colors group/btn">
                      <Link href={`/blog/${post.id}`} className="flex items-center">
                        Read Full Story <span className="ml-2 group-hover/btn:translate-x-1 transition-transform">→</span>
                      </Link>
                    </Button>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-400">
                      <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                      {post.likes || 0}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-20">
            <Button asChild size="lg" className="bg-mtendere-blue hover:bg-mtendere-blue/90 shadow-xl px-10 py-6 rounded-full text-lg font-bold transition-all hover:scale-105">
              <Link href="/blog">View All Articles</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section
        className="py-24 text-white relative overflow-hidden"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&q=80&w=2000')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-mtendere-dark/93 to-mtendere-blue/85 z-0" />
        <div className="container relative z-10 mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-white/20 text-white border-white/30 px-5 py-1.5 text-xs font-bold uppercase tracking-widest">
              Student Success Stories
            </Badge>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4 drop-shadow-lg">
              Lives We've <span className="text-mtendere-orange">Transformed</span>
            </h2>
            <div className="w-24 h-1.5 bg-mtendere-orange mx-auto mb-8 rounded-full" />
            <p className="text-xl opacity-90 max-w-2xl mx-auto font-semibold drop-shadow">
              Hear from the thousands of students who have achieved their dreams through Mtendere Education
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: "Chipo Mwale",
                role: "Oxford University Scholar",
                country: "🇬🇧 United Kingdom",
                text: "Mtendere's guidance was transformational. They helped me secure a full scholarship to Oxford — something I never thought possible. From the application essay to visa preparation, they supported me every step of the way.",
                img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200",
              },
              {
                name: "Kondwani Banda",
                role: "DAAD Scholar — TU Munich",
                country: "🇩🇪 Germany",
                text: "I was rejected from three universities before finding Mtendere. They completely rewrote my applications, coached me for interviews, and I'm now completing my Master's degree at one of Germany's best technical universities.",
                img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
              },
              {
                name: "Grace Phiri",
                role: "Chevening Scholar",
                country: "🇬🇧 United Kingdom",
                text: "The resume and personal statement services at Mtendere are world-class. My Chevening application was completely transformed by their expert guidance. Now I'm living my dream in London!",
                img: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200",
              },
            ].map((t) => (
              <div key={t.name} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 hover:bg-white/15 transition-all duration-300 group">
                <div className="flex items-center gap-1 mb-5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-mtendere-orange text-mtendere-orange" />
                  ))}
                </div>
                <p className="text-gray-100 italic leading-relaxed mb-6 text-base">"{t.text}"</p>
                <div className="flex items-center gap-4 pt-4 border-t border-white/20">
                  <img src={t.img} alt={t.name} className="w-14 h-14 rounded-full object-cover border-2 border-mtendere-orange" />
                  <div>
                    <div className="font-bold text-white text-lg">{t.name}</div>
                    <div className="text-sm text-gray-300">{t.role}</div>
                    <div className="text-xs text-mtendere-orange font-semibold mt-0.5">{t.country}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section id="team" className="py-24 bg-mtendere-gray/40 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 text-mtendere-green border-mtendere-green px-4 py-1 uppercase tracking-wider text-xs font-bold">
              Expert Team
            </Badge>
            <h2 className="text-4xl md:text-5xl font-extrabold text-mtendere-blue mb-6 tracking-tight">
              Meet Our <span className="text-mtendere-orange">Advisors</span>
            </h2>
            <div className="w-24 h-1.5 bg-mtendere-blue mx-auto mb-8 rounded-full" />
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Our dedicated professionals combine years of experience to help you navigate your global educational path
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            <Carousel className="w-full">
              <CarouselContent>
                {teamMembers?.map((member: any) => (
                  <CarouselItem key={member.id} className="md:basis-1/2 lg:basis-1/3 p-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Card className="text-center hover:shadow-lg transition-all duration-300 cursor-pointer group h-full">
                          <CardContent className="p-6 flex flex-col items-center">
                            <Avatar className="w-32 h-32 mb-4 border-4 border-white shadow-md group-hover:border-mtendere-blue/20 transition-all">
                              <AvatarImage src={member.imageUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400'} alt={member.name || 'Team Member'} />
                              <AvatarFallback>{member.name ? member.name[0] : 'U'}</AvatarFallback>
                            </Avatar>
                            <h3 className="text-xl font-bold text-mtendere-blue group-hover:text-mtendere-green transition-colors">{member.name || 'Anonymous'}</h3>
                            <p className="text-mtendere-green font-medium mb-3">{member.position}</p>
                            <Button variant="outline" size="sm" className="w-full mt-2">View Profile</Button>
                          </CardContent>
                        </Card>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                          <div className="flex flex-col items-center gap-4 py-4">
                            <Avatar className="w-32 h-32 border-4 border-mtendere-blue/10">
                              <AvatarImage src={member.imageUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400'} alt={member.name || 'Team Member'} />
                              <AvatarFallback>{member.name ? member.name[0] : 'U'}</AvatarFallback>
                            </Avatar>
                            <div className="text-center">
                              <DialogTitle className="text-2xl font-bold text-mtendere-blue">{member.name || 'Anonymous'}</DialogTitle>
                              <p className="text-mtendere-green font-semibold">{member.position}</p>
                            </div>
                          </div>
                        </DialogHeader>
                        <div className="py-4">
                          <h4 className="font-semibold text-mtendere-blue mb-2">Biography</h4>
                          <p className="text-gray-600 leading-relaxed italic">
                            "{member.bio || "No biography available."}"
                          </p>
                        </div>
                        <div className="flex flex-col gap-3">
                          <div className="flex justify-center space-x-6">
                            {member.linkedin && (
                              <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600 transition-colors">
                                <Linkedin className="w-6 h-6" />
                              </a>
                            )}
                            {member.twitter && (
                              <a href={member.twitter} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-400 transition-colors">
                                <Twitter className="w-6 h-6" />
                              </a>
                            )}
                            {member.email && (
                              <a href={`mailto:${member.email}`} className="text-gray-400 hover:text-red-500 transition-colors">
                                <Mail className="w-6 h-6" />
                              </a>
                            )}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden md:flex -left-12" />
              <CarouselNext className="hidden md:flex -right-12" />
            </Carousel>
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      <section
        className="py-16 relative overflow-hidden text-white"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=2000')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-mtendere-blue/90 to-mtendere-green/88 z-0" />
        <div className="container relative z-10 mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto text-center">
            {[
              { value: "200+", label: "Partner Universities", icon: Trophy },
              { value: "50+", label: "Countries Reached", icon: Globe },
              { value: "10K+", label: "Students Helped", icon: Users },
              { value: "95%", label: "Success Rate", icon: Award },
            ].map((s) => (
              <div key={s.label} className="group">
                <div className="flex items-center justify-center mb-2">
                  <s.icon className="w-8 h-8 text-mtendere-orange group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-4xl md:text-5xl font-extrabold drop-shadow-lg mb-1">{s.value}</div>
                <div className="text-sm font-semibold opacity-90 uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 text-mtendere-orange border-mtendere-orange px-4 py-1 uppercase tracking-wider text-xs font-bold">
              What We Do
            </Badge>
            <h2 className="text-4xl md:text-5xl font-extrabold text-mtendere-blue mb-4">
              Our Services
            </h2>
            <div className="w-24 h-1.5 bg-mtendere-orange mx-auto mb-8 rounded-full" />
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Comprehensive education and career services designed to open every door for Malawian students
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: GraduationCap,
                color: "text-mtendere-blue",
                bg: "bg-blue-50",
                border: "border-mtendere-blue",
                title: "Scholarship Guidance",
                desc: "Expert guidance to help you find and secure fully-funded scholarships from top institutions worldwide.",
                bullets: ["Scholarship search & matching", "Application writing support", "Essay & SOP reviews", "Scholarship interview prep"],
                link: "/scholarships",
                linkText: "Explore Scholarships",
                btnClass: "bg-mtendere-blue hover:bg-blue-700 text-white",
              },
              {
                icon: Globe,
                color: "text-mtendere-green",
                bg: "bg-green-50",
                border: "border-mtendere-green",
                title: "Study Abroad",
                desc: "Complete support for international education including university selection, visa assistance, and pre-departure preparation.",
                bullets: ["University selection & matching", "Visa application support", "Pre-departure orientation", "Accommodation guidance"],
                link: "/study-abroad",
                linkText: "Start Your Journey",
                btnClass: "bg-mtendere-green hover:bg-green-700 text-white",
              },
              {
                icon: Briefcase,
                color: "text-mtendere-orange",
                bg: "bg-orange-50",
                border: "border-mtendere-orange",
                title: "Career Placement",
                desc: "Connect with leading employers and find your dream job through our extensive local and international network.",
                bullets: ["Job search & matching", "Interview preparation", "Salary negotiation coaching", "Professional networking"],
                link: "/jobs",
                linkText: "View Job Portal",
                btnClass: "bg-mtendere-orange hover:bg-orange-600 text-white",
              },
              {
                icon: Award,
                color: "text-mtendere-blue",
                bg: "bg-blue-50",
                border: "border-mtendere-blue",
                title: "University Applications",
                desc: "Expert assistance with applications to top universities worldwide, from school selection to offer acceptance.",
                bullets: ["University shortlisting", "Application timeline management", "Recommendation letter guidance", "Admission interview prep"],
                link: "/university-applications",
                linkText: "Get Application Help",
                btnClass: "bg-mtendere-blue hover:bg-blue-700 text-white",
              },
              {
                icon: Trophy,
                color: "text-mtendere-green",
                bg: "bg-green-50",
                border: "border-mtendere-green",
                title: "Career Counseling",
                desc: "One-on-one career guidance to help you discover your path, build your strategy, and achieve your professional goals.",
                bullets: ["Career path exploration", "Skills assessment", "Goal setting & planning", "Industry mentorship"],
                link: "/career-counseling",
                linkText: "Book a Session",
                btnClass: "bg-mtendere-green hover:bg-green-700 text-white",
              },
              {
                icon: Users,
                color: "text-mtendere-orange",
                bg: "bg-orange-50",
                border: "border-mtendere-orange",
                title: "Resume Building",
                desc: "Professional resume writing, LinkedIn optimization, and personal branding to make you stand out to employers.",
                bullets: ["ATS-optimized resume writing", "LinkedIn profile makeover", "Cover letter writing", "Interview coaching"],
                link: "/resume-building",
                linkText: "Upgrade Your Resume",
                btnClass: "bg-mtendere-orange hover:bg-orange-600 text-white",
              },
            ].map((s) => (
              <Card key={s.title} className={`hover:shadow-2xl transition-all duration-500 border-t-4 ${s.border} group flex flex-col`}>
                <CardHeader>
                  <div className={`w-14 h-14 ${s.bg} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <s.icon className={`w-7 h-7 ${s.color}`} />
                  </div>
                  <CardTitle className="text-xl text-mtendere-blue font-bold">{s.title}</CardTitle>
                  <CardDescription className="text-gray-600 leading-relaxed">{s.desc}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-2 mb-6 flex-1">
                    {s.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="w-1.5 h-1.5 bg-mtendere-orange rounded-full flex-shrink-0" />
                        {b}
                      </li>
                    ))}
                  </ul>
                  <Button asChild className={`w-full font-bold ${s.btnClass}`}>
                    <Link href={s.link}>{s.linkText}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section
        className="py-24 relative overflow-hidden text-white text-center"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&q=80&w=2000')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-mtendere-blue/90 to-mtendere-green/85 z-0" />
        <div className="container relative z-10 mx-auto px-4 max-w-3xl">
          <Badge className="mb-5 bg-white/20 text-white border-white/30 px-5 py-1.5 text-xs font-bold uppercase tracking-widest">
            Your Journey Starts Now
          </Badge>
          <h2 className="text-4xl md:text-6xl font-extrabold mb-6 drop-shadow-lg leading-tight">
            Ready to Transform<br/>Your Future?
          </h2>
          <p className="text-xl md:text-2xl mb-10 opacity-95 drop-shadow font-semibold max-w-xl mx-auto leading-relaxed">
            Join 10,000+ students who have achieved their dreams through Mtendere Education Consult
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/scholarships">
              <Button size="lg" className="bg-white text-mtendere-blue hover:bg-gray-100 font-bold px-10 py-6 text-lg shadow-2xl transition-all hover:scale-105 rounded-xl">
                Explore Scholarships
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/20 font-bold px-10 py-6 text-lg shadow-xl transition-all hover:scale-105 rounded-xl">
                Contact an Advisor
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
