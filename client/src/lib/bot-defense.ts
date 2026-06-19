type HoneypotFields = {
  website: string;
  company: string;
  homepage: string;
};

type FingerprintSignals = {
  timezone?: string;
  language?: string;
  languages?: string[];
  viewport?: string;
  screen?: string;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  platform?: string;
  canvasHash?: string;
  webglHash?: string;
  webdriver?: boolean;
  pluginsLength?: number;
  maxTouchPoints?: number;
};

type NavigatorWithHints = Navigator & {
  deviceMemory?: number;
  hardwareConcurrency?: number;
  maxTouchPoints?: number;
  webdriver?: boolean;
};

export type BotDefenseSubmission = {
  website: string;
  company: string;
  homepage: string;
  recaptchaToken?: string;
  security: {
    flow: string;
    visitorHash: string;
    fingerprint: FingerprintSignals;
    automation: {
      webdriver?: boolean;
      pluginsLength?: number;
    };
    honeypot: HoneypotFields;
    form: {
      startedAt: number;
      elapsedMs: number;
    };
    recaptchaToken?: string;
  };
};

type BuildBotDefenseSubmissionArgs = {
  flow: string;
  startedAt?: number | null;
  website?: string;
  company?: string;
  homepage?: string;
  recaptchaToken?: string;
};

const VISITOR_HASH_STORAGE_KEY = "mec.bot-defense.visitor-hash";
const VISITOR_SIGNATURE_STORAGE_KEY = "mec.bot-defense.visitor-signature";

const toBase64Url = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const simpleHash = (value: string) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `mec_${(hash >>> 0).toString(16)}`;
};

const hashText = async (value: string) => {
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    const bytes = new TextEncoder().encode(value);
    const digest = await window.crypto.subtle.digest("SHA-256", bytes);
    return toBase64Url(digest);
  }

  return simpleHash(value);
};

const safeLocalStorage = () => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
};

const collectCanvasHash = async () => {
  if (typeof document === "undefined") return undefined;
  const canvas = document.createElement("canvas");
  canvas.width = 220;
  canvas.height = 60;
  const context = canvas.getContext("2d");
  if (!context) return undefined;

  context.textBaseline = "top";
  context.font = "16px Arial";
  context.fillStyle = "#0f172a";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#f8fafc";
  context.fillText("Mtendere Bot Defense", 12, 10);
  context.strokeStyle = "#38bdf8";
  context.beginPath();
  context.arc(160, 28, 16, 0, Math.PI * 2);
  context.stroke();
  return hashText(canvas.toDataURL());
};

const collectWebglHash = async () => {
  if (typeof document === "undefined") return undefined;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  if (!context) return undefined;

  const gl = context as WebGLRenderingContext;
  const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
  const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
  const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  const version = gl.getParameter(gl.VERSION);
  const shadingLanguage = gl.getParameter(gl.SHADING_LANGUAGE_VERSION);
  const extensions = gl.getSupportedExtensions() || [];

  return hashText(JSON.stringify({ vendor, renderer, version, shadingLanguage, extensions }));
};

const buildFingerprintSignals = async (): Promise<FingerprintSignals> => {
  const navigatorRef = typeof navigator === "undefined" ? null : (navigator as NavigatorWithHints);
  const screenRef = typeof screen === "undefined" ? null : screen;
  const viewport = typeof window === "undefined" ? undefined : `${window.innerWidth}x${window.innerHeight}`;
  const screenSize = screenRef ? `${screenRef.width}x${screenRef.height}` : undefined;
  const canvasHash = await collectCanvasHash();
  const webglHash = await collectWebglHash();

  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigatorRef?.language,
    languages: navigatorRef?.languages ? Array.from(navigatorRef.languages).slice(0, 10) : undefined,
    viewport,
    screen: screenSize,
    deviceMemory: typeof navigatorRef?.deviceMemory === "number" ? navigatorRef.deviceMemory : undefined,
    hardwareConcurrency: typeof navigatorRef?.hardwareConcurrency === "number" ? navigatorRef.hardwareConcurrency : undefined,
    platform: navigatorRef?.platform,
    canvasHash,
    webglHash,
    webdriver: navigatorRef ? Boolean(navigatorRef.webdriver) : undefined,
    pluginsLength: navigatorRef?.plugins?.length ?? undefined,
    maxTouchPoints: typeof navigatorRef?.maxTouchPoints === "number" ? navigatorRef.maxTouchPoints : undefined,
  };
};

export async function buildBotDefenseSubmission({
  flow,
  startedAt,
  website = "",
  company = "",
  homepage = "",
  recaptchaToken,
}: BuildBotDefenseSubmissionArgs): Promise<BotDefenseSubmission> {
  const fingerprint = await buildFingerprintSignals();
  const storage = safeLocalStorage();
  const signature = JSON.stringify({ flow, fingerprint });
  let visitorHash = storage?.getItem(VISITOR_HASH_STORAGE_KEY) ?? "";
  const storedSignature = storage?.getItem(VISITOR_SIGNATURE_STORAGE_KEY) ?? "";

  if (!visitorHash || storedSignature !== signature) {
    visitorHash = await hashText(signature);
    if (storage) {
      storage.setItem(VISITOR_HASH_STORAGE_KEY, visitorHash);
      storage.setItem(VISITOR_SIGNATURE_STORAGE_KEY, signature);
    }
  }

  const formStartedAt = startedAt ?? Date.now();
  const elapsedMs = Math.max(0, Date.now() - formStartedAt);

  return {
    website,
    company,
    homepage,
    recaptchaToken,
    security: {
      flow,
      visitorHash,
      fingerprint,
      automation: {
        webdriver: fingerprint.webdriver,
        pluginsLength: fingerprint.pluginsLength,
      },
      honeypot: {
        website,
        company,
        homepage,
      },
      form: {
        startedAt: formStartedAt,
        elapsedMs,
      },
      recaptchaToken,
    },
  };
}
