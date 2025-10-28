

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
// --- THAY THÔNG TIN CLOUDINARY CỦA BẠN VÀO ĐÂY ---
// CẢNH BÁO: Việc để API Secret ở phía client là RẤT NGUY HIỂM. 
// Bất kỳ ai cũng có thể xem mã nguồn và lấy cắp nó, dẫn đến việc họ có thể xóa toàn bộ ảnh của bạn.
// Chỉ sử dụng cách này khi bạn hoàn toàn chắc chắn về môi trường của mình.
const CLOUD_NAME = 'dnqqtiazb';
const UPLOAD_PRESET = 'image_studio_unsigned';
const API_KEY = '588397425159675'; // <-- THAY API KEY CỦA BẠN
const API_SECRET = '1_FoUsnAm1mr_qjKxlAJvujan0I'; // <-- THAY API SECRET CỦA BẠN
// ---------------------------------------------------


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
    
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
        throw new Error("Cloudinary configuration (cloud name, upload preset) is missing.");
    }

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

/**
 * Generates a SHA1 hash for the Cloudinary deletion signature.
 */
async function sha1(str: string): Promise<string> {
    const textAsBuffer = new TextEncoder().encode(str);
    const hashBuffer = await window.crypto.subtle.digest('SHA-1', textAsBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hash;
}

/**
 * Deletes an image from Cloudinary using the Admin API.
 * Requires API Key and Secret to be configured.
 */
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
    if (!API_KEY || !API_SECRET || !CLOUD_NAME) {
        console.error("Cloudinary credentials for deletion are not configured. Skipping delete.");
        return;
    }

    const timestamp = Math.round(new Date().getTime() / 1000);
    const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`;
    const signature = await sha1(stringToSign);

    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('timestamp', String(timestamp));
    formData.append('api_key', API_KEY);
    formData.append('signature', signature);
    
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`, {
        method: 'POST',
        body: formData,
    });
    
    const result = await response.json();
    if (result.result !== 'ok') {
        console.error("Failed to delete from Cloudinary:", result);
        throw new Error(`Cloudinary deletion failed for public_id: ${publicId}. Reason: ${result.error?.message || 'Unknown error'}`);
    }
};

const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;

export const getImageAspectRatio = (dataUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const w = img.naturalWidth;
            const h = img.naturalHeight;
            if (w > 0 && h > 0) {
                const divisor = gcd(w, h);
                resolve(`${w / divisor}:${h / divisor}`);
            } else {
                // Fallback for edge cases
                resolve('1:1');
            }
        };
        img.onerror = () => reject(new Error("Could not load image to determine aspect ratio."));
        img.src = dataUrl;
    });
};


export const downloadJson = (data: object, filename: string): void => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const readJsonFromFile = <T>(file: File): Promise<T> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsText(file, 'UTF-8');
        reader.onload = (e) => {
            try {
                const result = JSON.parse(e.target?.result as string);
                resolve(result as T);
            } catch (error) {
                reject(new Error("Failed to parse JSON file."));
            }
        };
        reader.onerror = (error) => reject(error);
    });
};
