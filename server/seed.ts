import { db } from "./db";
import { users, scholarships, jobs, partners, blogPosts, teamMembers, events, testimonials } from "@shared/schema";
import bcrypt from "bcryptjs";
import { eq, inArray, isNull } from "drizzle-orm";
import { ensurePartnerHeroVideoSeeds } from "./partner-video-seeds";

const PASSWORD_HASH_ROUNDS = 12;

const validateSeedSuperAdminPassword = (password: string) => {
  const hasStrongShape =
    password.length >= 12 &&
    password.length <= 128 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password) &&
    !/admin123|password|qwerty|mtendere/i.test(password);

  if (!hasStrongShape) {
    throw new Error(
      "SEED_SUPER_ADMIN_PASSWORD must be 12-128 characters and include uppercase, lowercase, number, and symbol characters.",
    );
  }
};

async function seed() {
  console.log("Seeding database...");

  const superAdminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD || process.env.SUPER_ADMIN_PASSWORD;
  const [existingAdmin] = await db.select().from(users).where(eq(users.username, "admin")).limit(1);
  const [existingSuperAdmin] = await db.select().from(users).where(eq(users.role, "super_admin")).limit(1);
  let adminId = existingAdmin?.id || existingSuperAdmin?.id;

  if (existingAdmin) {
    if (existingAdmin.role !== "super_admin" || existingAdmin.isActive === false) {
      await db
        .update(users)
        .set({ role: "super_admin", isActive: true, updatedAt: new Date() })
        .where(eq(users.id, existingAdmin.id));
    }
    adminId = existingAdmin.id;
  } else if (superAdminPassword) {
    validateSeedSuperAdminPassword(superAdminPassword);
    const hashedPassword = await bcrypt.hash(superAdminPassword, PASSWORD_HASH_ROUNDS);
    const [adminUser] = await db.insert(users).values({
      username: "admin",
      email: process.env.SEED_SUPER_ADMIN_EMAIL || "admin@mtendere.com",
      password: hashedPassword,
      firstName: "Admin",
      lastName: "User",
      role: "super_admin",
      isActive: true,
    }).onConflictDoNothing().returning();
    adminId = adminUser?.id || adminId;
  }

  if (!adminId) {
    throw new Error("No super admin exists. Set SEED_SUPER_ADMIN_PASSWORD before seeding a new database.");
  }

  // Scholarships
  await db.insert(scholarships).values([
    {
      title: "Mastercard Foundation Scholars Program",
      description: "The Mastercard Foundation Scholars Program enables young people from Africa to access quality secondary and university education. The program provides comprehensive support including tuition, accommodation, meals, books, and a laptop.",
      institution: "University of Malawi",
      country: "Malawi",
      amount: 15000,
      currency: "USD",
      deadline: new Date("2026-06-30"),
      requirements: ["Academic excellence", "Demonstrated leadership", "Financial need"],
      category: "STEM",
      imageUrl: "programs/students-campus.jpg",
      isActive: true,
      createdBy: adminId,
    },
    {
      title: "Commonwealth Scholarship for Africa",
      description: "Fully-funded scholarship for African students to pursue postgraduate studies in the UK. Covers tuition, airfare, and monthly stipend for living expenses.",
      institution: "University of Oxford",
      country: "United Kingdom",
      amount: 45000,
      currency: "USD",
      deadline: new Date("2026-09-15"),
      requirements: ["Bachelor's degree with distinction", "2 years work experience", "Nationality from Commonwealth country"],
      category: "Postgraduate",
      imageUrl: "scholarships/application-guidance.jpg",
      isActive: true,
      createdBy: adminId,
    },
    {
      title: "DAAD Study Scholarship Germany",
      description: "Study in Germany with full financial support. The German Academic Exchange Service offers scholarships for African students in all academic disciplines.",
      institution: "Technical University of Munich",
      country: "Germany",
      amount: 12000,
      currency: "EUR",
      deadline: new Date("2026-10-31"),
      requirements: ["Completed Bachelor's degree", "German or English language proficiency", "Minimum GPA of 3.0"],
      category: "Engineering",
      imageUrl: "scholarships/students.jpg",
      isActive: true,
      createdBy: adminId,
    },
    {
      title: "Chevening Scholarship",
      description: "The UK government's global scholarship programme, funded by the Foreign, Commonwealth & Development Office and partner organisations. Offers fully-funded Masters degrees.",
      institution: "London School of Economics",
      country: "United Kingdom",
      amount: 50000,
      currency: "GBP",
      deadline: new Date("2026-11-05"),
      requirements: ["2 years work experience", "Leadership qualities", "Return to home country commitment"],
      category: "Leadership",
      imageUrl: "programs/abroad-students.jpg",
      isActive: true,
      createdBy: adminId,
    },
    {
      title: "African Development Bank Scholarship",
      description: "Scholarships for outstanding African students to pursue postgraduate studies in accredited universities in Africa. Focuses on disciplines critical to Africa's development.",
      institution: "African Development Bank",
      country: "Pan-African",
      amount: 20000,
      currency: "USD",
      deadline: new Date("2026-07-31"),
      requirements: ["African citizenship", "Excellent academic record", "Focus on development-related fields"],
      category: "Development",
      imageUrl: "projects/foundation.jpg",
      isActive: true,
      createdBy: adminId,
    },
    {
      title: "Inlaks Shivdasani Foundation Scholarship",
      description: "Provides funding for exceptional young Indians and Africans to study at leading universities. For study at top-ranked universities abroad.",
      institution: "Various Top Universities",
      country: "USA / UK",
      amount: 80000,
      currency: "USD",
      deadline: new Date("2026-04-15"),
      requirements: ["Age under 30", "First-class degree", "Demonstrated exceptional talent"],
      category: "Arts & Sciences",
      imageUrl: "scholarships/application-registration.jpg",
      isActive: true,
      createdBy: adminId,
    },
  ]).onConflictDoNothing();

  // Jobs
  await db.insert(jobs).values([
    {
      title: "Software Engineer (Junior)",
      description: "Join our growing tech team as a Junior Software Engineer. You will work on building and maintaining web applications using modern technologies. Great opportunity for recent graduates.",
      company: "TechMalawi Solutions",
      location: "Lilongwe, Malawi",
      salary: 8000,
      currency: "USD",
      jobType: "Full-time",
      requirements: ["Bachelor's in Computer Science", "JavaScript/Python knowledge", "Team player"],
      benefits: ["Health insurance", "Annual bonus", "Professional development budget"],
      isRemote: false,
      deadline: new Date("2026-05-30"),
      isActive: true,
      createdBy: adminId,
    },
    {
      title: "Marketing Manager",
      description: "Lead our marketing team in creating and implementing effective marketing strategies. Must have experience in digital marketing and brand management for African markets.",
      company: "African Growth Partners",
      location: "Blantyre, Malawi",
      salary: 15000,
      currency: "USD",
      jobType: "Full-time",
      requirements: ["5+ years marketing experience", "MBA preferred", "Digital marketing skills"],
      benefits: ["Company car", "Performance bonus", "Housing allowance"],
      isRemote: false,
      deadline: new Date("2026-06-15"),
      isActive: true,
      createdBy: adminId,
    },
    {
      title: "Data Analyst (Remote)",
      description: "Analyze complex datasets to derive actionable insights for our global clients. Work from anywhere in Africa while collaborating with international teams.",
      company: "Global Analytics Inc.",
      location: "Remote",
      salary: 25000,
      currency: "USD",
      jobType: "Full-time",
      requirements: ["Python or R proficiency", "SQL expertise", "3+ years experience"],
      benefits: ["Remote work", "Flexible hours", "Competitive salary"],
      isRemote: true,
      deadline: new Date("2026-07-01"),
      isActive: true,
      createdBy: adminId,
    },
    {
      title: "Project Manager - NGO",
      description: "Manage education and community development projects across Malawi. Partner with international donors and local communities to deliver impactful programs.",
      company: "USAID Malawi",
      location: "Lilongwe, Malawi",
      salary: 35000,
      currency: "USD",
      jobType: "Contract",
      requirements: ["PMP certification preferred", "5+ years NGO experience", "Fluent in English and Chichewa"],
      benefits: ["International exposure", "Housing support", "Travel allowance"],
      isRemote: false,
      deadline: new Date("2026-05-20"),
      isActive: true,
      createdBy: adminId,
    },
  ]).onConflictDoNothing();

  // Partners
  await db.insert(partners).values([
    {
      name: "Chandigarh University",
      description: "A globally connected Indian university pathway with campus, scholarship, and student support routes for international students.",
      logoUrl: "partners/cu-logo-white.webp",
      website: "https://www.cuchd.in",
      country: "India",
      studentCount: 150,
      ranking: "QS Asia ranked",
      isActive: true,
    },
    {
      name: "GBS Dubai",
      description: "Career-focused higher education routes for students comparing business, finance, hospitality, and professional programs in the UAE.",
      logoUrl: "partners/gbs-dubai.webp",
      website: "https://gbs.ac.ae",
      country: "United Arab Emirates",
      studentCount: 85,
      ranking: "Career-led",
      isActive: true,
    },
    {
      name: "CT University",
      description: "Applied learning and technology-focused university pathway for students seeking practical, career-connected degree programs.",
      logoUrl: "logos/ct-logo.png",
      website: "https://ctuniversity.in",
      country: "India",
      studentCount: 120,
      ranking: "Partner",
      isActive: true,
    },
    {
      name: "Amity University",
      description: "Global university network offering pathways across business, law, computing, applied sciences, and international programs.",
      logoUrl: "logos/au-logo.png",
      website: "https://amity.edu",
      country: "India",
      studentCount: 200,
      ranking: "Global",
      isActive: true,
    },
    {
      name: "MSM Unify",
      description: "International education marketplace and partner network helping students compare study destinations and admissions routes.",
      logoUrl: "logos/msm-unify-logo.png",
      website: "https://www.msmunify.com",
      country: "Global",
      studentCount: 45,
      ranking: "Network",
      isActive: true,
    },
    {
      name: "GEDU Global Education",
      description: "Global education network connecting students with international institutions, foundation routes, and degree pathways.",
      logoUrl: "logos/gedu-logo.png",
      website: "https://gedu.global",
      country: "Global",
      studentCount: 175,
      ranking: "Global",
      isActive: true,
    },
  ]).onConflictDoNothing();

  await ensurePartnerHeroVideoSeeds();

  // Team Members
  await db.insert(teamMembers).values([
    {
      name: "Mr. Rabson Kaluwile",
      position: "Board Chairperson",
      bio: "MSc. Environmental Health, University of Dundee, Scotland. Provides board leadership and governance oversight for Mtendere Education Consult.",
      imageUrl: "team/mr. rabson.jpg",
      email: null,
      linkedin: "https://www.linkedin.com/in/mtendere-education-consult-478133298/",
      isActive: true,
      order: 1,
    },
    {
      name: "Dr. Daniel S. Nyangulu",
      position: "Board Member",
      bio: "MB ChB, University of Manchester, England. Contributes board-level guidance informed by medical training and professional judgment.",
      imageUrl: "team/dr. daniel.jpg",
      email: null,
      linkedin: "https://www.linkedin.com/in/mtendere-education-consult-478133298/",
      isActive: true,
      order: 2,
    },
    {
      name: "Dr. Gabriella Chiutsi Phiri",
      position: "Board Member",
      bio: "PhD in Rural Development and Extension. Brings rural development and extension expertise to Mtendere's governance and community impact work.",
      imageUrl: null,
      email: null,
      linkedin: "https://www.linkedin.com/in/mtendere-education-consult-478133298/",
      isActive: true,
      order: 3,
    },
    {
      name: "Brenda Gondwe",
      position: "Board Member",
      bio: "BA in Leadership and Management. Supports the board with leadership and management insight.",
      imageUrl: "team/ms brenda.jpg",
      email: null,
      linkedin: "https://www.linkedin.com/in/mtendere-education-consult-478133298/",
      isActive: true,
      order: 4,
    },
    {
      name: "Brenda Tawina Kumwembe",
      position: "Lead Consultant",
      bio: "BA in Management and Public Relations. Leads consulting work across student guidance, public relations, and client support.",
      imageUrl: "team/Brend tawina.jpg",
      email: null,
      isActive: true,
      order: 5,
    },
    {
      name: "George Kaluwile",
      position: "Chief Marketing Officer",
      bio: "BA in International Management. Guides marketing and growth efforts for Mtendere.",
      imageUrl: "team/george.jpg",
      email: null,
      isActive: true,
      order: 6,
    },
    {
      name: "Christopher Nazonse Waluza",
      position: "Admissions Coordinator",
      bio: "BA in Development Studies. Coordinates admissions support and application workflows.",
      imageUrl: "team/christoper.jpg",
      email: null,
      isActive: true,
      order: 7,
    },
    {
      name: "Timothy Mahwayo",
      position: "Admin and Finance Officer",
      bio: "Accounting. Supports administration and finance functions for reliable student service delivery.",
      imageUrl: "team/timothy.jpg",
      email: null,
      isActive: true,
      order: 8,
    },
  ]).onConflictDoNothing();

  // Events
  await db.insert(events).values([
    {
      title: "Scholarship Application Masterclass",
      slug: "scholarship-application-masterclass",
      summary: "A practical workshop for students preparing competitive scholarship applications.",
      description: "Join Mtendere consultants for a hands-on scholarship application masterclass covering opportunity matching, personal statements, recommendation planning, document readiness, and interview preparation.",
      category: "Scholarships",
      eventType: "Workshop",
      location: "Lilongwe, Malawi",
      venueName: "Mtendere Education Consult",
      address: "Lilongwe, Malawi",
      isVirtual: false,
      isPaid: false,
      priceAmount: 0,
      currency: "MWK",
      capacity: 120,
      startAt: new Date("2026-06-12T08:30:00"),
      endAt: new Date("2026-06-12T12:30:00"),
      registrationDeadline: new Date("2026-06-10T17:00:00"),
      coverImage: "events/IMG-20250321-WA0250.jpg",
      tags: ["scholarships", "applications", "students"],
      agenda: [
        { time: "08:30", title: "Registration and orientation" },
        { time: "09:00", title: "Finding best-fit scholarships" },
        { time: "10:30", title: "Statement of purpose clinic" },
        { time: "11:45", title: "Q&A and next steps" },
      ],
      speakers: [
        { name: "Brenda Tawina Kumwembe", role: "Lead Consultant" },
        { name: "Christopher Nazonse Waluza", role: "Admissions Coordinator" },
      ],
      sponsors: [{ name: "Mtendere Education Consult" }],
      faqs: [
        { question: "Is this event free?", answer: "Yes, registration is free but seats are limited." },
        { question: "Should I bring documents?", answer: "Bring transcripts, certificates, and any draft personal statement if available." },
      ],
      resources: [{ title: "Application checklist", url: "/application-form.pdf" }],
      status: "published",
      isFeatured: true,
      isRecommended: true,
      isTrending: true,
      allowComments: true,
      requiresApproval: false,
      createdBy: adminId,
    },
    {
      title: "Virtual Study Abroad Briefing",
      slug: "virtual-study-abroad-briefing",
      summary: "A live online briefing for students comparing international study pathways.",
      description: "This virtual event explains university selection, program fit, visa timelines, budgeting, accommodation, and pre-departure planning for students exploring study abroad options.",
      category: "Study Abroad",
      eventType: "Live Briefing",
      location: "Virtual",
      venueName: "Online",
      isVirtual: true,
      virtualUrl: "https://meet.google.com/",
      livestreamUrl: "https://meet.google.com/",
      isPaid: false,
      priceAmount: 0,
      currency: "MWK",
      capacity: 300,
      startAt: new Date("2026-06-20T18:00:00"),
      endAt: new Date("2026-06-20T19:30:00"),
      registrationDeadline: new Date("2026-06-20T12:00:00"),
      coverImage: "events/IMG-20221029-WA0058.jpg",
      tags: ["study-abroad", "virtual", "university"],
      agenda: [
        { time: "18:00", title: "Study destination overview" },
        { time: "18:35", title: "Application and visa planning" },
        { time: "19:10", title: "Live Q&A" },
      ],
      speakers: [{ name: "George Kaluwile", role: "Chief Marketing Officer" }],
      sponsors: [{ name: "Mtendere Education Consult" }],
      faqs: [{ question: "Will a recording be available?", answer: "Registered attendees will receive follow-up resources after the session." }],
      resources: [{ title: "Study abroad planning guide", url: "/study-abroad" }],
      status: "published",
      isFeatured: false,
      isRecommended: true,
      isTrending: false,
      allowComments: true,
      requiresApproval: false,
      createdBy: adminId,
    },
    {
      title: "Career Readiness and CV Review Day",
      slug: "career-readiness-cv-review-day",
      summary: "An in-person event for CV reviews, interview preparation, and job-search planning.",
      description: "Students and job seekers can receive practical support on CV structure, interview readiness, LinkedIn positioning, and job-search strategy during this interactive career support event.",
      category: "Careers",
      eventType: "Clinic",
      location: "Lilongwe, Malawi",
      venueName: "Mtendere Education Consult",
      address: "Lilongwe, Malawi",
      isVirtual: false,
      isPaid: false,
      priceAmount: 0,
      currency: "MWK",
      capacity: 80,
      startAt: new Date("2026-07-05T09:00:00"),
      endAt: new Date("2026-07-05T14:00:00"),
      registrationDeadline: new Date("2026-07-03T17:00:00"),
      coverImage: "events/IMG-20220907-WA0124.jpg",
      tags: ["careers", "cv", "jobs"],
      agenda: [
        { time: "09:00", title: "Career planning briefing" },
        { time: "10:00", title: "CV review rotations" },
        { time: "12:30", title: "Mock interview practice" },
      ],
      speakers: [{ name: "Timothy Mahwayo", role: "Admin and Finance Officer" }],
      sponsors: [{ name: "Mtendere Education Consult" }],
      faqs: [{ question: "Can non-students attend?", answer: "Yes, job seekers and recent graduates are welcome." }],
      resources: [{ title: "Resume support", url: "/resume-building" }],
      status: "published",
      isFeatured: false,
      isRecommended: false,
      isTrending: true,
      allowComments: true,
      requiresApproval: true,
      createdBy: adminId,
    },
  ]).onConflictDoNothing();

  // Blog Posts
  const legacyBlogTitles = [
    "Top 10 Scholarships for Malawian Students in 2026",
    "How to Write a Winning Statement of Purpose",
    "Life as a Malawian Student in Germany: A Complete Guide",
    "Building a Career in International Development: A Roadmap",
    "Student Visa Success: Avoiding Common Rejection Reasons",
    "The Power of Networking: How to Build Connections That Launch Careers",
  ];

  const officialBlogSeeds = [
    {
      title: "India Education Expo 2024 at Crossroads Hotel",
      createdAt: new Date("2024-02-10T09:00:00"),
      category: "Events",
      imageUrl: "events/IMG-20250321-WA0250.jpg",
      tags: ["India", "Education Expo", "Events"],
      likes: 84,
      excerpt:
        "The India Education Expo 2024 connected Indian education officials, Malawian stakeholders, parents, and prospective students at Crossroads Hotel.",
      content: `# India Education Expo 2024 at Crossroads Hotel
The India Education Expo 2024 was held at Crossroads Hotel, bringing together Indian education officials, Malawian stakeholders, parents, and prospective students. The event created a practical platform for students to compare academic pathways, understand scholarship options, and speak directly with people connected to Indian higher education.

## A platform for international opportunity
The expo showcased the range of academic opportunities available in India, from undergraduate pathways to postgraduate progression. Students and families received firsthand guidance on admissions expectations, program selection, documentation, campus life, and the realities of preparing for study abroad.

## Why the expo mattered
For many students, international education can feel distant until they meet representatives and advisors who can explain the journey clearly. The Crossroads Hotel expo made that process more transparent by bringing information, counseling, and institutional relationships into one room.

## What students and parents gained
- Direct exposure to Indian education pathways and available programs.
- A clearer understanding of scholarships, tuition planning, and application readiness.
- Space to ask practical questions about visas, accommodation, student support, and cultural adjustment.
- Confidence that study in India can be planned through credible guidance and structured preparation.

## Strengthening Malawi-India education links
The event highlighted the growing partnership between Malawi and India in higher education. It also reinforced Mtendere Education Consult's role as a bridge between students in Malawi and international institutions that can open doors for their academic and professional growth.

## About the Author
Mtendere Education Consult is an education consultancy committed to creating international opportunities for students across Malawi through guidance, partnerships, mentorship, and transparent application support.`,
    },
    {
      title: "Celebrating 50+ Students Awarded Partial Scholarships to India",
      createdAt: new Date("2022-07-16T10:00:00"),
      category: "Scholarships",
      imageUrl: "events/IMG-20221029-WA0058.jpg",
      tags: ["Scholarships", "India", "Mentorship"],
      likes: 96,
      excerpt:
        "A mentorship and send-off ceremony celebrated more than 50 students who secured partial scholarships to pursue studies in India.",
      content: `# Celebrating 50+ Students Awarded Partial Scholarships to India
On July 16, 2022, Mtendere Education Consult hosted a mentorship and send-off ceremony to celebrate more than 50 students who secured partial scholarships to study in India. The gathering recognized the students' hard work while preparing them emotionally and practically for the next stage of their academic journey.

## A moment of recognition and responsibility
The ceremony was more than a celebration. It was a reminder that every scholarship comes with responsibility: to study with discipline, represent Malawi well, support one another abroad, and return with knowledge that can contribute to families, communities, and the country.

## Guidance from respected guests
The guest of honour was Justice Gloria Nomondwe of the High Court. She was joined by Dr. Naomi Mvula of LUANAR and Mr. Phiri from the Ministry of Foreign Affairs. Their words encouraged students to approach the opportunity with humility, courage, and seriousness of purpose.

## Mentorship before departure
Students received practical encouragement on adjusting to a new country, staying focused, managing expectations, and building healthy academic routines. Families also had a chance to understand the transition and celebrate the achievement with pride.

## Why this milestone matters
More than 50 students earning partial scholarships represents a powerful signal: Malawian students can compete for international opportunities when they receive the right information, preparation, and mentorship. The ceremony strengthened Mtendere's commitment to scholarship access and student success.

## About the Author
Mtendere Education Consult is an education consultancy committed to creating international opportunities for students across Malawi through guidance, partnerships, mentorship, and transparent application support.`,
    },
    {
      title: "Students Departure at Kamuzu International Airport",
      createdAt: new Date("2023-09-05T08:00:00"),
      category: "Study Abroad",
      imageUrl: "events/IMG-20220907-WA0124.jpg",
      tags: ["Departure", "Study Abroad", "Student Journey"],
      likes: 71,
      excerpt:
        "Students departing from Kamuzu International Airport began a new chapter in their international education journey with support from families and mentors.",
      content: `# Students Departure at Kamuzu International Airport
The departure of students from Kamuzu International Airport marked the beginning of a new chapter in their educational journey. Families, friends, and mentors gathered to bid farewell with pride, emotion, and encouragement as the students prepared to continue their studies abroad.

## The meaning behind the departure
Every airport farewell carries a bigger story. For these students, the journey represented years of effort, family sacrifice, academic ambition, and the belief that international education can expand what is possible for young Malawians.

## Support beyond the ticket
Before departure, students were guided on travel readiness, documentation, expectations abroad, communication with families, and the importance of staying connected to their goals. This kind of preparation helps students move with more confidence and less uncertainty.

## Carrying Malawi into the world
The moment symbolized not only the pursuit of academic dreams but also the strengthening of Malawi's global presence through its students abroad. Each student carried the hopes of their communities and the responsibility to learn, grow, and make an impact.

## A journey that continues
Departure is not the end of the support process. Mtendere continues to encourage students to remain focused, seek help when needed, build strong networks, and use their international exposure to become more capable contributors wherever their path leads.

## About the Author
Mtendere Education Consult is an education consultancy committed to creating international opportunities for students across Malawi through guidance, partnerships, mentorship, and transparent application support.`,
    },
    {
      title: "European Education Expo with GEDU at Crossroads Hotel",
      createdAt: new Date("2023-10-22T09:00:00"),
      category: "Partnerships",
      imageUrl: "events/IMG-20230311-WA0110.jpg",
      tags: ["Europe", "Education Expo", "Partnerships"],
      likes: 79,
      excerpt:
        "Mtendere Education Consult and GEDU hosted a European Education Expo at Crossroads Hotel for students, principals, and education-sector stakeholders.",
      content: `# European Education Expo with GEDU at Crossroads Hotel
The European Education Expo, hosted by Mtendere Education Consult in collaboration with GEDU, was a remarkable event at Crossroads Hotel. It brought together senior students, principals, organizations, and stakeholders from the education sector to explore study opportunities connected to Europe.

## Connecting students to European pathways
The expo gave Malawian students a chance to learn about European institutions, available programs, admission expectations, and the wider benefits of international exposure. It also helped students understand how to compare destinations and choose pathways that match their goals.

## A strong partnership moment
Working with GEDU strengthened the credibility and reach of the event. The collaboration demonstrated how international partnerships can help students access better information, clearer options, and structured support before making major education decisions.

## Value for schools and stakeholders
Principals and education leaders were able to see how international study pathways can complement local academic preparation. Organizations and stakeholders also had space to connect around shared goals: student mobility, responsible guidance, and improved access to global learning.

## Mtendere's bridge-building role
The expo underscored Mtendere's role in bridging international opportunities for young scholars. By bringing institutions, schools, families, and students together, the event turned interest in Europe into a more informed and actionable education conversation.

## About the Author
Mtendere Education Consult is an education consultancy committed to creating international opportunities for students across Malawi through guidance, partnerships, mentorship, and transparent application support.`,
    },
  ];

  for (const blogSeed of officialBlogSeeds) {
    const [existingPost] = await db.select().from(blogPosts).where(eq(blogPosts.title, blogSeed.title)).limit(1);
    const values = { ...blogSeed, isPublished: true, authorId: adminId, updatedAt: new Date() };

    if (existingPost) {
      await db.update(blogPosts).set(values).where(eq(blogPosts.id, existingPost.id));
    } else {
      await db.insert(blogPosts).values(values);
    }
  }

  await db.update(blogPosts).set({ isPublished: false, updatedAt: new Date() }).where(inArray(blogPosts.title, legacyBlogTitles));

  if (process.env.SEED_LEGACY_BLOGS === "true") {
  await db.insert(blogPosts).values([
    {
      title: "Top 10 Scholarships for Malawian Students in 2026",
      content: `Education is the most powerful tool for change in Malawi. In this comprehensive guide, we cover the top 10 fully-funded scholarships available to Malawian students in 2026.

## 1. Mastercard Foundation Scholars Program
The Mastercard Foundation Scholars Program is one of the most prestigious scholarship programs in Africa. It offers fully-funded education from secondary school through university, including tuition, accommodation, meals, books, and a laptop.

## 2. Commonwealth Scholarship
The Commonwealth Scholarship offers Malawian students the opportunity to pursue postgraduate studies in the UK. It covers tuition fees, airfare, and monthly living stipends.

## 3. Chevening Scholarship
Funded by the UK government, Chevening offers fully-funded Masters programs for future leaders. Applications typically open in August each year.

## Key Tips for Successful Applications
- Start early — most scholarship deadlines are 6-12 months before the study period begins
- Tailor your statement of purpose to each scholarship
- Get strong recommendation letters from academic and professional references
- Demonstrate leadership and community impact in your application

Contact Mtendere Education Consult for personalized guidance on your scholarship journey.`,
      excerpt: "Discover the top 10 fully-funded scholarships available to Malawian students in 2026, with expert tips on how to make your application stand out.",
      category: "Scholarships",
      imageUrl: "blogs/application-guidance.jpg",
      tags: ["scholarships", "education", "malawi", "2026"],
      isPublished: true,
      authorId: adminId,
      likes: 48,
    },
    {
      title: "How to Write a Winning Statement of Purpose",
      content: `Your Statement of Purpose (SOP) is often the most critical component of your university or scholarship application. A well-written SOP can be the difference between acceptance and rejection.

## What Admissions Committees Look For
Admissions committees look for three key elements in every SOP:
1. **Academic preparation** - Why are you academically ready for this program?
2. **Professional motivation** - What drives your passion for this field?
3. **Future goals** - How will this program help you achieve your objectives?

## Structure Your SOP for Maximum Impact
**Introduction (1 paragraph)**: Start with a compelling hook that immediately captures attention. Avoid clichés like "From a young age, I have always been passionate about..."

**Academic Background (1-2 paragraphs)**: Highlight key academic achievements and research experiences.

**Professional Experience (1-2 paragraphs)**: Connect your work experience to your academic goals.

**Why This Program (1 paragraph)**: Specific reasons why THIS program at THIS university.

**Future Plans (1 paragraph)**: Clear, realistic post-graduation plans.

## Common Mistakes to Avoid
- Being too vague about your goals
- Repeating your CV without adding context
- Using overly formal or complex language
- Ignoring the specific prompts in the application

Our team at Mtendere Education Consult offers professional SOP editing and review services. Schedule a consultation today.`,
      excerpt: "Master the art of writing a compelling Statement of Purpose with our expert guide. Learn the structure, common mistakes, and pro tips that win scholarships.",
      category: "Tips & Guides",
      imageUrl: "blogs/counselling-mentorship.jpg",
      tags: ["application tips", "SOP", "writing", "scholarships"],
      isPublished: true,
      authorId: adminId,
      likes: 72,
    },
    {
      title: "Life as a Malawian Student in Germany: A Complete Guide",
      content: `Germany has become one of the most popular destinations for African students due to its world-class education system and tuition-free universities. Here's everything you need to know about studying in Germany as a Malawian student.

## Why Choose Germany?
- Most public universities charge no tuition fees
- Strong engineering and technology programs
- Rich cultural diversity and international community
- Gateway to European job market

## Visa Requirements for Malawian Students
1. Acceptance letter from a German university
2. Proof of financial means (€10,236 per year in a blocked account)
3. German language proficiency (for German-taught programs)
4. Health insurance coverage

## Cost of Living
Germany is surprisingly affordable compared to UK or USA:
- Accommodation: €300-600/month
- Food: €150-200/month
- Transport: Semester ticket covers all public transport

## Success Story: Kondwani from Blantyre
"I arrived in Munich with my DAAD scholarship and initially struggled with the language barrier. But within a semester, I had made friends from 40 different countries and felt completely at home. The academic quality is exceptional."

Contact Mtendere Education Consult for personalized guidance on studying in Germany.`,
      excerpt: "Everything a Malawian student needs to know about studying in Germany — from visa requirements and costs to cultural adaptation and career opportunities.",
      category: "Study Abroad",
      imageUrl: "blogs/chiunda-campus.jpg",
      tags: ["germany", "study abroad", "europe", "DAAD"],
      isPublished: true,
      authorId: adminId,
      likes: 34,
    },
    {
      title: "Building a Career in International Development: A Roadmap",
      content: `International development is one of the most rewarding career paths for Malawians with a desire to create lasting impact. Organizations like the World Bank, UN, USAID, and African Development Bank offer exceptional opportunities.

## Entry Pathways
**Academic Route**: A Master's in International Development, Public Policy, or Economics from a top institution significantly boosts your chances.

**Experience Route**: Start with local NGOs and build experience before transitioning to international organizations.

## Essential Skills
- Project management (PMP certification is valuable)
- Data analysis and monitoring & evaluation
- Grant writing and donor reporting
- Cross-cultural communication

## Top Organizations Hiring in Africa
1. World Bank Group
2. African Development Bank
3. USAID and bilateral aid agencies
4. UN agencies (UNICEF, UNDP, WFP)
5. International NGOs (Oxfam, Save the Children, etc.)

## Salary Expectations
Entry-level positions at international organizations typically pay $40,000-60,000 USD with additional benefits including hardship allowances, housing, and travel.

Book a career counseling session with our specialists to map your personalized development career roadmap.`,
      excerpt: "Your comprehensive roadmap to building a successful career in international development, from entry pathways to salary expectations and top employers.",
      category: "Career",
      imageUrl: "blogs/career-motivation.jpg",
      tags: ["career", "international development", "NGO", "World Bank"],
      isPublished: true,
      authorId: adminId,
      likes: 29,
    },
    {
      title: "Student Visa Success: Avoiding Common Rejection Reasons",
      content: `Visa rejection is one of the biggest fears for international students. Understanding why applications get rejected and how to address those concerns can make all the difference.

## Top Reasons for Student Visa Rejection

### 1. Insufficient Proof of Financial Support
Embassies need to see that you can fund your studies and living expenses. A sponsorship letter and bank statements showing consistent, adequate funds are essential.

### 2. Weak Ties to Home Country
Visa officers want to be confident you'll return home after your studies. Strong ties include property ownership, family responsibilities, a job offer, and clear professional plans.

### 3. Gaps in Academic Records
Unexplained gaps in education or employment raise red flags. Prepare honest, documented explanations for any gaps in your application history.

### 4. Inconsistencies in Application
Every detail across your application must be consistent — dates, addresses, names, and statements should all match exactly.

## Preparation Checklist
- [ ] Original acceptance letter from university
- [ ] Financial statements (6 months bank statements)
- [ ] Sponsorship letter if applicable
- [ ] Proof of ties to Malawi
- [ ] Complete travel history
- [ ] Valid passport (at least 6 months beyond study period)

Our visa application support service has a 94% approval rate. Contact us today.`,
      excerpt: "Learn the most common reasons student visa applications are rejected and exactly how to address each one to maximize your chances of approval.",
      category: "Visa",
      imageUrl: "scholarships/application-registration.jpg",
      tags: ["visa", "student visa", "travel", "immigration"],
      isPublished: true,
      authorId: adminId,
      likes: 56,
    },
    {
      title: "The Power of Networking: How to Build Connections That Launch Careers",
      content: `In today's competitive job market, what you know matters — but who you know can be the deciding factor. Effective networking is a skill that can be learned and developed.

## Why Networking Matters More in Africa
In African job markets, particularly in Malawi, personal relationships and trust are foundational to business culture. A warm introduction from a mutual contact can open doors that cold applications simply cannot.

## Where to Network Effectively

### Online Platforms
- **LinkedIn**: The most powerful professional networking tool globally
- **Twitter/X**: Great for connecting with thought leaders in your field
- **Professional associations**: Sector-specific forums and groups

### In-Person Events
- Industry conferences and workshops
- Alumni meetups
- University career fairs
- Chamber of commerce events

## How to Approach Networking
1. **Give before you ask**: Offer value before requesting favors
2. **Be specific**: "I'm looking for advice on breaking into development finance" beats "I'm looking for a job"
3. **Follow up consistently**: Send a thank you message within 24 hours
4. **Stay in touch**: Regular, meaningful check-ins maintain relationships

## The Mtendere Alumni Network
As a Mtendere client, you gain access to our global alumni network of 10,000+ successful graduates who actively mentor and support new members. Book your consultation to get started.`,
      excerpt: "Master the art of professional networking with our expert guide. Learn where to network, how to approach connections, and leverage relationships for career success.",
      category: "Career",
      imageUrl: "jobs/corporate.jpg",
      tags: ["networking", "career", "LinkedIn", "professional development"],
      isPublished: true,
      authorId: adminId,
      likes: 41,
    },
  ]).onConflictDoNothing();
  }

  // Testimonials
  await db.delete(testimonials).where(isNull(testimonials.authorName));

  const testimonialSeeds = [
    {
      authorName: "Janet Kandulu",
      credential: "Bs Nutrition and Dietetics, Chandigarh University",
      content:
        "Mtendere Education Consult helped me get into my dream university in India. Their guidance through the entire process was invaluable!",
      rating: 5,
      imageUrl: "students/Janet Kandulu.jpg",
      isApproved: true,
    },
    {
      authorName: "Edna Karonga",
      credential: "Masters Degree in Business Administration, Chandigarh university",
      content: "The team at Mtendere made my application process seamless and stress-free.",
      rating: 5,
      imageUrl: "students/Edna Kalonga.jpg",
      isApproved: true,
    },
    {
      authorName: "Ian Ndola",
      credential: "MBA, University of Alabama USA",
      content:
        "When I was lost about where to start, Mtendere Education Consult provided the clarity and support I needed to pursue my studies abroad.",
      rating: 5,
      imageUrl: "students/Ian Ndola.jpg",
      isApproved: true,
    },
  ];

  for (const [index, testimonialSeed] of testimonialSeeds.entries()) {
    const createdAt = new Date(Date.now() - index * 60_000);
    const [existingTestimonial] = await db
      .select()
      .from(testimonials)
      .where(eq(testimonials.authorName, testimonialSeed.authorName))
      .limit(1);

    if (existingTestimonial) {
      await db
        .update(testimonials)
        .set({ ...testimonialSeed, createdAt, updatedAt: new Date() })
        .where(eq(testimonials.id, existingTestimonial.id));
    } else {
      await db.insert(testimonials).values({
        ...testimonialSeed,
        userId: adminId,
        createdAt,
      });
    }
  }

  console.log("✅ Database seeded successfully!");
}

seed().catch(console.error);
