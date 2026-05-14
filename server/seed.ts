import { db } from "./db";
import { users, scholarships, jobs, partners, blogPosts, teamMembers, testimonials } from "@shared/schema";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding database...");

  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 10);
  const [adminUser] = await db.insert(users).values({
    username: "admin",
    email: "admin@mtendere.com",
    password: hashedPassword,
    firstName: "Admin",
    lastName: "User",
    role: "super_admin",
  }).onConflictDoNothing().returning();

  const adminId = adminUser?.id || 1;

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
      imageUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=800",
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
      imageUrl: "https://images.unsplash.com/photo-1541339907198-e08756ebafe3?auto=format&fit=crop&q=80&w=800",
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
      imageUrl: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&q=80&w=800",
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
      imageUrl: "https://images.unsplash.com/photo-1501426026826-31c667bdf23d?auto=format&fit=crop&q=80&w=800",
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
      imageUrl: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=800",
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
      imageUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=800",
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
      name: "University of Oxford",
      description: "One of the world's leading research universities with over 900 years of history. Partners with Mtendere to offer scholarship pathways for exceptional Malawian students.",
      logoUrl: "https://images.unsplash.com/photo-1569447891824-5c7b02f5ef54?auto=format&fit=crop&q=80&w=200",
      website: "https://ox.ac.uk",
      country: "United Kingdom",
      studentCount: 150,
      ranking: "#1 QS World",
      isActive: true,
    },
    {
      name: "Technical University of Munich",
      description: "Germany's top technical university, partnering with Mtendere for engineering and technology scholarships for African students.",
      logoUrl: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&q=80&w=200",
      website: "https://tum.de",
      country: "Germany",
      studentCount: 85,
      ranking: "#50 QS World",
      isActive: true,
    },
    {
      name: "University of Toronto",
      description: "Canada's top ranked university offering diverse programs and a welcoming multicultural environment for international students from Africa.",
      logoUrl: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=200",
      website: "https://utoronto.ca",
      country: "Canada",
      studentCount: 120,
      ranking: "#34 QS World",
      isActive: true,
    },
    {
      name: "University of Cape Town",
      description: "Africa's top-ranked university, making quality education accessible to students across the continent.",
      logoUrl: "https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?auto=format&fit=crop&q=80&w=200",
      website: "https://uct.ac.za",
      country: "South Africa",
      studentCount: 200,
      ranking: "#226 QS World",
      isActive: true,
    },
    {
      name: "MIT - Massachusetts Institute of Technology",
      description: "World-renowned institute offering STEM education. Partners with Mtendere to identify and support exceptional African talent.",
      logoUrl: "https://images.unsplash.com/photo-1564981797816-1043664bf78d?auto=format&fit=crop&q=80&w=200",
      website: "https://mit.edu",
      country: "USA",
      studentCount: 45,
      ranking: "#1 QS World STEM",
      isActive: true,
    },
    {
      name: "Stellenbosch University",
      description: "Leading South African research university with strong ties to Malawi, offering postgraduate opportunities across all faculties.",
      logoUrl: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&q=80&w=200",
      website: "https://sun.ac.za",
      country: "South Africa",
      studentCount: 175,
      ranking: "#298 QS World",
      isActive: true,
    },
  ]).onConflictDoNothing();

  // Team Members
  await db.insert(teamMembers).values([
    {
      name: "Dr. Chisomo Banda",
      position: "Founder & Executive Director",
      bio: "Dr. Banda founded Mtendere Education Consult with a vision to transform educational access in Malawi. With over 15 years in international education, she has helped thousands of students secure scholarships at world-class universities.",
      imageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400",
      email: "chisomo@mtendereconsult.com",
      linkedin: "https://www.linkedin.com/in/mtendere-education-consult-478133298/",
      isActive: true,
      order: 1,
    },
    {
      name: "Mr. Kondwani Phiri",
      position: "Head of Scholarship Programs",
      bio: "Kondwani manages our scholarship portfolio with meticulous attention to detail. A Rhodes Scholar himself, he understands firsthand the transformative power of international education and guides students through every step of the application process.",
      imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400",
      email: "kondwani@mtendereconsult.com",
      linkedin: "https://www.linkedin.com/in/mtendere-education-consult-478133298/",
      isActive: true,
      order: 2,
    },
    {
      name: "Ms. Takondwa Mwale",
      position: "Career Development Specialist",
      bio: "Takondwa brings 8 years of HR and career coaching experience. She specializes in resume building, interview preparation, and connecting graduates with top employers both locally and internationally.",
      imageUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=400",
      email: "takondwa@mtendereconsult.com",
      linkedin: "https://www.linkedin.com/in/mtendere-education-consult-478133298/",
      isActive: true,
      order: 3,
    },
    {
      name: "Mr. Wyson Chirwa",
      position: "Partnerships & International Relations",
      bio: "Wyson manages our network of 200+ global university partnerships. He travels extensively to strengthen relationships with international institutions and negotiate scholarship slots for Malawian students.",
      imageUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=400",
      email: "wyson@mtendereconsult.com",
      linkedin: "https://www.linkedin.com/in/mtendere-education-consult-478133298/",
      isActive: true,
      order: 4,
    },
    {
      name: "Ms. Grace Nkosi",
      position: "Study Abroad Coordinator",
      bio: "Grace has helped over 500 students navigate the complexities of studying abroad, from university selection to visa applications and pre-departure preparation. She ensures every student is fully prepared for their international journey.",
      imageUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=400",
      email: "grace@mtendereconsult.com",
      isActive: true,
      order: 5,
    },
  ]).onConflictDoNothing();

  // Blog Posts
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
      imageUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=1200",
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
      imageUrl: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&q=80&w=1200",
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
      imageUrl: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&q=80&w=1200",
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
      imageUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=1200",
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
      imageUrl: "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&q=80&w=1200",
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
      imageUrl: "https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&q=80&w=1200",
      tags: ["networking", "career", "LinkedIn", "professional development"],
      isPublished: true,
      authorId: adminId,
      likes: 41,
    },
  ]).onConflictDoNothing();

  // Testimonials
  const [testUser] = await db.insert(users).values({
    username: "student1",
    email: "student1@example.com",
    password: hashedPassword,
    firstName: "Chipo",
    lastName: "Mbewe",
    role: "user",
  }).onConflictDoNothing().returning();

  if (testUser) {
    await db.insert(testimonials).values([
      {
        userId: testUser.id,
        content: "Mtendere Education Consult changed my life completely. With their expert guidance, I secured a full scholarship to study at the University of Oxford. The team was incredibly supportive through every step of my application process. I cannot recommend them highly enough!",
        rating: 5,
        imageUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200",
        isApproved: true,
      },
    ]).onConflictDoNothing();
  }

  console.log("✅ Database seeded successfully!");
}

seed().catch(console.error);
