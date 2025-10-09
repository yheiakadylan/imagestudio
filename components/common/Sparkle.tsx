
import React, { useState, useImperativeHandle, forwardRef } from 'react';

interface SparkleParticle {
    id: number;
    x: number;
    y: number;
    dx: number;
    dy: number;
    color: string;
}

export interface SparkleInstance {
    burst: (x: number, y: number, count?: number) => void;
}

export const Sparkle = forwardRef<SparkleInstance>((props, ref) => {
    const [sparkles, setSparkles] = useState<SparkleParticle[]>([]);

    useImperativeHandle(ref, () => ({
        burst: (x, y, count = 18) => {
            const colors = ['#60a5fa', '#a78bfa', '#f472b6', '#fbbf24', '#34d399', '#22d3ee', '#f87171'];
            const newSparkles: SparkleParticle[] = [];
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2) * (i / count) + (Math.random() - 0.5) * 0.7;
                const distance = 60 + Math.random() * 80;
                newSparkles.push({
                    id: Math.random(),
                    x,
                    y,
                    dx: Math.cos(angle) * distance,
                    dy: Math.sin(angle) * distance,
                    color: colors[Math.floor(Math.random() * colors.length)],
                });
            }
            setSparkles(s => [...s, ...newSparkles]);
        },
    }));

    return (
        <div className="fixed inset-0 pointer-events-none z-50">
            {sparkles.map(s => (
                <div
                    key={s.id}
                    className="absolute w-2 h-2 rounded-full bg-radial-sparkle shadow-sparkle animate-pop"
                    style={{
                        left: s.x,
                        top: s.y,
                        color: s.color,
                        // @ts-ignore
                        '--dx': `${s.dx}px`,
                        '--dy': `${s.dy}px`,
                    }}
                    onAnimationEnd={() => setSparkles(current => current.filter(p => p.id !== s.id))}
                />
            ))}
        </div>
    );
});

// Add keyframes and custom properties to a style tag in App.tsx or index.html
// Example to be added in your main CSS or a style tag:
/*
@keyframes pop {
    0% { transform: translate(0, 0) scale(0.6); opacity: 1; }
    80% { opacity: 1; }
    100% { transform: translate(var(--dx), var(--dy)) scale(0); opacity: 0; }
}
.animate-pop {
    animation: pop 0.9s ease-out forwards;
}
.bg-radial-sparkle {
    background: radial-gradient(circle at 30% 30%, #fff, rgba(255, 255, 255, 0.2) 60%, transparent 70%);
}
.shadow-sparkle {
    box-shadow: 0 0 10px currentColor, 0 0 18px currentColor;
}
*/
