import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import './legal.css';

const policies = {
  privacy: {
    source: '/legal/privacy.md',
    label: 'Privacy Policy',
  },
  terms: {
    source: '/legal/tos.md',
    label: 'Terms of Service',
  },
};

export default function LegalPage({ type }) {
  const [markdown, setMarkdown] = useState('');
  const [error, setError] = useState(false);

  const policy = policies[type];

  const { hash } = useLocation();

  useEffect(() => {
    if (!markdown || !hash) return;

    const frame = requestAnimationFrame(() => {
      const id = decodeURIComponent(hash.slice(1));
      document.getElementById(id)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [hash, markdown]);

  useEffect(() => {
    const controller = new AbortController();

    setMarkdown('');
    setError(false);

    fetch(policy.source, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Could not load legal document.');
        }

        return response.text();
      })
      .then(setMarkdown)
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') {
          setError(true);
        }
      });

    return () => controller.abort();
  }, [policy.source]);

  return (
    <main className="legal-page">
      <article className="legal-document" aria-busy={!markdown && !error}>
        {error && (
          <p className="legal-error">
            The {policy.label} could not be loaded.
          </p>
        )}

        {!markdown && !error && (
          <p className="legal-loading">Loading {policy.label}…</p>
        )}

        {markdown && (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
              table: ({ node: _node, children, ...props }) => (
                <div className="legal-table-wrapper scrollbar-custom">
                  <table {...props}>{children}</table>
                </div>
              ),
              a: ({ node: _node, href, children, ...props }) => {
                const external = href?.startsWith('http');

                return (
                  <a
                    href={href}
                    target={external ? '_blank' : undefined}
                    rel={external ? 'noreferrer' : undefined}
                    {...props}
                  >
                    {children}
                  </a>
                );
              },
            }}
          >
            {markdown}
          </ReactMarkdown>
        )}
      </article>
    </main>
  );
}
