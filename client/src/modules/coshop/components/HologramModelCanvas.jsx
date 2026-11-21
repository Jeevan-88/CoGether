import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

/**
 * HologramModelCanvas
 * Real-time 3D Hologram WebGL Renderer for CoShop.
 * Renders static 3D GLB models with animated holographic scanlines,
 * emerald-cyan rim glow, floating hover animation, and interactive mouse tilt.
 */
export default function HologramModelCanvas({
  modelUrl = '/coshop/models/shirt.glb',
  className = '',
  style = {},
  interactive = true,
  enableRays = true
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
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0, 2.2);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 2, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const cyanKeyLight = new THREE.DirectionalLight(0x00ffc8, 3.5);
    cyanKeyLight.position.set(2, 3, 3);
    scene.add(cyanKeyLight);

    const mintRimLight = new THREE.DirectionalLight(0x00ffa3, 4.0);
    mintRimLight.position.set(-3, -1, -2);
    scene.add(mintRimLight);

    const topProjectorLight = new THREE.PointLight(0x00e5ff, 4.5, 10);
    topProjectorLight.position.set(0, 1.5, 0.5);
    scene.add(topProjectorLight);

    const shirtGroup = new THREE.Group();
    scene.add(shirtGroup);

    // Laser Matrix Hologram Rays behind shirt
    let rayMat = null;
    if (enableRays) {
      const rayCount = 42;
      const rayGeo = new THREE.BufferGeometry();
      const rayPositions = [];
      const rayColors = [];
      const origin = new THREE.Vector3(0, 0.25, -0.05);

      for (let i = 0; i < rayCount; i++) {
        const angle = (i / rayCount) * Math.PI * 1.8 - Math.PI * 0.9;
        const spreadY = (Math.random() - 0.2) * 0.8;
        const dist = 1.1 + Math.random() * 0.6;
        const target = new THREE.Vector3(
          Math.sin(angle) * dist,
          origin.y + spreadY,
          Math.cos(angle) * 0.3 - 0.2
        );

        rayPositions.push(origin.x, origin.y, origin.z);
        rayPositions.push(target.x, target.y, target.z);

        rayColors.push(0.9, 1.0, 1.0);
        rayColors.push(0.0, 0.95, 0.75);
      }

      rayGeo.setAttribute('position', new THREE.Float32BufferAttribute(rayPositions, 3));
      rayGeo.setAttribute('color', new THREE.Float32BufferAttribute(rayColors, 3));

      rayMat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        linewidth: 1.5
      });
      const rayLines = new THREE.LineSegments(rayGeo, rayMat);
      shirtGroup.add(rayLines);
    }

    // Load GLB with MeshoptDecoder
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);

    loader.load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene;

        // Auto-center and fit
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 1.1 / maxDim;

        model.position.sub(center);
        model.scale.setScalar(scale);
        model.rotation.y = -Math.PI / 2; // Face front facing camera

        // Hologram Shader Material
        model.traverse((child) => {
          if (child.isMesh) {
            const origMat = child.material;
            const holoMat = new THREE.MeshStandardMaterial({
              map: origMat?.map || null,
              roughness: 0.3,
              metalness: 0.1,
              emissive: new THREE.Color(0x00ffb4),
              emissiveIntensity: 0.35,
              transparent: true,
              opacity: 0.96
            });

            holoMat.onBeforeCompile = (shader) => {
              shader.uniforms.time = { value: 0 };
              holoMat.userData.shader = shader;

              shader.fragmentShader = `
                uniform float time;
                ${shader.fragmentShader}
              `;

              shader.fragmentShader = shader.fragmentShader.replace(
                '#include <dithering_fragment>',
                `
                #include <dithering_fragment>

                // Animated Hologram Scanlines
                float scan = sin(gl_FragCoord.y * 0.4 - time * 5.0) * 0.5 + 0.5;
                scan = pow(scan, 3.0) * 0.45;

                // Subtle horizontal digital glitch slices
                float glitch = step(0.97, sin(time * 12.0 + gl_FragCoord.y * 0.05));
                
                // Holographic Rim Glow (Cyan / Emerald)
                vec3 holoColor = vec3(0.0, 1.0, 0.72);
                gl_FragColor.rgb += holoColor * (scan + glitch * 0.3);
                gl_FragColor.rgb += vec3(0.0, 0.4, 0.35) * (1.0 - gl_FragCoord.z);
                `
              );
            };

            child.material = holoMat;
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
    const clock = new THREE.Clock();
    let isDisposed = false;

    const animate = () => {
      if (isDisposed) return;
      animFrameRef.current = requestAnimationFrame(animate);

      const t = clock.getElapsedTime();

      // Smooth mouse interpolation
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.08;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.08;

      // Floating hover motion
      shirtGroup.position.y = Math.sin(t * 1.8) * 0.04;

      // Smooth tumbling yaw rotation with interactive tilt
      shirtGroup.rotation.y = Math.sin(t * 0.9) * 0.22 + mouseRef.current.x * 0.35;
      shirtGroup.rotation.x = 0.08 + Math.sin(t * 1.4) * 0.03 - mouseRef.current.y * 0.2;
      shirtGroup.rotation.z = Math.cos(t * 1.1) * 0.03;

      if (rayMat) {
        rayMat.opacity = 0.45 + Math.sin(t * 4.0) * 0.15;
      }

      // Update shader uniforms
      shirtGroup.traverse((child) => {
        if (child.isMesh && child.material?.userData?.shader) {
          child.material.userData.shader.uniforms.time.value = t;
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

      // Dispose Three.js scene
      shirtGroup.traverse((child) => {
        if (child.isMesh) {
          child.geometry?.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
            else child.material.dispose();
          }
        }
      });
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [modelUrl, interactive, enableRays]);

  return (
    <div
      ref={containerRef}
      className={`hologram-model-canvas-container ${className}`}
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
