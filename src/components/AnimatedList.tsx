import React, { useState, useRef, useCallback, useEffect } from 'react';

interface AnimatedListProps {
  items: string[];
  onItemSelect?: (item: string, index: number) => void;
  showGradients?: boolean;
  enableArrowNavigation?: boolean;
  displayScrollbar?: boolean;
  className?: string;
  itemClassName?: string;
}

export const AnimatedList: React.FC<AnimatedListProps> = ({
  items,
  onItemSelect,
  showGradients = true,
  enableArrowNavigation = true,
  displayScrollbar = false,
  className = '',
  itemClassName = '',
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [showTopGrad, setShowTopGrad] = useState(false);
  const [showBotGrad, setShowBotGrad] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    setShowTopGrad(el.scrollTop > 10);
    setShowBotGrad(el.scrollTop + el.clientHeight < el.scrollHeight - 10);
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    handleScroll();
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    if (!enableArrowNavigation) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => {
          const next = Math.min(i + 1, items.length - 1);
          listRef.current?.children[next]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => {
          const prev = Math.max(i - 1, 0);
          listRef.current?.children[prev]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          return prev;
        });
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        onItemSelect?.(items[selectedIndex], selectedIndex);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [enableArrowNavigation, items, selectedIndex, onItemSelect]);

  return (
    <div className={`animated-list-container ${className}`} style={{ position: 'relative' }}>
      {/* Top gradient */}
      {showGradients && (
        <div
          className="animated-list-gradient top"
          style={{ opacity: showTopGrad ? 1 : 0 }}
        />
      )}

      <div
        ref={listRef}
        className={`animated-list-scroll ${!displayScrollbar ? 'no-scrollbar' : ''}`}
      >
        {items.map((item, idx) => (
          <button
            key={`${item}-${idx}`}
            onClick={() => {
              setSelectedIndex(idx);
              onItemSelect?.(item, idx);
            }}
            className={`animated-list-item ${selectedIndex === idx ? 'selected' : ''} ${itemClassName} btn-press`}
          >
            <span className="animated-list-item-label">{item}</span>
            {selectedIndex === idx && (
              <span className="animated-list-item-dot" />
            )}
          </button>
        ))}
      </div>

      {/* Bottom gradient */}
      {showGradients && (
        <div
          className="animated-list-gradient bottom"
          style={{ opacity: showBotGrad ? 1 : 0 }}
        />
      )}
    </div>
  );
};

export default AnimatedList;
