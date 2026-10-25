import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

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
    console.error('WindSight Uncaught Application Error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 max-w-md w-full rounded-2xl p-6 text-white shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Temporary Display Glitch</h2>
              <p className="text-xs text-slate-400 mt-1">
                An unexpected component rendering issue occurred while visualizing forecast data.
              </p>
            </div>
            {this.state.error?.message && (
              <div className="p-3 bg-slate-900/60 rounded-lg text-left text-[11px] font-mono text-rose-300 max-h-24 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={this.handleReload}
              className="w-full py-2.5 px-4 bg-sky-500 hover:bg-sky-400 active:scale-95 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-sky-500/20"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload WindSight Dashboard</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
