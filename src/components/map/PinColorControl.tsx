import { useStore } from '../../store/useStore';

/** Personal preference: overrides the category colour for this contact only. */
export function PinColorControl({ contactId, categoryColor }: { contactId: string; categoryColor: string }) {
  const key = `contact:${contactId}`;
  const color = useStore(state => state.mapMarkerStyles[key]?.color);
  const setMapMarkerStyle = useStore(state => state.setMapMarkerStyle);
  const effectiveColor = color || categoryColor;

  return (
    <div className="flex items-center gap-2 pt-2 mt-2 border-t border-line">
      <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
        Colore pin
        <input
          type="color"
          aria-label="Scegli colore del pin"
          value={effectiveColor}
          onChange={event => setMapMarkerStyle(key, { color: event.target.value })}
          className="w-9 h-9 rounded-lg cursor-pointer"
        />
      </label>
      {color && (
        <button type="button" onClick={() => setMapMarkerStyle(key, { color: '' })} className="text-xs font-semibold text-accent underline">
          Usa colore categoria
        </button>
      )}
    </div>
  );
}
