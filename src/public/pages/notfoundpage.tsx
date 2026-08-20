import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import "./shared/publicPage.css"

export default function NotFoundPage(): ReactElement {
  return (
    <main className="app loading-container scrollbar-custom">
      <div className="public-info-page">
        <section className="public-info-hero" aria-labelledby="not-found-title">
          <span className="public-info-eyebrow">404 error</span>
          <h1 className="public-info-title" id="not-found-title">
            Page not found.
          </h1>
          <p className="public-info-lead">
            The page you&rsquo;re looking for may have been moved, deleted, or
            never existed.
          </p>

          <div className="public-info-section">
            <Link className="public-info-button primary" to="/">
              Return home
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}