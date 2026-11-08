import React, { useId, useLayoutEffect, useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import './orderedListField.css';

export default function OrderedListField({ label, helperText, required = false, value = [], onChange, lang = 'en' }) {
  const id = useId();
  const inputs = useRef([]);
  const focusIndex = useRef(null);
  const ui = (en, sw) => lang === 'sw' ? sw : en;
  const items = Array.isArray(value) && value.length ? value : [typeof value === 'string' ? value : ''];
  const hintId = `${id}-hint`;
  useLayoutEffect(() => {
    if (focusIndex.current === null) return;
    inputs.current[focusIndex.current]?.focus();
    focusIndex.current = null;
  }, [value]);
  const remove = index => {
    const next = items.filter((_, itemIndex) => itemIndex !== index);
    focusIndex.current = Math.max(0, Math.min(index, next.length - 1));
    onChange?.(next.length ? next : ['']);
  };
  return <fieldset className="ordered-list-field" aria-describedby={hintId}>
    <legend>{label}{required ? ' *' : ''}</legend>
    {helperText && <p className="ordered-list-field__hint">{helperText}</p>}
    <p id={hintId} className="ordered-list-field__hint">{ui('Write one item per box. Add as many items as you need.', 'Andika kipengele kimoja kwenye kila kisanduku. Ongeza vipengele unavyohitaji.')}</p>
    <ol className="ordered-list-field__items">
      {items.map((item, index) => <li key={index}>
        <div className="ordered-list-field__row">
          <textarea
            ref={element => { inputs.current[index] = element; }}
            rows={2}
            aria-label={`${label}: ${ui('Item', 'Kipengele')} ${index + 1}`}
            aria-describedby={hintId}
            placeholder={`${ui('Item', 'Kipengele')} ${index + 1}`}
            value={item}
            onChange={event => onChange?.(items.map((entry, itemIndex) => itemIndex === index ? event.target.value : entry))}
          />
          <button type="button" className="ordered-list-field__remove" aria-label={`${ui('Remove item', 'Ondoa kipengele')} ${index + 1}`} onClick={() => remove(index)}>
            <Trash2 size={18} aria-hidden="true" />
          </button>
        </div>
      </li>)}
    </ol>
    <button type="button" className="ordered-list-field__add" onClick={() => {
      focusIndex.current = items.length;
      onChange?.([...items, '']);
    }}><Plus size={18} aria-hidden="true" />{ui('Add item', 'Ongeza kipengele')}</button>
  </fieldset>;
}
