import ExpandingNav from "@/components/expanding-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
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
  const { data: teamMembers } = useQuery({
    queryKey: ["/api/team-members"],
  });

  const { data: testimonials } = useQuery({
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
      <section className="bg-gradient-to-r from-mtendere-blue to-mtendere-green text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              About Mtendere Education
            </h1>
            <p className="text-xl md:text-2xl mb-8 opacity-90">
              Empowering students worldwide to achieve their educational dreams and career aspirations through personalized guidance and global opportunities
            </p>
            <div className="flex justify-center">
              <Button asChild size="lg" className="bg-mtendere-orange hover:bg-orange-600">
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
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-mtendere-blue mb-4">
              Meet Our Team
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Dedicated professionals committed to your success
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {teamMembers?.slice(0, 6).map((member) => (
              <Card key={member.id} className="text-center hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden bg-gradient-to-br from-mtendere-blue to-mtendere-green">
                    {member.imageUrl ? (
                      <img 
                        src={member.imageUrl} 
                        alt={member.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Users className="w-12 h-12 text-white" />
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-xl text-mtendere-blue">
                    {member.name}
                  </CardTitle>
                  <CardDescription className="text-mtendere-green font-medium">
                    {member.position}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {member.bio}
                  </p>
                  <div className="flex justify-center space-x-2">
                    {member.linkedin && (
                      <Button variant="ghost" size="sm">
                        <Linkedin className="w-4 h-4" />
                      </Button>
                    )}
                    {member.twitter && (
                      <Button variant="ghost" size="sm">
                        <Twitter className="w-4 h-4" />
                      </Button>
                    )}
                    {member.email && (
                      <Button variant="ghost" size="sm">
                        <Mail className="w-4 h-4" />
                      </Button>
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
      <section className="py-16 bg-gradient-to-r from-mtendere-blue to-mtendere-green text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Start Your Journey?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of students who have transformed their lives with Mtendere
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-mtendere-orange hover:bg-orange-600">
              <Link href="/register">
                Get Started Now
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-mtendere-blue">
              <Link href="/contact">
                Contact Us
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
