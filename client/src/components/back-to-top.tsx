import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronUp } from "lucide-react";

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const toggleVisibility = () => {
      const scrolled = document.documentElement.scrollTop;
      const maxHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const progress = (scrolled / maxHeight) * 100;
      
      setScrollProgress(progress);
      setIsVisible(scrolled > 300);
    };

    const handleScroll = () => {
      toggleVisibility();
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Button
      onClick={scrollToTop}
      className="fixed bottom-6 left-6 w-12 h-12 rounded-full bg-mtendere-green hover:bg-green-700 shadow-lg z-40 transition-all duration-300 hover:scale-110"
      size="icon"
      aria-label="Scroll to top"
    >
      {/* Progress ring */}
      <div className="absolute inset-0 rounded-full">
        <svg 
          className="w-full h-full -rotate-90" 
          viewBox="0 0 48 48"
        >
          <circle
            cx="24"
            cy="24"
            r="22"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="2"
            fill="none"
          />
          <circle
            cx="24"
            cy="24"
            r="22"
            stroke="white"
            strokeWidth="2"
            fill="none"
            strokeDasharray={2 * Math.PI * 22}
            strokeDashoffset={2 * Math.PI * 22 * (1 - scrollProgress / 100)}
            className="transition-all duration-300"
          />
        </svg>
      </div>
      
      {/* Arrow icon */}
      <ChevronUp className="w-5 h-5 text-white relative z-10" />
    </Button>
  );
}
