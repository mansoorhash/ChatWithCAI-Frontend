import React from 'react';
import { CheckCircle2, Wrench } from 'lucide-react';
import './changelogPage.css';

const releases = [
  {
    version: 'v0.6.1',
    date: 'August 24, 2026',
    title: 'Usage and Model Catalog Fixes',
    summary: 'Usage information now stays current, with clearer model and plan navigation.',
    changes: [
      'Synchronized the displayed message count and reset time when their locally cached values change or are removed.',
      'Corrected the reset timestamp returned when the daily message limit is reached.',
      'Displayed model names, tiers, availability, preview notes, and retirement dates inside each provider dropdown.',
      'Linked View Tiers directly to the plans page and added clearer hover, active, and keyboard-focus feedback.',
    ],
  },
  {
    version: 'v0.6.0',
    date: 'August 23, 2026',
    title: 'Safer Regeneration and Service Reliability',
    summary: 'More control over regenerated answers, backed by stronger validation and clearer errors.',
    changes: [
      'Added ranked alternative models to the Try again menu and preserved them after refresh.',
      'Validated regeneration choices against the saved conversation, enabled models, context size, and current subscription tier.',
      'Kept one-click regeneration available for older conversations without ranked alternatives.',
      'Improved output token management and structured model responses.',
      'Added clearer, more consistent error handling across authentication, chat, sessions, settings, and usage.',
    ],
  },
  {
    version: 'v0.5.4',
    date: 'August 20, 2026',
    title: 'Public Beta and Long Responses',
    summary: 'CAI entered public beta with a more resilient chat experience.',
    changes: [
      'Released the redesigned public beta application.',
      'Added controls to stop an active response and continue one that reaches its output limit.',
      'Recovered incomplete responses across supported model providers.',
      'Improved the message composer, mobile layout, numbered lists, and copy-to-clipboard behavior.',
      'Fixed daily message counting and reset-time handling.',
    ],
  },
  {
    version: 'v0.5.2',
    date: 'August 18, 2026',
    title: 'Long-Running Chat Requests',
    summary: 'Chat requests now remain responsive while models work on longer answers.',
    changes: [
      'Added asynchronous status updates for long model requests.',
      'Reduced false connection failures while waiting for a response.',
      'Improved fallback recovery when a model cannot complete a request.',
    ],
  },
  {
    version: 'v0.5.1',
    date: 'August 17, 2026',
    title: 'Model and Account Reliability',
    summary: 'Improved model routing and fixed several account-access issues.',
    changes: [
      'Displayed the active model while a response is being generated.',
      'Improved fallback behavior when the first selected model fails.',
      'Fixed Gemini response structuring and provider calls.',
      'Fixed regional identification and default model selections during registration.',
    ],
  },
  {
    version: 'v0.5.0',
    date: 'August 15, 2026',
    title: 'Data Controls and Feedback',
    summary: 'The final private-beta update added privacy controls and response feedback.',
    changes: [
      'Added controls to allow or decline the use of conversations for model training.',
      'Added response reviews and message-usage tracking.',
      'Added regional availability checks for Canada and the United States.',
      'Improved policy-consent handling during account setup.',
    ],
  },
];

export default function ChangelogPage() {
  return (
    <main className="public-info-page changelog-page">
      <header className="public-info-hero">
        <span className="public-info-eyebrow">Changelog</span>
        <h1 className="public-info-title">What is new in CAI.</h1>
        <p className="public-info-lead">
          Product updates, fixes, and meaningful changes made throughout the public beta.
        </p>
      </header>

      <div className="changelog-beta-label">
        <Wrench size={18} aria-hidden="true" />
        <span>CAI is in active beta development. Features may change quickly.</span>
      </div>

      <section className="changelog-list" aria-label="CAI releases">
        {releases.map((release) => (
          <article className="changelog-release" key={release.version}>
            <aside>
              <span className="changelog-version">{release.version}</span>
              <time>{release.date}</time>
            </aside>

            <div className="changelog-release-content">
              <h2>{release.title}</h2>
              <p>{release.summary}</p>
              <ul>
                {release.changes.map((change) => (
                  <li key={change}>
                    <CheckCircle2 size={18} aria-hidden="true" />
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
