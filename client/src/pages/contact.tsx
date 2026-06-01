import { useState } from "react";
import ExpandingNav from "@/components/expanding-nav";
import Footer from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getAttributionMetadata, trackConversionEvent } from "@/lib/conversion-tracking";
import { getRecaptchaToken } from "@/lib/recaptcha";
import { socialLinks } from "@/lib/social-links";
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Send,
  MessageCircle,
  Users,
  Globe,
  Loader2,
  Facebook,
  Twitter,
  Instagram,
  Linkedin
} from "lucide-react";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    inquiryType: "",
    website: "",
    consentAccepted: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasTrackedStart, setHasTrackedStart] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target;
    const isCheckbox = target instanceof HTMLInputElement && target.type === "checkbox";
    const name = target.name;
    setFormData(prev => ({ ...prev, [name]: isCheckbox ? target.checked : target.value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    if (!hasTrackedStart && name !== "website") {
      setHasTrackedStart(true);
      trackConversionEvent("contact_form_started", { form: "contact" });
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    if (!hasTrackedStart) {
      setHasTrackedStart(true);
      trackConversionEvent("contact_form_started", { form: "contact" });
    }
  };

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};
    if (formData.name.trim().length < 2) nextErrors.name = "Full name is required";
    if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) nextErrors.email = "Valid email is required";
    if (!formData.inquiryType) nextErrors.inquiryType = "Inquiry type is required";
    if (formData.subject.trim().length < 2) nextErrors.subject = "Subject is required";
    if (formData.message.trim().length < 10) nextErrors.message = "Message must be at least 10 characters";
    if (!formData.consentAccepted) nextErrors.consentAccepted = "Please accept the privacy consent";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);

    try {
      const recaptchaToken = await getRecaptchaToken("contact");
      const response = await apiRequest("POST", "/api/messages", {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone || null,
        subject: formData.subject.trim(),
        inquiryCategory: formData.inquiryType,
        message: formData.message.trim(),
        website: formData.website,
        consentAccepted: formData.consentAccepted,
        recaptchaToken,
        source: "contact_page",
        ...getAttributionMetadata(),
      });
      const payload = await response.json();
      trackConversionEvent("contact_form_completed", {
        form: "contact",
        ticketCode: payload.ticketCode,
        category: formData.inquiryType,
      });
      
      toast({
        title: "Message Sent Successfully",
        description: payload.ticketCode
          ? `Thank you for contacting us. Your ticket is ${payload.ticketCode}.`
          : "Thank you for contacting us. We'll get back to you within 24 hours.",
      });

      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
        inquiryType: "",
        website: "",
        consentAccepted: false,
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
      details: ["Lilongwe, Malawi"],
      color: "text-mtendere-blue",
    },
    {
      icon: Phone,
      title: "Call Us",
      details: ["+265 999 360 325", "Monday - Friday: 8:00 AM - 5:00 PM", "Saturday: 9:00 AM - 1:00 PM"],
      color: "text-mtendere-green",
    },
    {
      icon: Mail,
      title: "Email Us",
      details: ["mtendereeducation@gmail.com"],
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
      <section className="bg-gradient-to-r from-mtendere-blue to-mtendere-green py-20 text-white">
        <div className="container mx-auto px-4">
          <div className="hero-panel hero-safe-copy mx-auto max-w-3xl rounded-3xl p-7 text-center md:p-10">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Get in Touch
            </h1>
            <p className="text-xl mb-8 opacity-90">
              Have questions about our services? Ready to start your educational journey? 
              We're here to help you every step of the way.
            </p>
            <div className="grid grid-cols-1 gap-4 text-sm font-bold opacity-90 drop-shadow-md sm:grid-cols-3">
              <div className="rounded-xl border border-white/15 bg-white/10 p-4 text-center shadow-lg backdrop-blur-sm">
                <div className="text-2xl font-bold">8AM-5PM</div>
                <div className="uppercase tracking-tighter">Weekdays</div>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/10 p-4 text-center shadow-lg backdrop-blur-sm">
                <div className="text-2xl font-bold">9AM-1PM</div>
                <div className="uppercase tracking-tighter">Saturday</div>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/10 p-4 text-center shadow-lg backdrop-blur-sm">
                <div className="text-2xl font-bold">50+</div>
                <div className="uppercase tracking-tighter">Countries</div>
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
              <p className="text-muted-foreground mb-6">
                Reach out to us through any of these channels. Our team is ready to assist you.
              </p>
            </div>

            <div className="space-y-6">
              {contactInfo.map((info, index) => (
                <Card key={index} className="premium-card">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className={`w-12 h-12 ${info.color} bg-muted/40 rounded-full flex items-center justify-center flex-shrink-0`}>
                        <info.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-mtendere-blue mb-2">
                          {info.title}
                        </h3>
                        {info.details.map((detail, idx) => (
                          <p key={idx} className="text-muted-foreground text-sm">
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
            <Card className="premium-card mt-6">
              <CardHeader>
                <CardTitle className="flex items-center text-mtendere-blue">
                  <Clock className="w-5 h-5 mr-2" />
                  Office Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monday - Friday</span>
                    <span className="font-medium">9:00 AM - 6:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Saturday</span>
                    <span className="font-medium">10:00 AM - 4:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sunday</span>
                    <span className="font-medium">Closed</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className="premium-card">
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
                    <input
                      tabIndex={-1}
                      autoComplete="off"
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                      className="hidden"
                      aria-hidden="true"
                    />
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        name="name"
                        autoComplete="name"
                        placeholder="Enter your full name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                      />
                      {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                      />
                      {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        autoComplete="tel"
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
                      {errors.inquiryType && <p className="text-sm text-destructive">{errors.inquiryType}</p>}
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
                    {errors.subject && <p className="text-sm text-destructive">{errors.subject}</p>}
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
                    {errors.message && <p className="text-sm text-destructive">{errors.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-start gap-3 text-sm text-muted-foreground">
                      <input
                        name="consentAccepted"
                        type="checkbox"
                        checked={formData.consentAccepted}
                        onChange={handleChange}
                        disabled={isLoading}
                        className="mt-1 h-4 w-4 rounded border-border"
                        required
                      />
                      <span>
                        I agree that Mtendere may store this inquiry and contact me about my request.
                      </span>
                    </label>
                    {errors.consentAccepted && <p className="text-sm text-destructive">{errors.consentAccepted}</p>}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-mtendere-blue hover:bg-mtendere-blue/90"
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
        <section className="section-shell mt-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-mtendere-blue mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Quick answers to common questions about our services
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="premium-card">
              <CardHeader>
                <CardTitle className="text-lg text-mtendere-blue">
                  How do I apply for scholarships?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Simply create an account on our platform, browse available scholarships, 
                  and submit your application through our streamlined process. Our team will 
                  guide you through each step.
                </p>
              </CardContent>
            </Card>

            <Card className="premium-card">
              <CardHeader>
                <CardTitle className="text-lg text-mtendere-blue">
                  What services do you offer?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  We offer scholarship guidance, job placement, study abroad assistance, 
                  career counseling, and partnership programs with leading institutions worldwide.
                </p>
              </CardContent>
            </Card>

            <Card className="premium-card">
              <CardHeader>
                <CardTitle className="text-lg text-mtendere-blue">
                  Is there a fee for your services?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Many of our basic services are free. For premium services and personalized 
                  guidance, we offer affordable packages. Contact us for detailed pricing information.
                </p>
              </CardContent>
            </Card>

            <Card className="premium-card">
              <CardHeader>
                <CardTitle className="text-lg text-mtendere-blue">
                  How long does the application process take?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Application processing time varies by institution and program. Typically, 
                  scholarship applications take 4-8 weeks, while job applications may have 
                  faster turnaround times.
                </p>
              </CardContent>
            </Card>

            <Card className="premium-card">
              <CardHeader>
                <CardTitle className="text-lg text-mtendere-blue">
                  Do you offer support after placement?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Yes! We provide ongoing support throughout your educational journey, 
                  including academic guidance, career counseling, and alumni networking opportunities.
                </p>
              </CardContent>
            </Card>

            <Card className="premium-card">
              <CardHeader>
                <CardTitle className="text-lg text-mtendere-blue">
                  Can international students apply?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Absolutely! We serve students from over 50 countries and have partnerships 
                  with institutions worldwide. We also provide visa assistance and cultural preparation.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Social Media & Emergency Contact */}
        <section className="premium-card mt-16 rounded-2xl bg-mtendere-gray p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="text-center md:text-left">
              <h2 className="text-2xl font-bold text-mtendere-blue mb-4">
                Follow Our Journey
              </h2>
              <p className="text-muted-foreground mb-6">
                Connect with us on social media for the latest scholarship updates and educational tips.
              </p>
              <div className="flex justify-center md:justify-start space-x-6">
                {[
                  { href: socialLinks.x, icon: Twitter, label: "X", hoverClass: "hover:text-mtendere-blue/80" },
                  { href: socialLinks.instagram, icon: Instagram, label: "Instagram", hoverClass: "hover:text-mtendere-orange" },
                  { href: socialLinks.facebook, icon: Facebook, label: "Facebook", hoverClass: "hover:text-mtendere-blue" },
                  { href: socialLinks.linkedin, icon: Linkedin, label: "LinkedIn", hoverClass: "hover:text-mtendere-blue" },
                ].map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className={`text-muted-foreground/70 transition-colors ${social.hoverClass}`}
                  >
                    <social.icon className="w-8 h-8" />
                  </a>
                ))}
              </div>
            </div>
            
            <div className="text-center">
              <h2 className="text-2xl font-bold text-mtendere-blue mb-4">
                Need Immediate Assistance?
              </h2>
              <p className="text-muted-foreground mb-6">
                For urgent matters or emergency support, contact us directly
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild className="bg-mtendere-green hover:bg-mtendere-green/90 text-white font-bold">
                  <a href="tel:+265999360325">
                    <Phone className="w-4 h-4 mr-2" />
                    Call Mtendere
                  </a>
                </Button>
                <Button asChild variant="outline" className="border-mtendere-blue text-mtendere-blue hover:bg-mtendere-blue hover:text-white font-bold">
                  <a href="mailto:mtendereeducation@gmail.com?subject=Support%20request">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Email Support
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}




