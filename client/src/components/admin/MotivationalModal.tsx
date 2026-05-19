import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Zap, Target, Trophy, Lightbulb } from "lucide-react";

const motivationalMessages = [
  {
    icon: <Zap className="h-8 w-8 text-warning" />,
    title: "Keep the Momentum Going!",
    message: "Every action you take today brings us closer to our platform goals. You're doing great!",
    color: "from-warning/10 to-warning/5"
  },
  {
    icon: <Target className="h-8 w-8 text-primary" />,
    title: "Stay Focused on Our Mission",
    message: "We're building something meaningful for education. Your dedication matters!",
    color: "from-primary/10 to-info/5"
  },
  {
    icon: <Trophy className="h-8 w-8 text-success" />,
    title: "You're Making an Impact",
    message: "Every scholarship processed, every opportunity listed - it changes lives. Great work!",
    color: "from-success/10 to-success/5"
  },
  {
    icon: <Lightbulb className="h-8 w-8 text-info" />,
    title: "Innovation in Progress",
    message: "Your admin work powers meaningful connections. Keep shining!",
    color: "from-info/10 to-info/5"
  },
];

interface MotivationalModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function MotivationalModal({ open = true, onOpenChange }: MotivationalModalProps) {
  const [isOpen, setIsOpen] = useState(open);
  const [currentMessage, setCurrentMessage] = useState(0);

  useEffect(() => {
    setIsOpen(open);
  }, [open]);

  const handleNext = () => {
    setCurrentMessage((prev) => (prev + 1) % motivationalMessages.length);
  };

  const handleClose = () => {
    setIsOpen(false);
    onOpenChange?.(false);
  };

  const message = motivationalMessages[currentMessage];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md border-0 shadow-2xl">
        <DialogHeader className="text-center space-y-4">
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 p-1 hover:bg-muted rounded-full transition"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>
        
        <div className={`bg-gradient-to-br ${message.color} rounded-xl p-8 text-center space-y-4 animate-fadeIn`}>
          <div className="flex justify-center animate-bounce">
            {message.icon}
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              {message.title}
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {message.message}
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-center pt-4">
          <Button
            variant="outline"
            onClick={handleClose}
            className="gap-2"
          >
            Got it
          </Button>
          <Button
            onClick={handleNext}
            className="bg-gradient-to-r from-primary to-chart-4 hover:from-primary/90 hover:to-chart-4/90 text-white"
          >
            Next Tip
          </Button>
        </div>

        <div className="flex justify-center gap-1 pt-2">
          {motivationalMessages.map((_, idx) => (
            <div
              key={idx}
              className={`h-1 rounded-full transition-all ${
                idx === currentMessage ? "bg-primary/100 w-6" : "bg-muted-foreground/40 w-1"
              }`}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}



