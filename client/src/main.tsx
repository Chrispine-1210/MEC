import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import ErrorBoundary from "@/components/error-boundary";
import { SpeedInsights } from "@vercel/speed-insights/react";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
    <SpeedInsights />
  </ErrorBoundary>,
);
