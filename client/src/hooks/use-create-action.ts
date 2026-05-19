import { useEffect } from "react";
import { useLocation } from "wouter";

export function useCreateAction(openDialog: () => void) {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("action") === "create") {
      openDialog();
      // Clean the URL without navigation
      const cleanUrl = window.location.pathname;
      window.history.replaceState(null, "", cleanUrl);
    }
  }, [location]);
}
