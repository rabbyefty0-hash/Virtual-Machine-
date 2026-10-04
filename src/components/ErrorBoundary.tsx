import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

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
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 text-white">
          <div className="max-w-md w-full glass-card p-8 rounded-[2.5rem] border border-red-500/30 text-center space-y-6">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-red-500/10">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Something went wrong</h2>
              <p className="text-white/60 text-sm leading-relaxed">
                An unexpected error occurred in ꧁Rᴀʙʙʏ Eғᴛʏ꧂. Our team has been notified.
              </p>
            </div>
            {this.state.error && (
              <div className="p-4 bg-black/40 rounded-2xl border border-white/5 text-left overflow-hidden">
                <p className="text-[10px] font-mono text-red-400 break-all">
                  {this.state.error.toString()}
                </p>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full h-14 bg-white text-black rounded-full font-bold flex items-center justify-center hover:bg-white/90 transition-all shadow-xl"
            >
              <RefreshCcw className="w-5 h-5 mr-2" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
