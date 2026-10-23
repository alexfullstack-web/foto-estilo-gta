import { useEffect, useRef, useState } from 'react';
import { BrainCircuit, ChevronDown, Menu, Moon, Sun, X, Sparkles } from 'lucide-react';

const BRAND = import.meta.env.VITE_BRAND_NAME || 'AlexSousa';
const SUFFIX = import.meta.env.VITE_BRAND_SUFFIX || '.IA';

export function Brand({ small = false }) {
  return (
    <a href="#inicio" className={`brand ${small ? 'brand--small' : ''}`} aria-label={`${BRAND}${SUFFIX} — início`}>
      <span className="brand__icon"><BrainCircuit aria-hidden /></span>
      <span className="brand__name">
        {BRAND}<span className="brand__suffix">{SUFFIX}</span>
      </span>
    </a>
  );
}

export default function Header({ scenarios, onPickScenario, theme, onToggleTheme, quota, onStart }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
    };
    const esc = (e) => e.key === 'Escape' && (setDropOpen(false), setMenuOpen(false));
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', esc);
    };
  }, []);

  const pick = (id) => {
    onPickScenario(id);
    setDropOpen(false);
    setMenuOpen(false);
  };

  return (
    <header className="header">
      <div className="container header__inner">
        <Brand />

        <nav className={`nav ${menuOpen ? 'nav--open' : ''}`} aria-label="Principal">
          <a href="#inicio" className="nav__link nav__link--active" onClick={() => setMenuOpen(false)}>Início</a>

          <div className="dropdown" ref={dropRef}>
            <button
              type="button"
              className="nav__link dropdown__toggle"
              aria-expanded={dropOpen}
              aria-haspopup="true"
              onClick={() => setDropOpen((v) => !v)}
            >
              Cenários <ChevronDown size={16} className={dropOpen ? 'rot' : ''} />
            </button>
            {dropOpen && (
              <ul className="dropdown__menu" role="menu">
                {scenarios.map((s) => (
                  <li key={s.id} role="none">
                    <button type="button" role="menuitem" onClick={() => pick(s.id)}>
                      <strong>{s.label}</strong>
                      <span>{s.description}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <a href="#galeria" className="nav__link" onClick={() => setMenuOpen(false)}>Galeria</a>
          <a href="#como-funciona" className="nav__link" onClick={() => setMenuOpen(false)}>Como funciona</a>
          <a href="#faq" className="nav__link" onClick={() => setMenuOpen(false)}>Dúvidas</a>
        </nav>

        <div className="header__actions">
          <button type="button" className="icon-btn" onClick={onToggleTheme} aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}>
            {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          {quota && (
            <span className="quota-chip" title="Gerações restantes hoje">
              {quota.remaining}/{quota.limit} hoje
            </span>
          )}
          <button type="button" className="btn btn--primary btn--sm hide-sm" onClick={onStart}>
            <Sparkles size={16} /> Criar agora
          </button>
          <button
            type="button"
            className="icon-btn show-sm"
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}
