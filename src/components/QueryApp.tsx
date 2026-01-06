import { h } from 'preact';
import { useState, useMemo, useCallback } from 'preact/hooks';

interface QueryAppProps {
  domains: any[];
  onEdit: (record: any) => void;
}

// Fisher-Yates shuffle
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const DISPLAY_COUNT = 12;

export default function QueryApp({ domains, onEdit }: QueryAppProps) {
  const [displayed, setDisplayed] = useState(() =>
    shuffle(domains).slice(0, DISPLAY_COUNT)
  );

  useMemo(() => {
    setDisplayed(shuffle(domains).slice(0, DISPLAY_COUNT));
  }, [domains]);

  const handleShuffle = useCallback(() => {
    setDisplayed(shuffle(domains).slice(0, DISPLAY_COUNT));
  }, [domains]);

  return (
    <div>
      {/* Header */}
      <nav class="row">
        <h5 class="max">
          Discover <span style={{ opacity: 0.5 }}>({domains.length} total)</span>
        </h5>
      </nav>

      <div class="space"></div>

      {/* No Results */}
      {domains.length === 0 && (
        <div class="center-align padding animate-fade-in">
          <i class="extra" style={{ opacity: 0.5 }}>search_off</i>
          <h5>No matching domains</h5>
          <p style={{ opacity: 0.6 }}>Try a different search term or register a new one above.</p>
        </div>
      )}

      {/* Grid */}
      {domains.length > 0 && (
        <div class="grid">
          {displayed.map((domain) => (
            <article
              key={domain.domain}
              class="s6 m4 l3 glass-panel round padding wave"
              onClick={() => onEdit(domain)}
              style={{ cursor: 'pointer' }}
            >
              {/* Domain Name */}
              <h6
                style={{
                  fontFamily: 'var(--font-mono)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={domain.domain}
              >
                {domain.domain}
              </h6>

              {/* Record Type Chips */}
              <nav class="scroll" style={{ gap: '0.25rem' }}>
                {domain.records && Object.keys(domain.records).map((type) => (
                  <span key={type} class="chip tiny surface-variant">{type}</span>
                ))}
                {(!domain.records || Object.keys(domain.records).length === 0) && (
                  <span class="small-text" style={{ opacity: 0.4 }}>No records</span>
                )}
              </nav>

              <div class="space small"></div>

              {/* Owner */}
              <span class="small-text" style={{ opacity: 0.6 }}>
                {domain.owner ? `@${domain.owner}` : '—'}
              </span>
            </article>
          ))}
        </div>
      )}

      {/* Shuffle Button */}
      {domains.length > DISPLAY_COUNT && (
        <div class="center-align">
          <div class="space"></div>
          <button class="border round" onClick={handleShuffle}>
            <i>casino</i>
            <span>Shuffle</span>
          </button>
        </div>
      )}
    </div>
  );
}
