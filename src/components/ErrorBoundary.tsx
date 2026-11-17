import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let displayMessage = error.message || 'একটি অপ্রত্যাশিত ত্রুটি ঘটেছে।';
    try {
      const parsed = JSON.parse(displayMessage) as {
        error?: string;
        operationType?: string;
        path?: string | null;
      };
      if (parsed && parsed.error && parsed.operationType) {
        displayMessage = `ডাটাবেস ত্রুটি (${parsed.operationType}${
          parsed.path ? ` · ${parsed.path}` : ''
        }): ${parsed.error}`;
      }
    } catch {
      // Not a JSON FirestoreErrorInfo string; use plain message
    }
    return { hasError: true, message: displayMessage };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Application ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#081123] text-white flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white text-slate-900 p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h1 className="font-display text-lg font-bold text-slate-950">
                সিস্টেম ত্রুটি পাওয়া গেছে
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed break-words">
                {this.state.message}
              </p>
            </div>
            <button
              type="button"
              onClick={this.handleReset}
              className="w-full min-h-[44px] rounded-full bg-[#0B1221] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-slate-800"
            >
              <RotateCcw className="w-4 h-4" />
              আবার চেষ্টা করুন
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
