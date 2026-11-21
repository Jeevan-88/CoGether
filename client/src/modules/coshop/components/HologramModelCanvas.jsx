import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

/**
 * HologramModelCanvas
 * Real-time 3D Hologram WebGL Renderer for CoShop.
 * Matches Tripo 3D's exact hologram preview quality:
 * - Opaque PBR fabric textures with high-definition normal maps and contrast (dark navy sleeves, gold stripes, dark AURA / 08).
 * - Electric cyan Fresnel contour aura (#00f5c4 / #00ffff) along the outer silhouette.
 * - Subtle high-tech holographic wave shimmer hugging grazing edges.
 * - Gentle floating hover animation and interactive mouse tilt parallax.
 */
export default function HologramModelCanvas({
  modelUrl = '/coshop/models/shirt.glb',
  className = '',
  style = {},
  interactive = true
}) {
  const containerRef = useRef(null);
  const animFrameRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 300;
    const height = container.clientHeight || 300;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(0, 0, 2.25);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 2, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // Balanced PBR Studio Lighting preserving rich navy, gold, and white fabric
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.75);
    keyLight.position.set(1.5, 3.0, 2.5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xeef4fc, 0.35);
    fillLight.position.set(-2.0, 1.0, 2.0);
    scene.add(fillLight);

    const backRim = new THREE.DirectionalLight(0xffffff, 0.5);
    backRim.position.set(0, 2.0, -2.5);
    scene.add(backRim);

    const shirtGroup = new THREE.Group();
    scene.add(shirtGroup);

    // Load GLB with MeshoptDecoder
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);

    loader.load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene;

        // Auto-center and fit to unit bounds
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 1.05 / maxDim;

        model.position.sub(center);
        model.scale.setScalar(scale);

        // Tripo 3D exact hero pose: 3/4 isometric perspective
        model.rotation.y = -Math.PI / 2 - 0.32;
        model.rotation.x = 0.08;
        model.rotation.z = -0.02;

        // Exact Tripo 3D Hologram Shader Injection
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            const mat = child.material;
            if (mat) {
              if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
              if (mat.emissiveMap) mat.emissiveMap.colorSpace = THREE.SRGBColorSpace;

              mat.roughness = 0.65;
              mat.metalness = 0.08;
              mat.emissive = new THREE.Color(0x000000);
              mat.emissiveIntensity = 0.0;

              mat.onBeforeCompile = (shader) => {
                shader.uniforms.time = { value: 0 };
                mat.userData.shader = shader;

                shader.fragmentShader = `
                  uniform float time;
                  ${shader.fragmentShader}
                `;

                shader.fragmentShader = shader.fragmentShader.replace(
                  '#include <dithering_fragment>',
                  `
                  #include <dithering_fragment>

                  // View direction & normal in view space
                  vec3 V = normalize(-vViewPosition);
                  vec3 N = normalize(vNormal);
                  float NdotV = abs(dot(N, V)); // Absolute dot for true silhouette edge detection
                  
                  // Tripo 3D Fresnel Edge Falloff: sharp contour glow along outer silhouette
                  float fresnel = 1.0 - NdotV;
                  float rim = pow(fresnel, 3.2) * 3.8;

                  // High-tech subtle holographic scanlines hugging grazing edges
                  float scan = smoothstep(0.85, 1.0, sin(gl_FragCoord.y * 0.35 - time * 2.5)) * 0.15 * pow(fresnel, 1.5);

                  // Tripo 3D signature electric cyan (#00f5c4 / #00ffff)
                  vec3 tripoCyan = vec3(0.0, 0.98, 0.88);
                  gl_FragColor.rgb += tripoCyan * (rim + scan);
                  `
                );
              };
            }
          }
        });

        shirtGroup.add(model);
      },
      undefined,
      (err) => console.error('Failed to load 3D hologram model:', err)
    );

    // Mouse Move Parallax Handler
    const handleMouseMove = (e) => {
      if (!interactive) return;
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      mouseRef.current.targetX = x;
      mouseRef.current.targetY = y;
    };

    const handleMouseLeave = () => {
      mouseRef.current.targetX = 0;
      mouseRef.current.targetY = 0;
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    // Animation loop
    let lastTime = performance.now();
    let totalTime = 0;
    let isDisposed = false;

    const animate = () => {
      if (isDisposed) return;
      animFrameRef.current = requestAnimationFrame(animate);

      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      totalTime += dt;

      // Smooth mouse interpolation
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.08;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.08;

      // Floating hover motion
      shirtGroup.position.y = Math.sin(totalTime * 1.5) * 0.022;

      // Gentle tumbling yaw rotation with interactive tilt
      shirtGroup.rotation.y = Math.sin(totalTime * 0.8) * 0.06 + mouseRef.current.x * 0.28;
      shirtGroup.rotation.x = 0.08 + Math.sin(totalTime * 1.2) * 0.02 - mouseRef.current.y * 0.18;
      shirtGroup.rotation.z = Math.cos(totalTime * 1.0) * 0.02;

      // Update shader uniforms
      shirtGroup.traverse((child) => {
        if (child.isMesh && child.material?.userData?.shader) {
          child.material.userData.shader.uniforms.time.value = totalTime;
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    // Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container || isDisposed) return;
      const w = container.clientWidth || 300;
      const h = container.clientHeight || 300;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    return () => {
      isDisposed = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);

      // Dispose Three.js resources
      shirtGroup.traverse((child) => {
        if (child.isMesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m?.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });
      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [modelUrl, interactive]);

  return (
    <div
      ref={containerRef}
      className={`coshop-hologram-canvas-container ${className}`}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        pointerEvents: interactive ? 'auto' : 'none',
        ...style
      }}
    />
  );
}
