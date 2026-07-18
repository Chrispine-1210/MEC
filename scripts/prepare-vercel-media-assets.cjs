const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const sourceRoot = path.join(repoRoot, "client", "src", "assets", "imgs");
const outputRoot = path.join(repoRoot, "vercel-media-assets");

const mediaAssetReferences = [
  "Blogs/application-guidance.jpg",
  "Blogs/career-motivation.jpg",
  "Blogs/chiunda-campus.jpg",
  "Blogs/counselling-mentorship.jpg",
  "team.jpg",
  "team/Brend tawina.jpg",
  "team/christoper.jpg",
  "team/dr. daniel.jpg",
  "team/george.jpg",
  "team/mr. rabson.jpg",
  "team/ms brenda.jpg",
  "team/timothy.jpg",
  "teams/brend-tawina.jpg",
  "teams/dr-daniel.jpg",
  "teams/george.jpg",
  "teams/ms-brenda.jpg",
  "teams/timothy.jpg",
  "au-logo.png",
  "ct-logo.png",
  "gedu-logo.png",
  "msm-unify-logo.png",
  "cu-logo-white.webp",
  "gbs-dubai-1.webp",
  "Students on Campus with Branded Jerseys.jpg",
  "Partners/cu-logo-white.webp",
  "Partners/gbs-dubai.webp",
  "Partners/our-partners.jpg",
  "Partners/partners-2.jpg",
  "Partners/partners-default.jpg",
  "universities/university-of-malawi.jpg",
  "universities/university-of-oxford.jpg",
  "universities/technical-university-of-munich.jpg",
  "universities/london-school-of-economics.jpg",
  "universities/african-development-bank.jpg",
  "universities/inlaks-foundation.png",
  "universities/chandigarh-university.jpg",
  "universities/gbs-dubai.webp",
  "universities/ct-university-logo.png",
  "universities/amity-university-logo.png",
  "universities/msm-unify-logo.png",
  "universities/gedu-global-banner.png",
  "scholarships/application-guidance.jpg",
  "scholarships/application-registration.jpg",
  "scholarships/graduates-default.jpg",
  "scholarships/students.jpg",
  "jobs/computer-repair.jpg",
  "jobs/corporate.jpg",
  "jobs/inspector.jpg",
  "jobs/jobs-default.jpg",
  "Events/IMG-20221029-WA0058.jpg",
  "Events/IMG-20220907-WA0124.jpg",
  "Events/IMG-20230311-WA0110.jpg",
  "Events/IMG-20250321-WA0250.jpg",
  "Events/events-default.jpg",
  "projects/foundation.jpg",
  "programs/abroad-students.jpg",
  "programs/international-studies.jpg",
  "programs/students-campus.jpg",
  "students/Edna Kalonga.jpg",
  "students/Ian Ndola.jpg",
  "students/Janet Kandulu.jpg",
  "testimonials/edna-kalonga.jpg",
  "testimonials/ian-ndola.jpg",
  "testimonials/trust-mangani.jpg",
  "misc/about-mtendere.jpg",
  "misc/mtendere.jpg",
  "defaults/mtendere-default.png",
];

const isInside = (candidate, root) => {
  const relative = path.relative(root, candidate);
  return relative === "" || (!!relative && !relative.startsWith("..") && !path.isAbsolute(relative));
};

fs.rmSync(outputRoot, { recursive: true, force: true });

let totalBytes = 0;
for (const reference of mediaAssetReferences) {
  const source = path.resolve(sourceRoot, reference);
  if (!isInside(source, sourceRoot) || !fs.existsSync(source)) {
    throw new Error(`Missing Vercel media asset: ${reference}`);
  }

  const target = path.resolve(outputRoot, reference);
  if (!isInside(target, outputRoot)) {
    throw new Error(`Refusing to copy media asset outside output root: ${reference}`);
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  totalBytes += fs.statSync(source).size;
}

console.log(
  `Prepared ${mediaAssetReferences.length} Vercel media assets (${(totalBytes / 1024 / 1024).toFixed(2)} MB).`,
);
