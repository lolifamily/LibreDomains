import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';

interface GeneratorAppProps {
  initialValues?: any;
  onBack: () => void;
}

export default function GeneratorApp({ initialValues, onBack }: GeneratorAppProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    domain: '',
    subdomain: '',
    description: '',
    records: [] as { type: string; value: string }[],
  });

  useEffect(() => {
    if (initialValues) {
      let domain = '';
      let subdomain = '';

      if (initialValues.domain) {
        const firstDot = initialValues.domain.indexOf('.');
        if (firstDot > 0) {
          subdomain = initialValues.domain.substring(0, firstDot);
          domain = initialValues.domain.substring(firstDot + 1);
        } else {
          subdomain = initialValues.domain;
        }
      }

      setFormData({
        name: initialValues.owner || '',
        email: initialValues.email || '',
        domain: domain,
        subdomain: subdomain,
        description: initialValues.description || '',
        records: initialValues.records
          ? Object.entries(initialValues.records).map(([type, value]) => ({ type, value: String(value) }))
          : [{ type: 'A', value: '' }]
      });
    }
  }, [initialValues]);

  const updateForm = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addRecord = () => {
    setFormData(prev => ({
      ...prev,
      records: [...prev.records, { type: 'A', value: '' }]
    }));
  };

  const updateRecord = (index: number, field: 'type' | 'value', value: string) => {
    const newRecords = [...formData.records];
    newRecords[index][field] = value;
    setFormData(prev => ({ ...prev, records: newRecords }));
  };

  const removeRecord = (index: number) => {
    setFormData(prev => ({
      ...prev,
      records: prev.records.filter((_, i) => i !== index)
    }));
  };

  const generateJSON = () => {
    const recordObj = formData.records.reduce((acc, curr) => {
      if (curr.type && curr.value) {
        acc[curr.type] = curr.value;
      }
      return acc;
    }, {} as Record<string, string>);

    const json = {
      owner: {
        username: formData.name,
        email: formData.email || undefined,
      },
      records: recordObj,
      description: formData.description || undefined,
    };
    return JSON.stringify(json, null, 2);
  };

  const steps = [
    { id: 1, title: 'Identity', icon: 'person' },
    { id: 2, title: 'Domain', icon: 'dns' },
    { id: 3, title: 'Records', icon: 'list' },
    { id: 4, title: 'Export', icon: 'code' },
  ];

  return (
    <div class="grid">
      {/* Left: Form Stepper */}
      <div class="s12 l6">
        {/* Header with Back Button */}
        <nav class="row">
          <button class="circle transparent" onClick={onBack}>
            <i>arrow_back</i>
          </button>
          <h4 class="max">{initialValues ? 'Edit Domain' : 'Register New Domain'}</h4>
        </nav>

        <div class="space"></div>

        {/* Stepper Header */}
        <nav class="scroll center-align">
          {steps.map((s) => (
            <button
              key={s.id}
              class={`vertical chip large ${step === s.id ? 'fill primary' : 'surface-variant'}`}
              onClick={() => setStep(s.id)}
            >
              <i>{s.icon}</i>
              <span class="small-text">{s.title}</span>
            </button>
          ))}
        </nav>

        <div class="space"></div>

        {/* Step Content */}
        <article class="glass-panel round large-padding spotlight-card animate-fade-in" style={{ minHeight: '400px' }}>
          {step === 1 && (
            <div>
              <h5 class="text-gradient">Who are you?</h5>
              <div class="space"></div>
              <div class="field label border round">
                <input
                  type="text"
                  value={formData.name}
                  onInput={(e) => updateForm('name', (e.target as HTMLInputElement).value)}
                />
                <label>Owner Name / Handle</label>
              </div>
              <div class="field label border round">
                <input
                  type="email"
                  value={formData.email}
                  onInput={(e) => updateForm('email', (e.target as HTMLInputElement).value)}
                />
                <label>Email (Optional)</label>
              </div>
              <div class="field label border round textarea">
                <textarea
                  value={formData.description}
                  onInput={(e) => updateForm('description', (e.target as HTMLTextAreaElement).value)}
                ></textarea>
                <label>Description (Optional)</label>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h5 class="text-gradient">Choose your domain</h5>
              <div class="space"></div>
              <div class="grid">
                <div class="s6 field label border round">
                  <input
                    type="text"
                    value={formData.subdomain}
                    onInput={(e) => updateForm('subdomain', (e.target as HTMLInputElement).value)}
                  />
                  <label>Subdomain</label>
                </div>
                <div class="s6 field label border round">
                  <input
                    type="text"
                    value={formData.domain}
                    placeholder="ciao.su"
                    onInput={(e) => updateForm('domain', (e.target as HTMLInputElement).value)}
                  />
                  <label>Parent Domain</label>
                </div>
              </div>
              <p class="small-text">
                Full domain: <span class="primary-text" style={{ fontFamily: 'var(--font-mono)' }}>
                  {formData.subdomain}.{formData.domain}
                </span>
              </p>
            </div>
          )}

          {step === 3 && (
            <div>
              <nav class="row">
                <h5 class="max text-gradient">DNS Records</h5>
                <button class="circle small primary" onClick={addRecord}>
                  <i>add</i>
                </button>
              </nav>
              <div class="space"></div>

              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {formData.records.map((record, idx) => (
                  <nav key={idx} class="row animate-fade-in">
                    <div class="field border round" style={{ width: '6rem' }}>
                      <select
                        value={record.type}
                        onChange={(e) => updateRecord(idx, 'type', (e.target as HTMLSelectElement).value)}
                      >
                        <option>A</option>
                        <option>AAAA</option>
                        <option>CNAME</option>
                        <option>TXT</option>
                        <option>MX</option>
                        <option>NS</option>
                      </select>
                    </div>
                    <div class="max field border round">
                      <input
                        type="text"
                        value={record.value}
                        placeholder="Value"
                        onInput={(e) => updateRecord(idx, 'value', (e.target as HTMLInputElement).value)}
                      />
                    </div>
                    <button class="circle transparent error-text" onClick={() => removeRecord(idx)}>
                      <i>delete</i>
                    </button>
                  </nav>
                ))}
                {formData.records.length === 0 && (
                  <p class="center-align" style={{ opacity: 0.5 }}>No records yet. Add one!</p>
                )}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h5 class="text-gradient">Ready to Export</h5>
              <div class="space"></div>
              <p>
                Review your configuration on the right. If everything looks good, copy the JSON and submit a Pull Request.
              </p>
              <div class="space"></div>
              <nav class="row">
                <button class="max primary" onClick={() => {
                  navigator.clipboard.writeText(generateJSON());
                  alert('Copied to clipboard!');
                }}>
                  <i>content_copy</i>
                  <span>Copy JSON</span>
                </button>
                <a
                  href="https://github.com/libre-domains/libre-domains"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="max button border"
                >
                  <i>open_in_new</i>
                  <span>Open GitHub</span>
                </a>
              </nav>
            </div>
          )}
        </article>

        <div class="space"></div>

        {/* Navigation Buttons */}
        <nav class="row">
          <button
            class="border"
            onClick={() => setStep(s => Math.max(1, s - 1))}
            disabled={step === 1}
          >
            Back
          </button>
          <span class="max"></span>
          <button
            class="primary"
            onClick={() => setStep(s => Math.min(4, s + 1))}
            disabled={step === 4}
          >
            Next
          </button>
        </nav>
      </div>

      {/* Right: JSON Preview */}
      <div class="s12 l6">
        <article
          class="glass-panel round padding"
          style={{ position: 'sticky', top: '2rem' }}
        >
          <nav class="row">
            <span class="small-text" style={{ fontFamily: 'var(--font-mono)', opacity: 0.5 }}>PREVIEW.JSON</span>
            <span class="max"></span>
            <span class="circle tiny error"></span>
            <span class="circle tiny warning"></span>
            <span class="circle tiny" style={{ background: 'var(--success)' }}></span>
          </nav>
          <div class="space"></div>
          <pre
            class="round padding surface-variant"
            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', overflowX: 'auto' }}
          >
            <code>{generateJSON()}</code>
          </pre>
        </article>
      </div>
    </div>
  );
}
