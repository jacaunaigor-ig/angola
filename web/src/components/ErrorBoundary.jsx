import React, { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { falhou: false };
  }

  static getDerivedStateFromError() {
    return { falhou: true };
  }

  componentDidCatch(erro, info) {
    console.error("Falha de interface:", erro, info?.componentStack);
  }

  render() {
    if (!this.state.falhou) return this.props.children;
    return (
      <main className="page">
        <section className="card" role="alert">
          <h2>Esta secção falhou ao abrir</h2>
          <p className="muted">Os dados não foram alterados. Recarregue a página; se persistir, avise a equipa técnica.</p>
          <button className="primary" type="button" onClick={() => window.location.reload()}>
            Recarregar
          </button>
        </section>
      </main>
    );
  }
}
