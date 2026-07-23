"use client";

// Scène 3D de la moto (react-three-fiber). Chargée dynamiquement et
// montée uniquement quand le GLB existe et que WebGL est disponible
// (voir Moto3DStage). Respecte prefers-reduced-motion.
//
// Le défilement du hero pilote la rotation de la moto et un léger
// rapprochement de la caméra (voir scrollState).

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { scrollState } from "./scrollState";

const MODEL_URL = "/models/motocross.glb";

function usePrefersReducedMotion() {
  return useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);
}

function Moto({ reducedMotion }: { reducedMotion: boolean }) {
  const { scene } = useGLTF(MODEL_URL);
  const group = useRef<THREE.Group>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const intro = useRef(0); // 0 → 1, animation d'arrivée

  // Centre le modèle, le pose au sol et le met à l'échelle depuis sa boîte englobante.
  const prepared = useMemo(() => {
    const root = scene.clone(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = 3.4 / maxDim;
    root.position.set(-center.x, -box.min.y, -center.z); // pose au sol
    root.scale.setScalar(scale);
    root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    return root;
  }, [scene]);

  useEffect(() => {
    if (reducedMotion) return;
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [reducedMotion]);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    if (typeof document !== "undefined" && document.hidden) return;
    if (!scrollState.heroVisible) return; // pause quand le hero est passé

    const baseY = Math.PI * 0.16; // vue 3/4
    const progress = reducedMotion ? 0 : scrollState.heroProgress;

    // Intro : la moto arrive depuis la droite + se pose (suspension)
    intro.current = THREE.MathUtils.damp(intro.current, 1, 2.5, delta);
    const introOffsetY = (1 - intro.current) * 0.7; // rotation entrante
    const introDrop = (1 - intro.current) * 0.25; // descente

    if (reducedMotion) {
      g.rotation.set(0, baseY, 0);
      g.position.y = 0;
    } else {
      const idle = Math.sin(state.clock.elapsedTime * 0.35) * 0.05;
      // Le scroll fait pivoter la moto (~55°) pour révéler le flanc
      const targetY = baseY + introOffsetY + idle + progress * 0.95 + pointer.current.x * 0.16;
      const targetX = pointer.current.y * 0.05 - progress * 0.06;
      g.rotation.y = THREE.MathUtils.damp(g.rotation.y, targetY, 3, delta);
      g.rotation.x = THREE.MathUtils.damp(g.rotation.x, targetX, 3, delta);
      g.position.y = THREE.MathUtils.damp(g.position.y, -introDrop, 4, delta);
    }

    // Léger rapprochement de la caméra au défilement (vers le moteur)
    const targetZ = 6.2 - progress * 1.4;
    const targetCamY = 1.7 - progress * 0.35;
    state.camera.position.z = THREE.MathUtils.damp(state.camera.position.z, targetZ, 3, delta);
    state.camera.position.y = THREE.MathUtils.damp(state.camera.position.y, targetCamY, 3, delta);
    state.camera.lookAt(0, 0.6, 0);
  });

  return <group ref={group}><primitive object={prepared} /></group>;
}

export default function MotocrossScene() {
  const reducedMotion = usePrefersReducedMotion();
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [4.8, 1.7, 6.2], fov: 40 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%" }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 7, 4]} intensity={1.8} color="#ffd7a0" castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-6, 3, -4]} intensity={0.5} color="#88a0ff" />
      <spotLight position={[0, 6, 6]} angle={0.5} penumbra={1} intensity={0.6} color="#ffb060" />
      <Suspense fallback={null}>
        <Moto reducedMotion={reducedMotion} />
      </Suspense>
      <ContactShadows position={[0, -0.01, 0]} opacity={0.55} scale={12} blur={2.6} far={4.5} />
      <ResizeHandler />
    </Canvas>
  );
}

// Réagit proprement au redimensionnement
function ResizeHandler() {
  const { camera, gl } = useThree();
  useEffect(() => {
    const onResize = () => {
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.aspect = gl.domElement.clientWidth / gl.domElement.clientHeight;
        camera.updateProjectionMatrix();
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [camera, gl]);
  return null;
}

useGLTF.preload(MODEL_URL);
