import { useEffect, useState } from 'react';
import './_group.css';

const landingMessages = [
  "Every action is simulated before it's signed. Cirq shows you the outcome first — never the other way around.",
  'The agent proposes. You dispose. Cirq can prepare a move. Only your wallet can send it.',
  'Not every market is real. Cirq filters out the noise before it ever reaches you.',
  'Prices come from Chainlink, not a rumor in a pool. Every risk number traces back to a source you can check.',
  'Revoke access in one tap, any time. Your permissions are yours to end whenever you choose.',
];

function TypewriterFootnote() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [visibleText, setVisibleText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const message = landingMessages[messageIndex];
    const finishedTyping = !deleting && visibleText === message;
    const finishedDeleting = deleting && visibleText.length === 0;
    const timeout = window.setTimeout(() => {
      if (finishedDeleting) {
        setDeleting(false);
        setMessageIndex((current) => (current + 1) % landingMessages.length);
      } else if (deleting) {
        setVisibleText(message.slice(0, visibleText.length - 1));
      } else if (finishedTyping) {
        setDeleting(true);
      } else {
        setVisibleText(message.slice(0, visibleText.length + 1));
      }
    }, finishedTyping ? 3200 : deleting ? 48 : 72);

    return () => window.clearTimeout(timeout);
  }, [deleting, messageIndex, visibleText]);

  return (
    <p className="cirq-landing-footnote" aria-live="polite">
      <span className="typewriter-copy">{visibleText}</span>
      <span className="typewriter-caret" aria-hidden="true" />
    </p>
  );
}

export function SplitScreen() {
  return (
    <main className="cirq-landing">
      <div className="cirq-landing-frame">
        <section className="cirq-landing-copy">
          <div className="cirq-landing-brand" aria-label="Cirq">
            <img src="/__mockup/images/cirq-mark.png" alt="" />
            <img src="/__mockup/images/cirq-wordmark.png" alt="Cirq" />
          </div>

          <div className="cirq-landing-content">
            <img className="cirq-landing-hero-wordmark" src="/__mockup/images/cirq-wordmark.png" alt="Cirq" />
            <h1>Save. Earn.<br />Win Real Stocks.</h1>
            <p className="cirq-landing-description">
              AI-managed yield, liquidity pathfinding &amp; loop design on Robinhood Chain.
            </p>
            <button className="cirq-landing-button" type="button">
              <span className="cirq-wallet-icon" aria-hidden="true">▣</span>
              Connect Wallet
              <span className="cirq-button-arrow" aria-hidden="true">↗</span>
            </button>
          </div>

          <TypewriterFootnote />
        </section>

        <section className="cirq-landing-visual" aria-label="Cirq intelligence visual">
          <img src="/__mockup/images/cirq-eye.png" alt="A luminous green robotic eye" />
        </section>
      </div>
    </main>
  );
}