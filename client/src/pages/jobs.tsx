import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
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
  Clock,
  Wifi,
  Users,
  Building,
  ArrowRight,
} from "lucide-react";

const fallbackJobImages = [
  "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=800",
];

export default function Jobs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [applyingJobId, setApplyingJobId] = useState<number | null>(null);
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
    mutationFn: async (jobId: number) =>
      apiRequest("POST", "/api/applications", {
        type: "job",
        referenceId: jobId,
        status: "pending",
      }),
    onMutate: (jobId) => {
      setApplyingJobId(jobId);
    },
    onSuccess: () => {
      toast({
        title: "Application submitted",
        description: "Your job application has been submitted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
    },
    onError: () => {
      toast({
        title: "Application failed",
        description: "Failed to submit your application. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setApplyingJobId(null);
    },
  });

  const displayJobs = searchQuery.length > 2 ? searchResults : jobs;
  const jobTypes = [...new Set(jobs?.map((job) => job.jobType).filter(Boolean) || [])];
  const locations = [...new Set(jobs?.map((job) => job.location).filter(Boolean) || [])];

  const filteredJobs = displayJobs?.filter(
    (job) => (!selectedType || job.jobType === selectedType) && (!selectedLocation || job.location === selectedLocation),
  );

  const formatCurrency = (amount?: number | null, currency?: string | null) => {
    if (!amount) return "Competitive";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "Open";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const isDeadlineApproaching = (deadline?: string | null) => {
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
        title: "Authentication required",
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

      <section
        className="relative pt-28 pb-20 text-white overflow-hidden"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&q=80&w=2000)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-mtendere-green/90 to-mtendere-blue/90 z-0" />
        <div className="container relative z-10 mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 drop-shadow-2xl">Discover Your Next Career Opportunity</h1>
            <p className="text-lg md:text-2xl mb-8 opacity-95 drop-shadow-lg">
              Find your perfect role from our curated list of openings with top employers worldwide.
            </p>

            <div className="relative max-w-2xl mx-auto drop-shadow-2xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/70 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search jobs by title, company, or location..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-12 pr-12 py-6 text-lg bg-card text-foreground border-0 rounded-xl shadow-2xl focus-visible:ring-primary"
              />
              {isSearching && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="loading-spinner" />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 bg-mtendere-gray/40">
        <div className="container mx-auto px-4">
          <div className="mb-8 rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center space-x-2 mr-2">
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

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center space-x-2 mr-2">
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
                {locations.slice(0, 6).map((location) => (
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
            </div>
          </div>

          <div className="mb-6">
            <p className="text-muted-foreground">
              Showing {filteredJobs?.length || 0} job{filteredJobs?.length !== 1 ? "s" : ""}
              {searchQuery && ` for "${searchQuery}"`}
              {selectedType && ` in ${selectedType}`}
              {selectedLocation && ` at ${selectedLocation}`}
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <Card key={index}>
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
              {filteredJobs?.map((job, index) => {
                const previewImage = job.imageUrl || fallbackJobImages[index % fallbackJobImages.length];
                const requirements = Array.isArray(job.requirements) ? job.requirements : [];
                return (
                  <Card key={job.id} className="group overflow-hidden border-border/60 shadow-sm hover:shadow-xl transition-all">
                    <div className="relative h-52 overflow-hidden">
                      <img
                        src={previewImage}
                        alt={job.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                        <Badge className="bg-mtendere-green text-white font-bold text-xs">{job.jobType}</Badge>
                        {job.isRemote && (
                          <Badge className="bg-mtendere-blue text-white text-xs">
                            <Wifi className="w-3 h-3 mr-1" />
                            Remote
                          </Badge>
                        )}
                        {job.deadline && isDeadlineApproaching(job.deadline) && (
                          <Badge variant="destructive" className="animate-pulse text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            Urgent
                          </Badge>
                        )}
                      </div>
                      <div className="absolute bottom-3 left-3">
                        <span className="text-white text-sm font-bold drop-shadow flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {job.location}
                        </span>
                      </div>
                    </div>

                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-mtendere-blue line-clamp-2 font-bold group-hover:text-mtendere-green transition-colors">
                        {job.title}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 text-sm">
                        <Building className="w-3.5 h-3.5 text-mtendere-blue" />
                        {job.company}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <p className="text-muted-foreground line-clamp-3">{job.description}</p>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center text-sm text-muted-foreground">
                            <DollarSign className="w-4 h-4 mr-1" />
                            Salary
                          </span>
                          <span className="font-semibold text-mtendere-green">{formatCurrency(job.salary, job.currency)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4 mr-1" />
                            Deadline
                          </span>
                          <span
                            className={`font-semibold text-sm ${
                              isDeadlineApproaching(job.deadline) ? "text-destructive" : "text-foreground/80"
                            }`}
                          >
                            {formatDate(job.deadline)}
                          </span>
                        </div>
                      </div>

                      {requirements.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-foreground/80 mb-2">Key requirements</h4>
                          <div className="flex flex-wrap gap-1">
                            {requirements.slice(0, 3).map((requirement, reqIndex) => (
                              <Badge key={reqIndex} variant="outline" className="text-xs">
                                {requirement}
                              </Badge>
                            ))}
                            {requirements.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{requirements.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row gap-2 pt-1">
                        <Button
                          className="flex-1 bg-mtendere-green hover:bg-mtendere-green/90"
                          onClick={() => handleApply(job.id)}
                          disabled={applyingJobId === job.id}
                        >
                          {applyingJobId === job.id ? (
                            <>
                              <div className="loading-spinner mr-2" />
                              Applying...
                            </>
                          ) : (
                            <>
                              <Users className="w-4 h-4 mr-2" />
                              Apply Now
                            </>
                          )}
                        </Button>
                        <Button asChild variant="outline" className="sm:w-auto">
                          <Link href={`/jobs/${job.id}`}>
                            Details
                            <ArrowRight className="w-4 h-4 ml-2" />
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
            <div className="rounded-2xl border border-border/60 bg-card text-center py-14 px-6 shadow-sm">
              <Briefcase className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No jobs found</h3>
              <p className="text-muted-foreground mb-6">
                Try adjusting your filters or check back later for new opportunities.
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
      </section>

      <Footer />
    </div>
  );
}
