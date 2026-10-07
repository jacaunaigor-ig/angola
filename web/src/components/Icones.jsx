import React from "react";

function svgBase(children, { size = 18, className = "", strokeWidth = 2, ...props } = {}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`svg-icon ${className}`.trim()}
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconeDashboard(props) {
  return svgBase(
    <>
      <rect width="7" height="9" x="3" y="3" rx="1.5" />
      <rect width="7" height="5" x="14" y="3" rx="1.5" />
      <rect width="7" height="9" x="14" y="12" rx="1.5" />
      <rect width="7" height="5" x="3" y="16" rx="1.5" />
    </>,
    props,
  );
}

export function IconeHondt(props) {
  return svgBase(
    <>
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="M7 21h10" />
      <path d="M12 3v18" />
      <path d="M3 7h18" />
    </>,
    props,
  );
}

export function IconeDiaD(props) {
  return svgBase(
    <>
      <path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14" />
      <path d="M2 20h20" />
      <path d="M14 12v.01" />
      <path d="M9 16h6" />
      <path d="m10 8 2 2 4-4" />
    </>,
    props,
  );
}

export function IconePlanos(props) {
  return svgBase(
    <>
      <rect width="20" height="14" x="2" y="7" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </>,
    props,
  );
}

export function IconeDiscursos(props) {
  return svgBase(
    <>
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </>,
    props,
  );
}

export function IconeEleitor(props) {
  return svgBase(
    <>
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
      <path d="M8 12h.01" />
      <path d="M12 12h.01" />
      <path d="M16 12h.01" />
    </>,
    props,
  );
}

export function IconeDesktop(props) {
  return svgBase(
    <>
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <line x1="8" x2="16" y1="21" y2="21" />
      <line x1="12" x2="12" y1="17" y2="21" />
    </>,
    props,
  );
}

export function IconeMobile(props) {
  return svgBase(
    <>
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
      <line x1="12" x2="12.01" y1="18" y2="18" />
    </>,
    props,
  );
}

export function IconeAuto(props) {
  return svgBase(
    <>
      <path d="m12 3-1.9 4.3L5.8 9.2l3.8 3.5-1.1 5.3 4.5-2.6 4.5 2.6-1.1-5.3 3.8-3.5-4.3-1.9Z" />
    </>,
    props,
  );
}

export function IconeMenu(props) {
  return svgBase(
    <>
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </>,
    props,
  );
}

export function IconeFechar(props) {
  return svgBase(
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>,
    props,
  );
}

export function IconeCentrar(props) {
  return svgBase(
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="22" x2="18" y1="12" y2="12" />
      <line x1="6" x2="2" y1="12" y2="12" />
      <line x1="12" x2="12" y1="6" y2="2" />
      <line x1="12" x2="12" y1="22" y2="18" />
    </>,
    props,
  );
}

export function IconeCamadas(props) {
  return svgBase(
    <>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </>,
    props,
  );
}

export function IconeCheck(props) {
  return svgBase(
    <>
      <polyline points="20 6 9 17 4 12" />
    </>,
    props,
  );
}

export function IconeRefresh(props) {
  return svgBase(
    <>
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </>,
    props,
  );
}

export function IconePesquisa(props) {
  return svgBase(
    <>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" x2="16.65" y1="21" y2="16.65" />
    </>,
    props,
  );
}

export function IconeEscudo(props) {
  return svgBase(
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </>,
    props,
  );
}

export function IconeFiltro(props) {
  return svgBase(
    <>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </>,
    props,
  );
}

export function IconeRuas(props) {
  return svgBase(
    <>
      <path d="M14 2v20" />
      <path d="M10 2v20" />
      <path d="m4 4 16 16" strokeDasharray="3 3" />
    </>,
    props,
  );
}

export function IconeSatelite(props) {
  return svgBase(
    <>
      <path d="M13 7 9 3 5 7l4 4" />
      <path d="m17 11 4 4-4 4-4-4" />
      <path d="m8 12 4 4" />
      <path d="m16 8 4-4" />
      <path d="M12 20a8 8 0 0 0 8-8" />
    </>,
    props,
  );
}

export function IconeMalha(props) {
  return svgBase(
    <>
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" x2="9" y1="3" y2="18" />
      <line x1="15" x2="15" y1="6" y2="21" />
    </>,
    props,
  );
}

export function IconeZonamento(props) {
  return svgBase(
    <>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </>,
    props,
  );
}

export function IconeMargem(props) {
  return svgBase(
    <>
      <line x1="18" x2="18" y1="20" y2="10" />
      <line x1="12" x2="12" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="14" />
    </>,
    props,
  );
}

export function IconePrioridade(props) {
  return svgBase(
    <>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </>,
    props,
  );
}

export function IconeLogistica(props) {
  return svgBase(
    <>
      <rect width="16" height="13" x="1" y="3" rx="2" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </>,
    props,
  );
}

export function IconeAngolaEmblema(props) {
  const size = props.size || 22;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`svg-icon angola-emblem ${props.className || ""}`.trim()}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" fill="var(--flag-black, #0b0a09)" stroke="var(--flag-red, #ce1126)" strokeWidth="1.8" />
      <path
        d="M12 4.5l1.6 3.8 4.1.4-3.1 2.8.9 4-3.5-2-3.5 2 .9-4-3.1-2.8 4.1-.4L12 4.5z"
        fill="var(--flag-gold, #f5c518)"
      />
    </svg>
  );
}
