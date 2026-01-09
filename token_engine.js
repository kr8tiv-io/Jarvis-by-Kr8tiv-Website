
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initTokenEngine, 500);
});

function initTokenEngine() {
    const canvas = document.getElementById('tokenEngineCanvas');
    if (!canvas) return;

    const container = document.getElementById('tokenVisual');
    const ctx = canvas.getContext('2d');

    // Nodes
    const domNodes = {
        stake: document.querySelectorAll('.node-stake')[0],
        apis: document.querySelectorAll('.node-apis')[0],
        fund: document.querySelectorAll('.node-fund')[0],
        rev: document.querySelectorAll('.node-rev')[0],
        yield: document.querySelectorAll('.node-yield')[0]
    };

    const coreLabel = document.querySelector('.node-core');

    let width, height;
    let particlePool = [];
    let starPool = [];
    const particleCount = 40;
    const starCount = 30; // Green stars

    // Mouse State
    let mouse = { x: 0, y: 0 };
    let smoothMouse = { x: 0, y: 0 };

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    function resize() {
        width = container.offsetWidth;
        height = container.offsetHeight;
        canvas.width = width * 1.5;
        canvas.height = height * 1.5;
    }
    window.addEventListener('resize', resize);
    resize();

    container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / width) * 2 - 1;
        mouse.y = ((e.clientY - rect.top) / height) * 2 - 1;
    });

    container.addEventListener('mouseleave', () => {
        mouse.x = 0; mouse.y = 0;
    });

    const lerp = (start, end, amt) => (1 - amt) * start + amt * end;
    const getCenter = () => ({ x: canvas.width / 2, y: canvas.height / 2 });

    function getNodePos(key) {
        const el = domNodes[key];
        if (!el) return { x: 0, y: 0 };
        const rect = el.getBoundingClientRect();
        const contRect = container.getBoundingClientRect();
        const canvasLeft = (width - canvas.width) / 2;
        const canvasTop = (height - canvas.height) / 2;

        return {
            x: (rect.left - contRect.left + (rect.width / 2)) - canvasLeft,
            y: (rect.top - contRect.top + (rect.height / 2)) - canvasTop
        };
    }

    // --- Particle (Value Flow) ---
    class Particle {
        constructor() {
            this.reset();
            this.progress = Math.random();
        }
        reset() {
            this.progress = 0;
            this.speed = 0.003 + Math.random() * 0.004;
            this.pathType = Math.floor(Math.random() * 5);
            this.size = 1.0 + Math.random() * 1.5;
            this.alpha = 0.1 + Math.random() * 0.6;
        }
        update() {
            this.progress += this.speed;
            if (this.progress >= 1) this.reset();
        }
        draw(ctx, cx, cy) {
            const pStake = getNodePos('stake');
            const pAPIs = domNodes['apis'] ? getNodePos('apis') : { x: cx, y: cy };
            const pFund = domNodes['fund'] ? getNodePos('fund') : { x: cx, y: cy };
            const pRev = domNodes['rev'] ? getNodePos('rev') : { x: cx, y: cy };
            const pYield = domNodes['yield'] ? getNodePos('yield') : { x: cx, y: cy };

            let start, end, cp1, cp2;
            if (this.pathType === 0) { // Stake -> Core
                start = pStake; end = { x: cx, y: cy };
                cp1 = { x: start.x, y: start.y + 80 }; cp2 = { x: end.x, y: end.y - 80 };
            } else if (this.pathType === 1) { // Core -> APIs
                start = { x: cx, y: cy }; end = pAPIs;
                cp1 = { x: start.x + 80, y: start.y }; cp2 = { x: end.x - 80, y: end.y };
            } else if (this.pathType === 2) { // APIs -> Rev
                start = pAPIs; end = pRev;
                cp1 = { x: start.x, y: start.y + 150 }; cp2 = { x: end.x + 100, y: end.y - 50 };
            } else if (this.pathType === 3) { // Rev -> Fund
                start = pRev; end = pFund;
                cp1 = { x: start.x + 50, y: start.y }; cp2 = { x: end.x - 50, y: end.y };
            } else { // Rev -> Yield
                start = pRev; end = pYield;
                cp1 = { x: start.x - 80, y: start.y - 80 }; cp2 = { x: end.x + 80, y: end.y + 80 };
            }

            const pos = getBezierPoint(this.progress, start, cp1, cp2, end);
            ctx.fillStyle = `rgba(57, 255, 20, ${this.alpha})`;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // --- Star (Ring Effect) ---
    class Star {
        constructor() {
            this.reset();
            this.angle = Math.random() * Math.PI * 2; // Start random
        }
        reset() {
            // Start near top
            this.angle = -Math.PI / 2 - (Math.random() * 0.5);
            this.speed = 0.005 + Math.random() * 0.01;
            this.radius = 150 + (Math.random() * 20 - 10); // Around the ring radius (150)
            this.size = 1 + Math.random() * 2;
            this.alpha = 0.5 + Math.random() * 0.5;
        }
        update() {
            this.angle += this.speed;
            // Travel down? Loop around.
            if (this.angle > Math.PI * 1.5) { this.reset(); }
        }
        draw(ctx, cx, cy) {
            const x = cx + Math.cos(this.angle) * this.radius;
            const y = cy + Math.sin(this.angle) * this.radius;

            ctx.fillStyle = `rgba(57, 255, 20, ${this.alpha})`;
            // Draw cross/star
            const s = this.size;
            ctx.fillRect(x - s, y - 0.5, s * 2, 1);
            ctx.fillRect(x - 0.5, y - s, 1, s * 2);
        }
    }

    function getBezierPoint(t, p0, p1, p2, p3) {
        const cx = 3 * (p1.x - p0.x), bx = 3 * (p2.x - p1.x) - cx, ax = p3.x - p0.x - cx - bx;
        const cy = 3 * (p1.y - p0.y), by = 3 * (p2.y - p1.y) - cy, ay = p3.y - p0.y - cy - by;
        const t2 = t * t, t3 = t2 * t;
        return { x: (ax * t3) + (bx * t2) + (cx * t) + p0.x, y: (ay * t3) + (by * t2) + (cy * t) + p0.y };
    }

    // Init Pools
    for (let i = 0; i < particleCount; i++) particlePool.push(new Particle());
    for (let i = 0; i < starCount; i++) starPool.push(new Star());

    let running = false;
    let time = 0;

    function animate() {
        if (!running) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        time += 0.02;

        smoothMouse.x = lerp(smoothMouse.x, mouse.x, 0.05);
        smoothMouse.y = lerp(smoothMouse.y, mouse.y, 0.05);

        const center = getCenter();
        const cx = center.x + (smoothMouse.x * 20);
        const cy = center.y + (smoothMouse.y * 20);

        if (coreLabel) {
            coreLabel.style.transform = `translate(calc(-50% + ${smoothMouse.x * 10}px), calc(-50% + ${smoothMouse.y * 10}px))`;
        }

        for (const [key, el] of Object.entries(domNodes)) {
            let base = (key === 'stake') ? 'translateX(-50%)' : '';
            const mx = smoothMouse.x * 30;
            const my = smoothMouse.y * 30;
            const factor = (key === 'stake' || key === 'rev') ? 1.2 : 0.8;
            el.style.transform = `${base} translate(${mx * factor}px, ${my * factor}px)`;
        }

        // 1. Draw Clean Core (No Shadow)
        const coreSize = 70 + Math.sin(time) * 3;
        // Clean white glow center, fading to transparent. No dark borders.
        const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, coreSize);
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.3, 'rgba(255,255,255,0.8)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, coreSize, 0, Math.PI * 2);
        ctx.fill();

        // 2. Rings
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(time * 0.1);
        ctx.strokeStyle = 'rgba(57, 255, 20, 0.2)'; // Faint green ring
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, 150, 0, Math.PI * 1.5);
        ctx.stroke();
        ctx.restore();

        // 3. Green Flow Particles
        particlePool.forEach(p => { p.update(); p.draw(ctx, cx, cy); });

        // 4. Star Ring (Traveling stars)
        starPool.forEach(s => { s.update(); s.draw(ctx, cx, cy); });

        requestAnimationFrame(animate);
    }

    ScrollTrigger.create({
        trigger: "#tokenVisual",
        start: "top bottom",
        end: "bottom top",
        onEnter: () => { running = true; animate(); },
        onLeave: () => { running = false; },
        onEnterBack: () => { running = true; animate(); },
        onLeaveBack: () => { running = false; }
    });
}
