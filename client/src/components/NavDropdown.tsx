import { useEffect, useRef, useState } from 'react';

export interface NavDropdownItem {
  key: string;
  label: string;
}

interface NavDropdownProps {
  label: string;
  items: NavDropdownItem[];
  activeView: string;
  onSelect: (view: string) => void;
}

function NavDropdown({ label, items, activeView, onSelect }: NavDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape while open
  useEffect(() => {
    if (!open) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const containsActive = items.some(item => item.key === activeView);

  return (
    <div className="nav-dropdown" ref={containerRef}>
      <button
        className={containsActive ? 'active' : ''}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {label} <span className="nav-dropdown-caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="nav-dropdown-menu" role="menu">
          {items.map(item => (
            <button
              key={item.key}
              role="menuitem"
              className={activeView === item.key ? 'active' : ''}
              onClick={() => {
                onSelect(item.key);
                setOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default NavDropdown;
