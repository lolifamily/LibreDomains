import { h } from 'preact';
import { useState, useMemo } from 'preact/hooks';
import QueryApp from './QueryApp';
import GeneratorApp from './GeneratorApp';

interface ConsoleAppProps {
  domains: any[];
}

export default function ConsoleApp({ domains }: ConsoleAppProps) {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'explore' | 'editor'>('explore');
  const [editorData, setEditorData] = useState<any>(null);
  const [isFocused, setIsFocused] = useState(false);

  const filteredDomains = useMemo(() => {
    if (!search) return domains;
    const lower = search.toLowerCase();
    return domains.filter(d =>
      d.domain.toLowerCase().includes(lower) ||
      (d.owner && d.owner.toLowerCase().includes(lower))
    );
  }, [search, domains]);

  const exactMatch = domains.find(d => d.domain.toLowerCase() === search.toLowerCase());

  const handleRegister = (domainStr: string) => {
    setEditorData({ domain: domainStr });
    setView('editor');
    setIsFocused(false);
  };

  const handleEdit = (record: any) => {
    setEditorData(record);
    setView('editor');
    setIsFocused(false);
  };

  const handleBack = () => {
    setView('explore');
    setEditorData(null);
    setSearch('');
  };

  return (
    <div>
      {/* Omnibar */}
      <div class="space large"></div>
      <article
        class={`glass-panel round large-padding ${isFocused ? 'active elevate' : ''}`}
        style={{ maxWidth: '40rem', margin: '0 auto', position: 'relative', zIndex: 50 }}
      >
        <nav class="row">
          <i class={isFocused ? 'primary-text' : ''}>search</i>
          <div class="max field border no-margin">
            <input
              type="text"
              placeholder="Search domains to edit, or type to register new..."
              value={search}
              onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            />
          </div>
          {search && (
            <button class="circle transparent" onClick={() => setSearch('')}>
              <i>close</i>
            </button>
          )}
        </nav>

        {/* Dropdown Results */}
        {isFocused && search && (
          <div
            class="glass-panel round animate-fade-in elevate"
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '1rem',
              zIndex: 100,
            }}
          >
            {/* Primary Action */}
            <a
              class="row padding wave"
              onClick={() => exactMatch ? handleEdit(exactMatch) : handleRegister(search)}
              style={{ cursor: 'pointer' }}
            >
              <i class={`circle small-padding ${exactMatch ? 'secondary fill' : 'primary fill'}`}>
                {exactMatch ? 'edit' : 'add_circle'}
              </i>
              <div class="max">
                <div class="bold">{exactMatch ? 'Edit Existing Domain' : 'Register New Domain'}</div>
                <div class="small-text" style={{ fontFamily: 'var(--font-mono)', opacity: 0.7 }}>
                  {search}{!search.includes('.') && '.ciao.su'}
                </div>
              </div>
              <span class="chip tiny border">ENTER</span>
            </a>

            <div class="divider"></div>

            {/* Other Matches */}
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {filteredDomains.slice(0, 5).map(domain => (
                <a
                  key={domain.domain}
                  class="row padding wave"
                  onClick={() => handleEdit(domain)}
                  style={{ cursor: 'pointer' }}
                >
                  <i class="small">dns</i>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{domain.domain}</span>
                  {domain.owner && (
                    <span class="small-text" style={{ marginLeft: 'auto', opacity: 0.6 }}>
                      by {domain.owner}
                    </span>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}
      </article>

      <div class="space large"></div>

      {/* Content Area */}
      <div class="animate-fade-in">
        {view === 'explore' ? (
          <QueryApp domains={search ? filteredDomains : domains} onEdit={handleEdit} />
        ) : (
          <GeneratorApp initialValues={editorData} onBack={handleBack} />
        )}
      </div>
    </div>
  );
}
