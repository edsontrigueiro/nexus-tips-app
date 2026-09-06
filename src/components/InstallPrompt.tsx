"use client";

import { useEffect, useState } from "react";

type Plataforma = "ios" | "android" | "outro";

export function InstallPrompt() {
  const [plataforma, setPlataforma] = useState<Plataforma | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isAndroid = /Android/.test(ua);
    setPlataforma(isIOS ? "ios" : isAndroid ? "android" : "outro");

    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setStandalone(isStandalone);

    try {
      setDismissed(sessionStorage.getItem("nx-install-dismissed") === "1");
    } catch {
      setDismissed(false);
    }

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  function fechar() {
    setShowModal(false);
  }

  function dispensar() {
    setDismissed(true);
    try {
      sessionStorage.setItem("nx-install-dismissed", "1");
    } catch {
      // sem suporte a sessionStorage — segue sem lembrar a dispensa
    }
  }

  async function abrirInstalacao() {
    if (plataforma === "android" && deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }
    setShowModal(true);
  }

  if (standalone || dismissed || plataforma === "outro" || plataforma === null) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 bg-elevated border border-border rounded-full pl-4 pr-2 py-2 shadow-lg">
        <button
          onClick={abrirInstalacao}
          className="flex items-center gap-2 text-xs font-semibold text-text"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2">
            <path d="M12 3v12m0 0l-4-4m4 4l4-4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Instalar app
        </button>
        <button
          onClick={dispensar}
          aria-label="Dispensar"
          className="text-muted hover:text-text2 text-sm px-1.5"
        >
          ×
        </button>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4"
          onClick={fechar}
        >
          <div
            className="card p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xs font-bold tracking-wide text-primary mb-1">
              INSTALAR NEXUS TIPS
            </div>
            <h2 className="text-lg font-bold mb-4">
              {plataforma === "ios" ? "Adicionar à Tela de Início" : "Adicionar à tela inicial"}
            </h2>

            {plataforma === "ios" ? (
              <ol className="flex flex-col gap-3 text-sm text-text2">
                <li className="flex gap-3">
                  <span className="font-mono text-primary font-semibold">1.</span>
                  Toque no ícone de <strong className="text-text">Compartilhar</strong>{" "}
                  (o quadrado com uma seta para cima) na barra do Safari.
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-primary font-semibold">2.</span>
                  Deslize a lista de opções e toque em{" "}
                  <strong className="text-text">"Adicionar à Tela de Início"</strong>.
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-primary font-semibold">3.</span>
                  Toque em <strong className="text-text">"Adicionar"</strong> no canto
                  superior direito.
                </li>
              </ol>
            ) : (
              <ol className="flex flex-col gap-3 text-sm text-text2">
                <li className="flex gap-3">
                  <span className="font-mono text-primary font-semibold">1.</span>
                  Toque no menu <strong className="text-text">(⋮)</strong> no canto
                  superior direito do Chrome.
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-primary font-semibold">2.</span>
                  Toque em <strong className="text-text">"Instalar aplicativo"</strong>{" "}
                  (ou "Adicionar à tela inicial").
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-primary font-semibold">3.</span>
                  Confirme tocando em <strong className="text-text">"Instalar"</strong>.
                </li>
              </ol>
            )}

            <button onClick={fechar} className="btn-outline w-full mt-6 text-xs py-2.5">
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
