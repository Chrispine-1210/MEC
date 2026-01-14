import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import ExpandingNav from "@/components/expanding-nav";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["/api/jobs"],
  });

  const { data: searchResults, isLoading: isSearching } = useQuery({
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
      <section className="bg-gradient-to-r from-mtendere-green to-mtendere-blue text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Discover Your Next Career Opportunity
            </h1>
            <p className="text-xl mb-8 opacity-90">
              Find your perfect job from our curated list of opportunities with top employers worldwide
            </p>
            
            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search jobs by title, company, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-4 text-lg bg-white text-gray-900 border-0 rounded-lg shadow-lg"
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
            {filteredJobs?.map((job) => (
              <Card key={job.id} className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant="secondary" 
                        className="bg-mtendere-green text-white"
                      >
                        {job.jobType}
                      </Badge>
                      {job.isRemote && (
                        <Badge variant="outline" className="border-mtendere-blue text-mtendere-blue">
                          <Wifi className="w-3 h-3 mr-1" />
                          Remote
                        </Badge>
                      )}
                    </div>
                    {job.deadline && isDeadlineApproaching(job.deadline) && (
                      <Badge variant="destructive" className="animate-pulse">
                        <Clock className="w-3 h-3 mr-1" />
                        Urgent
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl text-mtendere-blue line-clamp-2">
                    {job.title}
                  </CardTitle>
                  <CardDescription className="flex items-center space-x-4 text-sm">
                    <span className="flex items-center">
                      <Building className="w-4 h-4 mr-1" />
                      {job.company}
                    </span>
                    <span className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      {job.location}
                    </span>
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
                        {job.salary ? formatCurrency(job.salary, job.currency) : 'Competitive'}
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
            ))}
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
    </div>
  );
}
