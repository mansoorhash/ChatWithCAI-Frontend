import React from 'react';
import { CheckCircle2, Wrench } from 'lucide-react';
import './changelogPage.css';

const releases = [
  {
    version: 'v0.5.0',
    date: 'August 15, 2026',
    title: 'Private Beta Final Release',
    summary: 'The final version of the private beta before public release.',
    changes: [
      'Message Regeneration Added',
      'UI + Bug Fixes',
      'A whole lotta stuff'
    ],
  },
  {
    version: 'v0.5.0.1',
    date: 'August 15, 2026',
    title: 'Region Lock',
    summary: 'Fixed user sign in location identification',
    changes: [
      'Location identification to ensure region lock based on sign up/in.',
    ],
  }
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
