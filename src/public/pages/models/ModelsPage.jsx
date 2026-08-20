import React, { useEffect, useState } from 'react';
import { Activity, BrainCircuit, ChevronDown, Gauge, Layers3 } from 'lucide-react';
import SpinnerRounded from '../../../components/loading';
import './modelsPage.css';

const providerFamilies = [
  {
    name: 'OpenAI',
    logo: '/provider-logos/openai.svg',
    matches: (id) => id.startsWith('gpt-'),
  },
  {
    name: 'Anthropic',
    logo: '/provider-logos/anthropic.svg',
    matches: (id) => id.startsWith('claude-'),
  },
  {
    name: 'Gemini',
    logo: '/provider-logos/gemini.svg',
    matches: (id) => id.startsWith('gemini-'),
  },
];

const activeTiers = ['free', 'plus', 'pro'];

const routingSteps = [
  {
    icon: BrainCircuit,
    title: 'Analyze the request',
    text: 'CAI determines what your prompt requires and which capabilities matter most.',
  },
  {
    icon: Layers3,
    title: 'Filter the options',
    text: 'Models are filtered by task fit, plan access, and availability.',
  },
  {
    icon: Gauge,
    title: 'Route to a model',
    text: 'CAI ranks the remaining models and sends your request to the best match.',
  },
];

export default function ModelsPage() {
  const [catalog, setCatalog] = useState(null);
  const [catalogError, setCatalogError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setCatalogError(false);
    fetch('/LLMs.json', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Could not load model catalog.');
        }

        return response.json();
      })
      .then(setCatalog)
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setCatalogError(true);
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const activeModels = catalog
  ? activeTiers.flatMap((tier) =>
      (catalog[tier] ?? []).map((model) => ({
        ...model,
        tier,
      }))
    )
  : [];

  const providers = providerFamilies.map((provider) => ({
    ...provider,
    models: activeModels
      .filter((model) => provider.matches(model.id))
      .map((model) => ({
        ...model,
        providerStatus: model.providerStatus ?? 'active',
      })),
  }));

  const empty = Array.from({ length: 3 }, (_, index) => ({
    key: `loading-${index}`,
    models: [],
    name: '',
    logo: null,
  }));

  const providerList = loading ? empty : providers;

  return (
    <main className="public-info-page models-page">
      <header className="public-info-hero">
        <span className="public-info-eyebrow">Supported models</span>
        <h1 className="public-info-title">One chat. Multiple AI providers.</h1>
        <p className="public-info-lead">
          CAI automatically routes each prompt to an eligible model based on the task, your
          plan, and live availability so you don't have to.
        </p>
      </header>

      <div className="models-availability-note">
        <Activity size={19} aria-hidden="true" />
        <p>
          <strong>Model availability changes during beta.</strong> Specific models may
          be added, removed, limited, or temporarily unavailable without notice.
        </p>
      </div>

      <section className="public-info-section" aria-labelledby="provider-heading">
        <div className="public-info-section-heading">
          <h2 id="provider-heading">Provider families</h2>
          <p>
            The exact model used can vary, but CAI currently routes across these
            provider families when they are eligible and available.
          </p>
        </div>

        <div className="models-provider-list">
          {catalogError && (
            <p className="models-catalog-status">
              The supported model list could not be loaded.
            </p>
          )}

          {!catalogError &&
            providerList.map((provider) => {
              return (
                <details
                  className="model-provider-dropdown"
                  key={provider.key ?? provider.name}
                >
                  <summary className="model-provider-summary">
                    <span className="model-provider-mark" aria-hidden="true">
                      {!loading ? <img src={provider.logo} alt="" /> : <SpinnerRounded size={24} thickness={4}/>}
                    </span>

                    <span className="model-provider-title">
                      <strong className={loading ? 'loading-text' : ''}>
                        {loading ? '\u00A0' : provider.name}
                      </strong>

                      <small className={loading ? 'loading-text' : ''}>
                        {loading ? '\u00A0' : `${provider.models.length} models`}
                      </small>
                    </span>

                    <span
                      className={`provider-status active ${
                        loading ? 'loading-text' : ''
                      }`}
                    >
                      {!loading && (
                        <>
                          <span className="status-dot" />
                          Active
                        </>
                      )}
                    </span>

                    {!loading && 
                      <ChevronDown
                        className="provider-chevron"
                        size={19}
                        aria-hidden="true"
                      />
                    }
                  </summary>

                  {!loading && (
                    <div className="model-provider-content">
                      {/* existing model list */}
                    </div>
                  )}
                </details>
              );
            })}
        </div>
      </section>

      <section className="public-info-section" aria-labelledby="routing-heading">
        <div className="public-info-section-heading">
          <h2 id="routing-heading">How routing works</h2>
          <p>Model selection happens automatically for every new message sent.</p>
        </div>

        <div className="model-routing-grid">
          {routingSteps.map(({ icon: Icon, title, text }, index) => (
            <article key={title}>
              <div className="model-routing-icon">
                <Icon size={21} aria-hidden="true" />
              </div>
              <span className="model-routing-number">0{index + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
