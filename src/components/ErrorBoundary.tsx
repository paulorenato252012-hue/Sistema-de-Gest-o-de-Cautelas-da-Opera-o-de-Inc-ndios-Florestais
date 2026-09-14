import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 border border-red-100">
            <div className="flex items-center space-x-4 mb-6">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Ops! Ocorreu um erro inesperado.</h1>
                <p className="text-gray-500 mt-1">O aplicativo encontrou uma falha de funcionamento.</p>
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl p-5 mb-6 overflow-x-auto">
              <p className="text-sm font-bold text-red-400 mb-2">Mensagem de Erro (Envie isso para a IA):</p>
              <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">
                {this.state.error?.toString()}
              </pre>
              {this.state.errorInfo && (
                <pre className="text-xs text-gray-500 font-mono mt-3 border-t border-gray-700 pt-3 whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>

            <div className="flex gap-4">
              <button
                onClick={this.handleReset}
                className="flex-1 bg-red-800 hover:bg-red-900 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center transition-colors"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Recarregar Aplicativo
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
