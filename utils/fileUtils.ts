
/*interface ImgBBResponse {
    data: {
        url: string;
        delete_url: string;
    };
    success: boolean;
}*/
interface CloudinaryResponse {
    secure_url: string;
    public_id: string;
}
export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};

export const downloadDataUrl = (dataUrl: string, filename: string): void => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const downscaleDataUrl = (dataUrl: string, maxDim: number = 1536): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            let { width: w, height: h } = img;
            if (Math.max(w, h) > maxDim) {
                const ratio = w >= h ? maxDim / w : maxDim / h;
                w = Math.round(w * ratio);
                h = Math.round(h * ratio);
            }
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            if (!ctx) return reject(new Error("Canvas context not available."));
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = () => reject(new Error("Cannot load image for downscaling."));
        img.src = dataUrl;
    });
};

export const upscale2xDataURL = (dataUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const w = img.naturalWidth || img.width;
            const h = img.naturalHeight || img.height;
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, w * 2);
            canvas.height = Math.max(1, h * 2);
            const ctx = canvas.getContext("2d");
            if (!ctx) return reject(new Error("Canvas context not available for upscaling."));
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = () => reject(new Error("Upscale failed: Could not load source image."));
        img.src = dataUrl;
    });
};


export const blobToDataURL = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const readImagesFromClipboard = async (): Promise<string[]> => {
    const urls: string[] = [];
    try {
        const items = await navigator.clipboard.read();
        for (const item of items) {
            for (const type of item.types) {
                if (type.startsWith("image/")) {
                    const blob = await item.getType(type);
                    urls.push(await blobToDataURL(blob));
                }
            }
        }
    } catch (err) {
        console.error("Failed to read clipboard:", err);
        throw new Error("Could not read image from clipboard. Permission might be denied.");
    }
    return urls;
};

export const uploadDataUrlToStorage = async (dataUrl: string, path: string): Promise<{ downloadUrl: string, publicId: string }> => {
    if (!dataUrl.startsWith('data:')) {
        return { downloadUrl: dataUrl, publicId: '' };
    }

    // --- THAY THÔNG TIN CỦA BẠN VÀO ĐÂY ---
    const CLOUD_NAME = 'dnqqtiazb';
    const UPLOAD_PRESET = 'image_studio_unsigned';
    // ------------------------------------

    const formData = new FormData();
    formData.append('file', dataUrl);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', 'image_studio'); // (Tùy chọn) Tổ chức ảnh vào thư mục

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
    });

    const result: CloudinaryResponse = await response.json();

    if (result.secure_url) {
        return {
            downloadUrl: result.secure_url,
            publicId: result.public_id,
        };
    } else {
        console.error("Lỗi tải lên Cloudinary:", result);
        throw new Error('Failed to upload image to Cloudinary');
    }
};