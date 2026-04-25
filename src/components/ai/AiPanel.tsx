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
        <p key={key++} className="font-black text-gray-900 dark:text-white mt-4 mb-1 first:mt-0 text-sm uppercase tracking-wide">
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
          <span className="text-indigo-400 font-bold mt-0.5 flex-shrink-0">•</span>
          <span className="text-sm text-gray-700 dark:text-gray-300">{renderInline(content)}</span>
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
          <span className="text-indigo-500 font-black text-xs mt-0.5 flex-shrink-0 w-4">{num}.</span>
          <span className="text-sm text-gray-700 dark:text-gray-300">{renderInline(content)}</span>
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
      <p key={key++} className="text-sm text-gray-700 dark:text-gray-300 mb-1">
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
      ? <strong key={i} className="font-bold text-gray-900 dark:text-white">{part.replace(/\*\*/g, '')}</strong>
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
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white dark:bg-gray-800 w-full md:max-w-2xl rounded-t-3xl md:rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <h2 className="font-black text-gray-900 dark:text-white text-base">{title}</h2>
              {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {result && (
              <>
                <button onClick={handleCopy} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all" title="Copia">
                  <Copy size={16} />
                </button>
                {onRetry && (
                  <button onClick={onRetry} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all" title="Rigenera">
                    <RefreshCw size={16} />
                  </button>
                )}
              </>
            )}
            <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
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
                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center">
                  <Sparkles size={28} className="text-indigo-500" />
                </div>
                <Loader2 size={20} className="text-indigo-500 animate-spin absolute -top-1 -right-1" />
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-700 dark:text-gray-300 text-sm">Claude sta elaborando…</p>
                <p className="text-xs text-gray-400 mt-1">Ci vogliono pochi secondi</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center">
                <AlertCircle size={24} className="text-red-400" />
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-700 dark:text-gray-300 text-sm">Qualcosa è andato storto</p>
                <p className="text-xs text-red-400 mt-1">{error}</p>
              </div>
              {onRetry && (
                <button onClick={onRetry} className="mt-2 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all">
                  <RefreshCw size={14} /> Riprova
                </button>
              )}
            </div>
          )}

          {/* Result */}
          {result && !loading && (
            <div className="bg-gray-50 dark:bg-gray-900/40 rounded-2xl p-4">
              <RichText text={result} />
            </div>
          )}
        </div>

        {/* Footer label */}
        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
          <p className="text-[10px] text-gray-300 dark:text-gray-600 text-center">
            Generato da Claude AI (Anthropic) — verifica sempre le informazioni prima di usarle
          </p>
        </div>
      </div>
    </div>
  );
};
