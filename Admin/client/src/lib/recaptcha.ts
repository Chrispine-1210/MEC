declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

let scriptPromise: Promise<void> | null = null;

const loadRecaptchaScript = (siteKey: string) => {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.grecaptcha) return Promise.resolve();

  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load reCAPTCHA"));
    document.head.appendChild(script);
  });

  return scriptPromise;
};

export async function getRecaptchaToken(action: string) {
  const siteKey =
    import.meta.env.VITE_RECAPTCHA_SITE_KEY?.trim() ||
    import.meta.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim();
  if (!siteKey || typeof window === "undefined") return undefined;

  await loadRecaptchaScript(siteKey);
  await new Promise<void>((resolve) => window.grecaptcha?.ready(() => resolve()));
  return window.grecaptcha?.execute(siteKey, { action });
}
