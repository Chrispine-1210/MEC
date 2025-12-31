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
  GraduationCap,
  ExternalLink,
  BookOpen,
  Globe,
  Clock
} from "lucide-react";

interface Scholarship {
  id: number;
  title: string;
  description: string;
  institution: string;
  country: string;
  amount: number;
  currency: string;
  deadline: string;
  requirements: any;
  category: string;
  imageUrl?: string;
  isActive: boolean;
}

export default function Scholarships() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: scholarships, isLoading } = useQuery({
    queryKey: ["/api/scholarships"],
  });

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["/api/scholarships/search", searchQuery],
    enabled: searchQuery.length > 2,
  });

  const applyMutation = useMutation({
    mutationFn: async (scholarshipId: number) => {
      return apiRequest("POST", "/api/applications", {
        type: "scholarship",
        referenceId: scholarshipId,
        status: "pending",
      });
    },
    onSuccess: () => {
      toast({
        title: "Application Submitted",
        description: "Your scholarship application has been submitted successfully.",
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

  const displayScholarships = searchQuery.length > 2 ? searchResults : scholarships;
  const categories = [...new Set(scholarships?.map(s => s.category) || [])];

  const filteredScholarships = displayScholarships?.filter(scholarship => 
    !selectedCategory || scholarship.category === selectedCategory
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

  const isDeadlineApproaching = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  };

  const handleApply = (scholarshipId: number) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to apply for scholarships.",
        variant: "destructive",
      });
      return;
    }
    applyMutation.mutate(scholarshipId);
  };

  return (
    <div className="min-h-screen bg-background">
      <ExpandingNav />
      
      {/* Header Section */}
      <section className="bg-gradient-to-r from-mtendere-blue to-mtendere-green text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Find Your Perfect Scholarship
            </h1>
            <p className="text-xl mb-8 opacity-90">
              Discover funding opportunities from top institutions worldwide and make your educational dreams a reality
            </p>
            
            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search scholarships by title, institution, or country..."
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
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-700">Filter by category:</span>
            </div>
            <Button
              variant={selectedCategory === "" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("")}
              className={selectedCategory === "" ? "bg-mtendere-blue" : ""}
            >
              All Categories
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={selectedCategory === category ? "bg-mtendere-blue" : ""}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            Showing {filteredScholarships?.length || 0} scholarship{filteredScholarships?.length !== 1 ? 's' : ''}
            {searchQuery && ` for "${searchQuery}"`}
            {selectedCategory && ` in ${selectedCategory}`}
          </p>
        </div>

        {/* Scholarships Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredScholarships?.map((scholarship) => (
              <Card key={scholarship.id} className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Badge 
                      variant="secondary" 
                      className="bg-mtendere-green text-white"
                    >
                      {scholarship.category}
                    </Badge>
                    {isDeadlineApproaching(scholarship.deadline) && (
                      <Badge variant="destructive" className="animate-pulse">
                        <Clock className="w-3 h-3 mr-1" />
                        Urgent
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl text-mtendere-blue line-clamp-2">
                    {scholarship.title}
                  </CardTitle>
                  <CardDescription className="flex items-center space-x-4 text-sm">
                    <span className="flex items-center">
                      <GraduationCap className="w-4 h-4 mr-1" />
                      {scholarship.institution}
                    </span>
                    <span className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      {scholarship.country}
                    </span>
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {scholarship.description}
                  </p>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center text-sm text-gray-600">
                        <DollarSign className="w-4 h-4 mr-1" />
                        Award Amount
                      </span>
                      <span className="font-semibold text-mtendere-green">
                        {scholarship.amount ? formatCurrency(scholarship.amount, scholarship.currency) : 'Full Coverage'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-1" />
                        Deadline
                      </span>
                      <span className={`font-semibold ${isDeadlineApproaching(scholarship.deadline) ? 'text-red-600' : 'text-gray-700'}`}>
                        {formatDate(scholarship.deadline)}
                      </span>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      className="flex-1 bg-mtendere-blue hover:bg-blue-700"
                      onClick={() => handleApply(scholarship.id)}
                      disabled={applyMutation.isPending}
                    >
                      {applyMutation.isPending ? (
                        <>
                          <div className="loading-spinner mr-2"></div>
                          Applying...
                        </>
                      ) : (
                        <>
                          <BookOpen className="w-4 h-4 mr-2" />
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

        {filteredScholarships?.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              No scholarships found
            </h3>
            <p className="text-gray-500 mb-6">
              Try adjusting your search criteria or check back later for new opportunities.
            </p>
            <Button 
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("");
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
