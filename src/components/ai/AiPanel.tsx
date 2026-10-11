import { DialogFrame } from '../ui/DialogFrame';
import React from 'react';
import { X, Sparkles, Loader2, AlertCircle, Copy, RefreshCw } from 'lucide-react';
import { useToast } from '../ui/ToastContext';

interface AiPanelProps {
  title: string;
  subtitle?: string;
  loading: boolean;
  result: string | null;
  error: string | null;
  onClose: () => void;
  onRetry?: () => void;
}

// Renders markdown-like text: **bold**, bullet lists, numbered lists
function RichText({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const raw of lines) {
    const line = raw.trimEnd();

    // Heading: **text** on its own line
    if (/^\*\*[^*]+\*\*$/.test(line.trim())) {
      const label = line.replace(/\*\*/g, '').trim();
      elements.push(
        <p key={key++} className="font-semibold text-foreground dark:text-foreground mt-4 mb-1 first:mt-0 text-sm uppercase tracking-wide">
          {label}
        </p>
      );
      continue;
    }

    // Bullet
    if (/^[-•]\s/.test(line.trim())) {
      const content = line.replace(/^[-•]\s/, '').trim();
      elements.push(
        <div key={key++} className="flex gap-2 mb-1">
          <span className="text-accent font-bold mt-0.5 flex-shrink-0">•</span>
          <span className="text-sm text-foreground dark:text-muted">{renderInline(content)}</span>
        </div>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line.trim())) {
      const num = line.match(/^(\d+)\./)?.[1] ?? '';
      const content = line.replace(/^\d+\.\s/, '').trim();
      elements.push(
        <div key={key++} className="flex gap-2 mb-1">
          <span className="text-accent font-semibold text-xs mt-0.5 flex-shrink-0 w-4">{num}.</span>
          <span className="text-sm text-foreground dark:text-muted">{renderInline(content)}</span>
        </div>
      );
      continue;
    }

    // Empty line → spacer
    if (!line.trim()) {
      elements.push(<div key={key++} className="h-1" />);
      continue;
    }

    // Normal paragraph
    elements.push(
      <p key={key++} className="text-sm text-foreground dark:text-muted mb-1">
        {renderInline(line)}
      </p>
    );
  }

  return <div className="space-y-0">{elements}</div>;
}

function renderInline(text: string): React.ReactNode {
  // **bold**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    /^\*\*[^*]+\*\*$/.test(part)
      ? <strong key={i} className="font-bold text-foreground dark:text-foreground">{part.replace(/\*\*/g, '')}</strong>
      : part
  );
}

export const AiPanel: React.FC<AiPanelProps> = ({
  title, subtitle, loading, result, error, onClose, onRetry
}) => {
  const { showToast } = useToast();

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result).then(() => showToast('Copiato negli appunti', 'success'));
  };

  return (
    <DialogFrame className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-surface dark:bg-surface w-full md:max-w-2xl rounded-t-3xl md:rounded-panel shadow-panel flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-line dark:border-line flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-action rounded-md flex items-center justify-center">
              <Sparkles size={18} className="text-action-foreground" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground dark:text-foreground text-base">{title}</h2>
              {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {result && (
              <>
                <button onClick={handleCopy} className="p-2 rounded-md text-muted hover:text-secondary hover:bg-raised dark:hover:bg-raised transition-all" title="Copia">
                  <Copy size={16} />
                </button>
                {onRetry && (
                  <button onClick={onRetry} className="p-2 rounded-md text-muted hover:text-secondary hover:bg-raised dark:hover:bg-raised transition-all" title="Rigenera">
                    <RefreshCw size={16} />
                  </button>
                )}
              </>
            )}
            <button aria-label="Chiudi dialogo" data-dialog-close onClick={onClose} className="p-2 rounded-md text-muted hover:text-secondary hover:bg-raised dark:hover:bg-raised transition-all">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative">
                <div className="w-16 h-16 bg-accent-soft dark:bg-accent-soft/30 rounded-panel flex items-center justify-center">
                  <Sparkles size={28} className="text-accent" />
                </div>
                <Loader2 size={20} className="text-accent animate-spin absolute -top-1 -right-1" />
              </div>
              <div className="text-center">
                <p className="font-bold text-foreground dark:text-muted text-sm">Claude sta elaborando…</p>
                <p className="text-xs text-muted mt-1">Ci vogliono pochi secondi</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-14 h-14 bg-danger-soft dark:bg-danger-soft rounded-panel flex items-center justify-center">
                <AlertCircle size={24} className="text-danger" />
              </div>
              <div className="text-center">
                <p className="font-bold text-foreground dark:text-muted text-sm">Qualcosa è andato storto</p>
                <p className="text-xs text-danger mt-1">{error}</p>
              </div>
              {onRetry && (
                <button onClick={onRetry} className="mt-2 flex items-center gap-2 px-4 py-2 bg-action text-action-foreground rounded-md text-sm font-bold hover:bg-action-hover transition-all">
                  <RefreshCw size={14} /> Riprova
                </button>
              )}
            </div>
          )}

          {/* Result */}
          {result && !loading && (
            <div className="bg-canvas dark:bg-canvas/40 rounded-panel p-4">
              <RichText text={result} />
            </div>
          )}
        </div>

        {/* Footer label */}
        <div className="px-5 py-3 border-t border-line dark:border-line flex-shrink-0">
          <p className="text-xs text-muted dark:text-secondary text-center">
            Generato da Gemini AI (Google) — verifica sempre le informazioni prima di usarle
          </p>
        </div>
      </div>
    </DialogFrame>
  );
};
