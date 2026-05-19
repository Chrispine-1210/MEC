import VideoHeader from "@/components/video-header";
import InteractiveCarousel from "@/components/interactive-carousel";
import ExpandingNav from "@/components/expanding-nav";
import Footer from "@/components/footer";
import GovernedImage from "@/components/governed-image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import TeamMemberDialog from "@/components/team-member-dialog";
import TeamPortrait from "@/components/team-portrait";
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
  Star,
  BookOpen
} from "lucide-react";
import type {
  ApiScholarship,
  ApiJob,
  ApiPartner,
  ApiTestimonial,
  ApiBlogPost,
  ApiTeamMember,
} from "@/lib/api-types";
import { getGovernedBackgroundImage } from "@/lib/image-governance";
import { getTeamGroups } from "@/lib/team-display";

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

  const { data: blogPosts } = useQuery<ApiBlogPost[]>({
    queryKey: ["/api/blog-posts"],
    initialData: [],
  });

  const { data: teamMembers = [] } = useQuery<ApiTeamMember[]>({
    queryKey: ["/api/team-members"],
  });

  const activeScholarships = (scholarships || []).filter(
    (item) => item && item.isActive !== false
  );
  const activeJobs = (jobs || []).filter((item) => item && item.isActive !== false);
  const approvedTestimonials = (testimonials || []).filter(
    (item) => item && item.isApproved !== false
  );

  const featuredScholarships = activeScholarships;
  const featuredJobs = activeJobs;
  const featuredTestimonials = approvedTestimonials;
  const testimonialHighlights = featuredTestimonials.slice(0, 3);

  const publishedBlogPosts = (blogPosts || []).filter(
    (post) => post && post.isPublished !== false
  );
  const blogHighlights = publishedBlogPosts.slice(0, 3);

  const teamRoster = getTeamGroups(teamMembers).all;

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
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover the latest scholarships, job openings, and success stories from our community
            </p>
          </div>
          
          <InteractiveCarousel 
            scholarships={featuredScholarships}
            jobs={featuredJobs}
            testimonials={featuredTestimonials}
          />

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            <Card className="border-0 shadow-sm hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center space-y-3">
                <GraduationCap className="w-8 h-8 text-mtendere-blue mx-auto" />
                <p className="font-semibold text-mtendere-blue">Browse Scholarships</p>
                <p className="text-sm text-muted-foreground">
                  Filter by country, field, and deadline.
                </p>
                <Button asChild variant="outline" className="border-mtendere-blue text-mtendere-blue hover:bg-mtendere-blue hover:text-white">
                  <Link href="/scholarships">Explore Scholarships</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center space-y-3">
                <Briefcase className="w-8 h-8 text-mtendere-green mx-auto" />
                <p className="font-semibold text-mtendere-green">Find Job Openings</p>
                <p className="text-sm text-muted-foreground">
                  Fresh roles from trusted partners.
                </p>
                <Button asChild variant="outline" className="border-mtendere-green text-mtendere-green hover:bg-mtendere-green hover:text-white">
                  <Link href="/jobs">View Job Portal</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center space-y-3">
                <Trophy className="w-8 h-8 text-mtendere-orange mx-auto" />
                <p className="font-semibold text-mtendere-orange">Share Your Story</p>
                <p className="text-sm text-muted-foreground">
                  Celebrate wins and inspire others.
                </p>
                <Button asChild variant="outline" className="border-mtendere-orange text-mtendere-orange hover:bg-mtendere-orange hover:text-white">
                  <Link href="/contact">Submit a Success Story</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Blog Section */}
      <section className="py-24 bg-card relative overflow-hidden">
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
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Expert insights, industry news, and comprehensive guides for your educational and career journey
            </p>
          </div>

          {blogHighlights.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {blogHighlights.map((post: any) => (
                <Card key={post.id} className="group flex flex-col h-full hover:shadow-2xl transition-all duration-500 overflow-hidden border-none bg-mtendere-gray/30 backdrop-blur-sm">
                <div className="relative h-64 overflow-hidden">
                  <GovernedImage
                    module="blog"
                    src={post.imageUrl}
                    title={post.title}
                    category={post.category}
                    tags={Array.isArray(post.tags) ? post.tags : []}
                    variant="card"
                    aspectRatio="auto"
                    className="h-full"
                    wrapperClassName="h-full rounded-none shadow-none"
                    imageClassName="group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
                <CardHeader className="relative -mt-12 mx-6 bg-card rounded-xl shadow-lg group-hover:-mt-16 transition-all duration-500 z-20">
                  <div className="flex items-center justify-between mb-3">
                    <Badge className="bg-mtendere-blue hover:bg-mtendere-blue/90">
                      {post.category}
                    </Badge>
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 text-mtendere-orange" />
                      {new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  <CardTitle className="text-xl font-bold text-mtendere-blue line-clamp-2 group-hover:text-mtendere-green transition-colors leading-snug">
                    {post.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-8 pt-6 pb-4 flex-1">
                  <CardDescription className="text-muted-foreground line-clamp-3 leading-relaxed text-base">
                    {post.excerpt || (post.content ? post.content.substring(0, 150) + '...' : 'No content available')}
                  </CardDescription>
                </CardContent>
                <div className="px-8 pb-8 mt-auto">
                  <div className="h-px bg-muted w-full mb-6" />
                  <div className="flex items-center justify-between">
                    <Button asChild variant="link" className="p-0 text-mtendere-blue font-bold h-auto hover:text-mtendere-green transition-colors group/btn">
                      <Link href={`/blog/${post.id}`} className="flex items-center">
                        Read Full Story <span className="ml-2 group-hover/btn:translate-x-1 transition-transform">→</span>
                      </Link>
                    </Button>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground/70">
                      <Heart className="h-4 w-4 text-destructive fill-destructive" />
                      {post.likes || 0}
                    </div>
                  </div>
                </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="mx-auto max-w-2xl border border-dashed border-border/70">
              <CardContent className="py-12 text-center">
                <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
                <p className="text-muted-foreground">Published blog posts from Admin will appear here.</p>
              </CardContent>
            </Card>
          )}
          
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
          backgroundImage: getGovernedBackgroundImage({
            module: "testimonial",
            title: "Student success stories",
            category: "education",
            variant: "hero",
          }),
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-mtendere-dark/93 to-mtendere-blue/85 z-0" />
        <div className="container relative z-10 mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-card/20 text-white border-white/30 px-5 py-1.5 text-xs font-bold uppercase tracking-widest">
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

          {testimonialHighlights.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {testimonialHighlights.map((testimonial) => {
                const rating = Math.max(1, Math.min(5, testimonial.rating || 5));
                const name = testimonial.authorName || "Mtendere Student";

                return (
                  <div key={testimonial.id} className="bg-card/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 hover:bg-card/15 transition-all duration-300 group">
                    <div className="flex items-center gap-1 mb-5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 ${
                            i < rating
                              ? "fill-mtendere-orange text-mtendere-orange"
                              : "text-white/30"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-white/85 italic leading-relaxed mb-6 text-base">"{testimonial.content}"</p>
                    <div className="flex items-center gap-4 pt-4 border-t border-white/20">
                      <GovernedImage
                        module="testimonial"
                        src={testimonial.imageUrl}
                        title={name}
                        variant="profile"
                        aspectRatio="auto"
                        className="h-14 w-14"
                        wrapperClassName="h-full rounded-full border-2 border-mtendere-orange shadow-none"
                      />
                      <div>
                        <div className="font-bold text-white text-lg">{name}</div>
                        <div className="text-sm text-white/70">{testimonial.credential || "Mtendere Graduate"}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mx-auto max-w-2xl rounded-2xl border border-white/20 bg-card/10 p-8 text-center backdrop-blur-sm">
              <p className="text-white/80">Approved testimonials from Admin will appear here.</p>
            </div>
          )}
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
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Our dedicated professionals combine years of experience to help you navigate your global educational path
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            {teamRoster.length > 0 ? (
              <Carousel className="w-full">
                <CarouselContent>
                  {teamRoster.map((member) => (
                    <CarouselItem key={member.id} className="md:basis-1/2 lg:basis-1/3 p-4">
                      <TeamMemberDialog
                        member={member}
                        trigger={
                          <Card className="h-full cursor-pointer text-center transition-all duration-300 hover:shadow-lg group">
                            <CardContent className="flex flex-col items-center p-6">
                              <TeamPortrait
                                member={member}
                                aspectRatio="auto"
                                className="mb-4 h-32 w-32"
                                wrapperClassName="h-full rounded-full border-4 border-white shadow-md transition-all group-hover:border-mtendere-blue/20"
                              />
                              <h3 className="text-xl font-bold text-mtendere-blue transition-colors group-hover:text-mtendere-green">
                                {member.name}
                              </h3>
                              <p className="mb-3 text-mtendere-green font-medium">{member.position}</p>
                              <Button variant="outline" size="sm" className="mt-2 w-full">
                                View Profile
                              </Button>
                            </CardContent>
                          </Card>
                        }
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="hidden md:flex -left-12" />
                <CarouselNext className="hidden md:flex -right-12" />
              </Carousel>
            ) : (
              <Card className="border border-dashed border-border/70">
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  Team profiles will appear here after they are published in Admin.
                </CardContent>
              </Card>
            )}

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-mtendere-blue hover:bg-mtendere-blue/90 font-bold">
                <Link href="/team">Meet the Full Team</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-mtendere-green text-mtendere-green hover:bg-mtendere-green hover:text-white font-bold">
                <Link href="/contact">Book a Consultation</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      <section
        className="py-16 relative overflow-hidden text-white"
        style={{
          backgroundImage: getGovernedBackgroundImage({
            module: "misc",
            title: "Mtendere student outcomes",
            category: "education",
            variant: "hero",
          }),
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
      <section className="py-24 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 text-mtendere-orange border-mtendere-orange px-4 py-1 uppercase tracking-wider text-xs font-bold">
              What We Do
            </Badge>
            <h2 className="text-4xl md:text-5xl font-extrabold text-mtendere-blue mb-4">
              Our Services
            </h2>
            <div className="w-24 h-1.5 bg-mtendere-orange mx-auto mb-8 rounded-full" />
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Comprehensive education and career services designed to open every door for Malawian students
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: GraduationCap,
                color: "text-mtendere-blue",
                bg: "bg-mtendere-blue/10",
                border: "border-mtendere-blue",
                title: "Scholarship Guidance",
                desc: "Expert guidance to help you find and secure fully-funded scholarships from top institutions worldwide.",
                bullets: ["Scholarship search & matching", "Application writing support", "Essay & SOP reviews", "Scholarship interview prep"],
                link: "/scholarships",
                linkText: "Explore Scholarships",
                btnClass: "bg-mtendere-blue hover:bg-mtendere-blue/90 text-white",
              },
              {
                icon: Globe,
                color: "text-mtendere-green",
                bg: "bg-mtendere-green/10",
                border: "border-mtendere-green",
                title: "Study Abroad",
                desc: "Complete support for international education including university selection, visa assistance, and pre-departure preparation.",
                bullets: ["University selection & matching", "Visa application support", "Pre-departure orientation", "Accommodation guidance"],
                link: "/study-abroad",
                linkText: "Start Your Journey",
                btnClass: "bg-mtendere-green hover:bg-mtendere-green/90 text-white",
              },
              {
                icon: Briefcase,
                color: "text-mtendere-orange",
                bg: "bg-mtendere-orange/10",
                border: "border-mtendere-orange",
                title: "Career Placement",
                desc: "Connect with leading employers and find your dream job through our extensive local and international network.",
                bullets: ["Job search & matching", "Interview preparation", "Salary negotiation coaching", "Professional networking"],
                link: "/jobs",
                linkText: "View Job Portal",
                btnClass: "bg-mtendere-orange hover:bg-mtendere-orange/90 text-white",
              },
              {
                icon: Award,
                color: "text-mtendere-blue",
                bg: "bg-mtendere-blue/10",
                border: "border-mtendere-blue",
                title: "University Applications",
                desc: "Expert assistance with applications to top universities worldwide, from school selection to offer acceptance.",
                bullets: ["University shortlisting", "Application timeline management", "Recommendation letter guidance", "Admission interview prep"],
                link: "/university-applications",
                linkText: "Get Application Help",
                btnClass: "bg-mtendere-blue hover:bg-mtendere-blue/90 text-white",
              },
              {
                icon: Trophy,
                color: "text-mtendere-green",
                bg: "bg-mtendere-green/10",
                border: "border-mtendere-green",
                title: "Career Counseling",
                desc: "One-on-one career guidance to help you discover your path, build your strategy, and achieve your professional goals.",
                bullets: ["Career path exploration", "Skills assessment", "Goal setting & planning", "Industry mentorship"],
                link: "/career-counseling",
                linkText: "Book a Session",
                btnClass: "bg-mtendere-green hover:bg-mtendere-green/90 text-white",
              },
              {
                icon: Users,
                color: "text-mtendere-orange",
                bg: "bg-mtendere-orange/10",
                border: "border-mtendere-orange",
                title: "Resume Building",
                desc: "Professional resume writing, LinkedIn optimization, and personal branding to make you stand out to employers.",
                bullets: ["ATS-optimized resume writing", "LinkedIn profile makeover", "Cover letter writing", "Interview coaching"],
                link: "/resume-building",
                linkText: "Upgrade Your Resume",
                btnClass: "bg-mtendere-orange hover:bg-mtendere-orange/90 text-white",
              },
            ].map((s) => (
              <Card key={s.title} className={`hover:shadow-2xl transition-all duration-500 border-t-4 ${s.border} group flex flex-col`}>
                <CardHeader>
                  <div className={`w-14 h-14 ${s.bg} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <s.icon className={`w-7 h-7 ${s.color}`} />
                  </div>
                  <CardTitle className="text-xl text-mtendere-blue font-bold">{s.title}</CardTitle>
                  <CardDescription className="text-muted-foreground leading-relaxed">{s.desc}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-2 mb-6 flex-1">
                    {s.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-2 text-sm text-muted-foreground">
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
          backgroundImage: getGovernedBackgroundImage({
            module: "misc",
            title: "Mtendere future students",
            category: "education",
            variant: "hero",
          }),
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-mtendere-blue/90 to-mtendere-green/85 z-0" />
        <div className="container relative z-10 mx-auto px-4 max-w-3xl">
          <Badge className="mb-5 bg-card/20 text-white border-white/30 px-5 py-1.5 text-xs font-bold uppercase tracking-widest">
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
              <Button size="lg" className="bg-card text-mtendere-blue hover:bg-muted font-bold px-10 py-6 text-lg shadow-2xl transition-all hover:scale-105 rounded-xl">
                Explore Scholarships
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="text-white border-white hover:bg-card/20 font-bold px-10 py-6 text-lg shadow-xl transition-all hover:scale-105 rounded-xl">
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





