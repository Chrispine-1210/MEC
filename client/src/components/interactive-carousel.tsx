import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, GraduationCap, Briefcase, Star, MapPin, Calendar, DollarSign, Building, Award } from "lucide-react";
import { Link } from "wouter";

interface CarouselItem {
  id: number;
  type: 'scholarship' | 'job' | 'testimonial';
  title: string;
  description: string;
  imageUrl?: string;
  metadata?: any;
}

interface InteractiveCarouselProps {
  scholarships: any[];
  jobs: any[];
  testimonials: any[];
}

export default function InteractiveCarousel({ scholarships, jobs, testimonials }: InteractiveCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Combine all items into carousel format
  const carouselItems: CarouselItem[] = [
    ...scholarships.slice(0, 3).map(scholarship => ({
      id: scholarship.id,
      type: 'scholarship' as const,
      title: scholarship.title,
      description: scholarship.description,
      imageUrl: scholarship.imageUrl,
      metadata: {
        institution: scholarship.institution,
        country: scholarship.country,
        amount: scholarship.amount,
        currency: scholarship.currency,
        deadline: scholarship.deadline,
        category: scholarship.category,
      }
    })),
    ...jobs.slice(0, 3).map(job => ({
      id: job.id,
      type: 'job' as const,
      title: job.title,
      description: job.description,
      imageUrl: job.imageUrl,
      metadata: {
        company: job.company,
        location: job.location,
        salary: job.salary,
        currency: job.currency,
        jobType: job.jobType,
        isRemote: job.isRemote,
      }
    })),
    ...testimonials.slice(0, 3).map(testimonial => ({
      id: testimonial.id,
      type: 'testimonial' as const,
      title: "Student Success Story",
      description: testimonial.content,
      imageUrl: testimonial.imageUrl,
      metadata: {
        rating: testimonial.rating,
        userId: testimonial.userId,
      }
    })),
  ];

  const totalSlides = carouselItems.length;
  const itemsPerView = window.innerWidth >= 1024 ? 3 : window.innerWidth >= 768 ? 2 : 1;

  useEffect(() => {
    if (isAutoPlaying && totalSlides > 0) {
      const interval = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % Math.ceil(totalSlides / itemsPerView));
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isAutoPlaying, totalSlides, itemsPerView]);

  const nextSlide = () => {
    setCurrentSlide(prev => (prev + 1) % Math.ceil(totalSlides / itemsPerView));
    setIsAutoPlaying(false);
  };

  const prevSlide = () => {
    setCurrentSlide(prev => prev === 0 ? Math.ceil(totalSlides / itemsPerView) - 1 : prev - 1);
    setIsAutoPlaying(false);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
  };

  // Touch handlers for swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const renderCarouselItem = (item: CarouselItem) => {
    switch (item.type) {
      case 'scholarship':
        return (
          <Card className="h-full hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Badge className="bg-mtendere-green text-white">
                  <GraduationCap className="w-3 h-3 mr-1" />
                  Scholarship
                </Badge>
                <span className="text-sm text-gray-500">
                  Deadline: {formatDate(item.metadata.deadline)}
                </span>
              </div>
              <CardTitle className="text-xl text-mtendere-blue line-clamp-2">
                {item.title}
              </CardTitle>
              <CardDescription className="flex items-center space-x-4 text-sm">
                <span className="flex items-center">
                  <Building className="w-4 h-4 mr-1" />
                  {item.metadata.institution}
                </span>
                <span className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  {item.metadata.country}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4 line-clamp-3">
                {item.description}
              </p>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-600">Award Amount</span>
                <span className="font-semibold text-mtendere-green">
                  {item.metadata.amount ? formatCurrency(item.metadata.amount, item.metadata.currency) : 'Full Coverage'}
                </span>
              </div>
              <Button asChild className="w-full bg-mtendere-blue hover:bg-blue-700">
                <Link href="/scholarships">
                  Learn More
                </Link>
              </Button>
            </CardContent>
          </Card>
        );

      case 'job':
        return (
          <Card className="h-full hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Badge className="bg-mtendere-orange text-white">
                  <Briefcase className="w-3 h-3 mr-1" />
                  Job
                </Badge>
                {item.metadata.isRemote && (
                  <Badge variant="outline" className="border-mtendere-blue text-mtendere-blue">
                    Remote
                  </Badge>
                )}
              </div>
              <CardTitle className="text-xl text-mtendere-blue line-clamp-2">
                {item.title}
              </CardTitle>
              <CardDescription className="flex items-center space-x-4 text-sm">
                <span className="flex items-center">
                  <Building className="w-4 h-4 mr-1" />
                  {item.metadata.company}
                </span>
                <span className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  {item.metadata.location}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4 line-clamp-3">
                {item.description}
              </p>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-600">Salary</span>
                <span className="font-semibold text-mtendere-green">
                  {item.metadata.salary ? formatCurrency(item.metadata.salary, item.metadata.currency) : 'Competitive'}
                </span>
              </div>
              <Button asChild className="w-full bg-mtendere-green hover:bg-green-700">
                <Link href="/jobs">
                  Apply Now
                </Link>
              </Button>
            </CardContent>
          </Card>
        );

      case 'testimonial':
        return (
          <Card className="h-full hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Badge className="bg-mtendere-blue text-white">
                  <Star className="w-3 h-3 mr-1" />
                  Success Story
                </Badge>
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < item.metadata.rating ? 'text-mtendere-orange fill-current' : 'text-gray-300'}`}
                    />
                  ))}
                </div>
              </div>
              <CardTitle className="text-xl text-mtendere-blue">
                {item.title}
              </CardTitle>
              <CardDescription>
                Mtendere Graduate Success
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4 italic line-clamp-4">
                "{item.description}"
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-mtendere-blue to-mtendere-green flex items-center justify-center mr-3">
                  {item.imageUrl ? (
                    <img 
                      src={item.imageUrl} 
                      alt="Student"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <Award className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <div className="font-semibold text-mtendere-blue">Student</div>
                  <div className="text-sm text-gray-500">Successful Graduate</div>
                </div>
              </div>
              <Button asChild variant="outline" className="w-full mt-4 border-mtendere-blue text-mtendere-blue hover:bg-mtendere-blue hover:text-white">
                <Link href="/about">
                  Read More Stories
                </Link>
              </Button>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  if (totalSlides === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
          <Star className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-500">No featured content available at the moment.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Carousel Container */}
      <div 
        ref={carouselRef}
        className="overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className="flex transition-transform duration-500 ease-in-out"
          style={{ 
            transform: `translateX(-${currentSlide * (100 / Math.ceil(totalSlides / itemsPerView))}%)`,
            width: `${Math.ceil(totalSlides / itemsPerView) * 100}%`
          }}
        >
          {Array.from({ length: Math.ceil(totalSlides / itemsPerView) }).map((_, slideIndex) => (
            <div 
              key={slideIndex}
              className="flex space-x-6"
              style={{ width: `${100 / Math.ceil(totalSlides / itemsPerView)}%` }}
            >
              {carouselItems.slice(slideIndex * itemsPerView, (slideIndex + 1) * itemsPerView).map((item) => (
                <div key={`${item.type}-${item.id}`} className={`${itemsPerView === 1 ? 'w-full' : itemsPerView === 2 ? 'w-1/2' : 'w-1/3'} flex-shrink-0`}>
                  {renderCarouselItem(item)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Arrows */}
      {Math.ceil(totalSlides / itemsPerView) > 1 && (
        <>
          <Button
            variant="outline"
            size="icon"
            className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-4 bg-white shadow-lg hover:bg-gray-50 z-10"
            onClick={prevSlide}
          >
            <ChevronLeft className="w-5 h-5 text-mtendere-blue" />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-4 bg-white shadow-lg hover:bg-gray-50 z-10"
            onClick={nextSlide}
          >
            <ChevronRight className="w-5 h-5 text-mtendere-blue" />
          </Button>
        </>
      )}

      {/* Slide Indicators */}
      {Math.ceil(totalSlides / itemsPerView) > 1 && (
        <div className="flex justify-center space-x-2 mt-6">
          {Array.from({ length: Math.ceil(totalSlides / itemsPerView) }).map((_, index) => (
            <button
              key={index}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? 'bg-mtendere-blue'
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
              onClick={() => goToSlide(index)}
            />
          ))}
        </div>
      )}

      {/* Auto-play indicator */}
      <div className="flex justify-center mt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsAutoPlaying(!isAutoPlaying)}
          className="text-gray-600 hover:text-mtendere-blue"
        >
          {isAutoPlaying ? 'Pause Auto-play' : 'Resume Auto-play'}
        </Button>
      </div>
    </div>
  );
}
