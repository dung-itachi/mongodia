"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const TEXTURES = {
  earth: "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg",
  normal: "https://threejs.org/examples/textures/planets/earth_normal_2048.jpg",
  specular: "https://threejs.org/examples/textures/planets/earth_specular_2048.jpg",
  clouds: "https://threejs.org/examples/textures/planets/earth_clouds_1024.png",
  lights: "https://threejs.org/examples/textures/planets/earth_lights_2048.png",
};

export default function EarthBackground() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let width = mount.clientWidth;
    let height = mount.clientHeight;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.01, 2000);
    camera.position.set(-0.15, 0.05, 3.25);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.5));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.025;
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.minDistance = 1.45;
    controls.maxDistance = 7;
    controls.zoomSpeed = 0.7;
    controls.rotateSpeed = 0.45;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.08;

    const ambient = new THREE.AmbientLight(0x17304c, 0.12);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 4.2);
    sun.position.set(5, 2, 4);
    scene.add(sun);

    const earthGroup = new THREE.Group();
    earthGroup.position.set(0.55, 0, 0);
    earthGroup.rotation.z = THREE.MathUtils.degToRad(-23.5);
    scene.add(earthGroup);

    const loader = new THREE.TextureLoader();
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    const loadTexture = (url: string) => {
      const texture = loader.load(url);
      texture.anisotropy = maxAnisotropy;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      return texture;
    };

    const earthMap = loadTexture(TEXTURES.earth);
    const normalMap = loadTexture(TEXTURES.normal);
    const specularMap = loadTexture(TEXTURES.specular);
    const cloudMap = loadTexture(TEXTURES.clouds);
    const lightsMap = loadTexture(TEXTURES.lights);

    earthMap.colorSpace = THREE.SRGBColorSpace;
    cloudMap.colorSpace = THREE.SRGBColorSpace;
    lightsMap.colorSpace = THREE.SRGBColorSpace;

    const earthGeometry = new THREE.SphereGeometry(1, 256, 256);
    const earthMaterial = new THREE.MeshPhongMaterial({
      map: earthMap,
      normalMap,
      normalScale: new THREE.Vector2(1.25, 1.25),
      specularMap,
      specular: new THREE.Color(0x394d62),
      shininess: 20,
    });
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    earthGroup.add(earth);

    const cloudGeometry = new THREE.SphereGeometry(1.012, 256, 256);
    const cloudMaterial = new THREE.MeshPhongMaterial({
      map: cloudMap,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      side: THREE.FrontSide,
    });
    const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
    earthGroup.add(clouds);

    const cityGeometry = new THREE.SphereGeometry(1.004, 256, 256);
    const cityMaterial = new THREE.MeshBasicMaterial({
      map: lightsMap,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const cityLights = new THREE.Mesh(cityGeometry, cityMaterial);
    earthGroup.add(cityLights);

    const atmosphereGeometry = new THREE.SphereGeometry(1.07, 192, 192);
    const atmosphereMaterial = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        glowColor: { value: new THREE.Color(0x258dff) },
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.5);
          gl_FragColor = vec4(glowColor, intensity * 0.9);
        }
      `,
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    earthGroup.add(atmosphere);

    const outerAtmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.12, 128, 128),
      new THREE.MeshBasicMaterial({
        color: 0x168cff,
        transparent: true,
        opacity: 0.045,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
      })
    );
    earthGroup.add(outerAtmosphere);

    const STAR_COUNT = 16000;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      const radius = 30 + Math.random() * 130;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.cos(phi);
      starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));

    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.025,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    const star2 = new THREE.Points(
      starGeometry.clone(),
      new THREE.PointsMaterial({
        color: 0x79a9ff,
        size: 0.012,
        transparent: true,
        opacity: 0.45,
      })
    );
    scene.add(star2);

    let mouseX = 0;
    let mouseY = 0;
    const onMouseMove = (event: MouseEvent) => {
      mouseX = (event.clientX / window.innerWidth) * 2 - 1;
      mouseY = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("mousemove", onMouseMove);

    const clock = new THREE.Clock();

    let frameId = 0;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();
      earth.rotation.y += 0.00065;
      clouds.rotation.y += 0.001;
      cityLights.rotation.y = earth.rotation.y;
      stars.rotation.y += 0.000008;
      star2.rotation.y -= 0.000005;
      earthGroup.rotation.x += (-mouseY * 0.025 - earthGroup.rotation.x) * 0.002;
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      width = mount.clientWidth;
      height = mount.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", handleResize);
      controls.dispose();
      renderer.dispose();
      earthGeometry.dispose();
      earthMaterial.dispose();
      cloudGeometry.dispose();
      cloudMaterial.dispose();
      cityGeometry.dispose();
      cityMaterial.dispose();
      atmosphereGeometry.dispose();
      atmosphereMaterial.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="earth-bg" aria-hidden="true" />;
}
