import React, { useState, useRef, useEffect } from 'react';
import { ExpandedNode as ExpandedNodeType } from '../../types';
import Button from '../common/Button';
import { SparkleInstance } from '../common/Sparkle';
import { downloadDataUrl, upscale2xDataURL } from '../../utils/fileUtils';

interface ExpandedNodeProps {
    node: ExpandedNodeType;
    onClose: (id: string) => void;
    onPositionChange: (id: string, pos: { x: number; y: number }) => void;
    onViewImage: (url: string) => void;
    sparkleRef: React.RefObject<SparkleInstance>;
    isUpscaled: boolean;
}

const ExpandedNode: React.FC<ExpandedNodeProps> = ({ node, onClose, onPositionChange, onViewImage, sparkleRef, isUpscaled }) => {
    const [isDragging, setIsDragging] = useState(false);
    const nodeRef = useRef<HTMLDivElement>(null);
    const dragStartPos = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!nodeRef.current) return;
        setIsDragging(true);
        dragStartPos.current = {
            x: e.clientX - nodeRef.current.offsetLeft,
            y: e.clientY - nodeRef.current.offsetTop
        };
        e.preventDefault();
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !nodeRef.current) return;
            const newPos = {
                x: e.clientX - dragStartPos.current.x,
                y: e.clientY - dragStartPos.current.y
            };
            onPositionChange(node.id, newPos);
        };
        const handleMouseUp = () => setIsDragging(false);

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, node.id, onPositionChange]);

    const handleSave = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        sparkleRef.current?.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, 10);
        const dataToSave = isUpscaled ? await upscale2xDataURL(node.dataUrl) : node.dataUrl;
        downloadDataUrl(dataToSave, `expanded-${node.ratioLabel}-${Date.now()}.png`);
    };

    return (
        <div
            id={`expanded-node-${node.id}`}
            ref={nodeRef}
            className="absolute pointer-events-auto bg-white/10 border border-white/20 rounded-xl shadow-2xl backdrop-blur-lg flex flex-col"
            style={{
                left: node.position.x,
                top: node.position.y,
                maxWidth: '420px',
            }}
        >
            <header
                onMouseDown={handleMouseDown}
                className="flex items-center justify-between gap-2 p-2 cursor-move border-b border-white/10 text-sm font-bold"
            >
                <span>Expanded {node.ratioLabel}</span>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" className="!px-2 !py-1" onClick={handleSave}>Save</Button>
                    <Button variant="warn" className="!px-2 !py-1" onClick={() => onClose(node.id)}>×</Button>
                </div>
            </header>
            <div className="p-1 flex-1 min-h-0 flex items-center justify-center">
                <img
                    src={node.dataUrl}
                    alt={`Expanded view ${node.ratioLabel}`}
                    className="max-w-full object-contain rounded-b-lg cursor-zoom-in"
                    style={{ maxHeight: '300px' }}
                    onClick={() => onViewImage(node.dataUrl)}
                />
            </div>
        </div>
    );
};

export default ExpandedNode;