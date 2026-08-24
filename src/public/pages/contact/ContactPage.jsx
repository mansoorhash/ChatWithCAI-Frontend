import React, { useState } from 'react';
import { Mail, MessageSquareText, ShieldCheck } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import './contactPage.css';

const BUG_REPORT_TEMPLATE = `What happened?

What did you expect to happen?

Steps to reproduce:
1. `;

const contactOptions = [
  {
    icon: MessageSquareText,
    title: 'Product support',
    description: 'Account problems, bugs, unexpected errors, or general questions.',
    email: 'support@chatwithcai.com',
  },
  {
    icon: ShieldCheck,
    title: 'Privacy inquiries',
    description: 'Privacy questions and requests concerning your personal information.',
    email: 'privacy@chatwithcai.com',
  },
];

export default function ContactPage() {
  const [searchParams] = useSearchParams();
  const isBugReport = searchParams.get('topic') === 'bug';
  const [form, setForm] = useState(() => ({
    name: '',
    email: isBugReport ? 'support@chatwithcai.com' : '',
    topic: isBugReport ? 'Bug report' : 'Product support',
    message: isBugReport ? BUG_REPORT_TEMPLATE : '',
  }));

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const submitMessage = (event) => {
    event.preventDefault();

    const recipient =
      form.topic === 'Privacy inquiry'
        ? 'privacy@chatwithcai.com'
        : 'support@chatwithcai.com';

    const subject = encodeURIComponent(`[${form.topic}] CAI contact request`);
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`,
    );

    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
  };

  return (
    <main className="public-info-page contact-page">
      <header className="public-info-hero">
        <span className="public-info-eyebrow">Contact</span>
        <h1 className="public-info-title">Tell us what is going on.</h1>
        <p className="public-info-lead">
          Report a beta issue, ask a question, or contact us about your privacy rights.
          Never include your password, access token, or other authentication credentials.
        </p>
      </header>

      <section className="contact-layout">
        <div className="contact-options">
          {contactOptions.map(({ icon: Icon, title, description, email }) => (
            <article className="contact-option" key={title}>
              <div className="contact-option-icon">
                <Icon size={21} aria-hidden="true" />
              </div>
              <div>
                <h2>{title}</h2>
                <p>{description}</p>
                <a href={`mailto:${email}`}>{email}</a>
              </div>
            </article>
          ))}

          <div className="contact-response-note">
            <Mail size={18} aria-hidden="true" />
            <p>
              Response times can be longer during public beta. Service incidents are
              listed on the status page when available.
            </p>
          </div>
        </div>

        <form className="contact-form" onSubmit={submitMessage}>
          <div className="contact-form-row">
            <label>
              <span>Name</span>
              <input
                autoComplete="name"
                name="name"
                onChange={updateField}
                required
                type="text"
                value={form.name}
              />
            </label>

            <label>
              <span>Email</span>
              <input
                autoComplete="email"
                name="email"
                onChange={updateField}
                required
                type="email"
                value={form.email}
              />
            </label>
          </div>

          <label>
            <span>Topic</span>
            <select name="topic" onChange={updateField} value={form.topic}>
              <option>Product support</option>
              <option>Bug report</option>
              <option>Account issue</option>
              <option>Privacy inquiry</option>
              <option>Other</option>
            </select>
          </label>

          <label>
            <span>Message</span>
            <textarea
              className="scrollbar-custom"
              name="message"
              onChange={updateField}
              placeholder="Describe what happened and include any visible error message."
              required
              rows="7"
              value={form.message}
            />
          </label>

          <button className="public-info-button primary" type="submit">
            Open email message
          </button>
          <p className="contact-form-note">
            This opens your email application with the message filled in. You can attach
            screenshots or other relevant files before sending.
          </p>
        </form>
      </section>
    </main>
  );
}
