/** Mutable state for an in-game text input field. */
export interface TextInputState {
  /** Current text content. */
  value: string;
  /** Cursor position (character index). */
  cursor: number;
  /** Whether the input is currently accepting keystrokes. */
  active: boolean;
}

let _active: TextInputState | null = null;
let _onChange: ((value: string) => void) | null = null;

/**
 * Activate an in-game text input field.
 * @param initial - Starting text value
 * @param onChange - Called whenever the text value changes
 */
export function startTextInput(
  initial: string = '',
  onChange?: (value: string) => void,
): TextInputState {
  const state: TextInputState = { value: initial, cursor: initial.length, active: true };
  _active = state;
  _onChange = onChange ?? null;
  return state;
}

/** Deactivate the current text input field. */
export function stopTextInput(): void {
  _active = null;
  _onChange = null;
}

/** Get the active text input state, or null if none is active. */
export function getTextInput(): TextInputState | null {
  return _active;
}

/**
 * Feed a keyboard event to the active text input.
 * @returns true if the event was consumed by the text input.
 */
export function processTextInput(e: KeyboardEvent): boolean {
  const state = _active;
  if (!state || !state.active) return false;

  const ctrl = e.ctrlKey || e.metaKey;

  if (e.code === 'Enter') {
    stopTextInput();
    return true;
  }

  if (e.code === 'Backspace') {
    if (state.cursor > 0) {
      state.value = state.value.slice(0, state.cursor - 1) + state.value.slice(state.cursor);
      state.cursor--;
      _onChange?.(state.value);
    }
    e.preventDefault();
    return true;
  }

  if (e.code === 'Delete') {
    if (state.cursor < state.value.length) {
      state.value = state.value.slice(0, state.cursor) + state.value.slice(state.cursor + 1);
      _onChange?.(state.value);
    }
    e.preventDefault();
    return true;
  }

  if (e.code === 'ArrowLeft') {
    state.cursor = Math.max(0, state.cursor - 1);
    return true;
  }

  if (e.code === 'ArrowRight') {
    state.cursor = Math.min(state.value.length, state.cursor + 1);
    return true;
  }

  if (e.code === 'Home') {
    state.cursor = 0;
    return true;
  }

  if (e.code === 'End') {
    state.cursor = state.value.length;
    return true;
  }

  if (ctrl && e.code === 'KeyV') {
    navigator.clipboard?.readText().then(text => {
      state.value = state.value.slice(0, state.cursor) + text + state.value.slice(state.cursor);
      state.cursor += text.length;
      _onChange?.(state.value);
    });
    return true;
  }

  if (e.key.length === 1 && !ctrl) {
    state.value = state.value.slice(0, state.cursor) + e.key + state.value.slice(state.cursor);
    state.cursor++;
    _onChange?.(state.value);
    return true;
  }

  return false;
}
