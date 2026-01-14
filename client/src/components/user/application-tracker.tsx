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
  notes?: string;
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
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
      case 'declined':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
      case 'under review':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'documents required':
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'accepted':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
      case 'declined':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
      case 'under review':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'documents required':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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

  if (!applications || applications.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">
          No Applications Yet
        </h3>
        <p className="text-gray-500 mb-6">
          Start your journey by applying for scholarships or jobs
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="bg-mtendere-blue hover:bg-blue-700">
            <Link href="/scholarships">
              <GraduationCap className="w-4 h-4 mr-2" />
              Browse Scholarships
            </Link>
          </Button>
          <Button asChild className="bg-mtendere-green hover:bg-green-700">
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
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Total Applications</p>
              <p className="text-2xl font-bold text-blue-700">{applications.length}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Approved</p>
              <p className="text-2xl font-bold text-green-700">
                {applications.filter(app => app.status.toLowerCase() === 'approved').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600 font-medium">Pending</p>
              <p className="text-2xl font-bold text-yellow-700">
                {applications.filter(app => app.status.toLowerCase() === 'pending').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-orange-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium">Action Required</p>
              <p className="text-2xl font-bold text-orange-700">
                {applications.filter(app => app.status.toLowerCase().includes('documents')).length}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {sortedApplications.map((application) => (
          <Card key={application.id} className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${
                    application.type === 'scholarship' 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-green-100 text-green-600'
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
                <div className="flex justify-between text-sm text-gray-600 mb-2">
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
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>Notes:</strong> {application.notes}
                  </p>
                </div>
              )}

              {/* Documents */}
              {application.documents && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Documents Submitted:</p>
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
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline">
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                  
                  {application.status.toLowerCase().includes('documents') && (
                    <Button size="sm" className="bg-mtendere-orange hover:bg-orange-600">
                      <FileText className="w-4 h-4 mr-2" />
                      Upload Documents
                    </Button>
                  )}
                </div>

                <Button size="sm" variant="ghost">
                  <ExternalLink className="w-4 h-4" />
                </Button>
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
                <span className="text-xs text-gray-500">Browse available opportunities</span>
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
              <Link href="/jobs">
                <Briefcase className="w-6 h-6 text-mtendere-green" />
                <span className="font-medium">Find Job Opportunities</span>
                <span className="text-xs text-gray-500">Explore our job portal</span>
              </Link>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
              <FileText className="w-6 h-6 text-mtendere-orange" />
              <span className="font-medium">Update Documents</span>
              <span className="text-xs text-gray-500">Upload required files</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
