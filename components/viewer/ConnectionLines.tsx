import React, { useState, useLayoutEffect } from 'react';
import { ExpandedNode } from '../../types';

interface ConnectionLinesProps {
    nodes: ExpandedNode[];
}

interface LinePath {
    id: string;
    d: string;
}

const ConnectionLines: React.FC<ConnectionLinesProps> = ({ nodes }) => {
    const [lines, setLines] = useState<LinePath[]>([]);

    useLayoutEffect(() => {
        const calculateLines = () => {
            const newLines: LinePath[] = [];
            const containerRect = document.body.getBoundingClientRect();

            nodes.forEach(node => {
                const sourceEl = document.getElementById(node.sourceId);
                const nodeEl = document.getElementById(`expanded-node-${node.id}`);

                if (sourceEl && nodeEl) {
                    const sourceRect = sourceEl.getBoundingClientRect();
                    const nodeRect = nodeEl.getBoundingClientRect();

                    const startX = sourceRect.left - containerRect.left + sourceRect.width / 2;
                    const startY = sourceRect.top - containerRect.top + sourceRect.height / 2;
                    const endX = nodeRect.left - containerRect.left + nodeRect.width / 2;
                    const endY = nodeRect.top - containerRect.top + nodeRect.height / 2;
                    
                    const dx = Math.abs(endX - startX) * 0.4;
                    const c1x = startX + (endX > startX ? dx : -dx);
                    const c1y = startY;
                    const c2x = endX - (endX > startX ? dx : -dx);
                    const c2y = endY;

                    newLines.push({
                        id: node.id,
                        d: `M${startX},${startY} C${c1x},${c1y} ${c2x},${c2y} ${endX},${endY}`
                    });
                }
            });
            setLines(newLines);
        };
        
        calculateLines();
        
        // Use a shared timeout to debounce recalculations
        let timeoutId: number;
        const debouncedRecalculate = () => {
            clearTimeout(timeoutId);
            timeoutId = window.setTimeout(calculateLines, 50);
        };

        window.addEventListener('resize', debouncedRecalculate);
        const mainContent = document.querySelector('.flex-1.grid');
        mainContent?.addEventListener('scroll', debouncedRecalculate, { passive: true });

        // Also recalculate when nodes change
        return () => {
            window.removeEventListener('resize', debouncedRecalculate);
            mainContent?.removeEventListener('scroll', debouncedRecalculate);
            clearTimeout(timeoutId);
        };
    }, [nodes]);

    return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-30">
            {lines.map(line => (
                <path
                    key={line.id}
                    d={line.d}
                    fill="none"
                    stroke="rgba(255,255,255,0.35)"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    className="animate-dash"
                />
            ))}
            <style>
                {`
                @keyframes dash {
                    to { stroke-dashoffset: -20; }
                }
                .animate-dash { animation: dash 1s linear infinite; }
                `}
            </style>
        </svg>
    );
};

export default ConnectionLines;
