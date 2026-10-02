import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in component tree:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-background">
          <div className="max-w-md w-full p-6 rounded-xl border border-destructive/20 bg-destructive/5 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">
                An error occurred
              </h3>
              <p className="text-sm text-muted-foreground">
                {this.state.error?.message || "Something went wrong while rendering this page."}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => this.setState({ hasError: false, error: null })}
                className="gap-1.5"
              >
                <RotateCcw className="w-4 h-4" /> Try Again
              </Button>
              <Button
                size="sm"
                onClick={() => (window.location.href = "/")}
                className="gap-1.5"
              >
                <Home className="w-4 h-4" /> Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
