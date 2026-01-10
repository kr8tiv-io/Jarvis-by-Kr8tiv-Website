/**
 * TOKEN ECONOMY ENGINE (WebGL/Three.js)
 * 
 * A premium, minimalist generative system representing a living economic engine.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Safety check for container
    if (!document.getElementById('token-webgl-container')) return;

    // Check availability of Three.js
    if (typeof THREE === 'undefined') {
        console.warn('Three.js not loaded. Falling back to CSS.');
        document.body.classList.add('no-webgl');
        return;
    }

    // Delay init slightly to ensure container is ready
    setTimeout(initTokenEngineGL, 100);
});

function initTokenEngineGL() {
    const container = document.getElementById('token-webgl-container');
    const canvas = document.getElementById('token-webgl-canvas');
    if (!container || !canvas) return;

    // SCENE SETUP
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xffffff, 0.002);

    // CAMERA
    const fov = 45;
    const aspect = container.clientWidth / container.clientHeight;
    const near = 0.1;
    const far = 1000;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(0, 0, 18);

    // RENDERER (Robust Init)
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            alpha: true,
            antialias: true // Try antialias, logic can fallback if crash but here simplified
        });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    } catch (e) {
        console.error("WebGL Init Failed:", e);
        document.body.classList.add('no-webgl');
        return;
    }

    // LIGHTING
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0xeefeff, 0.8);
    rimLight.position.set(-5, 2, -5);
    scene.add(rimLight);

    const accentLight = new THREE.PointLight(0x39FF14, 1.5, 30);
    accentLight.position.set(0, 0, 0);
    scene.add(accentLight);

    // --- OBJECTS ---

    // 1. THE CORE: "Jarvis Fund"
    // Glassy Icosahedron
    const coreGeo = new THREE.IcosahedronGeometry(2.4, 2);
    const coreMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.1,
        metalness: 0.1,
        transmission: 0.5,
        thickness: 1.5,
        transparent: true,
        opacity: 0.95,
        clearcoat: 1.0,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    scene.add(core);

    // Inner Green Glow
    const innerGeo = new THREE.IcosahedronGeometry(1.5, 1);
    const innerMat = new THREE.MeshBasicMaterial({
        color: 0x39FF14,
        transparent: true,
        opacity: 0.4,
        wireframe: true
    });
    const innerCore = new THREE.Mesh(innerGeo, innerMat);
    core.add(innerCore);


    // 2. ORBIT RINGS (Structure)
    const orbitsGroup = new THREE.Group();
    scene.add(orbitsGroup);

    const orbitData = [
        { radius: 4.5, speed: 0.002, tilt: 0.2 },
        { radius: 6.0, speed: -0.0015, tilt: -0.1 },
        { radius: 7.5, speed: 0.001, tilt: 0.3 },
    ];

    const rings = [];
    orbitData.forEach(d => {
        const curve = new THREE.EllipseCurve(0, 0, d.radius, d.radius, 0, 2 * Math.PI, false, 0);
        const points = curve.getPoints(100);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0xbbbbbb, transparent: true, opacity: 0.15 });
        const ring = new THREE.Line(geometry, material);
        ring.rotation.x = Math.PI / 2 + d.tilt;
        rings.push({ mesh: ring, speed: d.speed });
        orbitsGroup.add(ring);
    });

    // 3. VALUE FLOW PARTICLES
    // Representing Revenue -> Fund -> Yield
    const pCount = 200;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);

    // We want flow: Outer -> Inner (Revenue), Inner -> Outer (Yield)
    // For now, chaotic orbit is visually enough for "Alive"
    for (let i = 0; i < pCount; i++) {
        const r = 3 + Math.random() * 6;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        pPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pPos[i * 3 + 2] = r * Math.cos(phi);
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
        color: 0x39FF14,
        size: 0.06,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // ANIMATION
    let time = 0;
    let targetRotation = { x: 0, y: 0 };
    let mouse = { x: 0, y: 0 };

    container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    });

    container.addEventListener('mouseleave', () => { mouse.x = 0; mouse.y = 0; });

    // Scroll Observer for opacity
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                canvas.style.opacity = 1;
            }
        });
    }, { threshold: 0.1 });
    observer.observe(container);

    function animate() {
        requestAnimationFrame(animate);
        time += 0.01;

        // Mouse Parallax
        targetRotation.x = THREE.MathUtils.lerp(targetRotation.x, mouse.y * 0.3, 0.05);
        targetRotation.y = THREE.MathUtils.lerp(targetRotation.y, mouse.x * 0.3, 0.05);
        orbitsGroup.rotation.x = targetRotation.x * 0.2;
        orbitsGroup.rotation.y = targetRotation.y * 0.2;

        // Core Pulse
        const pulse = 1 + Math.sin(time * 2) * 0.03;
        core.scale.set(pulse, pulse, pulse);
        core.rotation.y += 0.003;
        innerCore.rotation.z -= 0.01;

        // Rings
        rings.forEach(ring => { ring.mesh.rotation.z += ring.speed; });

        // Particles
        particles.rotation.y += 0.002;

        renderer.render(scene, camera);
    }

    // Resize
    window.addEventListener('resize', () => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    });

    animate();
}
