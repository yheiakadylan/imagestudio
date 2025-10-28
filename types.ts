import { User as AuthUser } from './contexts/AuthContext';

export interface Status {
    message: string;
    type: 'ok' | 'err' | 'info' | 'warn';
    visible: boolean;
}

export interface ApiKey {
    id: string;
    name: string;
    key: string;
}

export interface ArtRef {
    id: string;
    name: string;
    dataUrl: string;
    publicId?: string;
    createdAt: number;
}

export interface Sample {
    id: string;
    name: string;
    dataUrl: string;
    publicId?: string;
    createdAt: number;
}

export interface CutTemplate {
    id: string;
    name: string;
    createdAt: number;
    svgText?: string;
    pngMask?: string;
    pngMaskPublicId?: string;
}

export interface Template {
    id: string;
    name: string;
    prompt: string;
    createdAt: number;
}

export interface MockupPrompt {
    id: string;
    prompt: string;
}

export interface LogEntry {
    id: string;
    type: 'artwork' | 'mockup';
    prompt: string;
    dataUrl: string;
    //deleteUrl?: string;
    publicId?: string;
    error?: string;
    createdAt: number;
    ownerUid?: string;
}

export interface ExpandedNode {
    id: string;
    sourceId: string;
    dataUrl: string;
    ratioLabel: string;
    position: { x: number; y: number };
}

export type User = AuthUser;