import { cloneElement, isValidElement } from 'react';

export default function FormField({
  id,
  label,
  error,
  hint,
  required = false,
  children,
}) {
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint && !error ? `${id}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  const fieldProps = {
    id,
    required,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
  };

  let control;
  if (typeof children === 'function') {
    control = children({
      ...fieldProps,
      className: error ? 'input inputError' : 'input',
    });
  } else if (isValidElement(children)) {
    const childClass = children.props.className || '';
    control = cloneElement(children, {
      ...fieldProps,
      className: [childClass, error ? 'inputError' : ''].filter(Boolean).join(' '),
    });
  } else {
    control = children;
  }

  return (
    <div className="formGroup">
      {label && (
        <label className="label" htmlFor={id}>
          {label}
          {required ? <span className="requiredMark" aria-hidden="true"> *</span> : null}
        </label>
      )}
      {control}
      {hint && !error && (
        <p id={hintId} className="fieldHint">{hint}</p>
      )}
      {error && (
        <p id={errorId} className="fieldError" role="alert">{error}</p>
      )}
    </div>
  );
}
