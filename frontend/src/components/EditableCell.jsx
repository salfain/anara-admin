import { useEffect, useRef, useState } from 'react';

/**
 * A table cell that turns into an input when clicked, the way a spreadsheet
 * does. Enter or clicking away commits, Escape abandons the edit, and Tab
 * commits then hands over to the next cell in the row.
 *
 * `type` picks the editor: a plain input, a date picker, a fixed dropdown
 * (`select`), or a free-text field with suggestions (`combo`) for columns like
 * PIC and Destinasi where the known values are a starting point, not a limit.
 */
export default function EditableCell({
  value,
  type = 'text',
  options = [],
  listId,
  display,
  editing,
  disabled,
  placeholder,
  className = '',
  onStartEdit,
  onCommit,
  onCancel,
  onTab,
}) {
  const [draft, setDraft] = useState(value ?? '');
  const ref = useRef(null);
  // Escape and Tab both need to bypass the blur handler's commit.
  const skipCommit = useRef(false);

  useEffect(() => {
    if (!editing) return;
    setDraft(value ?? '');
    skipCommit.current = false;
    const el = ref.current;
    if (!el) return;
    el.focus();
    if (el.select && type !== 'date') el.select();
  }, [editing, value, type]);

  if (!editing) {
    return (
      <td
        onClick={disabled ? undefined : onStartEdit}
        title={disabled ? undefined : 'Klik untuk ubah'}
        className={`px-2 py-2 truncate ${disabled ? '' : 'cursor-text hover:ring-1 hover:ring-inset hover:ring-primary/40'} ${className}`}
      >
        {display}
      </td>
    );
  }

  function commit(next = draft) {
    onCommit(next);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      skipCommit.current = true;
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      skipCommit.current = true;
      onCancel();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      skipCommit.current = true;
      onCommit(draft, { then: () => onTab?.(e.shiftKey ? -1 : 1) });
    }
  }

  function handleBlur() {
    if (skipCommit.current) return;
    commit();
  }

  // Kolom seperti Paket menyimpan id tapi menampilkan nama, jadi opsi boleh
  // berupa string biasa atau { value, label }.
  const opts = options.map((o) => (typeof o === 'object' ? o : { value: o, label: o }));

  const shared = {
    ref,
    value: draft,
    onChange: (e) => setDraft(e.target.value),
    onKeyDown: handleKeyDown,
    onBlur: handleBlur,
    className:
      'w-full h-7 px-1.5 text-xs bg-surface text-gray-dark border border-primary rounded outline-none',
  };

  return (
    <td className={`px-1 py-1 ${className}`}>
      {type === 'select' ? (
        // Committing on change keeps a dropdown to one interaction.
        <select
          {...shared}
          onChange={(e) => {
            setDraft(e.target.value);
            skipCommit.current = true;
            commit(e.target.value);
          }}
        >
          {opts.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : (
        <>
          <input
            {...shared}
            type={type === 'date' ? 'date' : 'text'}
            list={type === 'combo' ? listId : undefined}
            placeholder={placeholder}
          />
          {type === 'combo' && (
            <datalist id={listId}>
              {opts.map((o) => (
                <option key={o.value} value={o.value} />
              ))}
            </datalist>
          )}
        </>
      )}
    </td>
  );
}
