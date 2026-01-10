/**
 * JARVIS TOKEN FIELD - "The Living Network"
 * 
 * A high-performance Canvas 2D engine that creates a "Force Field" effect.
 * Features:
 * 1. Ambient Connection Field: Faint, breathing lines connecting nodes to core.
 * 2. Energy Flows: Pulses of data traveling through the connections.
 * 3. Reactive Particles: Background liquidity that responds to mouse movement.
 * 4. Hover States: Igniting high-energy beams when nodes are interacted with.
 */

(function () {
    'use strict';

    // CONFIGURATION
    const CONFIG = {
        particleCount: 50,
        connectionDistance: 150, // Max distance for particle linking (optional)
        coreColor: '#39FF14',    // Electric Green
        coreGlow: 'rgba(57, 255, 20, 0.4)',
        particleColor: 'rgba(57, 255, 20, 0.3)',
        mouseRadius: 120,        // Radius of mouse influence
        flowSpeed: 2.0           // Speed of data pulses
    };

    // Orbit Configuration (Refined)
    const ORBITS = [
        { radius: 60, speed: 0.003, planetSize: 3, planetColor: '#39FF14', count: 2 },
        { radius: 100, speed: -0.002, planetSize: 2.5, planetColor: '#ffffff', count: 3 },
        { radius: 150, speed: 0.0015, planetSize: 3.5, planetColor: '#39FF14', count: 1 },
        { radius: 210, speed: -0.001, planetSize: 2, planetColor: '#39FF14', count: 4 },
        { radius: 280, speed: 0.0008, planetSize: 4, planetColor: '#ffffff', count: 2 }
    ];

    // Node Rotation Config
    const NODE_CONFIG = {
        radius: 200,             // Distance from center
        rotationSpeed: 0.0005,   // Base speed (radians per frame) ~60s loop
        hoverSpeedMult: 4.0      // Speed multiplier on hover
    };

    let canvas, ctx;
    let container;
    let width, height;
    let particles = [];
    let orbiters = [];
    let animationId;
    let mouse = { x: -9999, y: -9999 };

    // Node System
    let systemAngle = 0;
    let nodesResult = { core: null, peripherals: [] }; // Store positions for canvas
    let domNodes = []; // Store DOM elements

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        container = document.getElementById('tokenVisual');

        // Remove old canvases if any
        const oldCanvas = document.getElementById('tokenEngineCanvas');
        if (oldCanvas) oldCanvas.remove();
        const oldSvg = document.querySelector('.token-flow-svg');
        if (oldSvg) oldSvg.remove();

        if (!container) return;

        // Create New Canvas
        canvas = document.createElement('canvas');
        canvas.className = 'token-field-canvas';
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none'; // Click-through
        canvas.style.zIndex = '0'; // Behind content

        container.insertBefore(canvas, container.firstChild);
        ctx = canvas.getContext('2d');

        // Init Data
        initDomNodes();     // Gather and reset CSS for nodes
        resize();
        createParticles();
        createOrbiters();

        // Listeners
        window.addEventListener('resize', () => {
            resize();
            // No need to re-locate nodes, we calculate them in animate() now
        });

        // Mouse Tracking (Relative to container)
        container.addEventListener('mousemove', (e) => {
            const rect = container.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        });

        container.addEventListener('mouseleave', () => {
            mouse.x = -9999;
            mouse.y = -9999;
        });

        // Node Hover Effects
        setupHoverListeners();

        // Start Loop
        animate();
    }

    // Initialize DOM Nodes: Find them and override CSS to center them
    function initDomNodes() {
        if (!container) return;

        // Core
        const coreEl = container.querySelector('.node-core');

        // Peripherals (Order matters for circular arrangement)
        // We'll distribute them evenly: Stake, APIs, Fund, Rev, Yield
        const selectors = ['.node-stake', '.node-apis', '.node-fund', '.node-rev', '.node-yield'];

        domNodes = selectors.map((sel, index) => {
            const el = container.querySelector(sel);
            if (el) {
                // FORCE OVERRIDE CSS POSITIONS
                // We set them to absolute center, then translate them in the loop
                el.style.top = '50%';
                el.style.left = '50%';
                el.style.right = 'auto'; // Clear 'right' properties
                el.style.bottom = 'auto'; // Clear 'bottom' properties
                el.style.margin = '0';
                el.style.transform = 'translate(-50%, -50%)'; // Center pivot
                el.style.position = 'absolute';
                return { el, index, active: false };
            }
            return null;
        }).filter(n => n !== null);

        // Core position is static (center)
        nodesResult.core = { x: 0, y: 0, el: coreEl };
    }

    function setupHoverListeners() {
        domNodes.forEach(node => {
            node.el.addEventListener('mouseenter', () => { node.active = true; });
            node.el.addEventListener('mouseleave', () => { node.active = false; });
        });
    }

    function resize() {
        width = container.offsetWidth;
        height = container.offsetHeight;

        // Responsive Radius
        const isMobile = width < 768;
        NODE_CONFIG.radius = isMobile ? 170 : 290; // Increased from 120/200 to 170/290 to clear core text

        // Handle High DPI
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
    }

    function createParticles() {
        particles = [];
        for (let i = 0; i < CONFIG.particleCount; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 2 + 0.5,
                alpha: Math.random() * 0.3 + 0.1
            });
        }
    }

    function createOrbiters() {
        orbiters = [];
        ORBITS.forEach(def => {
            // Create multiple planets per orbit based on 'count'
            for (let i = 0; i < (def.count || 1); i++) {
                orbiters.push({
                    ...def,
                    angle: (Math.PI * 2 * i) / (def.count || 1) + Math.random(), // Distributed
                    currentSpeed: def.speed
                });
            }
        });
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);

        const centerX = width / 2;
        const centerY = height / 2;

        // Update Core Position
        if (nodesResult.core) {
            nodesResult.core.x = centerX;
            nodesResult.core.y = centerY;
        }

        // 0. Update & Draw Rotating Nodes
        if (domNodes.length > 0) {
            // Speed up if mouse is present in container
            const isHovering = mouse.x > 0 && mouse.x < width && mouse.y > 0 && mouse.y < height;
            const currentSpeed = isHovering ? NODE_CONFIG.rotationSpeed * NODE_CONFIG.hoverSpeedMult : NODE_CONFIG.rotationSpeed;

            systemAngle += currentSpeed;

            // Calculate Angle Step (Pentagon = 72deg)
            const angleStep = (Math.PI * 2) / domNodes.length;

            domNodes.forEach((node, i) => {
                // Calculate Target Angle: System Rotation + Index Offset
                // -Math.PI/2 to start top (12 o'clock)
                const angle = systemAngle + (i * angleStep) - (Math.PI / 2);

                // Polar to Cartesian
                const px = Math.cos(angle) * NODE_CONFIG.radius;
                const py = Math.sin(angle) * NODE_CONFIG.radius;

                // Move DOM Element (Translate relative to center 50%, 50%)
                // We use translate3d for GPU acceleration
                // -50% -50% is handled by the initial css rule, we just add the offset px
                // Actually, best to set transform directly: translate(calc(-50% + px), calc(-50% + py))
                node.el.style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`;

                // Update Position Data for Canvas Connections
                // We need absolute coordinates inside the canvas
                node.x = centerX + px;
                node.y = centerY + py;
            });
        }

        // 1. Draw Planetary Orbits (Background)
        if (nodesResult.core) {
            drawOrbits(nodesResult.core);
        }

        // 2. Draw Network Connections (Node -> Core)
        if (nodesResult.core) {
            domNodes.forEach((node, i) => {
                drawConnection(node, nodesResult.core, i);
            });
        }

        // 3. Draw Particles
        updateParticles();

        animationId = requestAnimationFrame(animate);
    }

    function drawOrbits(core) {
        // Draw Rings First
        // We group orbiters by radius to avoid drawing the ring multiple times
        const uniqueRadii = [...new Set(orbiters.map(o => o.radius))];

        // Pulse Effect: Global time approx
        const time = Date.now() * 0.002; // Speed of pulse

        uniqueRadii.forEach(radius => {
            // Check Mouse Proximity to Ring
            const dx = mouse.x - core.x;
            const dy = mouse.y - core.y;
            const distToMouse = Math.sqrt(dx * dx + dy * dy);
            const distToRing = Math.abs(distToMouse - radius);

            const isHovered = distToRing < 20; // 20px threshold

            // Sequential Pulse Calculation (Inside Out)
            // Phase shift based on radius
            const pulsePhase = radius * 0.05;
            // Sine wave from 0 to 1
            const pulse = (Math.sin(time - pulsePhase) + 1) / 2;

            ctx.beginPath();
            ctx.arc(core.x, core.y, radius, 0, Math.PI * 2);

            if (isHovered) {
                ctx.strokeStyle = 'rgba(57, 255, 20, 0.5)'; // Brighter green on hover
                ctx.lineWidth = 2; // Thicker on hover
                ctx.shadowBlur = 8;
                ctx.shadowColor = '#39FF14';
            } else {
                // Base State with Pulse
                // Opacity pulses between 0.15 and 0.5 (More visible)
                const alpha = 0.15 + (pulse * 0.35);
                // Line width pulses between 1 and 2.5
                const lineWidth = 1 + (pulse * 1.5);

                ctx.strokeStyle = `rgba(57, 255, 20, ${alpha})`;
                ctx.lineWidth = lineWidth;
                ctx.shadowBlur = pulse * 10; // Stronger glow pulse
                ctx.shadowColor = 'rgba(57, 255, 20, 0.6)';
            }

            ctx.stroke();
            ctx.shadowBlur = 0; // Reset
        });

        // Draw Planets
        orbiters.forEach(orbiter => {
            // Update Angle
            orbiter.angle += orbiter.speed;

            const px = core.x + Math.cos(orbiter.angle) * orbiter.radius;
            const py = core.y + Math.sin(orbiter.angle) * orbiter.radius;

            ctx.beginPath();
            ctx.arc(px, py, orbiter.planetSize, 0, Math.PI * 2);
            ctx.fillStyle = orbiter.planetColor;

            // Glow
            ctx.shadowBlur = 10;
            ctx.shadowColor = orbiter.planetColor;
            ctx.globalAlpha = 0.9;
            ctx.fill();

            // Reset
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        });
    }

    function drawConnection(node, core, index) {
        const dx = core.x - node.x;
        const dy = core.y - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Dynamic Bezier Curve
        // We create a control point that shifts slightly for "organic" feel
        const midX = (node.x + core.x) / 2;
        const midY = (node.y + core.y) / 2;

        // Offset varies by time
        const time = Date.now() / 1000;
        const offsetX = Math.sin(time + index) * 10;
        const offsetY = Math.cos(time + index) * 10;

        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.quadraticCurveTo(midX + offsetX, midY + offsetY, core.x, core.y);

        // Style based on State
        if (node.active) {
            // High Energy Beam
            ctx.strokeStyle = '#39FF14';
            ctx.lineWidth = 1.5;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#39FF14';
            ctx.globalAlpha = 0.8;
            ctx.stroke();

            // Projectile pulse
            const pulsePos = (Date.now() % 1000) / 1000; // 0 to 1
            // Simple interpolation for pulse dot
            // (Ideally, we'd follow the curve, but linear Lerp is fast and mostly looks ok for subtle curves)
            // For true curve following we'd calculate point on bezier.
            // Let's stick to the stroke for now to keep it performant
        } else {
            // Ambient Connection
            const grad = ctx.createLinearGradient(node.x, node.y, core.x, core.y);
            grad.addColorStop(0, 'rgba(57, 255, 20, 0.05)');
            grad.addColorStop(0.5, 'rgba(57, 255, 20, 0.2)');
            grad.addColorStop(1, 'rgba(57, 255, 20, 0.05)');

            ctx.strokeStyle = grad;
            ctx.lineWidth = 0.5;
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
            ctx.stroke();
        }

        // Draw little flows (Dashes)
        // Only if ambient or active. 
        if (!node.active) {
            ctx.setLineDash([2, 50]);
            ctx.lineDashOffset = -Date.now() / 40; // Flow speed
            ctx.stroke();
            ctx.setLineDash([]); // Reset
        }
    }

    function updateParticles() {
        particles.forEach(p => {
            // Move
            p.x += p.vx;
            p.y += p.vy;

            // Boundary Wrap
            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;
            if (p.y < 0) p.y = height;
            if (p.y > height) p.y = 0;

            // Mouse Repulsion
            const dx = p.x - mouse.x;
            const dy = p.y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < CONFIG.mouseRadius) {
                const angle = Math.atan2(dy, dx);
                const force = (CONFIG.mouseRadius - dist) / CONFIG.mouseRadius;
                p.vx += Math.cos(angle) * force * 0.2;
                p.vy += Math.sin(angle) * force * 0.2;
            }

            // Damping check to keep them slow
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (speed > 1) {
                p.vx *= 0.9;
                p.vy *= 0.9;
            }

            // Draw
            ctx.fillStyle = CONFIG.particleColor;
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
    }

})();
