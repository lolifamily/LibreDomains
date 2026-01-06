import { useEffect, useRef } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import clsx from 'clsx';

interface InteractiveCardProps {
  children: ComponentChildren;
  className?: string;
  spotlight?: boolean;
  tilt?: boolean;
}

/**
 * Interactive card component with spotlight and 3D tilt effects
 * Owns and manages its own DOM element and effects lifecycle
 */
export function InteractiveCard({
  children,
  className,
  spotlight = true,
  tilt = true,
}: InteractiveCardProps) {
  const cardRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const cleanups: Array<() => void> = [];

    // Spotlight effect: radial gradient follows cursor
    if (spotlight) {
      const handleSpotlight = (e: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      };

      card.addEventListener('mousemove', handleSpotlight);
      cleanups.push(() => card.removeEventListener('mousemove', handleSpotlight));
    }

    // 3D tilt effect: card rotates based on cursor position
    if (tilt) {
      const handleTilt = (e: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -5;
        const rotateY = ((x - centerX) / centerX) * 5;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
      };

      const handleTiltLeave = () => {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
      };

      card.addEventListener('mousemove', handleTilt);
      card.addEventListener('mouseleave', handleTiltLeave);
      cleanups.push(() => {
        card.removeEventListener('mousemove', handleTilt);
        card.removeEventListener('mouseleave', handleTiltLeave);
      });
    }

    return () => cleanups.forEach(fn => fn());
  }, [spotlight, tilt]);

  return (
    <article
      ref={cardRef}
      class={clsx(
        'glass',
        spotlight && 'spotlight-card',
        tilt && 'tilt-card',
        className,
      )}
    >
      {children}
    </article>
  );
}
