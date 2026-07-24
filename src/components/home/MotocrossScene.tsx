"use client";

// Scène 3D « showroom » avec vue éclatée pilotée par le défilement.
// Les pièces s'écartent radialement pour révéler l'anatomie de la moto,
// puis se réassemblent quand on remonte. Reflets métalliques (Environment
// procédural), sol réfléchissant, intro cinématique.
// Chargée dynamiquement seulement si le GLB existe (voir Moto3DStage).
// Respecte prefers-reduced-motion.

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, ContactShadows, Environment, Lightformer, MeshReflectorMaterial } from "@react-three/drei";
import * as THREE from "three";
import { scrollState } from "./scrollState";

const MODEL_URL = "/models/motocross.glb";

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function usePrefersReducedMotion() {
  return useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);
}

interface Part {
  obj: THREE.Object3D;
  home: THREE.Vector3; // position d'origine (assemblée)
  dir: THREE.Vector3; // direction locale d'explosion
  dist: number; // distance au centre (amplitude proportionnelle)
}

function Moto({ reducedMotion }: { reducedMotion: boolean }) {
  const { scene } = useGLTF(MODEL_URL);
  const group = useRef<THREE.Group>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const intro = useRef(0);
  const tmp = useRef(new THREE.Vector3()).current;

  // Prépare le modèle ET précalcule la direction d'explosion de chaque pièce.
  const { root, parts } = useMemo(() => {
    const root = scene.clone(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = 3.4 / maxDim;
    root.position.set(-center.x, -box.min.y, -center.z);
    root.scale.setScalar(scale);
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const mat = mesh.material as THREE.MeshStandardMaterial | undefined;
        if (mat && "envMapIntensity" in mat) mat.envMapIntensity = 1.15;
      }
    });

    // Mesure dans le repère local du modèle (matrices à jour, arbre détaché)
    root.updateMatrixWorld(true);
    const modelCenter = new THREE.Box3().setFromObject(root).getCenter(new THREE.Vector3());
    const parts: Part[] = [];
    const m3 = new THREE.Matrix3();
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || !mesh.parent) return;
      const worldCenter = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
      const radial = worldCenter.sub(modelCenter);
      const dist = radial.length();
      if (dist < 1e-4) return; // pièce centrale : ne bouge pas
      radial.normalize();
      // Convertit la direction (repère modèle) vers le repère local du parent
      m3.setFromMatrix4(new THREE.Matrix4().copy(mesh.parent.matrixWorld).invert());
      const dir = radial.clone().applyMatrix3(m3).normalize();
      parts.push({ obj: mesh, home: mesh.position.clone(), dir, dist });
    });
    return { root, parts };
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
    if (!scrollState.heroVisible) return;

    const baseY = Math.PI * 0.16;
    const progress = reducedMotion ? 0 : scrollState.heroProgress;
    const explode = reducedMotion ? 0 : smoothstep(0.12, 0.85, progress);
    const lerp = 1 - Math.exp(-7 * delta);

    // Vue éclatée : chaque pièce s'écarte radialement, proportionnellement
    for (const p of parts) {
      tmp.copy(p.home).addScaledVector(p.dir, p.dist * explode * 1.6);
      p.obj.position.lerp(tmp, lerp);
    }

    // Intro : la moto grandit + arrive en tournant + se pose
    intro.current = THREE.MathUtils.damp(intro.current, 1, 2.2, delta);
    const introRot = (1 - intro.current) * 0.9;
    const introDrop = (1 - intro.current) * 0.3;
    g.scale.setScalar(0.86 + intro.current * 0.14);

    if (reducedMotion) {
      g.rotation.set(0, baseY, 0);
      g.position.y = 0;
    } else {
      const t = state.clock.elapsedTime;
      const idle = Math.sin(t * 0.35) * 0.04;
      // Plateau tournant qui s'estompe quand l'éclatement révèle les pièces
      const turntable = t * 0.12 * (1 - progress) * (1 - explode);
      const targetY = baseY + introRot + idle + turntable + progress * 0.55 + pointer.current.x * 0.14;
      const targetX = pointer.current.y * 0.05 - progress * 0.05;
      g.rotation.y = THREE.MathUtils.damp(g.rotation.y, targetY, 3, delta);
      g.rotation.x = THREE.MathUtils.damp(g.rotation.x, targetX, 3, delta);
      g.position.y = THREE.MathUtils.damp(g.position.y, -introDrop, 4, delta);
    }

    // Caméra : léger recul pendant l'éclatement pour tout voir
    const targetZ = 6.2 + explode * 0.8 - progress * 0.4;
    const targetCamY = 1.7 - progress * 0.2;
    state.camera.position.z = THREE.MathUtils.damp(state.camera.position.z, targetZ, 3, delta);
    state.camera.position.y = THREE.MathUtils.damp(state.camera.position.y, targetCamY, 3, delta);
    state.camera.lookAt(0, 0.6, 0);
  });

  return <group ref={group}><primitive object={root} /></group>;
}

function Floor() {
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0}>
      <planeGeometry args={[40, 40]} />
      <MeshReflectorMaterial
        resolution={512}
        blur={[400, 120]}
        mixBlur={1}
        mixStrength={12}
        roughness={0.9}
        depthScale={1}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.4}
        color="#eeece8"
        metalness={0.35}
        mirror={0.35}
      />
    </mesh>
  );
}

export default function MotocrossScene() {
  const reducedMotion = usePrefersReducedMotion();
  const [reflective, setReflective] = useState(false);
  useEffect(() => {
    setReflective(window.matchMedia("(min-width: 1024px)").matches);
  }, []);

  return (
    <Canvas
      shadows
      dpr={[1, reflective ? 1.75 : 1.5]}
      camera={{ position: [4.8, 1.7, 6.2], fov: 40 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%" }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 7, 4]} intensity={1.5} color="#fff0d8" castShadow shadow-mapSize={[1024, 1024]} />
      <RimLight />

      <Suspense fallback={null}>
        <Moto reducedMotion={reducedMotion} />
        {reflective && <Floor />}
        <Environment resolution={256} frames={1}>
          <Lightformer intensity={2.2} position={[0, 5, -6]} scale={[12, 4, 1]} color="#ffffff" />
          <Lightformer intensity={1.3} position={[-6, 2, 3]} scale={[4, 4, 1]} color="#ffd9a0" />
          <Lightformer intensity={1.0} position={[6, 1.5, 4]} scale={[4, 4, 1]} color="#cfe0ff" />
          <Lightformer intensity={1.4} position={[0, 3, 6]} scale={[8, 2, 1]} color="#ffffff" />
        </Environment>
      </Suspense>

      <ContactShadows position={[0, 0.001, 0]} opacity={0.32} scale={12} blur={2.8} far={4.5} />
      <ResizeHandler />
    </Canvas>
  );
}

function RimLight() {
  const ref = useRef<THREE.SpotLight>(null);
  useFrame((state) => {
    if (ref.current) ref.current.intensity = 0.5 + Math.sin(state.clock.elapsedTime * 0.8) * 0.2;
  });
  return <spotLight ref={ref} position={[-5, 4, -3]} angle={0.6} penumbra={1} intensity={0.6} color="#ffa94d" />;
}

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
