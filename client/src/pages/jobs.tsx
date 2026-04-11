import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import ExpandingNav from "@/components/expanding-nav";
import Footer from "@/components/footer";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ApiJob } from "@/lib/api-types";
import { 
  Search, 
  Filter, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Briefcase,
  ExternalLink,
  Building,
  Clock,
  Wifi,
  Users
} from "lucide-react";

interface Job {
  id: number;
  title: string;
  description: string;
  company: string;
  location: string;
  salary: number;
  currency: string;
  jobType: string;
  requirements: any;
  benefits: any;
  isRemote: boolean;
  deadline?: string;
  isActive: boolean;
}

export default function Jobs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: jobs, isLoading } = useQuery<ApiJob[]>({
    queryKey: ["/api/jobs"],
  });

  const { data: searchResults, isLoading: isSearching } = useQuery<ApiJob[]>({
    queryKey: ["/api/jobs/search", searchQuery],
    enabled: searchQuery.length > 2,
  });

  const applyMutation = useMutation({
    mutationFn: async (jobId: number) => {
      return apiRequest("POST", "/api/applications", {
        type: "job",
        referenceId: jobId,
        status: "pending",
      });
    },
    onSuccess: () => {
      toast({
        title: "Application Submitted",
        description: "Your job application has been submitted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
    },
    onError: (error) => {
      toast({
        title: "Application Failed",
        description: "Failed to submit your application. Please try again.",
        variant: "destructive",
      });
    },
  });

  const displayJobs = searchQuery.length > 2 ? searchResults : jobs;
  const jobTypes = [...new Set(jobs?.map(j => j.jobType) || [])];
  const locations = [...new Set(jobs?.map(j => j.location) || [])];

  const filteredJobs = displayJobs?.filter(job => 
    (!selectedType || job.jobType === selectedType) &&
    (!selectedLocation || job.location === selectedLocation)
  );

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
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isDeadlineApproaching = (deadline?: string) => {
    if (!deadline) return false;
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays > 0;
  };

  const handleApply = (jobId: number) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to apply for jobs.",
        variant: "destructive",
      });
      return;
    }
    applyMutation.mutate(jobId);
  };

  return (
    <div className="min-h-screen bg-background">
      <ExpandingNav />
      
      {/* Header Section */}
      <section 
        className="relative py-24 text-white overflow-hidden"
        style={ {
          backgroundImage: `url(${'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&q=80&w=2000'})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        } }
      >
        <div className="absolute inset-0 bg-gradient-to-r from-mtendere-green/90 to-mtendere-blue/90 z-0" />
        <div className="container relative z-10 mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 drop-shadow-2xl">
              Discover Your Next Career Opportunity
            </h1>
            <p className="text-xl md:text-2xl mb-8 opacity-95 drop-shadow-lg">
              Find your perfect job from our curated list of opportunities with top employers worldwide
            </p>
            
            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto drop-shadow-2xl">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search jobs by title, company, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-6 text-lg bg-white text-gray-900 border-0 rounded-xl shadow-2xl focus-visible:ring-primary"
              />
              {isSearching && (
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <div className="loading-spinner"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        {/* Filters */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-700">Filter by type:</span>
            </div>
            <Button
              variant={selectedType === "" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType("")}
              className={selectedType === "" ? "bg-mtendere-blue" : ""}
            >
              All Types
            </Button>
            {jobTypes.map((type) => (
              <Button
                key={type}
                variant={selectedType === type ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType(type)}
                className={selectedType === type ? "bg-mtendere-blue" : ""}
              >
                {type}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-700">Filter by location:</span>
            </div>
            <Button
              variant={selectedLocation === "" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedLocation("")}
              className={selectedLocation === "" ? "bg-mtendere-green" : ""}
            >
              All Locations
            </Button>
            {locations.slice(0, 5).map((location) => (
              <Button
                key={location}
                variant={selectedLocation === location ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedLocation(location)}
                className={selectedLocation === location ? "bg-mtendere-green" : ""}
              >
                {location}
              </Button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            Showing {filteredJobs?.length || 0} job{filteredJobs?.length !== 1 ? 's' : ''}
            {searchQuery && ` for "${searchQuery}"`}
            {selectedType && ` in ${selectedType}`}
            {selectedLocation && ` at ${selectedLocation}`}
          </p>
        </div>

        {/* Jobs Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full mb-4" />
                  <Skeleton className="h-3 w-full mb-2" />
                  <Skeleton className="h-3 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredJobs?.map((job, idx) => {
              const jobImages = [
                "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=800",
              ];
              const coverImg = job.imageUrl || jobImages[idx % jobImages.length];
              return (
              <Card key={job.id} className="hover:shadow-2xl transition-all duration-500 overflow-hidden group border-none bg-white shadow-md flex flex-col">
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={coverImg}
                    alt={job.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <Badge className="bg-mtendere-green text-white font-bold text-xs">{job.jobType}</Badge>
                    {job.isRemote && (
                      <Badge className="bg-mtendere-blue text-white text-xs">
                        <Wifi className="w-3 h-3 mr-1" />Remote
                      </Badge>
                    )}
                    {job.deadline && isDeadlineApproaching(job.deadline) && (
                      <Badge variant="destructive" className="animate-pulse text-xs">
                        <Clock className="w-3 h-3 mr-1" />Urgent
                      </Badge>
                    )}
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <span className="text-white text-sm font-bold drop-shadow flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />{job.location}
                    </span>
                  </div>
                </div>
                <CardHeader className="pt-4">
                  <CardTitle className="text-lg text-mtendere-blue line-clamp-2 font-bold group-hover:text-mtendere-green transition-colors">
                    {job.title}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 text-sm">
                    <Building className="w-3.5 h-3.5 text-mtendere-blue" />
                    {job.company}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {job.description}
                  </p>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center text-sm text-gray-600">
                        <DollarSign className="w-4 h-4 mr-1" />
                        Salary
                      </span>
                      <span className="font-semibold text-mtendere-green">
                        {job.salary ? formatCurrency(job.salary, job.currency || 'USD') : 'Competitive'}
                      </span>
                    </div>
                    
                    {job.deadline && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center text-sm text-gray-600">
                          <Calendar className="w-4 h-4 mr-1" />
                          Application Deadline
                        </span>
                        <span className={`font-semibold ${isDeadlineApproaching(job.deadline) ? 'text-red-600' : 'text-gray-700'}`}>
                          {formatDate(job.deadline)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Requirements Preview */}
                  {job.requirements && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Key Requirements:</h4>
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(job.requirements) ? job.requirements : []).slice(0, 3).map((req, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {req}
                          </Badge>
                        ))}
                        {(Array.isArray(job.requirements) ? job.requirements : []).length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{(job.requirements as any[]).length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <Button
                      className="flex-1 bg-mtendere-green hover:bg-green-700"
                      onClick={() => handleApply(job.id)}
                      disabled={applyMutation.isPending}
                    >
                      {applyMutation.isPending ? (
                        <>
                          <div className="loading-spinner mr-2"></div>
                          Applying...
                        </>
                      ) : (
                        <>
                          <Users className="w-4 h-4 mr-2" />
                          Apply Now
                        </>
                      )}
                    </Button>
                    
                    <Button variant="outline" size="icon">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          </div>
        )}

        {filteredJobs?.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              No jobs found
            </h3>
            <p className="text-gray-500 mb-6">
              Try adjusting your search criteria or check back later for new opportunities.
            </p>
            <Button 
              onClick={() => {
                setSearchQuery("");
                setSelectedType("");
                setSelectedLocation("");
              }}
              variant="outline"
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
