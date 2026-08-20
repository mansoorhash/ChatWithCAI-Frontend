import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
} from 'lucide-react';
import { getStatus } from '../../../api/data/status';
import './statusPage.css';

const statusLabels = {
  active: 'Active',
  degraded: 'Degraded performance',
  outage: 'Service outage',
  maintenance: 'Maintenance',
};

const statusPriority = {
  active: 0,
  maintenance: 1,
  degraded: 2,
  outage: 3,
};

const createServices = (data) => [
  {
    id: 'backend',
    name: 'APIs',
    description: 'api.chatwithcai.com',
    status: data.backend,
  },
  {
    id: 'routing',
    name: 'Routing backend',
    status: data.routing,
  },
];

const empty = Array.from({ length: 2 }, (_, index) => ({
  id: `loading-${index}`,
  name: 'this is an empty name for aura',
  description: null,
  status: "active",
}));

export default function StatusPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusError, setStatusError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const fetchStatus = async () => {
      try {
        const data = await getStatus(controller.signal);

        setServices(createServices(data));
        setStatusError(false);
      } catch (error) {
        if (error.name !== 'AbortError') {
          setStatusError(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchStatus();

    return () => controller.abort();
  }, []);

  const overallStatus = services.reduce(
    (worst, service) =>
      statusPriority[service.status] > statusPriority[worst]
        ? service.status
        : worst,
    'active',
  );

  const OverallIcon =
    overallStatus === 'active' ? CheckCircle2 : AlertTriangle;

  const serviceList = loading ? empty : services;

  return (
    <main className="public-info-page">
      <header className="public-info-hero">
        <span className="public-info-eyebrow">Service status</span>
        <h1>CAI system status.</h1>
        <p>
          Current availability for the services required to access CAI and
          generate responses.
        </p>
      </header>

      {loading && (
        <section className="status-overall loading" aria-live="polite">
          <CircleDashed size={25} aria-hidden="true" />

          <div>
            <h2>Checking system status</h2>
            <p>Retrieving the current status of CAI services.</p>
          </div>
        </section>
      )}

      {!loading && statusError && (
        <section className="status-overall outage" aria-live="polite">
          <AlertTriangle size={25} aria-hidden="true" />

          <div>
            <h2>Status unavailable</h2>
            <p>CAI could not retrieve the current system status.</p>
          </div>
        </section>
      )}

      {!loading && !statusError && (
        <section
          className={`status-overall ${overallStatus}`}
          aria-live="polite"
        >
          <OverallIcon size={25} aria-hidden="true" />

          <div>
            <h2>{statusLabels[overallStatus]}</h2>

            <p>
              {overallStatus === 'active'
                ? 'All listed CAI services are operating normally.'
                : 'One or more CAI services are currently affected.'}
            </p>
          </div>
        </section>
      )}

      {!statusError && (
        <section
          className="public-info-section"
          aria-labelledby="components-heading"
        >
          <div className="public-info-section-heading">
            <h2 id="components-heading">Components</h2>
          </div>

          <div className="status-components public-info-panel">
            {serviceList.map((service) => (
              <article key={service.id}>
                <div className="status-label">
                  <span className={loading ? 'loading-text' : ''}>
                    {service.name}
                  </span>

                  {service.description && (
                    <div
                      className={`status-sublabel ${
                        loading ? 'loading-text' : ''
                      }`}
                    >
                      {service.description}
                    </div>
                  )}
                </div>

                <span
                  className={`status-badge ${
                    loading ? 'loading-text' : service.status
                  }`}
                >
                  {statusLabels[service.status]}
                </span>
              </article>
            ))}
          </div>
        </section>
      )}

      <section
        className="public-info-section"
        aria-labelledby="incidents-heading"
      >
        <div className="public-info-section-heading">
          <h2 id="incidents-heading">Recent incidents</h2>

          <p>
            Service disruptions and important operational updates appear here.
          </p>
        </div>

        <div className="status-empty">
          <CircleDashed size={22} aria-hidden="true" />

          <div>
            <h3>No recent incidents</h3>
            <p>There are no recently reported incidents.</p>
          </div>
        </div>
      </section>
    </main>
  );
}