import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import ExpandingNav from "@/components/expanding-nav";
import Footer from "@/components/footer";
import ApplicationDialog from "@/components/application-dialog";
import GovernedImage from "@/components/governed-image";
import type { ApiJob } from "@/lib/api-types";
import { getGovernedBackgroundImage } from "@/lib/image-governance";
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

  const { data: jobs, isLoading } = useQuery<ApiJob[]>({
    queryKey: ["/api/jobs"],
  });

  const { data: searchResults, isLoading: isSearching } = useQuery<ApiJob[]>({
    queryKey: ["/api/jobs/search", { q: searchQuery }],
    enabled: searchQuery.length > 2,
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

  return (
    <div className="min-h-screen bg-background">
      <ExpandingNav />
      
      {/* Header Section */}
      <section 
        className="relative py-24 text-white overflow-hidden"
        style={ {
          backgroundImage: getGovernedBackgroundImage({
            module: "job",
            title: "Career opportunities",
            category: "career",
            variant: "hero",
          }),
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
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground/70 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search jobs by title, company, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-6 text-lg bg-card text-foreground border-0 rounded-xl shadow-2xl focus-visible:ring-primary"
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
              <Filter className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium text-foreground/80">Filter by type:</span>
            </div>
            <Button
              variant={selectedType === "" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType("")}
              className={selectedType === "" ? "bg-mtendere-blue text-white" : ""}
            >
              All Types
            </Button>
            {jobTypes.map((type) => (
              <Button
                key={type}
                variant={selectedType === type ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType(type)}
                className={selectedType === type ? "bg-mtendere-blue text-white" : ""}
              >
                {type}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium text-foreground/80">Filter by location:</span>
            </div>
            <Button
              variant={selectedLocation === "" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedLocation("")}
              className={selectedLocation === "" ? "bg-mtendere-green text-white" : ""}
            >
              All Locations
            </Button>
            {locations.slice(0, 5).map((location) => (
              <Button
                key={location}
                variant={selectedLocation === location ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedLocation(location)}
                className={selectedLocation === location ? "bg-mtendere-green text-white" : ""}
              >
                {location}
              </Button>
            ))}
          </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-muted-foreground">
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
              return (
                <Card key={idx}>
                  <div className="relative">
                    <GovernedImage
                      module="job"
                      src={job.imageUrl}
                      title={job.title}
                      category={job.jobType}
                      index={idx}
                      variant="card"
                      aspectRatio="auto"
                      className="h-32"
                      wrapperClassName="h-full rounded-t-lg rounded-b-none shadow-none"
                    />
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
                    <p className="text-muted-foreground mb-4 line-clamp-3">
                      {job.description}
                    </p>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center text-sm text-muted-foreground">
                          <DollarSign className="w-4 h-4 mr-1" />
                          Salary
                        </span>
                        <span className="font-semibold text-mtendere-green">
                          {job.salary ? formatCurrency(job.salary, job.currency || 'USD') : 'Competitive'}
                        </span>
                      </div>

                      {job.deadline && (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4 mr-1" />
                            Application Deadline
                          </span>
                          <span className={`font-semibold ${isDeadlineApproaching(job.deadline) ? 'text-destructive' : 'text-foreground/80'}`}>
                            {formatDate(job.deadline)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Requirements Preview */}
                    {job.requirements && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-foreground/80 mb-2">Key Requirements:</h4>
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
                      <ApplicationDialog
                        type="job"
                        referenceId={job.id}
                        title={job.title}
                        trigger={
                          <Button className="flex-1 bg-mtendere-green hover:bg-mtendere-green/90">
                            <Users className="w-4 h-4 mr-2" />
                            Apply Now
                          </Button>
                        }
                      />

                      <Button asChild variant="outline" size="icon" aria-label={`View ${job.title}`}>
                        <Link href={`/jobs/${job.id}`}>
                          <ExternalLink className="w-4 h-4" />
                        </Link>
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
            <Briefcase className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">
              No jobs found
            </h3>
            <p className="text-muted-foreground mb-6">
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
      <Footer />
    </div>
  );
}




