/**
 * imageCompression.js
 * ------------------------------------------------------------------
 * Client-side compression run BEFORE a file is uploaded to Cloudinary.
 * Goal: long edge ~1000px, output WebP, target ~100KB per image.
 *
 * Usage in your upload flow (e.g. sell.js):
 *
 *   const fileInput = document.getElementById("imageInput");
 *   fileInput.addEventListener("change", async () => {
 *       const original = fileInput.files[0];
 *       const compressed = await compressImage(original);
 *       const formData = new FormData();
 *       formData.append("image", compressed, "listing.webp");
 *       // ...upload formData to your backend, which forwards it to
 *       // Cloudinary and stores ONLY the returned secure_url.
 *   });
 * ------------------------------------------------------------------
 */

const MAX_DIMENSION = 1000;   // long edge, px
const TARGET_BYTES = 100 * 1024; // ~100KB target
const MIN_QUALITY = 0.4;      // don't degrade below this
const OUTPUT_TYPE = "image/webp";

const loadImageFromFile = (file) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = (err) => {
            URL.revokeObjectURL(url);
            reject(err);
        };
        img.src = url;
    });
}

const drawResizedCanvas = (img) => {
    const longEdge = Math.max(img.width, img.height);
    const scale = longEdge > MAX_DIMENSION ? MAX_DIMENSION / longEdge : 1;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);

    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    return canvas;
}

const canvasToBlob = (canvas, quality) => {
    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), OUTPUT_TYPE, quality);
    });
}

/**
 * Compresses a File/Blob to roughly TARGET_BYTES, resized to
 * MAX_DIMENSION on the long edge, encoded as WebP.
 * Falls back to the original file if the browser can't produce WebP
 * (very old browsers) or compression fails for any reason.
 */
const compressImage = async (file) => {
    try {
        const img = await loadImageFromFile(file);
        const canvas = drawResizedCanvas(img);

        let quality = 0.8;
        let blob = await canvasToBlob(canvas, quality);

        // Step quality down until under target size or floor reached.
        while (blob && blob.size > TARGET_BYTES && quality > MIN_QUALITY) {
            quality -= 0.1;
            blob = await canvasToBlob(canvas, quality);
        }

        if (!blob) {
            return file; // browser couldn't encode webp, use original
        }

        return new File([blob], "listing.webp", { type: OUTPUT_TYPE });
    } catch (error) {
        console.error("Image compression failed, using original file:", error);
        return file;
    }
}
