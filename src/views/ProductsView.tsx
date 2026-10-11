import { confirmAction } from '../components/ui/Feedback';
import { DialogFrame } from '../components/ui/DialogFrame';
import React, { useState, useMemo, useRef, useCallback } from 'react';
import { blakladerUrl, enrichProduct } from '../lib/blaklader';
import * as XLSX from 'xlsx';
import { useStore } from '../store/useStore';
import {
  Plus, Upload, X, MoreHorizontal, Package,
  LayoutList, LayoutGrid, Rows3, ShoppingBag, Check, Trash2, Copy, Pencil, RefreshCw,
  Tag, Ruler, Layers, Sparkles, Loader2, ExternalLink
} from 'lucide-react';
import { Product } from '../types';
import { useToast } from '../components/ui/ToastContext';
import { SearchDropdown } from '../components/ui/SearchDropdown';
import { matchSearch } from '../utils/search';

// ─── Types ────────────────────────────────────────────────────────────────────
type LayoutVariant = 'compact' | 'visual' | 'grid';
const LAYOUT_KEY = 'nm_prod_variant';

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'all',       label: 'Tutti'      },
  { id: 'giacche',   label: 'Giacche'    },
  { id: 'felpe',     label: 'Felpe'      },
  { id: 'pantaloni', label: 'Pantaloni'  },
  { id: 'hivis',     label: 'Hi-Vis'     },
  { id: 'tshirt',    label: 'T-Shirt'    },
  { id: 'accessori', label: 'Accessori'  },
];

const CAT_STYLE: Record<string, { bg: string; text: string }> = {
  giacche:   { bg: 'bg-accent-soft dark:bg-accent-soft/20',    text: 'text-accent dark:text-accent'   },
  felpe:     { bg: 'bg-accent-soft dark:bg-accent-soft/20', text: 'text-accent dark:text-accent'},
  pantaloni: { bg: 'bg-warning-soft dark:bg-warning-soft',   text: 'text-warning dark:text-warning' },
  hivis:     { bg: 'bg-warning-soft dark:bg-warning-soft', text: 'text-warning dark:text-warning'},
  tshirt:    { bg: 'bg-success-soft dark:bg-success-soft',   text: 'text-success dark:text-success' },
  accessori: { bg: 'bg-raised dark:bg-raised',       text: 'text-secondary dark:text-muted'   },
};

const COLOR_HEX: Record<string, string> = {
  'nero': '#1A1A1A', 'black': '#1A1A1A',
  'blu': '#1E3A5F', 'blu marino': '#1E3A5F', 'navy': '#1E3A5F', 'blue': '#1E3A5F',
  'verde': '#2D5536', 'verde foresta': '#2D5536', 'forest': '#2D5536', 'green': '#2D5536',
  'grigio': '#7A7A7A', 'gray': '#7A7A7A', 'grey': '#7A7A7A',
  'bianco': '#F5F5F0', 'white': '#F5F5F0',
  'arancione': '#E8723C', 'orange': '#E8723C',
  'giallo': '#E8DC2A', 'high vis': '#E8DC2A', 'yellow': '#E8DC2A',
  'rosso': '#C03A2B', 'red': '#C03A2B',
  'marrone': '#6B4423', 'brown': '#6B4423',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getColorHex = (c: string) => COLOR_HEX[c.toLowerCase()] ?? '#9CA3AF';

function resizeImage(file: File, maxSize = 400): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

const pName = (p: Product) => p.name || p.description;

const normCat = (cat: string): string => {
  const c = cat.toLowerCase();
  if (c.includes('giacc') || c.includes('parka') || c.includes('jacket')) return 'giacche';
  if (c.includes('felp') || c.includes('pull') || c.includes('fleece') || c.includes('sweater')) return 'felpe';
  if (c.includes('pant') || c.includes('trouser')) return 'pantaloni';
  if (c.includes('hivis') || c.includes('hi-vis') || c.includes('high vis') || c.includes('hv')) return 'hivis';
  if (c.includes('tshirt') || c.includes('t-shirt') || c.includes('magliett') || c.includes('polo')) return 'tshirt';
  if (c.includes('access') || c.includes('cap') || c.includes('guant') || c.includes('cintur')) return 'accessori';
  return c;
};

const fPrice = (p: Product) =>
  p.price > 0 ? `€${p.price % 1 === 0 ? p.price.toFixed(0) : p.price.toFixed(2)}` : '';

const stockSt = (p: Product): 'esaurito' | 'low' | 'ok' | null => {
  if (p.stock === undefined || p.stock === null) return null;
  if (p.stock === 0) return 'esaurito';
  if (p.stock < 10) return 'low';
  return 'ok';
};

// ─── ColorDots ────────────────────────────────────────────────────────────────
const ColorDots: React.FC<{ colors?: string[]; size?: number }> = ({ colors, size = 14 }) => {
  if (!colors?.length) return null;
  const show = colors.slice(0, 3);
  const extra = colors.length - 3;
  return (
    <div className="flex items-center">
      {show.map((c, i) => (
        <span
          key={i}
          title={c}
          aria-label={`colore: ${c}`}
          style={{
            width: size, height: size, borderRadius: '50%',
            background: getColorHex(c),
            border: '1.5px solid rgba(128,128,128,0.25)',
            marginLeft: i > 0 ? -4 : 0,
            display: 'inline-block', flexShrink: 0,
          }}
        />
      ))}
      {extra > 0 && (
        <span style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', marginLeft: 5 }}>+{extra}</span>
      )}
    </div>
  );
};

// ─── StockBadge ───────────────────────────────────────────────────────────────
const StockBadge: React.FC<{ p: Product; tiny?: boolean }> = ({ p, tiny }) => {
  const st = stockSt(p);
  if (!st || st === 'ok') return null;
  if (st === 'esaurito')
    return <span className={`${tiny ? 'text-xs px-1.5 py-0' : 'text-xs px-2 py-0.5'} rounded-full bg-danger-soft text-danger font-semibold uppercase`}>Esaurito</span>;
  return <span className={`${tiny ? 'text-xs px-1.5 py-0' : 'text-xs px-2 py-0.5'} rounded-full bg-warning-soft text-warning font-semibold uppercase`}>Solo {p.stock}</span>;
};

// ─── DotMenu (⋯ dropdown) ─────────────────────────────────────────────────────
const DotMenu: React.FC<{ onDelete: () => void; onDuplicate: () => void; onEdit: () => void }> = ({ onDelete, onDuplicate, onEdit }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        className="p-1.5 rounded-lg text-muted hover:text-secondary hover:bg-raised dark:hover:bg-raised transition-all"
        aria-label="Azioni"
      >
        <MoreHorizontal size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-30 bg-surface dark:bg-surface border border-line dark:border-line rounded-md shadow-panel py-1 w-36">
          <button onClick={() => { onDuplicate(); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-secondary dark:text-muted hover:bg-canvas dark:hover:bg-raised">
            <Copy size={13} /> Duplica
          </button>
          <button onClick={() => { onEdit(); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-secondary dark:text-muted hover:bg-canvas dark:hover:bg-raised">
            <Pencil size={13} /> Modifica
          </button>
          <div className="border-t border-line dark:border-line my-1" />
          <button onClick={() => { onDelete(); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-danger hover:bg-danger-soft dark:hover:bg-danger-soft">
            <Trash2 size={13} /> Elimina
          </button>
        </div>
      )}
    </div>
  );
};

// ─── COMPACT LIST ─────────────────────────────────────────────────────────────
const CompactList: React.FC<{
  products: Product[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onOpen: (p: Product) => void;
  onDelete: (id: string) => void;
  onDuplicate: (p: Product) => void;
  onEdit: (p: Product) => void;
  onEnrich: (p: Product) => void;
  enrichingIds: Set<string>;
}> = ({ products, selected, onToggle, onOpen, onDelete, onDuplicate, onEdit, onEnrich, enrichingIds }) => {
  const catStyle = (p: Product) => CAT_STYLE[normCat(p.category)] ?? CAT_STYLE['accessori'];
  const catLabel = (p: Product) => {
    const c = normCat(p.category);
    return CATEGORIES.find(x => x.id === c)?.label ?? p.category;
  };

  return (
    <div className="bg-surface dark:bg-surface rounded-panel overflow-hidden border border-line dark:border-line">
      {products.map((p, i) => {
        const sel = selected.has(p.id);
        const st = stockSt(p);
        const cs = catStyle(p);
        return (
          <div
            key={p.id}
            onClick={() => onOpen(p)}
            style={{ minHeight: 54, opacity: st === 'esaurito' ? 0.6 : 1 }}
            className={`flex items-center px-4 cursor-pointer transition-colors ${
              i > 0 ? 'border-t border-line dark:border-line/50' : ''
            } ${sel ? 'bg-accent-soft dark:bg-accent-soft/20' : 'hover:bg-canvas dark:hover:bg-raised/30'}`}
          >
            {/* Left: thumbnail o color dots */}
            <div className="mr-3 flex-shrink-0">
              {p.imageUrl
                ? <img src={p.imageUrl} alt={pName(p)} className="w-9 h-9 rounded-xl object-cover border border-line dark:border-line" />
                : p.colors?.length
                  ? <ColorDots colors={p.colors} size={14} />
                  : <div className="w-9 h-9 bg-raised dark:bg-raised rounded-md flex items-center justify-center"><Package size={14} className="text-muted" /></div>
              }
            </div>

            {/* Center: name + code + meta */}
            <div className="flex-1 min-w-0 py-3">
              <div className="flex items-baseline gap-2 min-w-0">
                <span
                  className="dark:text-foreground truncate"
                  style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.3 }}
                >
                  {pName(p)}
                </span>
                <a
                  href={blakladerUrl(p.code, p.productUrl)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="text-accent hover:text-accent flex-shrink-0 font-mono hover:underline flex items-center gap-0.5"
                  style={{ fontSize: 10.5 }}
                >
                  {p.code}
                  {p.productUrl && <ExternalLink size={9} />}
                </a>
                {!p.productUrl && (
                  <button
                    onClick={e => { e.stopPropagation(); onEnrich(p); }}
                    title="Recupera dati da blaklader.it"
                    className="text-muted hover:text-success transition-colors"
                  >
                    {enrichingIds.has(p.id)
                      ? <Loader2 size={11} className="animate-spin text-success" />
                      : <Sparkles size={11} />}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className={`text-[9.5px] font-semibold uppercase tracking-wide ${cs.text}`}>
                  {catLabel(p)}
                </span>
                {p.sizes && <><span className="text-muted dark:text-secondary text-xs">·</span><span className="text-[9.5px] text-muted font-medium">{p.sizes}</span></>}
                {st === 'low' && <><span className="text-muted dark:text-secondary text-xs">·</span><span className="text-xs font-semibold text-warning">SOLO {p.stock}</span></>}
                {st === 'esaurito' && <><span className="text-muted dark:text-secondary text-xs">·</span><span className="text-xs font-semibold text-danger">ESAURITO</span></>}
              </div>
            </div>

            {/* Right: price + line + menu + checkbox */}
            <div className="flex items-center gap-2 ml-3 flex-shrink-0">
              <div className="text-right mr-1">
                <div className="dark:text-foreground font-bold" style={{ fontSize: 14 }}>{fPrice(p)}</div>
                {p.line && <div className="text-muted font-mono" style={{ fontSize: 9 }}>{p.line}</div>}
              </div>
              <DotMenu onDelete={() => onDelete(p.id)} onDuplicate={() => onDuplicate(p)} onEdit={() => onEdit(p)} />
              <div
                onClick={e => { e.stopPropagation(); onToggle(p.id); }}
                className={`w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${
                  sel
                    ? 'bg-action border-accent'
                    : 'border-line dark:border-line'
                }`}
                role="checkbox"
                aria-checked={sel}
                tabIndex={0}
                onKeyDown={e => e.key === ' ' && onToggle(p.id)}
              >
                {sel && <Check size={11} className="text-action-foreground" strokeWidth={3} />}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── VISUAL LIST ──────────────────────────────────────────────────────────────
const VisualList: React.FC<{
  products: Product[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onOpen: (p: Product) => void;
  onDelete: (id: string) => void;
  onDuplicate: (p: Product) => void;
  onEdit: (p: Product) => void;
  onEnrich: (p: Product) => void;
  enrichingIds: Set<string>;
}> = ({ products, selected, onToggle, onOpen, onDelete, onDuplicate, onEdit, onEnrich: _onEnrich2, enrichingIds: _enrichingIds2 }) => {
  const catStyle = (p: Product) => CAT_STYLE[normCat(p.category)] ?? CAT_STYLE['accessori'];
  const catLabel = (p: Product) => {
    const c = normCat(p.category);
    return CATEGORIES.find(x => x.id === c)?.label ?? p.category;
  };

  const thumbGrad = (p: Product) => {
    const c1 = p.colors?.[0] ? getColorHex(p.colors[0]) : '#946239';
    const c2 = p.colors?.[1] ? getColorHex(p.colors[1]) : c1 + '99';
    return `linear-gradient(135deg, ${c1}, ${c2})`;
  };

  return (
    <div className="space-y-2">
      {products.map(p => {
        const sel = selected.has(p.id);
        const st = stockSt(p);
        const cs = catStyle(p);
        return (
          <div
            key={p.id}
            onClick={() => onOpen(p)}
            style={{ opacity: st === 'esaurito' ? 0.65 : 1, borderRadius: 12, padding: 11 }}
            className={`bg-surface dark:bg-surface border flex gap-3 cursor-pointer transition-all ${
              sel ? 'border-accent dark:border-accent' : 'border-line dark:border-line hover:border-line'
            }`}
          >
            {/* Thumbnail */}
            <div className="flex-shrink-0 relative" style={{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden' }}>
              {p.imageUrl
                ? <img src={p.imageUrl} alt={pName(p)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', background: thumbGrad(p) }} />
              }
              {p.line && (
                <span style={{
                  position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)',
                  fontSize: 9.5, fontWeight: 700, color: '#fff',
                  textShadow: '0 1px 3px rgba(0,0,0,0.6)', whiteSpace: 'nowrap'
                }}>{p.line}</span>
              )}
              {st === 'esaurito' && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(0,0,0,0.45)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <span style={{ fontSize: 8, fontWeight: 900, color: '#fff', letterSpacing: 1 }}>ESAURITO</span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Top row: category + code */}
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`text-[9.5px] font-semibold uppercase nowrap ${cs.text} flex-shrink-0`} style={{ whiteSpace: 'nowrap', minWidth: 0 }}>
                  {catLabel(p)}
                </span>
                <a
                  href={blakladerUrl(p.code)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="text-accent hover:text-accent font-mono flex-shrink-0 hover:underline"
                  style={{ fontSize: 10 }}
                >
                  {p.code}
                </a>
              </div>
              {/* Name */}
              <div
                className="dark:text-foreground mt-0.5"
                style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.25 }}
              >
                {pName(p)}
              </div>
              {/* Footer */}
              <div className="flex items-center gap-2 mt-1.5">
                <ColorDots colors={p.colors} size={12} />
                {p.sizes && <span className="text-xs text-muted">{p.sizes}</span>}
                <StockBadge p={p} tiny />
              </div>
            </div>

            {/* Right column: price + checkbox */}
            <div className="flex flex-col items-end justify-between flex-shrink-0 ml-1">
              <div className="text-right">
                <div className="dark:text-foreground font-bold" style={{ fontSize: 16 }}>{fPrice(p)}</div>
              </div>
              <div className="flex items-center gap-1">
                <DotMenu onDelete={() => onDelete(p.id)} onDuplicate={() => onDuplicate(p)} onEdit={() => onEdit(p)} />
                <div
                  onClick={e => { e.stopPropagation(); onToggle(p.id); }}
                  className={`w-[22px] h-[22px] rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer ${
                    sel ? 'bg-action border-accent' : 'border-line dark:border-line'
                  }`}
                  role="checkbox"
                  aria-checked={sel}
                  tabIndex={0}
                  onKeyDown={e => e.key === ' ' && onToggle(p.id)}
                >
                  {sel && <Check size={13} className="text-action-foreground" strokeWidth={3} />}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── GRID LIST ────────────────────────────────────────────────────────────────
const GridList: React.FC<{
  products: Product[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onOpen: (p: Product) => void;
  onDelete: (id: string) => void;
  onDuplicate: (p: Product) => void;
  onEdit: (p: Product) => void;
  onEnrich: (p: Product) => void;
  enrichingIds: Set<string>;
}> = ({ products, selected, onToggle, onOpen, onDelete, onDuplicate, onEdit, onEnrich: _onEnrich, enrichingIds: _enrichingIds }) => {
  const catLabel = (p: Product) => {
    const c = normCat(p.category);
    return CATEGORIES.find(x => x.id === c)?.label ?? p.category;
  };
  const catStyle = (p: Product) => CAT_STYLE[normCat(p.category)] ?? CAT_STYLE['accessori'];

  const heroGrad = (p: Product) => {
    const c1 = p.colors?.[0] ? getColorHex(p.colors[0]) : '#946239';
    const c2 = p.colors?.[1] ? getColorHex(p.colors[1]) : '#c08d62';
    return `linear-gradient(180deg, ${c1} 0%, ${c2} 100%)`;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {products.map(p => {
        const sel = selected.has(p.id);
        const st = stockSt(p);
        const cs = catStyle(p);
        return (
          <div
            key={p.id}
            onClick={() => onOpen(p)}
            style={{ opacity: st === 'esaurito' ? 0.65 : 1, borderRadius: 14, overflow: 'hidden' }}
            className={`bg-surface dark:bg-surface border cursor-pointer transition-all ${
              sel ? 'border-accent shadow-panel  ' : 'border-line dark:border-line hover:border-line'
            }`}
          >
            {/* Hero */}
            <div style={{ position: 'relative', aspectRatio: '1 / 1.05', background: p.imageUrl ? 'transparent' : heroGrad(p) }}>
              {p.imageUrl && <img src={p.imageUrl} alt={pName(p)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
              {/* Stock badge top-left */}
              {(st === 'esaurito' || st === 'low') && (
                <div style={{ position: 'absolute', top: 6, left: 6 }}>
                  <StockBadge p={p} tiny />
                </div>
              )}
              {/* Checkmark top-right */}
              <div
                style={{ position: 'absolute', top: 6, right: 6 }}
                onClick={e => { e.stopPropagation(); onToggle(p.id); }}
              >
                <div className={`w-[22px] h-[22px] rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer ${
                  sel ? 'bg-action border-accent' : 'bg-surface/20 border-line/50'
                }`}>
                  {sel && <Check size={13} className="text-action-foreground" strokeWidth={3} />}
                </div>
              </div>
              {/* Line badge bottom */}
              {p.line && (
                <div style={{ position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)' }}>
                  <span style={{
                    background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: 20, padding: '2px 8px',
                    fontSize: 9.5, fontWeight: 700, color: '#fff',
                    whiteSpace: 'nowrap'
                  }}>{p.line}</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-3">
              {/* Cat + code */}
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`text-xs font-semibold uppercase ${cs.text}`}>{catLabel(p)}</span>
                <a href={blakladerUrl(p.code, p.productUrl)} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                  className="text-accent hover:text-accent font-mono text-xs ml-auto flex-shrink-0 hover:underline flex items-center gap-0.5">
                  {p.code}{p.productUrl && <ExternalLink size={8} />}
                </a>
              </div>
              {/* Name */}
              <div
                className="dark:text-foreground mb-2"
                style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.3,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
              >
                {pName(p)}
              </div>
              {/* Footer */}
              <div className="flex items-center justify-between">
                <ColorDots colors={p.colors} size={12} />
                <div className="flex items-center gap-1">
                  <DotMenu onDelete={() => onDelete(p.id)} onDuplicate={() => onDuplicate(p)} onEdit={() => onEdit(p)} />
                  <span className="dark:text-foreground font-bold text-xs">{fPrice(p)}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── ADD PRODUCT MODAL ────────────────────────────────────────────────────────
const AddProductModal: React.FC<{
  onClose: () => void;
  onSave: (p: Omit<Product, 'id'>) => void;
  editProduct?: Product;
}> = ({ onClose, onSave, editProduct }) => {
  const [form, setForm] = useState<Partial<Product>>(
    editProduct
      ? { ...editProduct }
      : { code: '', description: '', name: '', category: '', price: 0, sizes: '', discount: 0, colors: [], stock: undefined, line: undefined, imageUrl: undefined }
  );
  const [colorInput, setColorInput] = useState('');
  const imgInputRef = useRef<HTMLInputElement>(null);
  const set = (k: keyof Product, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await resizeImage(file);
    set('imageUrl', base64);
    if (imgInputRef.current) imgInputRef.current.value = '';
  };

  const handleSave = () => {
    if (!form.code || !form.description) return;
    onSave({
      code: form.code!, description: form.description!, name: form.name || form.description,
      category: form.category || 'accessori', price: Number(form.price) || 0,
      sizes: form.sizes || '', discount: Number(form.discount) || 0,
      colors: form.colors || [], stock: form.stock, line: form.line,
      imageUrl: form.imageUrl,
    });
    onClose();
  };

  const addColor = () => {
    if (!colorInput.trim()) return;
    set('colors', [...(form.colors || []), colorInput.trim().toLowerCase()]);
    setColorInput('');
  };

  const LINES = ['X1900','X1500','X1600','X1800','X1700','X1100','HiVis','Softshell','Knitwear'];
  const inputCls = 'w-full border-2 border-line dark:border-line rounded-panel p-3.5 bg-transparent dark:text-foreground font-bold outline-none focus:border-accent text-sm transition-colors';
  const labelCls = 'text-xs font-semibold text-muted uppercase tracking-normal mb-1 block';

  return (
    <DialogFrame className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-md">
      <div className="bg-surface dark:bg-surface w-full max-w-lg rounded-t-panel md:rounded-panel p-6 shadow-panel max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold   dark:text-foreground">{editProduct ? 'Modifica Articolo' : 'Nuovo Articolo'}</h2>
          <button aria-label="Chiudi dialogo" data-dialog-close onClick={onClose}><X size={22} className="text-muted" /></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Codice *</label>
              <input className={inputCls} value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="ES. 1234" />
            </div>
            <div>
              <label className={labelCls}>Linea</label>
              <select className={inputCls} value={form.line ?? ''} onChange={e => set('line', e.target.value || undefined)}>
                <option value="">—</option>
                {LINES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Descrizione / Nome *</label>
            <input className={inputCls} value={form.description} onChange={e => { set('description', e.target.value); set('name', e.target.value); }} placeholder="Es. Giacca antipioggia..." />
          </div>
          <div>
            <label className={labelCls}>Categoria</label>
            <select className={inputCls} value={normCat(form.category || '')} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.filter(c => c.id !== 'all').map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Prezzo (€)</label>
              <input type="number" className={inputCls} value={form.price || ''} onChange={e => set('price', Number(e.target.value))} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>Sconto (%)</label>
              <input type="number" className={inputCls} value={form.discount || ''} onChange={e => set('discount', Number(e.target.value))} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>Stock</label>
              <input type="number" className={inputCls} value={form.stock ?? ''} onChange={e => set('stock', e.target.value ? Number(e.target.value) : undefined)} placeholder="—" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Taglie</label>
            <input className={inputCls} value={form.sizes} onChange={e => set('sizes', e.target.value)} placeholder="Es. S, M, L, XL, XXL" />
          </div>
          <div>
            <label className={labelCls}>Colori</label>
            <div className="flex gap-2">
              <input className={inputCls} value={colorInput} onChange={e => setColorInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addColor()} placeholder="Es. nero, blu, grigio..." />
              <button onClick={addColor} className="px-4 py-3 bg-action text-action-foreground rounded-panel font-bold text-sm flex-shrink-0">+</button>
            </div>
            {(form.colors?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.colors!.map((c, i) => (
                  <span key={i} className="flex items-center gap-1.5 bg-raised dark:bg-raised rounded-full px-3 py-1 text-xs font-bold dark:text-foreground">
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: getColorHex(c), display: 'inline-block' }} />
                    {c}
                    <button onClick={() => set('colors', form.colors!.filter((_, j) => j !== i))} className="text-muted hover:text-danger"><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
          {/* Immagine */}
          <div>
            <label className={labelCls}>Immagine articolo</label>
            <input ref={imgInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            {form.imageUrl ? (
              <div className="flex items-center gap-3">
                <img src={form.imageUrl} alt="preview" className="w-20 h-20 rounded-panel object-cover border-2 border-line dark:border-line" />
                <div className="flex flex-col gap-2">
                  <button onClick={() => imgInputRef.current?.click()} className="text-xs font-bold text-accent hover:underline">Cambia foto</button>
                  <button onClick={() => set('imageUrl', undefined)} className="text-xs font-bold text-danger hover:underline">Rimuovi</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => imgInputRef.current?.click()}
                className="w-full border-2 border-dashed border-line dark:border-line rounded-panel py-5 flex flex-col items-center gap-2 text-muted hover:border-accent hover:text-accent transition-colors"
              >
                <Upload size={20} />
                <span className="text-xs font-bold">Carica foto (jpg, png, webp)</span>
              </button>
            )}
          </div>

          <button onClick={handleSave} className="w-full bg-action text-action-foreground py-4 rounded-panel font-semibold uppercase text-xs tracking-normal shadow-panel hover:bg-action-hover transition-all mt-2">
            {editProduct ? 'Salva Modifiche' : 'Salva nel Catalogo'}
          </button>
        </div>
      </div>
    </DialogFrame>
  );
};

// ─── ADD TO OFFER MODAL ───────────────────────────────────────────────────────
const AddToOfferModal: React.FC<{
  selectedProducts: Product[];
  onClose: () => void;
}> = ({ selectedProducts, onClose }) => {
  const { offers, contacts, updateOffer } = useStore();
  const { showToast } = useToast();

  const offerList = useMemo(() =>
    Object.values(offers)
      .filter(o => o.status === 'bozza' || o.status === 'inviata')
      .sort((a, b) => b.date - a.date),
    [offers]
  );

  const handlePick = (offerId: string) => {
    const offer = offers[offerId];
    if (!offer) return;
    const newItems = selectedProducts.map(p => ({
      id: `item_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      productId: p.id,
      description: pName(p),
      sizes: p.sizes || '',
      quantity: 1,
      price: p.price,
      discount: p.discount || 0,
    }));
    const updatedItems = [...offer.items, ...newItems];
    const total = updatedItems.reduce((sum, it) => {
      const net = it.price * it.quantity * (1 - it.discount / 100);
      return sum + net;
    }, 0);
    updateOffer(offerId, { items: updatedItems, totalAmount: total });
    showToast(`${selectedProducts.length} articoli aggiunti all'offerta ${offer.offerNumber}`, 'success');
    onClose();
  };

  return (
    <DialogFrame className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface dark:bg-surface w-full md:max-w-md rounded-t-3xl md:rounded-panel shadow-panel p-6 pb-10 md:pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-foreground dark:text-foreground text-base">Aggiungi a offerta</h2>
            <p className="text-xs text-secondary mt-0.5">{selectedProducts.length} articoli selezionati</p>
          </div>
          <button aria-label="Chiudi dialogo" data-dialog-close onClick={onClose} className="p-1.5 rounded-full text-muted hover:text-secondary">
            <X size={18} />
          </button>
        </div>

        {offerList.length === 0 ? (
          <div className="text-center py-8 text-muted">
            <ShoppingBag size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nessuna offerta in bozza o inviata</p>
            <p className="text-xs mt-1">Crea prima un'offerta dalla sezione Offerte</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {offerList.map(o => {
              const contact = contacts[o.contactId];
              return (
                <button
                  key={o.id}
                  onClick={() => handlePick(o.id)}
                  className="w-full flex items-center justify-between p-3 rounded-md border border-line dark:border-line hover:bg-accent-soft dark:hover:bg-accent-soft/20 hover:border-accent dark:hover:border-accent transition-all text-left group"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-foreground dark:text-foreground">
                      {o.offerNumber}
                    </div>
                    <div className="text-xs text-secondary truncate">
                      {contact?.company || 'Azienda sconosciuta'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${
                      o.status === 'bozza'
                        ? 'bg-raised dark:bg-raised text-secondary'
                        : 'bg-accent-soft dark:bg-accent-soft/30 text-accent'
                    }`}>
                      {o.status}
                    </span>
                    <span className="text-xs text-accent font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                      Aggiungi →
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </DialogFrame>
  );
};

// ─── PRODUCT DETAIL MODAL ─────────────────────────────────────────────────────
const ProductDetailModal: React.FC<{
  product: Product;
  onClose: () => void;
  onEdit: (p: Product) => void;
  onDuplicate: (p: Product) => void;
  onDelete: (id: string) => void;
  onAddToOffer: (p: Product) => void;
  onEnrich: (p: Product) => void;
  enrichingIds: Set<string>;
}> = ({ product: p, onClose, onEdit, onDuplicate, onDelete, onAddToOffer, onEnrich, enrichingIds }) => {
  const catStyle = CAT_STYLE[normCat(p.category)] ?? CAT_STYLE['accessori'];
  const catLabel = CATEGORIES.find(x => x.id === normCat(p.category))?.label ?? p.category;
  const st = stockSt(p);

  const heroGrad = () => {
    const c1 = p.colors?.[0] ? getColorHex(p.colors[0]) : '#946239';
    const c2 = p.colors?.[1] ? getColorHex(p.colors[1]) : c1 + '99';
    return `linear-gradient(160deg, ${c1} 0%, ${c2} 100%)`;
  };

  const netPrice = p.price > 0 && p.discount ? p.price * (1 - p.discount / 100) : p.price;

  return (
    <DialogFrame className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-md">
      <div className="bg-surface dark:bg-surface w-full max-w-lg rounded-t-panel md:rounded-panel shadow-panel max-h-[92vh] overflow-y-auto">
        {/* Hero image / color gradient */}
        <div style={{ position: 'relative', height: 200, background: p.imageUrl ? 'transparent' : heroGrad(), borderRadius: '2rem 2rem 0 0', overflow: 'hidden' }}>
          {p.imageUrl && (
            <img src={p.imageUrl} alt={pName(p)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
          <button aria-label="Chiudi dialogo" data-dialog-close
            onClick={onClose}
            className="absolute top-4 right-4 bg-black/30 backdrop-blur-sm text-foreground rounded-full p-2 hover:bg-black/50 transition-all"
          >
            <X size={18} />
          </button>
          {p.line && (
            <span style={{
              position: 'absolute', bottom: 12, left: 16,
              background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255,255,255,0.35)',
              borderRadius: 20, padding: '3px 10px',
              fontSize: 11, fontWeight: 700, color: '#fff',
            }}>{p.line}</span>
          )}
          {(st === 'esaurito' || st === 'low') && (
            <div style={{ position: 'absolute', top: 12, left: 16 }}>
              <StockBadge p={p} />
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Name + code */}
          <div>
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-xl font-semibold dark:text-foreground leading-tight">{pName(p)}</h2>
              <span className={`flex-shrink-0 text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${catStyle.bg} ${catStyle.text}`}>{catLabel}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <a
                href={blakladerUrl(p.code, p.productUrl)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-accent hover:text-accent text-sm hover:underline flex items-center gap-1"
              >
                {p.code} <ExternalLink size={12} />
              </a>
              {p.line && <><span className="text-muted dark:text-secondary">·</span><span className="font-mono text-muted text-sm">{p.line}</span></>}
              {!p.productUrl && (
                <button
                  onClick={() => onEnrich(p)}
                  className="flex items-center gap-1 text-xs font-semibold text-success bg-success-soft dark:bg-success-soft px-2 py-1 rounded-full hover:bg-success-soft transition-colors"
                >
                  {enrichingIds.has(p.id)
                    ? <><Loader2 size={10} className="animate-spin" /> Caricamento...</>
                    : <><Sparkles size={10} /> Arricchisci da blaklader.it</>}
                </button>
              )}
              {p.productUrl && (
                <span className="text-xs text-success font-semibold flex items-center gap-1">
                  <Check size={10} /> Dati sincronizzati
                </span>
              )}
            </div>
          </div>

          {/* Price */}
          <div className="bg-canvas dark:bg-raised/50 rounded-panel p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-normal text-muted mb-1">Prezzo</div>
              {p.price > 0 ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold dark:text-foreground">{fPrice(p)}</span>
                  {p.discount ? (
                    <>
                      <span className="text-sm text-muted line-through">€{p.price.toFixed(2)}</span>
                      <span className="text-xs font-semibold text-success bg-success-soft dark:bg-success-soft px-2 py-0.5 rounded-full">-{p.discount}%</span>
                    </>
                  ) : null}
                </div>
              ) : null}
              {p.discount && p.price > 0 ? (
                <div className="text-xs text-muted mt-0.5">Netto: <span className="font-bold text-secondary dark:text-muted">€{netPrice.toFixed(2)}</span></div>
              ) : null}
              {p.listPrice && p.listPrice > 0 ? (
                <div className="text-xs text-muted mt-0.5">Listino lordo: <span className="font-bold text-accent dark:text-accent">€{p.listPrice.toFixed(2)}</span></div>
              ) : null}
            </div>
            {p.stock !== undefined && p.stock !== null && (
              <div className="text-right">
                <div className="text-xs font-semibold uppercase tracking-normal text-muted mb-1">Stock</div>
                <div className={`text-xl font-semibold ${st === 'esaurito' ? 'text-danger' : st === 'low' ? 'text-warning' : 'dark:text-foreground'}`}>{p.stock}</div>
                <div className="text-xs text-muted">pz</div>
              </div>
            )}
          </div>

          {/* Details grid */}
          <div className="space-y-3">
            {p.sizes && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-raised dark:bg-raised rounded-md flex items-center justify-center flex-shrink-0">
                  <Ruler size={14} className="text-secondary" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase text-muted tracking-normal">Taglie</div>
                  <div className="text-sm font-bold dark:text-foreground">{p.sizes}</div>
                </div>
              </div>
            )}
            {p.colors?.length ? (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-raised dark:bg-raised rounded-md flex items-center justify-center flex-shrink-0">
                  <Layers size={14} className="text-secondary" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase text-muted tracking-normal mb-1">Colori</div>
                  <div className="flex flex-wrap gap-2">
                    {p.colors.map((c, i) => (
                      <span key={i} className="flex items-center gap-1.5 bg-raised dark:bg-raised rounded-full px-2.5 py-1 text-xs font-bold dark:text-foreground">
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: getColorHex(c), display: 'inline-block', border: '1px solid rgba(0,0,0,0.1)' }} />
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
            {p.category && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-raised dark:bg-raised rounded-md flex items-center justify-center flex-shrink-0">
                  <Tag size={14} className="text-secondary" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase text-muted tracking-normal">Categoria</div>
                  <div className="text-sm font-bold dark:text-foreground">{catLabel}</div>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={() => { onAddToOffer(p); onClose(); }}
              className="flex items-center justify-center gap-2 bg-action text-action-foreground py-3 rounded-panel font-semibold text-xs uppercase tracking-normal hover:bg-action-hover transition-all col-span-2"
            >
              <ShoppingBag size={14} /> Aggiungi a offerta
            </button>
            <button
              onClick={() => { onEdit(p); onClose(); }}
              className="flex items-center justify-center gap-2 bg-raised dark:bg-raised text-foreground dark:text-foreground py-3 rounded-panel font-semibold text-xs uppercase tracking-normal hover:bg-raised dark:hover:bg-raised transition-all"
            >
              <Pencil size={13} /> Modifica
            </button>
            <button
              onClick={() => { onDuplicate(p); onClose(); }}
              className="flex items-center justify-center gap-2 bg-raised dark:bg-raised text-foreground dark:text-foreground py-3 rounded-panel font-semibold text-xs uppercase tracking-normal hover:bg-raised dark:hover:bg-raised transition-all"
            >
              <Copy size={13} /> Duplica
            </button>
            <button
              onClick={() => { onDelete(p.id); onClose(); }}
              className="flex items-center justify-center gap-2 bg-danger-soft dark:bg-danger-soft text-danger py-3 rounded-panel font-semibold text-xs uppercase tracking-normal hover:bg-danger-soft transition-all col-span-2"
            >
              <Trash2 size={13} /> Elimina articolo
            </button>
          </div>
        </div>
      </div>
    </DialogFrame>
  );
};

// ─── MAIN VIEW ────────────────────────────────────────────────────────────────
export const ProductsView: React.FC = () => {
  const { products, addProduct, bulkAddProducts, updateProduct, removeProduct } = useStore();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [layout, setLayout] = useState<LayoutVariant>(
    () => (localStorage.getItem(LAYOUT_KEY) as LayoutVariant) ?? 'compact'
  );
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [importingBlk, setImportingBlk] = useState(false);
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
  const [enrichBulkRunning, setEnrichBulkRunning] = useState(false);

  const changeLayout = (v: LayoutVariant) => {
    setLayout(v);
    localStorage.setItem(LAYOUT_KEY, v);
  };

  const enrichOne = useCallback(async (p: Product) => {
    if (enrichingIds.has(p.id)) return;
    setEnrichingIds(prev => new Set(prev).add(p.id));
    const data = await enrichProduct(p.code);
    setEnrichingIds(prev => { const s = new Set(prev); s.delete(p.id); return s; });
    if (!data) { showToast(`Prodotto ${p.code} non trovato su blaklader.it`, 'error'); return; }
    updateProduct(p.id, {
      productUrl:  data.url,
      imageUrl:    data.imageUrl ?? p.imageUrl,
      name:        p.name || data.title || p.description,
      description: p.description || data.description,
      ...(data.listPrice != null ? { listPrice: data.listPrice } : {}),
    });
    showToast(`${p.code} arricchito ✓`);
  }, [enrichingIds, updateProduct, showToast]);

  const removeDuplicates = useCallback(async () => {
    const all = Object.values(products) as Product[];
    // Raggruppa per codice articolo normalizzato (prime 4 cifre numeriche)
    const byCode: Record<string, Product[]> = {};
    for (const p of all) {
      const digits = p.code.replace(/\D/g, '');
      const key = digits.slice(0, 4) || p.code;
      if (!byCode[key]) byCode[key] = [];
      byCode[key].push(p);
    }
    const toDelete: string[] = [];
    for (const group of Object.values(byCode)) {
      if (group.length <= 1) continue;
      // Tieni il prodotto più completo: preferisce chi ha productUrl, poi imageUrl, poi listPrice
      group.sort((a, b) => {
        const scoreA = (a.productUrl ? 4 : 0) + (a.imageUrl ? 2 : 0) + (a.listPrice ? 1 : 0);
        const scoreB = (b.productUrl ? 4 : 0) + (b.imageUrl ? 2 : 0) + (b.listPrice ? 1 : 0);
        return scoreB - scoreA;
      });
      // Elimina tutti tranne il primo
      for (let i = 1; i < group.length; i++) toDelete.push(group[i].id);
    }
    if (toDelete.length === 0) { showToast('Nessun doppione trovato'); return; }
    if (!await confirmAction(`Trovati ${toDelete.length} doppioni. Eliminarli tenendo il prodotto più completo per ogni codice?`)) return;
    toDelete.forEach(id => removeProduct(id));
    showToast(`${toDelete.length} doppioni eliminati`, 'success');
  }, [products, removeProduct, showToast]);

  const enrichAll = useCallback(async () => {
    const toEnrich = Object.values(products).filter(p => !p.productUrl);
    if (toEnrich.length === 0) { showToast('Tutti i prodotti già arricchiti'); return; }
    setEnrichBulkRunning(true);
    for (const p of toEnrich) {
      setEnrichingIds(prev => new Set(prev).add(p.id));
      const data = await enrichProduct(p.code);
      setEnrichingIds(prev => { const s = new Set(prev); s.delete(p.id); return s; });
      if (data) {
        updateProduct(p.id, {
          productUrl:  data.url,
          imageUrl:    data.imageUrl ?? p.imageUrl,
          name:        p.name || data.title || p.description,
          description: p.description || data.description,
          ...(data.listPrice != null ? { listPrice: data.listPrice } : {}),
        });
      }
      await new Promise(r => setTimeout(r, 600)); // throttle
    }
    setEnrichBulkRunning(false);
    showToast(`Arricchimento completato`);
  }, [products, updateProduct, showToast]);

  const productList = useMemo(() => Object.values(products) as Product[], [products]);

  const filtered = useMemo(() => {
    return productList.filter(p => {
      const matchesQuery = matchSearch(search, [
        pName(p), p.code, p.line, p.description, p.category, ...(p.colors ?? []),
      ]);
      const matchCat = catFilter === 'all' || normCat(p.category) === catFilter;
      return matchesQuery && matchCat;
    });
  }, [productList, search, catFilter]);

  const toggleSelect = (id: string) => {
    setSelected(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const clearSelect = () => setSelected(new Set());

  const handleDelete = async (id: string) => {
    if (await confirmAction('Eliminare questo articolo?')) {
      removeProduct(id);
      setSelected(s => { const n = new Set(s); n.delete(id); return n; });
      showToast('Articolo eliminato', 'success');
    }
  };

  const handleDuplicate = (p: Product) => {
    addProduct({ ...p, id: `prod_${Date.now()}`, code: `${p.code}-COPIA` });
    showToast('Articolo duplicato', 'success');
  };

  const handleSaveProduct = (data: Omit<Product, 'id'>) => {
    // Validate product (business logic)
    if (data.price < 0) {
      showToast('Errore: Il prezzo non può essere negativo', 'error');
      return;
    }
    if (data.discount < 0) {
      showToast('Errore: Lo sconto non può essere negativo', 'error');
      return;
    }
    if (data.discount > 100) {
      showToast('Errore: Lo sconto non può superare il 100%', 'error');
      return;
    }

    if (editingProduct) {
      updateProduct(editingProduct.id, data);
      showToast('Articolo aggiornato', 'success');
      setEditingProduct(null);
    } else {
      addProduct({ ...data, id: `prod_${Date.now()}` });
      showToast('Articolo aggiunto', 'success');
    }
  };

  const handleAddToOffer = () => {
    if (selected.size === 0) return;
    setShowOfferModal(true);
  };

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return;
    if (!await confirmAction(`Eliminare ${selected.size} articoli selezionati?`)) return;
    selected.forEach(id => removeProduct(id));
    showToast(`${selected.size} articoli eliminati`, 'success');
    clearSelect();
  };

  const syncPricesFromCatalog = async () => {
    try {
      const res = await fetch('/blak-catalog.json');
      const data: { catalog: Record<string, { url: string; name: string; imageUrl: string | null; description: string; listPrice: number | null }> } = await res.json();
      let updated = 0;
      let notFound = 0;
      for (const p of Object.values(products) as Product[]) {
        const digits = p.code.replace(/\D/g, '');
        const artCode = digits.slice(0, 4);
        const entry = data.catalog[artCode];
        if (entry?.listPrice != null && entry.listPrice > 0) {
          updateProduct(p.id, { listPrice: entry.listPrice });
          updated++;
        } else {
          notFound++;
        }
      }
      showToast(`${updated} prezzi aggiornati${notFound > 0 ? ` · ${notFound} non trovati` : ''}`, 'success');
    } catch {
      showToast('Errore caricamento catalogo', 'error');
    }
  };

  const handleImportBlaklader = async () => {
    if (!await confirmAction('Importare tutti i prodotti Blåkläder dal catalogo ufficiale (1061 articoli con URL, immagine e prezzo lordo)?')) return;
    setImportingBlk(true);
    try {
      const res = await fetch('/blak-catalog.json');
      const data: { catalog: Record<string, { url: string; name: string; imageUrl: string | null; description: string; listPrice: number | null }> } = await res.json();

      // Codici già presenti → salta
      const existingCodes = new Set(productList.map(p => p.code.slice(0, 4)));

      // Derive category from product name/URL
      const guessCategory = (name: string, url: string): string => {
        const s = (name + ' ' + url).toLowerCase();
        if (/pantalon|salopette|short/.test(s)) return 'pantaloni';
        if (/giacc|giubbott|parka|softshell|wind/.test(s)) return 'giacche';
        if (/felpa|maglion|pullover|hoodie|zip|knitwear/.test(s)) return 'felpe';
        if (/hi.?vis|alta.?visib|high.?vis/.test(s)) return 'hivis';
        if (/t.?shirt|polo|magliett|canottiera/.test(s)) return 'tshirt';
        return 'accessori';
      };

      const toAdd: Product[] = [];
      let skipped = 0;
      const ts = Date.now();
      for (const [code, entry] of Object.entries(data.catalog)) {
        if (existingCodes.has(code)) { skipped++; continue; }
        toAdd.push({
          id: `blk_${code}_${ts}_${Math.random().toString(36).slice(2, 6)}`,
          code,
          name: entry.name,
          description: entry.description || entry.name,
          category: guessCategory(entry.name, entry.url),
          price: 0,
          discount: 0,
          imageUrl: entry.imageUrl ?? undefined,
          productUrl: entry.url,
          listPrice: entry.listPrice ?? undefined,
        });
      }
      bulkAddProducts(toAdd);
      showToast(`${toAdd.length} articoli Blåkläder importati${skipped > 0 ? ` · ${skipped} già presenti saltati` : ''}`, 'success');
    } catch {
      showToast('Errore durante il caricamento del catalogo', 'error');
    }
    setImportingBlk(false);
  };

  const handleCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const isExcel = /\.(xlsx|xls)$/i.test(file.name);
    const reader = new FileReader();
    const processText = (text: string) => {
      let count = 0;
      let errors = 0;
      text.split('\n').slice(1).forEach((line, i) => {
        const l = line.trim(); if (!l) return;
        const sep = l.includes(';') ? ';' : ',';
        const v = l.split(sep);
        if (v[0] && v[1]) {
          const price = parseFloat(v[3]) || 0;
          const discount = parseFloat(v[5]) || 0;
          if (price < 0) { console.warn(`Riga ${i + 2}: Prezzo negativo, saltato`); errors++; return; }
          if (discount < 0 || discount > 100) { console.warn(`Riga ${i + 2}: Sconto invalido (${discount}), saltato`); errors++; return; }
          addProduct({
            id: `prod_${Date.now()}_${i}`,
            code: v[0].trim(), description: v[1].trim(), name: v[1].trim(),
            category: v[2]?.trim() || 'accessori',
            price,
            sizes: v[4]?.trim() || '',
            discount,
          });
          count++;
        }
      });
      showToast(`${count} articoli importati${errors > 0 ? ` (${errors} errori ignorati)` : ''}`, 'success');
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    if (isExcel) {
      reader.onload = ev => {
        const wb = XLSX.read(ev.target?.result, { type: 'array' });
        processText(XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]));
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = ev => processText(ev.target?.result as string);
      reader.readAsText(file);
    }
  };

  const LAYOUT_TABS = [
    { id: 'compact' as LayoutVariant, icon: <LayoutList size={15} />, label: 'Compatto' },
    { id: 'visual'  as LayoutVariant, icon: <Rows3 size={15} />,      label: 'Visivo'   },
    { id: 'grid'    as LayoutVariant, icon: <LayoutGrid size={15} />,  label: 'Griglia'  },
  ];

  const handleOpenDetail = (p: Product) => setViewingProduct(p);
  const handleAddToOfferFromDetail = (p: Product) => {
    setSelected(new Set([p.id]));
    setShowOfferModal(true);
  };

  const listProps = { products: filtered, selected, onToggle: toggleSelect, onOpen: handleOpenDetail, onDelete: handleDelete, onDuplicate: handleDuplicate, onEdit: setEditingProduct, onEnrich: enrichOne, enrichingIds };

  return (
    <div className="space-y-4 pb-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
        <div>
          <h1 className="text-2xl  dark:text-foreground  ">Prodotti</h1>
          <p className="text-muted text-sm font-bold uppercase tracking-normal">{productList.length} articoli</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input type="file" accept=".csv,.xlsx,.xls" ref={fileInputRef} onChange={handleCSV} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()}
            className="hidden md:flex items-center gap-2 bg-surface dark:bg-surface text-accent border-2 border-accent dark:border-accent/30 px-4 py-2.5 rounded-panel font-bold text-sm hover:bg-accent-soft transition-all">
            <Upload size={16} /> CSV / Excel
          </button>
          <button
            onClick={handleImportBlaklader}
            disabled={importingBlk}
            className="flex items-center gap-2 bg-surface dark:bg-surface text-warning border-2 border-warning dark:border-warning px-4 py-2.5 rounded-panel font-bold text-sm hover:bg-warning-soft transition-all disabled:opacity-50"
          >
            <RefreshCw size={16} className={importingBlk ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Blåkläder</span>
          </button>
          <button
            onClick={syncPricesFromCatalog}
            title="Aggiorna prezzi di listino lordo da catalogo blaklader.it"
            className="flex items-center gap-2 bg-surface dark:bg-surface text-accent border-2 border-accent dark:border-accent/30 px-4 py-2.5 rounded-panel font-bold text-sm hover:bg-accent-soft transition-all"
          >
            <Tag size={16} />
            <span className="hidden sm:inline">Prezzi</span>
          </button>
          <button
            onClick={removeDuplicates}
            title="Rimuovi prodotti duplicati per codice articolo"
            className="flex items-center gap-2 bg-surface dark:bg-surface text-danger border-2 border-danger dark:border-danger px-4 py-2.5 rounded-panel font-bold text-sm hover:bg-danger-soft transition-all"
          >
            <Trash2 size={16} />
            <span className="hidden sm:inline">Doppioni</span>
          </button>
          <button
            onClick={enrichAll}
            disabled={enrichBulkRunning}
            title="Recupera immagini e descrizioni da blaklader.it per tutti i prodotti non ancora arricchiti"
            className="flex items-center gap-2 bg-surface dark:bg-surface text-success border-2 border-success dark:border-success px-4 py-2.5 rounded-panel font-bold text-sm hover:bg-success-soft transition-all disabled:opacity-50"
          >
            {enrichBulkRunning
              ? <Loader2 size={16} className="animate-spin" />
              : <Sparkles size={16} />}
            <span className="hidden sm:inline">Arricchisci</span>
          </button>
          <button onClick={() => setShowModal(true)}
            className="bg-action text-action-foreground px-4 py-2.5 rounded-panel font-bold flex items-center gap-2 shadow-panel hover:bg-action-hover transition-all text-sm">
            <Plus size={16} /> Aggiungi
          </button>
        </div>
      </div>

      {/* ── Layout switcher ── */}
      <div className="flex gap-1 bg-raised dark:bg-surface p-1 rounded-panel w-fit">
        {LAYOUT_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => changeLayout(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wide transition-all ${
              layout === t.id
                ? 'bg-surface dark:bg-raised text-accent shadow-sm'
                : 'text-muted hover:text-secondary'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Search ── */}
      <SearchDropdown
        value={search}
        onChange={setSearch}
        onSelect={p => setSearch(pName(p))}
        placeholder="Cerca per nome, codice, linea, categoria, colore..."
        inputWrapperClassName={() => 'flex items-center gap-2 pl-4 pr-4 py-3 bg-surface dark:bg-surface border border-line dark:border-line rounded-panel text-sm font-medium dark:text-foreground outline-none focus-within:border-accent transition-colors'}
        results={(search.trim()
          ? productList.filter(p => matchSearch(search, [
              pName(p), p.code, p.line, p.description, p.category, ...(p.colors ?? []),
            ])).slice(0, 8)
          : []
        ).map(p => ({
          key: p.id,
          item: p,
          label: pName(p),
          sublabel: [p.code, p.line].filter(Boolean).join(' · '),
        }))}
      />

      {/* ── Category chips ── */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            onClick={() => setCatFilter(c.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${
              catFilter === c.id
                ? 'bg-action text-action-foreground shadow-sm'
                : 'bg-surface dark:bg-surface text-secondary dark:text-muted border border-line dark:border-line hover:border-line'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* ── Selection action bar ── */}
      {selected.size > 0 && (
        <div className="sticky top-2 z-20 bg-action text-action-foreground rounded-panel px-4 py-3 flex flex-wrap items-center justify-between gap-2 shadow-panel  ">
          <span className="font-bold text-sm flex-shrink-0">{selected.size} selezionati</span>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={handleAddToOffer} className="flex items-center gap-1.5 bg-surface/20 hover:bg-surface/30 px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wide transition-all">
              <ShoppingBag size={13} /> Aggiungi a offerta
            </button>
            <button onClick={handleDeleteSelected} className="flex items-center gap-1.5 bg-danger-soft hover:bg-danger px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wide transition-all">
              <Trash2 size={13} /> Elimina
            </button>
            <button onClick={clearSelect} className="p-1.5 hover:bg-surface/20 rounded-lg transition-all">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Product list ── */}
      {filtered.length > 0 ? (
        <>
          {layout === 'compact' && <CompactList {...listProps} />}
          {layout === 'visual'  && <VisualList  {...listProps} />}
          {layout === 'grid'    && <GridList    {...listProps} />}
        </>
      ) : (
        <div className="text-center py-20 bg-surface dark:bg-surface rounded-panel border-2 border-dashed border-line dark:border-line">
          <Package size={48} className="mx-auto mb-4 text-muted dark:text-secondary" />
          <p className="text-muted font-bold uppercase tracking-normal text-sm">
            {search || catFilter !== 'all' ? 'Nessun risultato' : 'Catalogo vuoto'}
          </p>
          {(search || catFilter !== 'all') && (
            <button onClick={() => { setSearch(''); setCatFilter('all'); }} className="mt-3 text-accent text-sm font-bold">
              Rimuovi filtri
            </button>
          )}
        </div>
      )}

      {/* ── Add / Edit Product Modal ── */}
      {(showModal || editingProduct) && (
        <AddProductModal
          onClose={() => { setShowModal(false); setEditingProduct(null); }}
          onSave={handleSaveProduct}
          editProduct={editingProduct ?? undefined}
        />
      )}

      {/* ── Add to Offer Modal ── */}
      {showOfferModal && (
        <AddToOfferModal
          selectedProducts={productList.filter(p => selected.has(p.id))}
          onClose={() => { setShowOfferModal(false); clearSelect(); }}
        />
      )}

      {/* ── Product Detail Modal ── */}
      {viewingProduct && (
        <ProductDetailModal
          product={viewingProduct}
          onClose={() => setViewingProduct(null)}
          onEdit={p => { setViewingProduct(null); setEditingProduct(p); }}
          onDuplicate={p => { handleDuplicate(p); setViewingProduct(null); }}
          onDelete={id => { handleDelete(id); setViewingProduct(null); }}
          onAddToOffer={handleAddToOfferFromDetail}
          onEnrich={enrichOne}
          enrichingIds={enrichingIds}
        />
      )}
    </div>
  );
};
