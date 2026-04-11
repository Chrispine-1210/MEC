import ExpandingNav from "@/components/expanding-nav";
import Footer from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { ApiTeamMember, ApiTestimonial } from "@/lib/api-types";
import { 
  Target, 
  Eye, 
  Heart, 
  Award, 
  Users, 
  Globe,
  Linkedin,
  Twitter,
  Mail,
  Phone,
  MapPin,
  Calendar,
  TrendingUp
} from "lucide-react";

export default function About() {
  const { data: teamMembers } = useQuery<ApiTeamMember[]>({
    queryKey: ["/api/team-members"],
  });

  const { data: testimonials } = useQuery<ApiTestimonial[]>({
    queryKey: ["/api/testimonials"],
  });

  const stats = [
    { icon: Users, label: "Students Helped", value: "10,000+", color: "text-mtendere-blue" },
    { icon: Award, label: "Scholarships Secured", value: "5,000+", color: "text-mtendere-green" },
    { icon: Globe, label: "Countries Reached", value: "50+", color: "text-mtendere-orange" },
    { icon: TrendingUp, label: "Success Rate", value: "95%", color: "text-mtendere-blue" },
  ];

  const values = [
    {
      icon: Target,
      title: "Excellence",
      description: "We strive for excellence in everything we do, ensuring the highest quality of service and support for our students.",
    },
    {
      icon: Heart,
      title: "Integrity",
      description: "We operate with honesty, transparency, and ethical practices in all our interactions and partnerships.",
    },
    {
      icon: Globe,
      title: "Global Perspective",
      description: "We embrace diversity and provide opportunities for students to gain international exposure and experience.",
    },
    {
      icon: Users,
      title: "Student-Centric",
      description: "Every decision we make is focused on providing the best possible outcomes for our students' educational journeys.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <ExpandingNav />
      
      {/* Hero Section */}
      <section 
        className="relative py-28 text-white overflow-hidden"
        style={ {
          backgroundImage: `url(${'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=2000'})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        } }
      >
        <div className="absolute inset-0 bg-gradient-to-r from-mtendere-blue/80 to-mtendere-green/80 z-0" />
        <div className="container relative z-10 mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 drop-shadow-2xl">
              About Mtendere Education
            </h1>
            <p className="text-xl md:text-3xl mb-10 opacity-95 drop-shadow-lg leading-relaxed">
              Empowering students worldwide to achieve their educational dreams and career aspirations through personalized guidance and global opportunities
            </p>
            <div className="flex justify-center">
              <Button asChild size="lg" className="bg-mtendere-orange hover:bg-orange-600 shadow-xl transition-all hover:scale-105 px-8">
                <Link href="/contact">
                  Get Started Today
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className={`w-16 h-16 ${stat.color} mx-auto mb-4 flex items-center justify-center bg-gray-50 rounded-full`}>
                  <stat.icon className="w-8 h-8" />
                </div>
                <div className="text-3xl font-bold text-mtendere-blue mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 bg-mtendere-gray">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-mtendere-blue mb-4">
                Our Mission & Vision
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Driving change in global education through innovation, accessibility, and excellence
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="w-12 h-12 bg-mtendere-blue rounded-full flex items-center justify-center mb-4">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-2xl text-mtendere-blue">Our Mission</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 leading-relaxed">
                    To democratize access to quality education by connecting students with the best educational 
                    opportunities worldwide. We provide comprehensive guidance, support, and resources to help 
                    students navigate their educational journey and achieve their career goals.
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="w-12 h-12 bg-mtendere-green rounded-full flex items-center justify-center mb-4">
                    <Eye className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-2xl text-mtendere-blue">Our Vision</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 leading-relaxed">
                    To be the world's leading education consultancy, recognized for our commitment to student 
                    success, innovation in educational services, and our role in shaping the future of global 
                    education through technology and personalized guidance.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-mtendere-blue mb-4">
                Our Story
              </h2>
              <p className="text-lg text-gray-600">
                From humble beginnings to global impact
              </p>
            </div>

            <div className="prose prose-lg max-w-none text-gray-600">
              <p className="text-lg leading-relaxed mb-6">
                Mtendere Education Consultants was founded with a simple yet powerful vision: to make quality 
                education accessible to every student, regardless of their background or location. What started 
                as a small initiative to help local students find scholarship opportunities has grown into a 
                comprehensive global platform.
              </p>

              <p className="text-lg leading-relaxed mb-6">
                Our founders, experienced educators and career counselors, recognized the challenges students 
                face in navigating the complex landscape of higher education. They saw the need for a personalized, 
                technology-driven approach that could scale to help thousands of students worldwide.
              </p>

              <p className="text-lg leading-relaxed mb-6">
                Today, Mtendere serves as a bridge between ambitious students and world-class educational 
                institutions. Through our partnerships with universities like GBS and Chandigarh University, 
                and our innovative platform, we've helped over 10,000 students achieve their educational goals.
              </p>

              <p className="text-lg leading-relaxed">
                Our commitment extends beyond just placement – we provide ongoing support, career guidance, 
                and a community where students can thrive and grow throughout their educational journey.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 bg-mtendere-gray">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-mtendere-blue mb-4">
              Our Values
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="w-16 h-16 bg-mtendere-blue rounded-full flex items-center justify-center mx-auto mb-4">
                    <value.icon className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-xl text-mtendere-blue">
                    {value.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {value.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section id="team" className="py-24 bg-white relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-mtendere-blue/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 text-mtendere-blue border-mtendere-blue px-4 py-1 uppercase tracking-wider text-xs font-bold">
              Our Experts
            </Badge>
            <h2 className="text-4xl md:text-5xl font-extrabold text-mtendere-blue mb-6 tracking-tight">
              Meet Our <span className="text-mtendere-green">Dedicated Team</span>
            </h2>
            <div className="w-24 h-1.5 bg-mtendere-orange mx-auto mb-8 rounded-full" />
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Highly qualified professionals committed to providing you with the best educational and career guidance
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {teamMembers?.map((member) => (
              <Card key={member.id} className="text-center group hover:shadow-2xl transition-all duration-500 border-none bg-mtendere-gray/30 backdrop-blur-sm overflow-hidden">
                <CardHeader className="pt-10">
                  <div className="relative w-40 h-40 mx-auto mb-6">
                    <div className="absolute inset-0 bg-gradient-to-br from-mtendere-blue to-mtendere-green rounded-full rotate-6 group-hover:rotate-12 transition-transform duration-500 scale-105 opacity-20" />
                    <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-white shadow-xl group-hover:border-mtendere-blue/20 transition-all duration-500">
                      {member.imageUrl ? (
                        <img 
                          src={member.imageUrl} 
                          alt={member.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-mtendere-gray">
                          <Users className="w-20 h-20 text-mtendere-blue/20" />
                        </div>
                      )}
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold text-mtendere-blue group-hover:text-mtendere-green transition-colors">
                    {member.name}
                  </CardTitle>
                  <CardDescription className="text-mtendere-orange font-bold uppercase tracking-wider text-xs">
                    {member.position}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-8 pb-10">
                  <div className="h-px bg-mtendere-blue/10 w-full mb-6" />
                  <p className="text-gray-600 leading-relaxed mb-8 line-clamp-4 italic text-base">
                    "{member.bio}"
                  </p>
                  <div className="flex justify-center gap-4">
                    {member.linkedin && (
                      <a href={member.linkedin} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="icon" className="rounded-full hover:bg-mtendere-blue hover:text-white transition-all">
                          <Linkedin className="w-4 h-4" />
                        </Button>
                      </a>
                    )}
                    {member.twitter && (
                      <a href={member.twitter} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="icon" className="rounded-full hover:bg-blue-400 hover:text-white transition-all">
                          <Twitter className="w-4 h-4" />
                        </Button>
                      </a>
                    )}
                    {member.email && (
                      <a href={`mailto:${member.email}`}>
                        <Button variant="outline" size="icon" className="rounded-full hover:bg-red-500 hover:text-white transition-all">
                          <Mail className="w-4 h-4" />
                        </Button>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {(!teamMembers || teamMembers.length === 0) && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Team information will be available soon.</p>
            </div>
          )}
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-mtendere-gray">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-mtendere-blue mb-4">
              What Our Students Say
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Success stories from students who achieved their dreams with Mtendere
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials?.slice(0, 6).map((testimonial) => (
              <Card key={testimonial.id} className="hover:shadow-lg transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Award
                        key={i}
                        className={`w-4 h-4 ${i < testimonial.rating ? 'text-mtendere-orange fill-current' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-4 italic">
                    "{testimonial.content}"
                  </p>
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-mtendere-blue to-mtendere-green flex items-center justify-center mr-3">
                      {testimonial.imageUrl ? (
                        <img 
                          src={testimonial.imageUrl} 
                          alt="Student"
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <Users className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-mtendere-blue">Student</div>
                      <div className="text-sm text-gray-500">Mtendere Graduate</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {(!testimonials || testimonials.length === 0) && (
            <div className="text-center py-12">
              <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Student testimonials will be available soon.</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section 
        className="relative py-24 text-white overflow-hidden"
        style={ {
          backgroundImage: `url(${'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&q=80&w=2000'})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        } }
      >
        <div className="absolute inset-0 bg-gradient-to-r from-mtendere-blue/90 to-mtendere-green/90 z-0" />
        <div className="container relative z-10 mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 drop-shadow-2xl">
            Ready to Start Your Journey?
          </h2>
          <p className="text-xl md:text-2xl mb-10 opacity-95 drop-shadow-lg max-w-2xl mx-auto">
            Join thousands of students who have transformed their lives with Mtendere
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Button asChild size="lg" className="bg-mtendere-orange hover:bg-orange-600 shadow-xl transition-all hover:scale-105 px-8">
              <Link href="/register">
                Get Started Now
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/10 shadow-xl transition-all hover:scale-105 px-8">
              <Link href="/contact">
                Contact Us
              </Link>
            </Button>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
