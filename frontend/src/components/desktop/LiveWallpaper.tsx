import React, { useEffect, useRef } from "react";
import { useWallpaper } from "../../context/WallpaperContext";
import { useTheme } from "../../context/ThemeContext";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseAlpha: number;
}

interface Orb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

export const LiveWallpaper: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { wallpaper, enableParallax } = useWallpaper();
  const { theme, reduceMotion } = useTheme();

  const parallaxRef = useRef({ currentX: 0, currentY: 0, targetX: 0, targetY: 0 });
  const animFrameRef = useRef<number | null>(null);

  // Track mouse for smooth parallax
  useEffect(() => {
    if (!enableParallax || reduceMotion) {
      parallaxRef.current = { currentX: 0, currentY: 0, targetX: 0, targetY: 0 };
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      parallaxRef.current.targetX = (e.clientX / innerWidth - 0.5) * 28;
      parallaxRef.current.targetY = (e.clientY / innerHeight - 0.5) * 28;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [enableParallax, reduceMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Color definitions based on theme
    const isKali = theme === "kali-dark";
    const isLight = theme === "ubuntu-light";

    // Setup orbs for Aurora
    const orbs: Orb[] = isKali
      ? [
          { x: width * 0.2, y: height * 0.3, vx: 0.3, vy: 0.2, radius: 340, color: "rgba(0, 240, 255, 0.16)" },
          { x: width * 0.75, y: height * 0.4, vx: -0.25, vy: 0.35, radius: 400, color: "rgba(37, 99, 235, 0.22)" },
          { x: width * 0.5, y: height * 0.8, vx: 0.2, vy: -0.3, radius: 360, color: "rgba(99, 102, 241, 0.18)" },
          { x: width * 0.85, y: height * 0.85, vx: -0.35, vy: -0.2, radius: 320, color: "rgba(6, 182, 212, 0.15)" },
        ]
      : isLight
      ? [
          { x: width * 0.2, y: height * 0.3, vx: 0.3, vy: 0.2, radius: 380, color: "rgba(233, 84, 32, 0.12)" },
          { x: width * 0.8, y: height * 0.3, vx: -0.25, vy: 0.35, radius: 420, color: "rgba(217, 70, 239, 0.1)" },
          { x: width * 0.5, y: height * 0.8, vx: 0.2, vy: -0.3, radius: 360, color: "rgba(249, 115, 22, 0.1)" },
        ]
      : [
          // Authentic Ubuntu aubergine, purple, and orange
          { x: width * 0.25, y: height * 0.25, vx: 0.35, vy: 0.25, radius: 380, color: "rgba(233, 84, 32, 0.22)" },
          { x: width * 0.8, y: height * 0.35, vx: -0.3, vy: 0.3, radius: 440, color: "rgba(119, 33, 111, 0.32)" },
          { x: width * 0.45, y: height * 0.75, vx: 0.25, vy: -0.35, radius: 400, color: "rgba(168, 85, 247, 0.24)" },
          { x: width * 0.9, y: height * 0.8, vx: -0.35, vy: -0.2, radius: 320, color: "rgba(233, 84, 32, 0.18)" },
        ];

    // Setup particles
    const particleCount = 42;
    const particles: Particle[] = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      radius: Math.random() * 2 + 1,
      baseAlpha: Math.random() * 0.5 + 0.3,
    }));

    // Setup Matrix columns
    const glyphs = "01アイウエオカキクケコサシスセソタチツテトナニヌネハヒフヘホマミムメモヤユラリルレロワ0123456789ABCDEFλπΩ";
    const matrixFontSize = 14;
    const columns = Math.floor(width / matrixFontSize);
    const drops: number[] = Array.from({ length: columns }, () => Math.floor(Math.random() * -50));
    let lastMatrixTime = 0;

    let isTabVisible = !document.hidden;
    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const render = (time: number) => {
      // Pause animation if tab is hidden (saves CPU & Battery on 8GB laptop)
      if (!isTabVisible) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      // Smooth parallax interpolation
      const p = parallaxRef.current;
      p.currentX += (p.targetX - p.currentX) * 0.06;
      p.currentY += (p.targetY - p.currentY) * 0.06;
      const px = p.currentX;
      const py = p.currentY;

      // 1. Static Gradient
      if (wallpaper === "static-gradient") {
        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        if (isKali) {
          bgGrad.addColorStop(0, "#06090e");
          bgGrad.addColorStop(0.5, "#0b131e");
          bgGrad.addColorStop(1, "#030406");
        } else if (isLight) {
          bgGrad.addColorStop(0, "#ebdcd5");
          bgGrad.addColorStop(0.5, "#f7f1ed");
          bgGrad.addColorStop(1, "#dfcfc6");
        } else {
          bgGrad.addColorStop(0, "#2c001e");
          bgGrad.addColorStop(0.45, "#77216f");
          bgGrad.addColorStop(1, "#e95420");
        }
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);
        return; // No loop needed for static
      }

      // 2. Solid Minimal
      if (wallpaper === "solid") {
        ctx.fillStyle = isKali ? "#080b10" : isLight ? "#ebe6e3" : "#170e20";
        ctx.fillRect(0, 0, width, height);
        return; // No loop needed for solid
      }

      // 3. Matrix Rain
      if (wallpaper === "matrix") {
        // Slow down matrix to ~28 FPS for authentic feel and ultra-low CPU
        if (time - lastMatrixTime > 36) {
          lastMatrixTime = time;

          // Semitransparent fade to create phosphor trailing
          ctx.fillStyle = isKali ? "rgba(4, 7, 10, 0.12)" : "rgba(8, 14, 10, 0.14)";
          ctx.fillRect(0, 0, width, height);

          ctx.font = `${matrixFontSize}px "Ubuntu Mono", monospace`;

          for (let i = 0; i < drops.length; i++) {
            const char = glyphs[Math.floor(Math.random() * glyphs.length)];
            const x = i * matrixFontSize + px * 0.4;
            const y = drops[i] * matrixFontSize + py * 0.4;

            // Green/Cyan glow for head glyph, low-opacity tail
            ctx.fillStyle = isKali ? "rgba(0, 240, 255, 0.85)" : "rgba(74, 222, 128, 0.85)";
            ctx.fillText(char, x, y);

            if (y > height && Math.random() > 0.985) {
              drops[i] = 0;
            } else {
              drops[i]++;
            }
          }
        }
        if (!reduceMotion) {
          animFrameRef.current = requestAnimationFrame(render);
        }
        return;
      }

      // 4. Floating Particles Constellation
      if (wallpaper === "particles") {
        ctx.fillStyle = isKali ? "#070a0f" : isLight ? "#f4ece7" : "#120919";
        ctx.fillRect(0, 0, width, height);

        // Draw connections
        ctx.lineWidth = 0.8;
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 110) {
              const alpha = (1 - dist / 110) * 0.22;
              ctx.strokeStyle = isKali
                ? `rgba(0, 240, 255, ${alpha})`
                : isLight
                ? `rgba(233, 84, 32, ${alpha * 0.8})`
                : `rgba(233, 84, 32, ${alpha})`;
              ctx.beginPath();
              ctx.moveTo(particles[i].x + px, particles[i].y + py);
              ctx.lineTo(particles[j].x + px, particles[j].y + py);
              ctx.stroke();
            }
          }
        }

        // Draw and update particles
        for (const pt of particles) {
          ctx.beginPath();
          ctx.arc(pt.x + px, pt.y + py, pt.radius, 0, Math.PI * 2);
          ctx.fillStyle = isKali
            ? `rgba(0, 240, 255, ${pt.baseAlpha})`
            : isLight
            ? `rgba(233, 84, 32, ${pt.baseAlpha * 0.7})`
            : `rgba(249, 115, 22, ${pt.baseAlpha})`;
          ctx.fill();

          if (!reduceMotion) {
            pt.x += pt.vx;
            pt.y += pt.vy;
            if (pt.x < 0) pt.x = width;
            if (pt.x > width) pt.x = 0;
            if (pt.y < 0) pt.y = height;
            if (pt.y > height) pt.y = 0;
          }
        }

        if (!reduceMotion) {
          animFrameRef.current = requestAnimationFrame(render);
        }
        return;
      }

      // 5. Default: Ubuntu Aurora Mesh
      // Deep base background
      ctx.fillStyle = isKali ? "#080c12" : isLight ? "#ebdcd5" : "#170a20";
      ctx.fillRect(0, 0, width, height);

      // Render glowing floating orbs with radial gradients
      ctx.globalCompositeOperation = isLight ? "multiply" : "screen";

      for (const orb of orbs) {
        const ox = orb.x + px * 0.7;
        const oy = orb.y + py * 0.7;

        const grad = ctx.createRadialGradient(ox, oy, 10, ox, oy, orb.radius);
        grad.addColorStop(0, orb.color);
        grad.addColorStop(1, "transparent");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(ox, oy, orb.radius, 0, Math.PI * 2);
        ctx.fill();

        if (!reduceMotion) {
          orb.x += orb.vx;
          orb.y += orb.vy;

          if (orb.x < -100 || orb.x > width + 100) orb.vx *= -1;
          if (orb.y < -100 || orb.y > height + 100) orb.vy *= -1;
        }
      }

      ctx.globalCompositeOperation = "source-over";

      if (!reduceMotion) {
        animFrameRef.current = requestAnimationFrame(render);
      }
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [wallpaper, theme, reduceMotion, enableParallax]);

  return (
    <canvas
      ref={canvasRef}
      className="live-wallpaper-canvas"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
};

