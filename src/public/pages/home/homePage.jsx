import React from 'react';
// import { ArrowDown } from 'lucide-react';
// import Demo from './demo/layout';
import './home.css';

export default function Home() {
  function FadeWords({ text, delay = 0 }) {
    const words = text.split(' ');

    return (
      <span>
        {words.map((word, i) => (
          <span
            key={i}
            className="fade-word"
            style={{
              animationDelay: `${delay + i * 0.18}s`,
            }}
          >
            {word}&nbsp;
          </span>
        ))}
      </span>
    );
  }

  function FadeIn({ text, delay = 0 }) {
    return (
      <span
        className="fade-in"
        style={{
          animationDelay: `${delay}s`,
        }}
      >
        {text}
      </span>
    );
  }

  return (
    <div className="home">
      <section className="page-segment">
        <div className="hero-shell">
          <div className='construction'>
            <FadeIn
              text="AVAILABLE NOW"
            />
          </div>
          <div className="hero-copy">
            <h1>
              <FadeWords text="One Chat." delay={0.2}/>
            </h1>
            <h1>
              <FadeWords text="Every AI Model" delay={0.6} />
            </h1>
            <p>
              <FadeIn
                text="Never have to choose between models again."
                delay={1.1}
              />
            </p>
          </div>
        </div>
    
      </section>
    </div>
    
  );
}
