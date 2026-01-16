import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Zap, Target, Trophy, Lightbulb } from "lucide-react";

const motivationalMessages = [
  {
    icon: <Zap className="h-8 w-8 text-yellow-500" />,
    title: "Keep the Momentum Going!",
    message: "Every action you take today brings us closer to our platform goals. You're doing great!",
    color: "from-yellow-50 to-amber-50"
  },
  {
    icon: <Target className="h-8 w-8 text-blue-500" />,
    title: "Stay Focused on Our Mission",
    message: "We're building something meaningful for education. Your dedication matters!",
    color: "from-blue-50 to-cyan-50"
  },
  {
    icon: <Trophy className="h-8 w-8 text-green-500" />,
    title: "You're Making an Impact",
    message: "Every scholarship processed, every opportunity listed - it changes lives. Great work!",
    color: "from-green-50 to-emerald-50"
  },
  {
    icon: <Lightbulb className="h-8 w-8 text-purple-500" />,
    title: "Innovation in Progress",
    message: "Your admin work powers meaningful connections. Keep shining!",
    color: "from-purple-50 to-pink-50"
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
            className="absolute right-4 top-4 p-1 hover:bg-gray-100 rounded-full transition"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>
        
        <div className={`bg-gradient-to-br ${message.color} rounded-xl p-8 text-center space-y-4 animate-fadeIn`}>
          <div className="flex justify-center animate-bounce">
            {message.icon}
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">
              {message.title}
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
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
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
          >
            Next Tip
          </Button>
        </div>

        <div className="flex justify-center gap-1 pt-2">
          {motivationalMessages.map((_, idx) => (
            <div
              key={idx}
              className={`h-1 rounded-full transition-all ${
                idx === currentMessage ? "bg-blue-500 w-6" : "bg-gray-300 w-1"
              }`}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
