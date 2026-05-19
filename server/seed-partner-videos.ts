import { ensurePartnerHeroVideoSeeds } from "./partner-video-seeds";

ensurePartnerHeroVideoSeeds()
  .then((partners) => {
    console.table(
      partners.map((partner) => ({
        id: partner.id,
        name: partner.name,
        isActive: partner.isActive,
      })),
    );
    console.log("Partner hero videos are ready for Admin-managed homepage playback.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to seed partner hero videos:", error);
    process.exit(1);
  });
