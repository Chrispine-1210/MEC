import { eq } from "drizzle-orm";
import { partners } from "@shared/schema";
import { db } from "./db";
import { getPartnerMeta, setPartnerMeta } from "./admin-state";

type PartnerHeroVideoSeed = {
  name: string;
  description: string;
  website?: string;
  country: string;
  logoUrl?: string;
  ranking?: string;
  partnershipType: string;
  videoUrl: string;
  videoTitle: string;
  videoDescription: string;
  isFeatured: boolean;
};

export const partnerHeroVideoSeeds: PartnerHeroVideoSeed[] = [
  {
    name: "Chandigarh University",
    description:
      "Chandigarh University partner pathway for students exploring globally connected programs, campus life, and scholarship-supported study routes.",
    website: "https://www.cuchd.in",
    country: "India",
    logoUrl: "partners/cu-logo-white.webp",
    ranking: "QS Asia ranked private university",
    partnershipType: "University Partner",
    videoUrl: "https://youtu.be/xXPDde9pap4",
    videoTitle: "Chandigarh University Campus Tour",
    videoDescription:
      "A partner university campus preview for students comparing international study destinations and student life.",
    isFeatured: true,
  },
  {
    name: "Perul University",
    description:
      "Perul University partner pathway for students exploring Indian higher education, campus culture, and career-focused academic programs.",
    country: "India",
    partnershipType: "University Partner",
    videoUrl: "https://www.youtube.com/watch?v=1-z5Rn5Y-mI",
    videoTitle: "Perul University Partner Preview",
    videoDescription:
      "A partner university video preview managed from Admin for the homepage hero rotation.",
    isFeatured: true,
  },
  {
    name: "GBS Dubai",
    description:
      "GBS Dubai offers career-focused higher education routes for students comparing business, finance, and professional programs in the UAE.",
    website: "https://gbs.ac.ae",
    country: "United Arab Emirates",
    logoUrl: "partners/gbs-dubai.webp",
    partnershipType: "University Partner",
    videoUrl: "https://www.youtube.com/watch?v=fF8ysli2hAw",
    videoTitle: "GBS Dubai Partner Pathway",
    videoDescription:
      "A UAE education partner preview for students considering business, finance, and professional study routes.",
    isFeatured: true,
  },
];

const getExistingPartnerByName = async (name: string) => {
  const [partner] = await db
    .select()
    .from(partners)
    .where(eq(partners.name, name))
    .limit(1);

  return partner;
};

export async function ensurePartnerHeroVideoSeeds() {
  const seededPartners = [];

  for (const seed of partnerHeroVideoSeeds) {
    let partner = await getExistingPartnerByName(seed.name);

    if (!partner) {
      const [createdPartner] = await db
        .insert(partners)
        .values({
          name: seed.name,
          description: seed.description,
          logoUrl: seed.logoUrl ?? null,
          website: seed.website ?? null,
          country: seed.country,
          ranking: seed.ranking ?? null,
          isActive: true,
        })
        .returning();

      partner = createdPartner;
    } else if (partner.isActive === false) {
      const [updatedPartner] = await db
        .update(partners)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(partners.id, partner.id))
        .returning();

      partner = updatedPartner;
    }

    const meta = getPartnerMeta(partner.id);
    setPartnerMeta(partner.id, {
      partnershipType: meta.partnershipType ?? seed.partnershipType,
      logo: meta.logo ?? seed.logoUrl ?? "",
      region: meta.region ?? seed.country,
      videoUrl: meta.videoUrl || seed.videoUrl,
      videoTitle: meta.videoTitle || seed.videoTitle,
      videoDescription: meta.videoDescription || seed.videoDescription,
      isFeatured: meta.isFeatured ?? seed.isFeatured,
      isPremium: meta.isPremium ?? false,
      paymentStatus: meta.paymentStatus ?? "unpaid",
    });

    seededPartners.push(partner);
  }

  return seededPartners;
}
