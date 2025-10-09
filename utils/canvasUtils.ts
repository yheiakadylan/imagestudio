
interface ViewBox {
    vx: number;
    vy: number;
    vw: number;
    vh: number;
}

export const parseSvgViewBox = (svgText: string): ViewBox | null => {
    try {
        const viewBoxMatch = svgText.match(/viewBox\s*=\s*["']\s*([-\d\.]+)\s+([-\d\.]+)\s+([-\d\.]+)\s+([-\d\.]+)\s*["']/i);
        if (viewBoxMatch) {
            return {
                vx: parseFloat(viewBoxMatch[1]),
                vy: parseFloat(viewBoxMatch[2]),
                vw: parseFloat(viewBoxMatch[3]),
                vh: parseFloat(viewBoxMatch[4]),
            };
        }
        const widthMatch = svgText.match(/\bwidth\s*=\s*["']\s*([\d\.]+)\s*(px)?\s*["']/i);
        const heightMatch = svgText.match(/\bheight\s*=\s*["']\s*([\d\.]+)\s*(px)?\s*["']/i);
        if (widthMatch && heightMatch) {
            return { vx: 0, vy: 0, vw: parseFloat(widthMatch[1]), vh: parseFloat(heightMatch[1]) };
        }
    } catch (e) {
        console.error("Error parsing SVG viewbox:", e);
    }
    return null;
};

const loadImageAsync = (dataUrl: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Image load failed"));
        img.src = dataUrl;
    });
};

export const renderCutPreviewOnCanvas = async (
    canvas: HTMLCanvasElement,
    artworkUrl: string,
    template: { svgText?: string; pngMask?: string }
) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
        const artImg = await loadImageAsync(artworkUrl);
        const { naturalWidth: aw, naturalHeight: ah } = artImg;
        canvas.width = aw;
        canvas.height = ah;

        ctx.clearRect(0, 0, aw, ah);
        ctx.drawImage(artImg, 0, 0, aw, ah);

        if (template.svgText) {
            const viewBox = parseSvgViewBox(template.svgText) || { vx: 0, vy: 0, vw: aw, vh: ah };
            const strokeWidth = Math.max(1, Math.round(Math.min(aw, ah) * 0.006));
            
            let innerSvg = template.svgText;
            if (/^\s*<svg/i.test(template.svgText)) {
                innerSvg = template.svgText.replace(/<svg[^>]*>/i, "").replace(/<\/svg>\s*$/i, "");
            }

            const styledSvg = `
                <svg xmlns="http://www.w3.org/2000/svg" width="${aw}" height="${ah}" viewBox="${viewBox.vx} ${viewBox.vy} ${viewBox.vw} ${viewBox.vh}">
                    <style>
                        * { fill: none !important; stroke: rgba(255,0,0,0.95) !important; stroke-width: ${strokeWidth}px !important; vector-effect: non-scaling-stroke !important; }
                    </style>
                    ${innerSvg}
                </svg>
            `;
            const svgImg = await loadImageAsync("data:image/svg+xml;charset=utf-8," + encodeURIComponent(styledSvg));
            ctx.drawImage(svgImg, 0, 0, aw, ah);

        } else if (template.pngMask) {
            const maskImg = await loadImageAsync(template.pngMask);
            ctx.save();
            ctx.globalCompositeOperation = "source-over";
            ctx.filter = "drop-shadow(0 0 3px rgba(255, 0, 0, 1)) drop-shadow(0 0 1px rgba(255, 0, 0, 1))";
            ctx.drawImage(maskImg, 0, 0, aw, ah);
            ctx.restore();
        }
    } catch (error) {
        console.error("Failed to render cut preview:", error);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
        ctx.font = "16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Preview Error", canvas.width / 2, canvas.height / 2);
    }
};
