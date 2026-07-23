"use client";

// Scène 3D de la moto (react-three-fiber). Chargée dynamiquement et
// montée uniquement quand le GLB existe et que WebGL est disponible
// (voir Moto3DStage). Respecte prefers-reduced-motion.

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

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

  // Centre le modèle, le pose au sol et le met à l'échelle depuis sa boîte englobante.
  const prepared = useMemo(() => {
    const root = scene.clone(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = 3.2 / maxDim;
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
    if (typeof document !== "undefined" && document.hidden) return; // pause onglet inactif

    // Vue 3/4 de base
    const baseY = Math.PI * 0.18;
    if (reducedMotion) {
      g.rotation.y = baseY;
      return;
    }
    // Très légère respiration + parallaxe souris borné
    const idle = Math.sin(state.clock.elapsedTime * 0.35) * 0.06;
    const targetY = baseY + idle + pointer.current.x * 0.18; // limite stricte
    const targetX = pointer.current.y * 0.06;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, targetY, 3, delta);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, targetX, 3, delta);
  });

  return <group ref={group}><primitive object={prepared} /></group>;
}

export default function MotocrossScene() {
  const reducedMotion = usePrefersReducedMotion();
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [4.5, 1.8, 5.5], fov: 38 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%" }}
    >
      <color attach="background" args={["#0d0d0f"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 6, 4]} intensity={1.6} color="#ffd9a0" castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-5, 3, -4]} intensity={0.5} color="#8899ff" />
      <Suspense fallback={null}>
        <Moto reducedMotion={reducedMotion} />
      </Suspense>
      <ContactShadows position={[0, -0.01, 0]} opacity={0.5} scale={10} blur={2.4} far={4} />
      <ResizeHandler />
    </Canvas>
  );
}

// Réagit proprement au redimensionnement (r3f le gère, on force l'update caméra)
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
