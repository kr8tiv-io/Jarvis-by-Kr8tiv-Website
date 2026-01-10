/**
 * Quiet Electricity / Flow Field Background for Manifesto Section
 * Premium, subtle, engineered feel.
 */
document.addEventListener('DOMContentLoaded', () => {
    const section = document.querySelector('.manifesto-section');
    if (!section) return;

    // Create Canvas if not exists (though we plan to add it in HTML, safety check)
    let canvas = document.getElementById('manifesto-canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'manifesto-canvas';
        section.insertBefore(canvas, section.firstChild);
    }

    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];
    let animationFrameId;

    // Configuration
    const config = {
        particleCount: window.innerWidth < 768 ? 40 : 100, // Reduced for mobile
        connectionDistance: 150,
        mouseDistance: 200,
        baseSpeed: 0.2, // Very slow drift
        color: 'rgba(0, 0, 0, 0.08)', // Dark grey for white bg
        accentColor: 'rgba(57, 255, 20, 0.4)', // Electric green accent
        lineColor: 'rgba(0, 0, 0, 0.03)' // Faint dark lines
    };

    // Reduced Motion Support
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * config.baseSpeed;
            this.vy = (Math.random() - 0.5) * config.baseSpeed;
            this.size = Math.random() * 1.5 + 0.5; // Small, delicate dots
            this.isAccent = Math.random() > 0.9; // 10% are accent particles
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            // Wrap around screen
            if (this.x < 0) this.x = width;
            if (this.x > width) this.x = 0;
            if (this.y < 0) this.y = height;
            if (this.y > height) this.y = 0;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.isAccent ? config.accentColor : config.color;
            ctx.fill();
        }
    }

    function init() {
        resize();
        window.addEventListener('resize', resize);

        // Initial particles
        particles = [];
        for (let i = 0; i < config.particleCount; i++) {
            particles.push(new Particle());
        }

        if (!prefersReducedMotion) {
            animate();
        } else {
            drawStatic(); // Draw once for static bg
        }
    }

    function resize() {
        width = section.offsetWidth;
        height = section.offsetHeight;
        canvas.width = width;
        canvas.height = height;

        // Update config based on new width
        config.particleCount = width < 768 ? 40 : 100;

        // Re-init particles if count changed significantly? 
        // For simplicity, just let them be, or replenish if array is too small
        if (particles.length < config.particleCount) {
            while (particles.length < config.particleCount) particles.push(new Particle());
        } else if (particles.length > config.particleCount) {
            particles.length = config.particleCount;
        }
    }

    function drawStatic() {
        ctx.clearRect(0, 0, width, height);
        particles.forEach(p => p.draw());
        drawConnections();
    }

    function drawConnections() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < config.connectionDistance) {
                    ctx.beginPath();
                    ctx.strokeStyle = config.lineColor;
                    ctx.lineWidth = 1 - (dist / config.connectionDistance);
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);

        particles.forEach(p => {
            p.update();
            p.draw();
        });

        drawConnections();

        animationFrameId = requestAnimationFrame(animate);
    }

    // Optimization: Pause when not in viewport
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !prefersReducedMotion) {
                if (!animationFrameId) animate();
            } else {
                if (animationFrameId) {
                    cancelAnimationFrame(animationFrameId);
                    animationFrameId = null;
                }
            }
        });
    }, { threshold: 0.1 }); // Trigger when 10% visible

    observer.observe(section);

    init();
});
