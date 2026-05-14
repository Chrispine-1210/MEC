import type { ReactNode } from "react";
import { Component } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

type ErrorBoundaryState = {
  hasError: boolean;
};

type ErrorBoundaryProps = {
  children: ReactNode;
};

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Unhandled UI error:", error);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-mtendere-gray flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div>
            <div className="text-5xl font-black text-mtendere-blue mb-3">Something went wrong</div>
            <p className="text-muted-foreground">
              An unexpected error occurred. You can reload the page or return home.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={this.handleReload} className="bg-mtendere-blue hover:bg-mtendere-blue/90">
              Reload Page
            </Button>
            <Button asChild variant="outline" className="border-mtendere-blue text-mtendere-blue hover:bg-mtendere-blue hover:text-white">
              <Link href="/">Go Home</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }
}


