
import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';
import { EffectComposer } from 'https://unpkg.com/three@0.128.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://unpkg.com/three@0.128.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://unpkg.com/three@0.128.0/examples/jsm/postprocessing/UnrealBloomPass.js';

window.initUniverse3D = function () {
    console.log("Initializing Universe 3D Scene...");
    const canvas = document.getElementById('universeCanvas');
    const container = document.getElementById('universeVisual');

    if (!canvas || !container) {
        console.warn('Universe 3D: Canvas or container not found.');
        return;
    }

    // --- CONFIGURATION ---
    const ASSET_COUNT = 9;
    const isMobile = window.innerWidth < 800;
    const RADIUS = isMobile ? 4.5 : 7.0;
    const PARTICLE_COUNT = isMobile ? 300 : 800;

    let width = container.clientWidth;
    let height = container.clientHeight;

    // --- SCENE SETUP ---
    const scene = new THREE.Scene();
    // Soft white fog to blend with site background (#FFF)
    scene.fog = new THREE.FogExp2(0xFFFFFF, isMobile ? 0.05 : 0.03);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    // Move camera back to fit the ring
    camera.position.set(0, 0, isMobile ? 22 : 19);

    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: false, // Tone mapping and Post-proc handles smoothing
        powerPreference: "high-performance"
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    // --- LIGHTING ---
    // Ambient for base visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    // Green Accent (Jarvis Core)
    const pointLight = new THREE.PointLight(0x39FF14, 2, 30);
    pointLight.position.set(0, 5, 5);
    scene.add(pointLight);

    // Rim lights for "Gloss"
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(10, 10, 10);
    scene.add(dirLight);

    // --- MATERIAL (Premium Glass/Plastic) ---
    // We use a shared loader to prevent memory spikes
    const textureLoader = new THREE.TextureLoader();
    const planeGeo = new THREE.PlaneGeometry(1.6, 2.2); // Card aspect ratio

    // Object Group
    const ringGroup = new THREE.Group();
    scene.add(ringGroup);

    // Initial check for assets (we assume 1.png -> 9.png exist in root)
    // Create the Ring
    for (let i = 1; i <= ASSET_COUNT; i++) {
        // Calculate position on circle
        const angle = (i / ASSET_COUNT) * Math.PI * 2;
        const x = Math.cos(angle) * RADIUS;
        const z = Math.sin(angle) * RADIUS;

        const tex = textureLoader.load(`${i}.png`);

        // Premium Material
        // MeshPhysicalMaterial gives us clearcoat for that "Apple" gloss
        const mat = new THREE.MeshPhysicalMaterial({
            map: tex,
            color: 0xffffff,
            transparent: true,
            side: THREE.DoubleSide,
            transmission: 0, // No glass refraction to avoid artifacts with transparency
            roughness: 0.3,
            metalness: 0.1,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1
        });

        const mesh = new THREE.Mesh(planeGeo, mat);

        // Position
        mesh.position.set(x, 0, z);

        // Orientation: Face OUTWARD from center?
        // Let's face them towards the camera initially if at front?
        // Standard "Carousel" facing: lookAt(0,0,0) then rotateY(PI)
        mesh.lookAt(0, 0, 0);
        mesh.rotation.y += Math.PI;

        ringGroup.add(mesh);
    }

    // --- ENVIRONMENT PARTICLES (The "Universe") ---
    const particlesGeo = new THREE.BufferGeometry();
    const posArray = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT * 3; i += 3) {
        // Spread widely
        posArray[i] = (Math.random() - 0.5) * 40;     // x
        posArray[i + 1] = (Math.random() - 0.5) * 20;   // y
        posArray[i + 2] = (Math.random() - 0.5) * 40;   // z
    }

    particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    // Minimal dark dots
    const particlesMat = new THREE.PointsMaterial({
        size: 0.04,
        color: 0x111111, // Dark grey on white background
        transparent: true,
        opacity: 0.4
    });

    const particleSystem = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particleSystem);

    // --- POST PROCESSING (BLOOM) ---
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    if (!isMobile) {
        // Only Bloom on Desktop for performance
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 1.5, 0.4, 0.85);
        bloomPass.threshold = 0.2; // Only bright things bloom
        bloomPass.strength = 0.25; // Subtle
        bloomPass.radius = 0.5;
        composer.addPass(bloomPass);
    }

    // --- ANIMATION STATE ---
    const clock = new THREE.Clock();
    let mouseX = 0;
    let mouseY = 0;

    // Default Tilt
    ringGroup.rotation.x = 0.15;
    ringGroup.rotation.z = -0.05;

    // Mouse Listener
    container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        // Normalize -1 to 1
        mouseX = ((e.clientX - rect.left) / width) * 2 - 1;
        mouseY = -((e.clientY - rect.top) / height) * 2 + 1;
    });

    // --- SCROLL ANIMATION (GSAP) ---
    // We bind GSAP to the Scene Rotation
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        // 1. Rotate the Ring
        gsap.to(ringGroup.rotation, {
            y: Math.PI * 0.7, // Rotate ~120 degrees over the section
            ease: "none",
            scrollTrigger: {
                trigger: "#sectionUniverse",
                start: "top bottom",
                end: "bottom top",
                scrub: 1.5 // Smooth inertia
            }
        });

        // 2. Parallax the Particles (Slower)
        gsap.to(particleSystem.rotation, {
            y: Math.PI * 0.2,
            ease: "none",
            scrollTrigger: {
                trigger: "#sectionUniverse",
                start: "top bottom",
                end: "bottom top",
                scrub: 2
            }
        });

        // 3. Simple Entrance Scale
        gsap.from(ringGroup.scale, {
            x: 0.8, y: 0.8, z: 0.8,
            duration: 1.5,
            ease: "power3.out",
            scrollTrigger: {
                trigger: "#sectionUniverse",
                start: "top 60%"
            }
        });
    }

    // --- RENDER LOOP ---
    function animate() {
        requestAnimationFrame(animate);

        const time = clock.getElapsedTime();

        // Idle movement
        ringGroup.position.y = Math.sin(time * 0.4) * 0.3; // Floating
        particleSystem.rotation.x = Math.sin(time * 0.05) * 0.05;

        // Mouse Parallax Logic (Damped)
        // Move camera slightly based on mouse
        if (!isMobile) {
            camera.position.x += (mouseX * 0.5 - camera.position.x) * 0.05;
            camera.position.y += (mouseY * 0.5 - camera.position.y) * 0.05;
            camera.lookAt(0, 0, 0);
        }

        composer.render();
    }

    animate();

    // --- RESIZE HANDLER ---
    window.addEventListener('resize', () => {
        width = container.clientWidth;
        height = container.clientHeight;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        renderer.setSize(width, height);
        composer.setSize(width, height);
    });
};

// Auto-Init
if (document.readyState === 'complete') {
    window.initUniverse3D();
} else {
    window.addEventListener('load', () => window.initUniverse3D());
}
