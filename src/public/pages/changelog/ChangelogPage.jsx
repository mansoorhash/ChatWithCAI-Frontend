import React from 'react';
import { CheckCircle2, Wrench } from 'lucide-react';
import './changelogPage.css';

const releases = [
  {
    version: 'v0.7.1.1-v0.7.1.3',
    date: 'September 29, 2026',
    title: 'Chat and Session Reliability',
    summary: 'Security Fixes and UI Quality of Life',
    changes: [
      'Improved login security reliability.',
      'Added cancel button for edits.',
    ],
  },
  {
    version: 'v0.7.1',
    date: 'September 15, 2026',
    dateTime: '2026-09-15',
    title: 'Attachment Processing and Chat Responsiveness',
    summary: 'Uploaded documents now flow securely into conversations, with faster starts and clearer privacy protections.',
    changes: [
      'Added support for PDF, DOCX, TXT, and Markdown attachments up to 20 MB, with validation before processing.',
      'Made uploaded document content available to the selected model and kept attachments with their conversation after a message is sent.',
      'Reduced delays at the start of a request by preparing the chat service as you begin composing a message.',
      'Kept the conversation navigator focused on the newest turns as a chat grows.',
      'Updated the Privacy Policy and Terms of Service to explain file handling, retention, and that uploaded files are excluded from CAI model training.',
    ],
  },
  {
    version: 'v0.7.0',
    date: 'September 11, 2026',
    dateTime: '2026-09-11',
    title: 'File Attachments in Chat',
    summary: 'Attach files to a conversation and follow their upload status before sending a message.',
    changes: [
      'Added file selection and uploads through backend-issued storage links, with progress shown in the composer.',
      'Added clear ready, uploading, removing, and failed states for attachments; files can also be removed from a draft message.',
      'Displayed attached files alongside sent messages, including their names and file types.',
      'Blocked message submission while attachments are uploading or being removed, and improved feedback for upload failures and oversized files.',
    ],
  },
  {
    version: '0.6.2',
    date: 'September 2, 2026',
    dateTime: '2026-09-02',
    title: 'Conversation Navigation and Editing',
    summary: 'Longer conversations are easier to navigate, revise, and recover after an interrupted connection.',
    changes: [
      'Added a turn navigator for longer conversations so you can jump to a specific exchange.',
      'Added editing for earlier user messages and improved controls for choosing regenerated answers.',
      'Restored a saved answer when its stream ends early instead of showing a false failure.',
      'Updated message-limit and reset-time information as chat responses arrive.',
    ],
  },
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
          <article className="changelog-release" key={release.dateTime || release.version}>
            <aside>
              <span className="changelog-version">{release.version}</span>
              <time dateTime={release.dateTime}>{release.date}</time>
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
