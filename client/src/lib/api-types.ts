export interface ApiUser {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  profilePicture?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
}

export interface ApiScholarship {
  id: number;
  title: string;
  description: string;
  institution: string;
  country: string;
  amount: number | null;
  currency: string | null;
  deadline: string;
  requirements: string[] | null;
  category: string;
  imageUrl?: string | null;
  isActive: boolean | null;
  createdBy: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ApiJob {
  id: number;
  title: string;
  description: string;
  company: string;
  location: string;
  salary: number | null;
  currency: string | null;
  jobType: string;
  requirements: string[] | null;
  benefits: string[] | null;
  isRemote: boolean | null;
  deadline: string | null;
  isActive: boolean | null;
  createdBy: number;
  createdAt: string | null;
  updatedAt: string | null;
  imageUrl?: string | null;
}

export interface ApiApplication {
  id: number;
  userId: number;
  type: "scholarship" | "job";
  referenceId: number;
  status: string;
  documents?: Record<string, unknown> | null;
  notes?: string | null;
  submittedAt: string;
  updatedAt: string;
}

export interface ApiPartner {
  id: number;
  name: string;
  description: string;
  logoUrl?: string | null;
  website?: string | null;
  country: string | null;
  studentCount?: number | null;
  ranking?: string | null;
  isActive: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ApiTestimonial {
  id: number;
  userId: number;
  content: string;
  rating: number;
  imageUrl?: string | null;
  isApproved: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ApiBlogPost {
  id: number;
  title: string;
  content: string;
  excerpt?: string | null;
  imageUrl?: string | null;
  category: string;
  tags?: string[] | null;
  isPublished: boolean | null;
  authorId: number;
  likes: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ApiBlogComment {
  id: number;
  blogPostId: number;
  userId: number;
  content: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ApiTeamMember {
  id: number;
  name: string;
  position: string;
  bio?: string | null;
  imageUrl?: string | null;
  email?: string | null;
  linkedin?: string | null;
  twitter?: string | null;
  order: number | null;
  isActive: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ApiReferral {
  id: number;
  referrerId: number;
  referredUserId?: number | null;
  referredEmail: string;
  status: string;
  rewardAmount: number | null;
  createdAt: string;
  completedAt?: string | null;
}

export interface ApiAnalyticsEvent {
  id: number;
  event: string;
  userId?: number | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  timestamp: string | null;
}

export interface ApiAnalyticsSummary {
  totalUsers: number;
  totalScholarships: number;
  totalJobs: number;
  totalApplications: number;
  activeTestimonials: number;
  publishedBlogPosts: number;
}

export interface ApiSavedItem {
  id: number;
  userId: number;
  type: "scholarship" | "job" | "partner" | "blog_post";
  referenceId: number;
  notes?: string | null;
  createdAt: string;
}

export interface ApiMessage {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
  isRead?: boolean | null;
  createdAt: string | null;
  updatedAt?: string | null;
}
