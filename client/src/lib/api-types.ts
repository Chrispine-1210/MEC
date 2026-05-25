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
  referralCode?: string | null;
}

export interface ApiScholarship {
  id: number;
  title: string;
  slug?: string;
  shortDescription?: string | null;
  fullContent?: string | null;
  description: string;
  institution: string;
  country: string;
  amount: number | null;
  currency: string | null;
  deadline: string;
  requirements: string[] | null;
  category: string;
  imageUrl?: string | null;
  bannerImage?: string | null;
  scholarshipType?: string | null;
  fundingType?: string | null;
  eligibilityCriteria?: string | null;
  countryRestrictions?: string[] | null;
  academicRequirements?: string[] | null;
  openingDate?: string | null;
  fundingAmount?: string | null;
  sponsorOrganization?: string | null;
  benefits?: string[] | null;
  applicationSteps?: string[] | null;
  requiredDocuments?: string[] | null;
  faq?: Array<Record<string, unknown>> | null;
  brochures?: Array<Record<string, unknown>> | null;
  videoEmbeds?: Array<Record<string, unknown>> | null;
  seoMeta?: Record<string, unknown> | null;
  socialMeta?: Record<string, unknown> | null;
  isFeatured?: boolean | null;
  tags?: string[] | null;
  isActive: boolean | null;
  createdBy: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ApiJob {
  id: number;
  title: string;
  slug?: string;
  description: string;
  company: string;
  department?: string | null;
  location: string;
  salary: number | null;
  currency: string | null;
  jobType: string;
  employmentType?: string | null;
  experienceLevel?: string | null;
  responsibilities?: string[] | null;
  qualifications?: string[] | null;
  skills?: string[] | null;
  salaryRange?: string | null;
  salaryMin?: string | null;
  salaryMax?: string | null;
  requirements: string[] | null;
  benefits: string[] | null;
  isRemote: boolean | null;
  deadline: string | null;
  isActive: boolean | null;
  createdBy: number;
  createdAt: string | null;
  updatedAt: string | null;
  imageUrl?: string | null;
  attachments?: Array<Record<string, unknown>> | null;
  seoMeta?: Record<string, unknown> | null;
  socialMeta?: Record<string, unknown> | null;
  tags?: string[] | null;
  isFeatured?: boolean | null;
}

export interface ApiApplication {
  id: number;
  userId: number;
  type: "scholarship" | "job";
  referenceId: number;
  status: string;
  documents?: Record<string, unknown> | null;
  notes?: string | null;
  meta?: {
    stage?: string;
    score?: number;
    shortlist?: boolean;
    reviewerComments?: Array<Record<string, unknown>>;
    reviewHistory?: Array<Record<string, unknown>>;
    documents?: Array<Record<string, unknown>>;
    interviewSchedule?: Array<Record<string, unknown>>;
  } | null;
  submittedAt: string;
  updatedAt: string;
}

export interface ApiPartner {
  id: number;
  name: string;
  description: string;
  logoUrl?: string | null;
  coverImage?: string | null;
  website?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  socialLinks?: Record<string, string> | null;
  industryCategory?: string | null;
  partnershipLevel?: string | null;
  sponsorshipTier?: string | null;
  status?: string | null;
  country: string | null;
  region?: string | null;
  address?: string | null;
  linkedEvents?: Array<Record<string, unknown>> | null;
  partnershipHistory?: Array<Record<string, unknown>> | null;
  studentCount?: number | null;
  ranking?: string | null;
  partnershipType?: string | null;
  videoUrl?: string | null;
  videoTitle?: string | null;
  videoDescription?: string | null;
  isFeatured?: boolean | null;
  isActive: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ApiPartnerVideo {
  id: number;
  partnerId: number;
  partnerName: string;
  title: string;
  description?: string | null;
  videoUrl: string;
  logoUrl?: string | null;
  website?: string | null;
  country?: string | null;
  isFeatured?: boolean | null;
}

export interface ApiTestimonial {
  id: number;
  userId: number;
  authorName?: string | null;
  credential?: string | null;
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

export interface ApiEvent {
  id: number;
  title: string;
  slug: string;
  summary?: string | null;
  description: string;
  category: string;
  eventType: string;
  organizer?: string | null;
  location: string;
  venueName?: string | null;
  address?: string | null;
  mapUrl?: string | null;
  isVirtual: boolean | null;
  virtualUrl?: string | null;
  livestreamUrl?: string | null;
  isPaid: boolean | null;
  priceAmount: number | null;
  currency: string | null;
  capacity: number | null;
  rsvpEnabled?: boolean | null;
  startAt: string;
  endAt: string;
  registrationDeadline?: string | null;
  coverImage?: string | null;
  videoUrl?: string | null;
  tags?: string[] | null;
  ticketTypes?: Array<Record<string, unknown>> | null;
  customFields?: Array<Record<string, unknown>> | null;
  agenda?: Array<Record<string, unknown>> | null;
  speakers?: Array<Record<string, unknown>> | null;
  sponsors?: Array<Record<string, unknown>> | null;
  partners?: Array<Record<string, unknown>> | null;
  faqs?: Array<Record<string, unknown>> | null;
  resources?: Array<Record<string, unknown>> | null;
  attachments?: Array<Record<string, unknown>> | null;
  gallery?: Array<Record<string, unknown>> | null;
  seoMeta?: Record<string, unknown> | null;
  socialMeta?: Record<string, unknown> | null;
  status: string;
  runtimeStatus?: "upcoming" | "live" | "past" | "draft" | "archived" | "cancelled" | string;
  isFeatured: boolean | null;
  isRecommended: boolean | null;
  isTrending: boolean | null;
  allowComments: boolean | null;
  requiresApproval: boolean | null;
  viewCount: number | null;
  shareCount: number | null;
  likeCount: number | null;
  registrationCount?: number;
  approvedRegistrationCount?: number;
  commentCount?: number;
  remainingSeats?: number | null;
  conversionRate?: number;
  createdBy: number;
  createdAt: string | null;
  updatedAt: string | null;
  comments?: ApiEventComment[];
}

export interface ApiEventRegistration {
  id: number;
  eventId: number;
  userId?: number | null;
  fullName: string;
  email: string;
  phone?: string | null;
  organization?: string | null;
  ticketType?: string | null;
  status: string;
  ticketCode: string;
  attendanceStatus: string;
  answers?: Record<string, unknown> | null;
  reminderOptIn: boolean | null;
  source?: string | null;
  qrPayload?: Record<string, unknown> | null;
  approvalNotes?: string | null;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ApiEventComment {
  id: number;
  eventId: number;
  userId?: number | null;
  parentId?: number | null;
  authorName: string;
  authorEmail?: string | null;
  content: string;
  status: string;
  reportCount: number | null;
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

export interface ApiReferralDashboardItem {
  id: number;
  referredUserId: number;
  referredEmail: string;
  status: string;
  fraudStatus: string;
  createdAt: string | null;
  activatedAt: string | null;
  commissionAmount: number;
  commissionStatus: string | null;
  releaseAt: string | null;
}

export interface ApiLedgerEntry {
  id: number;
  walletAccountId?: number | null;
  userId?: number | null;
  commissionId?: number | null;
  payoutRequestId?: number | null;
  direction: string;
  balanceType: string;
  amount: number;
  currency: string;
  entryType: string;
  idempotencyKey: string;
  createdAt: string | null;
}

export interface ApiWalletAccount {
  id: number;
  userId: number;
  currency: string;
  availableBalance: number;
  pendingBalance: number;
  lifetimeEarned: number;
  createdAt: string | null;
}

export interface ApiReferralDashboard {
  referralCode: string | null;
  referralLink: string | null;
  stats: {
    clicks: number;
    signups: number;
    paidConversions: number;
    conversionRate: number;
    pendingEarnings: number;
    availableEarnings: number;
    lifetimeEarned: number;
  };
  wallet: ApiWalletAccount | null;
  referrals: ApiReferralDashboardItem[];
  ledger: ApiLedgerEntry[];
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
  totalEvents?: number;
  activeTestimonials: number;
  publishedBlogPosts: number;
  totalSubscribers?: number;
}

export interface ApiSavedItem {
  id: number;
  userId: number;
  type: "scholarship" | "job" | "partner" | "blog_post" | "event";
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
  isRead: boolean | null;
  createdAt: string | null;
}

export interface ApiSubscriber {
  id: number;
  email: string;
  name?: string | null;
  status: "pending" | "active" | "unsubscribed" | string;
  preferences?: string[] | null;
  source?: string | null;
  verifiedAt?: string | null;
  unsubscribedAt?: string | null;
  lastEmailAt?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}
