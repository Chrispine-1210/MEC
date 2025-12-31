import { useState } from "react";
import ExpandingNav from "@/components/expanding-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Send,
  MessageCircle,
  Users,
  Globe,
  Loader2
} from "lucide-react";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    inquiryType: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Simulate form submission
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Message Sent Successfully",
        description: "Thank you for contacting us. We'll get back to you within 24 hours.",
      });

      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
        inquiryType: "",
      });
    } catch (error) {
      toast({
        title: "Failed to Send Message",
        description: "Please try again or contact us directly via phone or email.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const contactInfo = [
    {
      icon: MapPin,
      title: "Visit Our Office",
      details: ["123 Education Street", "City, State 12345", "Country"],
      color: "text-mtendere-blue",
    },
    {
      icon: Phone,
      title: "Call Us",
      details: ["+1 (555) 123-4567", "+1 (555) 123-4568", "Mon-Fri: 9AM-6PM"],
      color: "text-mtendere-green",
    },
    {
      icon: Mail,
      title: "Email Us",
      details: ["info@mtendere.com", "support@mtendere.com", "admissions@mtendere.com"],
      color: "text-mtendere-orange",
    },
  ];

  const inquiryTypes = [
    "General Inquiry",
    "Scholarship Information",
    "Job Opportunities",
    "Partnership",
    "Technical Support",
    "Complaint/Feedback",
  ];

  return (
    <div className="min-h-screen bg-background">
      <ExpandingNav />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-mtendere-blue to-mtendere-green text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Get in Touch
            </h1>
            <p className="text-xl mb-8 opacity-90">
              Have questions about our services? Ready to start your educational journey? 
              We're here to help you every step of the way.
            </p>
            <div className="flex justify-center space-x-8 text-sm opacity-80">
              <div className="text-center">
                <div className="text-2xl font-bold">24/7</div>
                <div>Support Available</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">&lt;24h</div>
                <div>Response Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">50+</div>
                <div>Languages Supported</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Contact Information */}
          <div className="lg:col-span-1">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-mtendere-blue mb-4">
                Contact Information
              </h2>
              <p className="text-gray-600 mb-6">
                Reach out to us through any of these channels. Our team is ready to assist you.
              </p>
            </div>

            <div className="space-y-6">
              {contactInfo.map((info, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className={`w-12 h-12 ${info.color} bg-gray-50 rounded-full flex items-center justify-center flex-shrink-0`}>
                        <info.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-mtendere-blue mb-2">
                          {info.title}
                        </h3>
                        {info.details.map((detail, idx) => (
                          <p key={idx} className="text-gray-600 text-sm">
                            {detail}
                          </p>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Office Hours */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center text-mtendere-blue">
                  <Clock className="w-5 h-5 mr-2" />
                  Office Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Monday - Friday</span>
                    <span className="font-medium">9:00 AM - 6:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Saturday</span>
                    <span className="font-medium">10:00 AM - 4:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sunday</span>
                    <span className="font-medium">Closed</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl text-mtendere-blue">
                  Send Us a Message
                </CardTitle>
                <CardDescription>
                  Fill out the form below and we'll get back to you as soon as possible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="Enter your full name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="Enter your phone number"
                        value={formData.phone}
                        onChange={handleChange}
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="inquiryType">Inquiry Type *</Label>
                      <Select 
                        value={formData.inquiryType} 
                        onValueChange={(value) => handleSelectChange("inquiryType", value)}
                        disabled={isLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select inquiry type" />
                        </SelectTrigger>
                        <SelectContent>
                          {inquiryTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject *</Label>
                    <Input
                      id="subject"
                      name="subject"
                      placeholder="Enter message subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder="Enter your message here..."
                      value={formData.message}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                      rows={6}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-mtendere-blue hover:bg-blue-700"
                    disabled={isLoading}
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending Message...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQ Section */}
        <section className="mt-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-mtendere-blue mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Quick answers to common questions about our services
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="text-lg text-mtendere-blue">
                  How do I apply for scholarships?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm">
                  Simply create an account on our platform, browse available scholarships, 
                  and submit your application through our streamlined process. Our team will 
                  guide you through each step.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="text-lg text-mtendere-blue">
                  What services do you offer?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm">
                  We offer scholarship guidance, job placement, study abroad assistance, 
                  career counseling, and partnership programs with leading institutions worldwide.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="text-lg text-mtendere-blue">
                  Is there a fee for your services?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm">
                  Many of our basic services are free. For premium services and personalized 
                  guidance, we offer affordable packages. Contact us for detailed pricing information.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="text-lg text-mtendere-blue">
                  How long does the application process take?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm">
                  Application processing time varies by institution and program. Typically, 
                  scholarship applications take 4-8 weeks, while job applications may have 
                  faster turnaround times.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="text-lg text-mtendere-blue">
                  Do you offer support after placement?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm">
                  Yes! We provide ongoing support throughout your educational journey, 
                  including academic guidance, career counseling, and alumni networking opportunities.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="text-lg text-mtendere-blue">
                  Can international students apply?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm">
                  Absolutely! We serve students from over 50 countries and have partnerships 
                  with institutions worldwide. We also provide visa assistance and cultural preparation.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Emergency Contact */}
        <section className="mt-16 bg-mtendere-gray rounded-2xl p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-mtendere-blue mb-4">
              Need Immediate Assistance?
            </h2>
            <p className="text-gray-600 mb-6">
              For urgent matters or emergency support, contact us directly
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button className="bg-mtendere-green hover:bg-green-700">
                <Phone className="w-4 h-4 mr-2" />
                Call Emergency Line
              </Button>
              <Button variant="outline" className="border-mtendere-blue text-mtendere-blue">
                <MessageCircle className="w-4 h-4 mr-2" />
                Live Chat Support
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
