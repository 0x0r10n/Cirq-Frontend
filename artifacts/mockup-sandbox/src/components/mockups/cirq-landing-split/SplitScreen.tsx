import './_group.css';

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
            <p className="cirq-landing-eyebrow">A clearer way into DeFi</p>
            <h1>Explore yield without losing the plot.</h1>
            <p className="cirq-landing-description">
              Connect a wallet to let Cirq curate opportunities, watch your
              positions, and prepare the next move for your review.
            </p>
            <button className="cirq-landing-button" type="button">
              <span aria-hidden="true">◌</span>
              Connect wallet
            </button>
          </div>

          <p className="cirq-landing-footnote">
            <strong>Built for thoughtful on-chain decisions.</strong>
            <br />
            Cirq is a non-US interface. You stay in control of every signature.
          </p>
        </section>

        <section className="cirq-landing-visual" aria-label="Cirq intelligence visual">
          <img src="/__mockup/images/cirq-eye.png" alt="A luminous green robotic eye" />
        </section>
      </div>
    </main>
  );
}