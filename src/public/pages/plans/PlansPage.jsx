import React from 'react';
import { Link } from 'react-router-dom';
import { Check, Sparkles } from 'lucide-react';
import './plansPage.css';

const plans = [
  {
    name: 'Free',
    description:
      'Access to Models great for straightforward conversations and basic tasks.',
    price: '$0',
    priceNote: 'available soon',
    badge: 'Available after Plus spots filled',
    features: [
      "Access to CAI's lightweight model pool",
      'A new model selected for every message',
      'Automatic routing based on prompt',
      'Limited usage during full release',
    ],
    action: 'Coming later',
  },
  {
    name: 'Plus',
    description:
      'Premium models available for demanding tasks, speeding up everyday work.',
    price: 'Free',
    priceNote: 'until Plus tier spots are filled',
    badge: 'Included with signup',
    featured: true,
    features: [
      'Everything included in Free',
      "Access to CAI's premium model pool",
      'Quality-first routing across multiple AI providers',
      'Individual rolling allowances for select higher tier models',
    ],
    action: 'Create an account',
    to: '/register',
  },
  {
    name: 'Pro',
    description:
      "CAI's strongest model access for highly complex and demanding tasks.",
    price: 'Coming soon',
    priceNote: 'features and pricing are still being developed',
    badge: 'Planned',
    features: [
      'Everything included in Plus',
      "Access to CAI's strongest model pool",
      'Highest allowances for selected higher tier models',
      'Planned advanced and agentic routing capabilities',
    ],
    action: 'Not yet available',
  },
];

export default function PlansPage() {
  return (
    <main className="public-info-page plans-page">
      <header className="public-info-hero">
        <span className="public-info-eyebrow">Plans</span>
        <h1 className="public-info-title">Simple access. Smarter routing.</h1>
        <p className="public-info-lead">
          CAI automatically routes each conversation to an appropriate model.
          Your plan determines the model pool and usage available to the router.
        </p>
      </header>

      <div className="plans-beta-note">
        <Sparkles size={20} aria-hidden="true" />

        <div>
          <strong>Every new account currently receives Plus access.</strong>
          <span>
            As the beta grows, new Plus access will become invitation-only.
            Existing access and plan details may change during testing.
          </span>
        </div>
      </div>

      <section className="plans-grid" aria-label="CAI plans">
        {plans.map((plan) => (
          <article
            className={`plan-card${plan.featured ? ' featured' : ''}`}
            key={plan.name}
          >
            <div className="plan-card-topline">
              <h2>{plan.name}</h2>
              <span>{plan.badge}</span>
            </div>

            <p className="plan-description">{plan.description}</p>

            <div className="plan-price">
              <strong>{plan.price}</strong>
              <span>{plan.priceNote}</span>
            </div>

            <ul>
              {plan.features.map((feature) => (
                <li key={feature}>
                  <Check size={18} aria-hidden="true" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {plan.to ? (
              <Link className="public-info-button primary plan-action" to={plan.to}>
                {plan.action}
              </Link>
            ) : (
              <button className="public-info-button plan-action" type="button" disabled>
                {plan.action}
              </button>
            )}
          </article>
        ))}
      </section>

      <p className="plans-footnote">
        Model pools refer to the models available.
        Individual models may change as providers, capacity, and CAI's routing
        system evolve.
      </p>
    </main>
  );
}
