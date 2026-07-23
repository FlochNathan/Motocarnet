"use client";

// Orchestrateur du visuel 3D du hero.
// - vérifie la disponibilité de WebGL ;
// - vérifie la présence du modèle /models/motocross.glb (HEAD) ;
// - charge la scène 3D dynamiquement (ssr:false) seulement si tout est OK ;
// - sinon, affiche un visuel de secours élégant (aucun three.js chargé).

import { Component, type ReactNode, Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import ThreeFallback from "./ThreeFallback";

const MotocrossScene = dynamic(() => import("./MotocrossScene"), {
  ssr: false,
  loading: () => <ThreeFallback />,
});

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")));
  } catch {
    return false;
  }
}

// Capture toute erreur de rendu 3D et bascule sur le fallback.
class SceneErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function Moto3DStage() {
  const [status, setStatus] = useState<"checking" | "ready" | "fallback">("checking");

  useEffect(() => {
    let cancelled = false;
    if (!webglAvailable()) {
      setStatus("fallback");
      return;
    }
    // Le modèle existe-t-il ? (il n'est généré qu'après l'export Blender)
    fetch("/models/motocross.glb", { method: "HEAD" })
      .then((res) => {
        if (cancelled) return;
        setStatus(res.ok ? "ready" : "fallback");
      })
      .catch(() => !cancelled && setStatus("fallback"));
    return () => {
      cancelled = true;
    };
  }, []);

  if (status !== "ready") {
    return <ThreeFallback />;
  }

  return (
    <SceneErrorBoundary fallback={<ThreeFallback />}>
      <Suspense fallback={<ThreeFallback />}>
        <MotocrossScene />
      </Suspense>
    </SceneErrorBoundary>
  );
}
