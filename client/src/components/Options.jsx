export default function Options({ options, value, onChange, disabled }) {
  if (!options) return null;

  return (
    <div className="options">
      <fieldset className="options__group" disabled={disabled}>
        <legend>Cenário</legend>
        <div className="chips" role="radiogroup" aria-label="Cenário">
          {options.scenarios.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={value.scenario === s.id}
              className={`chip ${value.scenario === s.id ? 'chip--on' : ''}`}
              onClick={() => onChange({ scenario: s.id })}
              title={s.description}
            >
              {s.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="options__row">
        <fieldset className="options__group" disabled={disabled}>
          <legend>Estilo</legend>
          <div className="segmented" role="radiogroup" aria-label="Estilo">
            {options.styles.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={value.style === s.id}
                className={value.style === s.id ? 'on' : ''}
                onClick={() => onChange({ style: s.id })}
              >
                {s.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="options__group" disabled={disabled}>
          <legend>Formato</legend>
          <div className="segmented" role="radiogroup" aria-label="Formato">
            {options.formats.map((f) => (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={value.format === f.id}
                className={value.format === f.id ? 'on' : ''}
                onClick={() => onChange({ format: f.id })}
              >
                {f.label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
    </div>
  );
}
