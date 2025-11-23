
import { db } from '../firebase';
import { ref, get } from 'firebase/database';

const getTelegramSettings = async (): Promise<{ token: string | null, id: string | null }> => {
    try {
        const settingsRef = ref(db, 'settings/telegram');
        const snapshot = await get(settingsRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            return { token: data.botToken || null, id: data.chatId || null };
        }
        return { token: null, id: null };
    } catch (error) {
        console.error("Failed to fetch Telegram settings:", error);
        return { token: null, id: null };
    }
};

export const getTelegramFileUrl = async (fileId: string): Promise<string | null> => {
    const { token } = await getTelegramSettings();
    if (!token) {
        console.error("Telegram bot token is not configured.");
        return null;
    }

    try {
        const apiUrl = `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`;
        const response = await fetch(apiUrl, { cache: 'no-cache' });
        
        if (!response.ok) return null;
        
        const data = await response.json();

        if (data.ok && data.result.file_path) {
            return `https://api.telegram.org/file/bot${token}/${data.result.file_path}`;
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error resolving Telegram file URL:", error);
        return null;
    }
};

// 1MB chunks to safely stay under limits
const CHUNK_SIZE = 1 * 1024 * 1024; 

export const uploadToTelegram = async (
    file: File, 
    onProgress?: (progress: number) => void
): Promise<string | null> => {
    
    // Try direct upload for files under 48MB (Telegram Bot API Limit is 50MB)
    // Using 48MB to be safe with overhead.
    if (file.size < 48 * 1024 * 1024) { 
        try {
            const fileId = await uploadSingleFile(file, file.name);
            if (onProgress) onProgress(100);
            return fileId;
        } catch (error) {
            console.warn("Direct upload failed, attempting chunked fallback...", error);
            // Only fallback to chunked if it's NOT an image, as images must be atomic
            if (!file.type.startsWith('image/')) {
                return uploadChunked(file, onProgress);
            }
            return null;
        }
    } else {
        return uploadChunked(file, onProgress);
    }
};

const uploadSingleFile = async (file: File | Blob, fileName: string): Promise<string | null> => {
    const { token, id: chat_id } = await getTelegramSettings();
    if (!token || !chat_id) throw new Error("Telegram settings missing.");

    // Robust MIME type detection
    const isVideo = file.type.startsWith('video/') || fileName.match(/\.(mp4|mov|avi|mkv|webm|m4v|3gp|flv)$/i);
    const isImage = file.type.startsWith('image/') || fileName.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg|heic)$/i);
    
    let endpoint = 'sendDocument';
    let key = 'document';

    if (isVideo) {
        endpoint = 'sendVideo';
        key = 'video';
    } else if (isImage) {
        endpoint = 'sendPhoto';
        key = 'photo';
    }
    
    const formData = new FormData();
    formData.append('chat_id', chat_id);
    formData.append(key, file, fileName);

    const apiUrl = `https://api.telegram.org/bot${token}/${endpoint}`;
    const proxyApiUrl = `/api/proxy?url=${encodeURIComponent(apiUrl)}`;

    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
        try {
            const response = await fetch(proxyApiUrl, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                // If rate limit (429), wait longer
                if (response.status === 429) {
                    console.warn("Telegram Rate Limit Hit. Waiting 5 seconds...");
                    await new Promise(r => setTimeout(r, 5000)); 
                    throw new Error("Rate limit hit"); // Throw to trigger retry loop
                }
                
                let errorMessage = `Status ${response.status}`;
                try {
                    const data = await response.json();
                    errorMessage = data.description || errorMessage;
                } catch (e) { /* ignore json error */ }
                
                throw new Error(errorMessage);
            }

            const data = await response.json();
            if (data.ok) {
                const res = data.result;
                // Extract best File ID based on type
                if (res.video) return res.video.file_id;
                if (res.document) return res.document.file_id;
                if (res.audio) return res.audio.file_id;
                
                // Photos return an array of sizes, take the last (largest) one
                if (res.photo && Array.isArray(res.photo) && res.photo.length > 0) {
                    return res.photo[res.photo.length - 1].file_id;
                }
                
                // Fallback for generic documents that might be photos treated as docs
                if (res.file_id) return res.file_id;

                return null;
            } else {
                throw new Error(data.description || 'Telegram API error');
            }
        } catch (error) {
            attempts++;
            console.warn(`Upload attempt ${attempts} failed:`, error);
            
            if (attempts >= maxAttempts) throw error;
            
            // Exponential backoff: 2s, 4s, 8s...
            const delay = 2000 * Math.pow(2, attempts - 1);
            await new Promise(r => setTimeout(r, delay)); 
        }
    }
    return null;
};

const uploadChunked = async (file: File, onProgress?: (progress: number) => void): Promise<string> => {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const fileIds: string[] = [];

    for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(file.size, start + CHUNK_SIZE);
        const chunk = file.slice(start, end, file.type || 'application/octet-stream');
        
        let attempts = 0;
        let uploaded = false;
        
        while (!uploaded && attempts < 3) {
            try {
                // Upload chunks as generic documents
                const fileId = await uploadSingleFile(chunk, `${file.name}.part${i}`);
                if (!fileId) throw new Error("No file ID returned");
                fileIds.push(fileId);
                uploaded = true;
            } catch (e) {
                attempts++;
                console.warn(`Chunk ${i} failed (attempt ${attempts}):`, e);
                if (attempts >= 3) throw e;
                await new Promise(r => setTimeout(r, 2000 * attempts)); 
            }
        }

        if (onProgress) {
            onProgress(Math.round(((i + 1) / totalChunks) * 100));
        }
    }

    const mimeType = file.type || 'video/mp4';
    // Return a special identifier for chunked files
    return `telegram-chunked:${mimeType}|${fileIds.join(',')}`;
};

export const assembleChunkedFile = async (chunkedInfo: string): Promise<Blob | null> => {
    try {
        const parts = chunkedInfo.replace('telegram-chunked:', '').split('|');
        let mimeType = 'application/octet-stream';
        let idsString = parts[0];

        if (parts.length > 1) {
            mimeType = parts[0];
            idsString = parts[1];
        }

        const chunkIds = idsString.split(',');
        const blobParts: Blob[] = [];

        for (const id of chunkIds) {
            const realUrl = await getTelegramFileUrl(id);
            if (!realUrl) throw new Error(`Failed to resolve URL for chunk ${id}`);
            
            const proxyUrl = `/api/proxy?url=${encodeURIComponent(realUrl)}`;
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error(`Failed to download chunk ${id}`);
            
            const blob = await response.blob();
            blobParts.push(blob);
        }

        return new Blob(blobParts, { type: mimeType });
    } catch (error) {
        console.error("Error assembling chunked file:", error);
        return null;
    }
};
