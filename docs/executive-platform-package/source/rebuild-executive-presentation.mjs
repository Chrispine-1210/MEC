import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const moduleDir = process.env.DOC_GEN_NODE_MODULES || path.join(os.tmpdir(), "mec-admin-training-build", "node_modules");
const pptxgen = require(path.join(moduleDir, "pptxgenjs"));

const root = process.cwd();
const pkg = path.join(root, "docs", "executive-platform-package");
const shots = path.join(pkg, "screenshots");
const diagrams = path.join(pkg, "diagrams");

const outPptx = path.join(pkg, "Mtendere-Education-Digital-Platform-Executive-Presentation.pptx");
const outPdf = path.join(pkg, "Mtendere-Education-Digital-Platform-Executive-Presentation.pdf");

const brand = {
  blue: "0B5FFF",
  green: "166534",
  orange: "F59E0B",
  ink: "0F172A",
  slate: "475569",
  pale: "F8FAFC",
  line: "CBD5E1",
};

const image = (name) => {
  const p = path.join(shots, name);
  return fs.existsSync(p) ? p : undefined;
};

const slideData = [
  ["Mtendere Education Digital Platform", "Executive overview of the platform strategy, operating model, governance controls and scale roadmap.", null],
  ["The platform is now an operating system, not only a website", "Mtendere combines student acquisition, applications, content, events, partner visibility and administration into one governed digital ecosystem.", null],
  ["Leadership gets a single view of digital operations", "The executive value is faster response, cleaner handoffs, measurable workflows and stronger institutional control.", null],
  ["The ecosystem supports both growth and governance", "Public journeys create demand while admin modules turn demand into managed records, decisions, communications and reports.", "architecture-overview.svg"],
  ["Public journeys are built around conversion", "Homepage, scholarships, jobs, events, partners, blog and contact paths guide visitors toward applications and consultations.", null],
  ["Scholarships and jobs are core opportunity engines", "Searchable opportunity pages convert student interest into structured applications and follow-up workflows.", null],
  ["Events, partners and content strengthen trust", "These modules show community activity, institutional relationships and educational authority while supporting SEO and engagement.", null],
  ["Student self-service reduces manual follow-up", "Login, dashboard, application tracking and payment-linked journeys give students clearer visibility into their progress.", "workflow-map.svg"],
  ["The admin dashboard is the command surface", "Administrators can monitor system status, content operations, application activity and recent actions from one starting point.", null],
  ["The ecosystem command center connects modules", "Operational health, automation readiness and cross-system visibility help leadership spot gaps before they become bottlenecks.", null],
  ["Content governance is repeatable across modules", "Scholarships, jobs, events, partners, blog posts, team profiles and media assets follow consistent management patterns.", null],
  ["Applications become a managed pipeline", "Structured review, status changes and administrative notes turn submissions into accountable decision workflows.", "workflow-map.svg"],
  ["Partner and event operations move beyond static pages", "CRM-style partner records, event management and activity tracking support revenue, relationships and institutional credibility.", null],
  ["Roles and settings protect institutional control", "Super Admin, Admin, Writer and Viewer boundaries reduce risk by matching access to responsibility.", "security-access-control.svg"],
  ["Analytics and activity close the management loop", "Reports and activity records help leadership understand demand, content performance, application flow and operational accountability.", null],
  ["Communications need reliable action links", "Email templates, confirmation, unsubscribe and event links must be tested end-to-end before campaigns scale.", null],
  ["Security is layered across identity, access and data", "JWT authentication, RBAC boundaries, admin settings, audit activity and cautious data handling form the control model.", "security-access-control.svg"],
  ["The interface is strong but still needs hardening", "The UI is broad and responsive, but executive readiness depends on fixing broken links, deployment settings, duplicate media and test coverage.", null],
  ["Performance and scale require production validation", "The architecture is cloud-ready, but backend availability, WebSocket behavior, migrations and environment variables must be validated in the target deployment.", null],
  ["Priority 1: stabilize core operations", "Confirm API startup, production environment variables, email links, database migrations, auth settings and CI build/test coverage.", null],
  ["Priority 2: strengthen operational intelligence", "Add role-based E2E tests, better audit entries, scheduled reports, monitoring dashboards and export governance.", null],
  ["Priority 3: prepare for regional scale", "Harden SEO, uploads, observability, automation and AI-assisted workflows before expanding campaigns and partnerships.", "future-roadmap.svg"],
  ["Roadmap: stabilize, govern, automate, scale", "The next phase should move from fixing reliability risks to stronger reporting, controlled automation and regional growth readiness.", "future-roadmap.svg"],
  ["Decision focus for leadership", "Approve stabilization work first, then fund operating intelligence and growth automation once the foundation is verified.", null],
  ["The platform can become Mtendere’s digital growth engine", "With reliability fixes and governance discipline, the system can reduce developer dependency and give leadership a scalable operating model.", null],
];

const safeImagePath = (img) => {
  if (!img) return undefined;
  const p = img.endsWith(".svg") ? path.join(diagrams, img) : image(img);
  return fs.existsSync(p) ? p : undefined;
};

const addHeader = (pptx, slide, idx) => {
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.16, fill: { color: brand.orange }, line: { color: brand.orange } });
  slide.addText(`Mtendere Education Consult · Executive Platform Package · ${idx + 1}`, { x: 0.55, y: 7.08, w: 5.8, h: 0.25, fontSize: 8.5, color: brand.slate });
};

const addImageFrame = (pptx, slide, imgPath) => {
  if (!imgPath) return;
  slide.addShape(pptx.ShapeType.roundRect, { x: 6.45, y: 1.15, w: 6.25, h: 4.85, rectRadius: 0.08, fill: { color: "FFFFFF" }, line: { color: brand.line, width: 1 } });
  slide.addImage({ path: imgPath, x: 6.55, y: 1.25, w: 6.05, h: 4.65, sizingContain: true });
};

const addExecutivePanel = (pptx, slide, title, body, idx) => {
  const labels = idx < 8
    ? ["Student acquisition", "Application conversion", "Follow-up visibility"]
    : idx < 18
      ? ["Operating control", "Accountability", "Management visibility"]
      : ["Stabilize core systems", "Govern daily operations", "Scale with confidence"];
  slide.addShape(pptx.ShapeType.roundRect, { x: 6.45, y: 1.18, w: 6.25, h: 4.8, rectRadius: 0.12, fill: { color: brand.pale }, line: { color: brand.line, width: 1 } });
  labels.forEach((label, i) => {
    const y = 1.6 + i * 1.25;
    slide.addShape(pptx.ShapeType.roundRect, { x: 6.85, y, w: 5.35, h: 0.82, rectRadius: 0.08, fill: { color: "FFFFFF" }, line: { color: brand.line, width: 0.7 } });
    slide.addShape(pptx.ShapeType.ellipse, { x: 7.12, y: y + 0.2, w: 0.38, h: 0.38, fill: { color: i === 0 ? brand.green : i === 1 ? brand.blue : brand.orange }, line: { color: "FFFFFF" } });
    slide.addText(label, { x: 7.72, y: y + 0.22, w: 3.8, h: 0.26, fontSize: 20, bold: true, color: brand.ink });
  });
  slide.addText("Board-level takeaway", { x: 6.85, y: 5.16, w: 2.8, h: 0.24, fontSize: 12, bold: true, color: brand.green });
  slide.addText(body.length > 110 ? body.slice(0, 107) + "..." : body, { x: 6.85, y: 5.42, w: 5.35, h: 0.36, fontSize: 11, color: brand.slate, fit: "shrink" });
};

const buildPptx = async () => {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Chrispine Mndala / Aöthothe Technologies";
  pptx.company = "Aöthothe Technologies";
  pptx.subject = "Mtendere Education Consult Executive Platform Overview";
  pptx.title = "Mtendere Education Digital Platform Executive Presentation";
  pptx.lang = "en-US";
  pptx.theme = {
    headFontFace: "Aptos Display",
    bodyFontFace: "Aptos",
    lang: "en-US",
  };

  slideData.forEach(([title, body, img], idx) => {
    const slide = pptx.addSlide();
    slide.background = { color: idx === 0 ? brand.green : "FFFFFF" };
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.333,
      h: 7.5,
      fill: { color: idx === 0 ? brand.green : "FFFFFF" },
      line: { color: idx === 0 ? brand.green : "FFFFFF" },
    });

    if (idx === 0) {
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.28, fill: { color: brand.orange }, line: { color: brand.orange } });
      slide.addText(title, { x: 0.72, y: 1.55, w: 6.8, h: 1.15, fontSize: 44, bold: true, color: "FFFFFF", fit: "shrink" });
      slide.addText(body, { x: 0.76, y: 2.95, w: 5.8, h: 1.25, fontSize: 22, color: "FFFFFF", breakLine: false, fit: "shrink" });
      slide.addText("Prepared by Chrispine Mndala / Aöthothe Technologies", { x: 0.76, y: 6.55, w: 6.2, h: 0.28, fontSize: 12, color: "FFFFFF" });
      addExecutivePanel(pptx, slide, "Executive platform overview", body, idx);
      return;
    }

    addHeader(pptx, slide, idx);
    slide.addText(title, { x: 0.58, y: 0.48, w: 5.55, h: 1.05, fontSize: 35, bold: true, color: brand.green, fit: "shrink" });
    slide.addShape(pptx.ShapeType.line, { x: 0.58, y: 1.62, w: 4.4, h: 0, line: { color: brand.orange, width: 2 } });
    slide.addText(body, { x: 0.62, y: 1.92, w: 5.15, h: 2.8, fontSize: 19, color: brand.ink, breakLine: false, fit: "shrink" });
    slide.addShape(pptx.ShapeType.roundRect, { x: 0.62, y: 5.35, w: 5.1, h: 0.62, rectRadius: 0.08, fill: { color: brand.pale }, line: { color: brand.line, width: 0.8 } });
    slide.addText(idx < 8 ? "Growth experience" : idx < 18 ? "Operating control" : "Executive action", { x: 0.9, y: 5.52, w: 4.4, h: 0.22, fontSize: 13, bold: true, color: brand.blue });
    const imgPath = safeImagePath(img);
    if (imgPath) addImageFrame(pptx, slide, imgPath);
    else addExecutivePanel(pptx, slide, title, body, idx);
    slide.addNotes(`Speaker notes: ${body}`);
  });

  await pptx.writeFile({ fileName: outPptx });
};

const imgData = (img) => {
  const p = safeImagePath(img);
  if (!p) return "";
  const ext = path.extname(p).slice(1).toLowerCase().replace("svg", "svg+xml");
  return `data:image/${ext};base64,${fs.readFileSync(p).toString("base64")}`;
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const html = () => `<!doctype html><html><head><meta charset="utf-8"><style>
@page{size:13.333in 7.5in;margin:0}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#0F172A}.slide{position:relative;width:13.333in;height:7.5in;box-sizing:border-box;padding:.55in;page-break-after:always;background:white;overflow:hidden}.cover{background:#166534;color:white}.bar{position:absolute;top:0;left:0;right:0;height:.18in;background:#F59E0B}h1{font-size:42px;line-height:1.05;color:#166534;margin:.1in 0 .35in;max-width:5.7in}.cover h1{font-size:50px;color:white;margin-top:1.25in}p{font-size:22px;line-height:1.33;max-width:5.25in}.cover p{font-size:24px;color:white}.img{position:absolute;right:.72in;top:1.15in;width:6.05in;height:4.75in;object-fit:contain;border:1px solid #CBD5E1;border-radius:12px;background:white}.tag{position:absolute;left:.62in;bottom:1.28in;padding:.16in .22in;background:#F8FAFC;border:1px solid #CBD5E1;border-radius:10px;color:#0B5FFF;font-weight:700}.foot{position:absolute;bottom:.22in;left:.55in;color:#64748B;font-size:10px}.cover .foot{color:white}
</style></head><body>${slideData.map(([title, body, img], idx) => {
  const src = imgData(img);
  return `<section class="slide ${idx === 0 ? "cover" : ""}"><div class="bar"></div><h1>${esc(title)}</h1><p>${esc(body)}</p>${src ? `<img class="img" src="${src}">` : ""}${idx ? `<div class="tag">${idx < 8 ? "Growth experience" : idx < 18 ? "Operating control" : "Executive action"}</div>` : ""}<div class="foot">Mtendere Education Consult · Executive Platform Package · ${idx + 1}</div></section>`;
}).join("")}</body></html>`;

const buildPdf = async () => {
  const htmlPath = path.join(pkg, "Mtendere-Education-Digital-Platform-Executive-Presentation.html");
  fs.writeFileSync(htmlPath, html(), "utf8");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(`file://${htmlPath.replace(/\\/g, "/")}`, { waitUntil: "load" });
  await page.pdf({ path: outPdf, width: "13.333in", height: "7.5in", printBackground: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
  await browser.close();
};

await buildPptx();
await buildPdf();
