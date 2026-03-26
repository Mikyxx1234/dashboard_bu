import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary capturou um erro:', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        className="flex min-h-screen items-center justify-center p-6"
        style={{
          background: 'linear-gradient(135deg, #0c1222 0%, #111a2e 50%, #0f1628 100%)',
        }}
      >
        <div className="w-full max-w-md text-center">
          <div
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl"
            style={{
              background: 'rgba(251, 146, 60, 0.12)',
              border: '1px solid rgba(251, 146, 60, 0.2)',
            }}
          >
            <AlertTriangle className="h-10 w-10 text-amber-400" />
          </div>

          <h1 className="mb-3 text-2xl font-bold text-white">Ops, algo deu errado</h1>

          <p className="mb-2 text-base text-slate-400">
            Parece que deu algum problema, mas nosso time já está vendo isso.
          </p>
          <p className="mb-8 text-sm text-slate-500">
            Tente recarregar a página. Se o problema persistir, entre em contato com o suporte.
          </p>

          <button
            onClick={this.handleReload}
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
            style={{
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
              boxShadow: '0 4px 20px rgba(37, 99, 235, 0.35)',
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Recarregar página
          </button>
        </div>
      </div>
    );
  }
}
