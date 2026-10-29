import React, { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { falhou: false, mensagem: "" };
  }

  static getDerivedStateFromError(erro) {
    return { falhou: true, mensagem: erro?.message || "Erro de interface." };
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
          <p className="muted">{this.state.mensagem}</p>
          <button className="primary" type="button" onClick={() => window.location.reload()}>
            Recarregar
          </button>
        </section>
      </main>
    );
  }
}
