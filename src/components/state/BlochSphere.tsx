import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { BlochVector } from '../../types';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface BlochSphereProps {
  bloch: BlochVector;
  isEntangled: boolean;
}

export function BlochSphere({ bloch, isEntangled }: BlochSphereProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  
  // Refs to persist animation state across renders
  const arrowHelperRef = useRef<THREE.ArrowHelper | null>(null);
  const innerSphereRef = useRef<THREE.Mesh | null>(null);
  const currentDirectionRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 1));
  const currentLengthRef = useRef(0.45);
  const targetDirectionRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 1));
  const targetLengthRef = useRef(0.45);
  const isInitializedRef = useRef(false);
  // The animation loop below is created once with an empty dependency list, so
  // reading `reducedMotion` inside it captured the first (false) value forever
  // and the media query had no effect on the arrow's motion at all. The loop
  // reads this ref instead, which the listener below keeps current.
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      reducedMotionRef.current = mediaQuery.matches;
      setReducedMotion(mediaQuery.matches);
    };
    sync();
    const handler = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
      setReducedMotion(e.matches);
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = 80;
    const height = 80;
    const radius = 0.45;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10);
    camera.position.z = 2;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    // Wireframe sphere
    const sphereGeometry = new THREE.SphereGeometry(radius, 16, 16);
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x1F497D,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(sphere);

    // Axes
    const axesLength = radius * 1.3;
    const axesGeometry = new THREE.BufferGeometry();
    const axesVertices = new Float32Array([
      -axesLength, 0, 0, axesLength, 0, 0,
      0, -axesLength, 0, 0, axesLength, 0,
      0, 0, -axesLength, 0, 0, axesLength,
    ]);
    axesGeometry.setAttribute('position', new THREE.BufferAttribute(axesVertices, 3));
    const axesMaterial = new THREE.LineBasicMaterial({ color: 0x595959, transparent: true, opacity: 0.3 });
    const axes = new THREE.LineSegments(axesGeometry, axesMaterial);
    scene.add(axes);

    // Bloch vector arrow - initialize with current refs
    const arrowLength = isEntangled ? bloch.purity * radius : radius;
    const arrowDirection = new THREE.Vector3(bloch.x, bloch.y, bloch.z);
    const arrowOrigin = new THREE.Vector3(0, 0, 0);

    // Normalize direction if not zero
    if (arrowDirection.length() > 0) {
      arrowDirection.normalize();
    } else {
      arrowDirection.set(0, 0, 1); // Default to +Z for |0⟩
    }

    const arrowHelper = new THREE.ArrowHelper(
      arrowDirection,
      arrowOrigin,
      arrowLength,
      isEntangled ? 0xF79646 : 0x0070C0,
      0.08,
      0.05
    );
    scene.add(arrowHelper);
    arrowHelperRef.current = arrowHelper;

    // Set initial refs
    currentDirectionRef.current.copy(arrowDirection);
    currentLengthRef.current = arrowLength;
    targetDirectionRef.current.copy(arrowDirection);
    targetLengthRef.current = arrowLength;

    // Inner sphere for entangled (mixed state)
    let innerSphere: THREE.Mesh | null = null;
    if (isEntangled) {
      const innerRadius = bloch.purity * radius;
      const innerGeometry = new THREE.SphereGeometry(innerRadius, 12, 12);
      const innerMaterial = new THREE.MeshBasicMaterial({
        color: 0xF79646,
        wireframe: true,
        transparent: true,
        opacity: 0.3,
      });
      innerSphere = new THREE.Mesh(innerGeometry, innerMaterial);
      scene.add(innerSphere);
      innerSphereRef.current = innerSphere;
    }

    // Animation loop - uses refs so it always has current values
    let animationId: number;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      if (!reducedMotionRef.current) {
        // Smoothly interpolate current toward target
        const lerpFactor = 0.1;
        
        // Interpolate direction
        currentDirectionRef.current.lerp(targetDirectionRef.current, lerpFactor);
        if (currentDirectionRef.current.length() > 0) {
          currentDirectionRef.current.normalize();
        }
        
        // Interpolate length
        currentLengthRef.current += (targetLengthRef.current - currentLengthRef.current) * lerpFactor;
        
        // Update arrow
        if (arrowHelperRef.current) {
          arrowHelperRef.current.setDirection(currentDirectionRef.current.clone());
          arrowHelperRef.current.setLength(currentLengthRef.current);
        }
      } else {
        // Instant update for reduced motion
        currentDirectionRef.current.copy(targetDirectionRef.current);
        currentLengthRef.current = targetLengthRef.current;
        if (arrowHelperRef.current) {
          arrowHelperRef.current.setDirection(targetDirectionRef.current.clone());
          arrowHelperRef.current.setLength(targetLengthRef.current);
        }
      }

      // Rotate inner sphere for entangled state
      if (innerSphereRef.current && !reducedMotionRef.current) {
        innerSphereRef.current.rotation.y += 0.002;
      }

      renderer.render(scene, camera);
    };

    animate();
    isInitializedRef.current = true;

    // Cleanup. renderer.dispose() alone leaves the geometries, the materials
    // and the WebGL context alive, so switching tabs repeatedly leaked one of
    // each per sphere until the tab ran out of contexts.
    return () => {
      cancelAnimationFrame(animationId);
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose?.();
        const material = mesh.material;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material?.dispose?.();
      });
      renderer.forceContextLoss();
      renderer.dispose();
      if (mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
      arrowHelperRef.current = null;
      innerSphereRef.current = null;
      isInitializedRef.current = false;
    };
  }, []); // Only run once on mount

  // Update targets when bloch changes - this triggers the animation
  useEffect(() => {
    if (!isInitializedRef.current) return;
    
    const radius = 0.45;
    const arrowLength = isEntangled ? bloch.purity * radius : radius;
    const newDirection = new THREE.Vector3(bloch.x, bloch.y, bloch.z);
    
    if (newDirection.length() > 0) {
      newDirection.normalize();
    } else {
      newDirection.set(0, 0, 1);
    }
    
    // Update target refs - animation loop will interpolate toward these
    targetDirectionRef.current.copy(newDirection);
    targetLengthRef.current = arrowLength;
    
    // Update inner sphere radius if entangled
    if (innerSphereRef.current && isEntangled) {
      const innerRadius = bloch.purity * radius;
      innerSphereRef.current.scale.setScalar(innerRadius / 0.45); // Scale relative to initial
    }
  }, [bloch, isEntangled]);

  const ariaLabel = `Bloch sphere for qubit ${bloch.q}${isEntangled ? ', entangled' : ', pure'}. Vector: (${bloch.x.toFixed(2)}, ${bloch.y.toFixed(2)}, ${bloch.z.toFixed(2)}), purity ${bloch.purity.toFixed(2)}`;

  return (
    <ErrorBoundary
      fallback={() => (
        <div
          className="relative w-20 h-20 flex items-center justify-center bg-gray-50 border border-gray-200 rounded text-[10px] font-mono text-muted"
          role="img"
          aria-label={ariaLabel}
        >
          Sphere unavailable
        </div>
      )}
    >
      <div
        ref={mountRef}
        className="relative w-20 h-20"
        role="img"
        aria-label={ariaLabel}
      >
        {isEntangled && (
          <div className="absolute -top-2 -right-2 flex items-center gap-1 px-1.5 py-0.5 bg-orange-tint text-accent-text-orange text-label font-medium rounded-full border border-orange/30">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-orange-strong" aria-hidden="true" />
            Entangled
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}