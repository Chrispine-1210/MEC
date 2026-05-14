import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  GraduationCap,
  Briefcase,
  Calendar,
  Eye,
  ExternalLink
} from "lucide-react";

interface Application {
  id: number;
  type: 'scholarship' | 'job';
  referenceId: number;
  status: string;
  documents?: any;
  notes?: string | null;
  submittedAt: string;
  updatedAt: string;
}

interface ApplicationTrackerProps {
  applications: Application[];
}

export default function ApplicationTracker({ applications }: ApplicationTrackerProps) {
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'accepted':
        return <CheckCircle className="w-5 h-5 text-mtendere-green" />;
      case 'rejected':
      case 'declined':
        return <XCircle className="w-5 h-5 text-destructive" />;
      case 'pending':
      case 'under review':
        return <Clock className="w-5 h-5 text-mtendere-orange" />;
      case 'documents required':
        return <AlertCircle className="w-5 h-5 text-mtendere-orange" />;
      default:
        return <FileText className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'accepted':
        return 'bg-mtendere-green/15 text-mtendere-green border-mtendere-green/20';
      case 'rejected':
      case 'declined':
        return 'bg-destructive/15 text-destructive border-destructive/20';
      case 'pending':
      case 'under review':
        return 'bg-mtendere-orange/15 text-mtendere-orange border-mtendere-orange/30';
      case 'documents required':
        return 'bg-mtendere-orange/15 text-mtendere-orange border-mtendere-orange/20';
      default:
        return 'bg-muted text-foreground border-border/60';
    }
  };

  const getProgressValue = (status: string) => {
    switch (status.toLowerCase()) {
      case 'submitted':
        return 25;
      case 'under review':
      case 'pending':
        return 50;
      case 'documents required':
        return 75;
      case 'approved':
      case 'accepted':
        return 100;
      case 'rejected':
      case 'declined':
        return 0;
      default:
        return 25;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTypeIcon = (type: string) => {
    return type === 'scholarship' ? (
      <GraduationCap className="w-4 h-4" />
    ) : (
      <Briefcase className="w-4 h-4" />
    );
  };

  const getApplicationTitle = (application: Application) => {
    // In a real application, you would fetch the title from the referenced item
    return `${application.type === 'scholarship' ? 'Scholarship' : 'Job'} Application #${application.referenceId}`;
  };

  const getReferencePath = (application: Application) => {
    return application.type === "scholarship"
      ? `/scholarships/${application.referenceId}`
      : `/jobs/${application.referenceId}`;
  };

  if (!applications || applications.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground mb-2">
          No Applications Yet
        </h3>
        <p className="text-muted-foreground mb-6">
          Start your journey by applying for scholarships or jobs
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="bg-mtendere-blue hover:bg-mtendere-blue/90">
            <Link href="/scholarships">
              <GraduationCap className="w-4 h-4 mr-2" />
              Browse Scholarships
            </Link>
          </Button>
          <Button asChild className="bg-mtendere-green hover:bg-mtendere-green/90">
            <Link href="/jobs">
              <Briefcase className="w-4 h-4 mr-2" />
              Find Jobs
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const sortedApplications = [...applications].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-mtendere-blue/10 rounded-lg p-4 border border-mtendere-blue/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-mtendere-blue font-medium">Total Applications</p>
              <p className="text-2xl font-bold text-mtendere-blue">{applications.length}</p>
            </div>
            <FileText className="w-8 h-8 text-mtendere-blue" />
          </div>
        </div>

        <div className="bg-mtendere-green/10 rounded-lg p-4 border border-mtendere-green/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-mtendere-green font-medium">Approved</p>
              <p className="text-2xl font-bold text-mtendere-green">
                {applications.filter(app => ["approved", "accepted"].includes(app.status.toLowerCase())).length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-mtendere-green" />
          </div>
        </div>

        <div className="bg-mtendere-orange/10 rounded-lg p-4 border border-mtendere-orange/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-mtendere-orange font-medium">Pending</p>
              <p className="text-2xl font-bold text-mtendere-orange">
                {applications.filter(app => ["pending", "under review"].includes(app.status.toLowerCase())).length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-mtendere-orange" />
          </div>
        </div>

        <div className="bg-mtendere-orange/10 rounded-lg p-4 border border-mtendere-orange/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-mtendere-orange font-medium">Action Required</p>
              <p className="text-2xl font-bold text-mtendere-orange">
                {applications.filter(app => app.status.toLowerCase().includes('document')).length}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-mtendere-orange" />
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {sortedApplications.map((application) => (
          <Card key={application.id} className="hover:shadow-lg transition-shadow duration-300 border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${
                    application.type === 'scholarship' 
                      ? 'bg-mtendere-blue/15 text-mtendere-blue' 
                      : 'bg-mtendere-green/15 text-mtendere-green'
                  }`}>
                    {getTypeIcon(application.type)}
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {getApplicationTitle(application)}
                    </CardTitle>
                    <CardDescription className="flex items-center space-x-4 mt-1">
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        Applied: {formatDate(application.submittedAt)}
                      </span>
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        Updated: {formatDate(application.updatedAt)}
                      </span>
                    </CardDescription>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Badge className={`${getStatusColor(application.status)} border`}>
                    {getStatusIcon(application.status)}
                    <span className="ml-1 capitalize">{application.status}</span>
                  </Badge>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                  <span>Application Progress</span>
                  <span>{getProgressValue(application.status)}%</span>
                </div>
                <Progress 
                  value={getProgressValue(application.status)} 
                  className="h-2"
                />
              </div>

              {/* Notes */}
              {application.notes && (
                <div className="mb-4 p-3 bg-muted/40 rounded-lg">
                  <p className="text-sm text-foreground/80">
                    <strong>Notes:</strong> {application.notes}
                  </p>
                </div>
              )}

              {/* Documents */}
              {application.documents && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-foreground/80 mb-2">Documents Submitted:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(application.documents).map((doc) => (
                      <Badge key={doc} variant="outline" className="text-xs">
                        {doc.replace(/([A-Z])/g, ' $1').trim()}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-4 border-t">
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={getReferencePath(application)}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Link>
                  </Button>

                  {application.status.toLowerCase().includes('document') && (
                    <Button asChild size="sm" className="bg-mtendere-orange hover:bg-mtendere-orange/90">
                      <Link href={getReferencePath(application)}>
                        <FileText className="w-4 h-4 mr-2" />
                        Continue Application
                      </Link>
                    </Button>
                  )}

                  <Button asChild size="sm" variant="ghost" className="text-mtendere-blue hover:text-mtendere-blue">
                    <Link href={getReferencePath(application)}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open Opportunity
                    </Link>
                  </Button>
                </div>

                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Ref #{application.referenceId}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-mtendere-blue">Quick Actions</CardTitle>
          <CardDescription>Common tasks for managing your applications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button asChild variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
              <Link href="/scholarships">
                <GraduationCap className="w-6 h-6 text-mtendere-blue" />
                <span className="font-medium">Apply for New Scholarship</span>
                <span className="text-xs text-muted-foreground">Browse available opportunities</span>
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
              <Link href="/jobs">
                <Briefcase className="w-6 h-6 text-mtendere-green" />
                <span className="font-medium">Find Job Opportunities</span>
                <span className="text-xs text-muted-foreground">Explore our job portal</span>
              </Link>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
              <FileText className="w-6 h-6 text-mtendere-orange" />
              <span className="font-medium">Update Documents</span>
              <span className="text-xs text-muted-foreground">Upload required files</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}





