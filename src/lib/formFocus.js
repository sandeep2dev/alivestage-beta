/** Focus a field by id (input, textarea, or nested editor). */
export function focusFieldControl(id) {
  if (!id || typeof document === 'undefined') return false;
  const el = document.getElementById(id);
  if (!el) return false;

  const focusable =
    el.querySelector?.('[contenteditable="true"]') ||
    el.querySelector?.('input:not([type="hidden"]), textarea, select, button') ||
    (typeof el.focus === 'function' ? el : null);

  if (focusable && typeof focusable.focus === 'function') {
    focusable.focus({ preventScroll: false });
  }

  (el.closest('.formGroup') || el).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  return true;
}

/** Focus the first control with aria-invalid in a form/card. */
export function focusFirstInvalidIn(scope) {
  if (!scope || typeof document === 'undefined') return false;
  const first = scope.querySelector('[aria-invalid="true"]');
  if (!first) return false;
  if (first.id) return focusFieldControl(first.id);
  const nested = first.querySelector?.('input, textarea, select, [contenteditable="true"]');
  if (nested && typeof nested.focus === 'function') {
    nested.focus({ preventScroll: false });
    first.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return true;
  }
  return false;
}

/** Run native validation and focus the first invalid field. */
export function validateFormAndFocus(form) {
  if (!form) return true;
  if (form.checkValidity()) return true;
  const firstInvalid = form.querySelector(':invalid');
  form.reportValidity();
  if (firstInvalid) {
    requestAnimationFrame(() => {
      const picker = firstInvalid.closest('[data-datetime-picker]');
      const focusEl = picker?.querySelector('[data-datetime-trigger]') || firstInvalid;
      focusEl.focus({ preventScroll: false });
      (focusEl.closest('.formGroup') || focusEl).scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    });
  }
  return false;
}

/** After setting custom field errors, focus the first listed field. */
export function focusFirstFieldError(errors, fieldOrder) {
  for (const key of fieldOrder) {
    if (errors[key]) {
      focusFieldControl(key);
      return key;
    }
  }
  return null;
}
