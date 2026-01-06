import { useEffect } from 'preact/hooks';
import { ui } from 'beercss';

/**
 * Beer CSS initialization component
 * Automatically binds all Beer CSS interactive elements on mount
 *
 * Runs on every page navigation to ensure new elements are properly initialized
 */
export function BeerCSSInit() {
  useEffect(() => {
    void ui();
    // Beer CSS doesn't provide cleanup API
    // MutationObserver persists globally (by design)
  }, []);

  return null;
}
