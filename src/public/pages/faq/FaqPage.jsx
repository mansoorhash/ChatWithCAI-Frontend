import React from 'react';
import { Link } from 'react-router-dom';
import './faqPage.css';

const faqGroups = [
  {
    title: 'Using CAI',
    questions: [
      {
        question: 'What is CAI?',
        answer:
          'CAI is an LLM router. You send one message, and CAI selects an eligible AI model based on the task, your plan, and availability.',
      },
      {
        question: 'Can I choose the exact model?',
        answer: 'CAI routes requests automatically by default. In Settings, you can enable or disable models to control ' +
          'which models the router may select, but you cannot choose a specific model for each prompt.',
      },
      {
        question: 'Why can two similar prompts use different models?',
        answer:
        'CAI evaluates every prompt independently. Similar prompts may be routed to different models due to plan limits, ' +
        'model availability, enabled model preferences, or differences in the request.',
      },
      {
        question: 'Is CAI free?',
        answer:
          'CAI is currently 100% free during the public beta, subject to usage limits. Plus and Pro plans are expected later, and their pricing will be announced before launch.',
      },
      {
        question: 'How usage is countend.',
        answer:
          'How usage is counted: Each successful response counts toward your usage allowance. Regenerations and edited-message branches count as new generations. ' +
          'A cancelled request may count if generation has already begun. Failed model attempts do not count as completed responses, ' + 
          'and model-specific allowances are restored when that model fails and CAI uses a fallback.'
      }
    ],
  },
  {
    title: 'Beta, privacy, and support',
    questions: [
      {
        question: 'What should I expect during the beta?',
        answer:
          'Features, limits, response time, and response quality may change. Temporary errors and outages are also more likely while the service is being tested.',
      },
      {
        question: 'Are my prompts sent to other AI providers?',
        answer: (
          <>
            When CAI routes a request to an external provider listed on the{' '}
            <Link to="/models">Models page</Link>, the information needed to generate
            a response is sent to that provider. Read the{' '}
            <Link to="/privacy">Privacy Policy</Link> for complete processing details.
          </>
        ),
      },
      {
        question: 'Does CAI always give accurate answers?',
        answer:
          'No. AI-generated responses can be incomplete, outdated, or incorrect. Verify important information, especially for legal, medical, financial, or safety-related decisions.',
      },
      {
        question: 'How do I report a problem?',
        answer: (
          <>
            Use the Contact page or email{' '}
            <a href="mailto:support@chatwithcai.com">
              support@chatwithcai.com
            </a>
            . Include what you were doing and any visible error message, but do not
            send passwords or authentication tokens.
          </>
        ),
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <main className="public-info-page faq-page">
      <header className="public-info-hero">
        <span className="public-info-eyebrow">FAQ</span>
        <h1 className="public-info-title">Questions, answered.</h1>
        <p className="public-info-lead">
          The important things to know about CAI, automatic model routing, and the public beta.
        </p>
      </header>

      <div className="faq-groups">
        {faqGroups.map((group) => (
          <section className="faq-group" key={group.title}>
            <h2>{group.title}</h2>
            <div className="faq-list">
              {group.questions.map((item) => (
                <details key={item.question}>
                  <summary>
                    <span>{item.question}</span>
                    <span className="faq-plus" aria-hidden="true" />
                  </summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="faq-contact-cta">
        <div>
          <h2>Still need help?</h2>
          <p>Send us the details and we will point you in the right direction.</p>
        </div>
        <Link className="public-info-button primary" to="/contact">
          Contact support
        </Link>
      </section>
    </main>
  );
}
