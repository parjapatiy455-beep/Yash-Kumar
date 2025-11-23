
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export const splitVideo = async (
    file: File, 
    segmentDuration: number, // This is the "Step" duration (unique content per clip)
    onProgress: (progress: number, stage: string) => void
): Promise<File[]> => {
    const ffmpeg = new FFmpeg();
    const OVERLAP = 2; // 2 Seconds overlap
    
    // URLs for the FFmpeg core and worker
    const coreBaseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    const ffmpegBaseURL = 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm';
    
    try {
        onProgress(0, 'Loading Engine...');
        
        await ffmpeg.load({
            coreURL: await toBlobURL(`${coreBaseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${coreBaseURL}/ffmpeg-core.wasm`, 'application/wasm'),
            workerURL: await toBlobURL(`${ffmpegBaseURL}/worker.js`, 'text/javascript'),
        });
    } catch (error) {
        console.error("FFmpeg Load Error:", error);
        throw new Error("Failed to load video processor. Please check your internet connection.");
    }

    onProgress(5, 'Reading file...');
    const inputName = 'input.mp4';
    
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    onProgress(10, 'Analyzing...');
    
    // Get duration using ffprobe (via exec since ffmpeg.js doesn't expose probe directly nicely)
    // We'll rely on the HTML video element method to get duration cheaply before upload if possible, 
    // but here we can just estimate or use a loop until we run out of frames.
    // For robustness in browser, we will use a JS-based approach to calc chunks.
    
    // Since we can't easily get duration inside ffmpeg.wasm without parsing logs, 
    // we assume the caller or a hidden video element provided duration, 
    // OR we just keep cutting until a cut fails. 
    
    // Let's use a more robust approach: Stream Copy splitting in a loop.
    
    // We first re-encode audio to AAC to ensure compatibility, then copy video.
    // Note: -c copy is fast but keyframe dependent. With overlap, this is less risky.
    
    const outputFiles: File[] = [];
    let startTime = 0;
    let part = 0;
    let done = false;

    // Optimization: Re-encode audio once to a temp file so we don't do it every chunk
    onProgress(15, 'Preparing Audio...');
    await ffmpeg.exec(['-i', inputName, '-c:v', 'copy', '-c:a', 'aac', '-ar', '44100', 'temp_master.mp4']);

    while (!done) {
        const fileName = `part_${String(part).padStart(3, '0')}.mp4`;
        // Duration of this clip = segmentDuration + OVERLAP
        // Except the last one might be shorter
        const clipDuration = segmentDuration + OVERLAP;
        
        const percent = Math.min(95, 20 + (part * 5));
        onProgress(percent, `Cutting Part ${part + 1}...`);

        // We use -ss before -i for fast seek, and -t for duration
        await ffmpeg.exec([
            '-ss', String(startTime),
            '-t', String(clipDuration),
            '-i', 'temp_master.mp4',
            '-c', 'copy', // Fast copy
            '-avoid_negative_ts', 'make_zero',
            fileName
        ]);

        try {
            const data = await ffmpeg.readFile(fileName);
            if (data.length < 1000) { // Empty or tiny file means end
                done = true;
                break;
            }
            
            const blob = new Blob([data], { type: 'video/mp4' });
            // Check if blob is valid video (optional, skip for speed)
            
            outputFiles.push(new File([blob], fileName, { type: 'video/mp4' }));
            await ffmpeg.deleteFile(fileName);
            
            // Calculate next start time
            // Standard logic: We advance by segmentDuration. 
            // E.g. 0-12, then 10-22, then 20-32.
            startTime += segmentDuration;
            part++;

            // Safety break if infinite loop (e.g. file > 5 hours in 10s chunks)
            if (part > 1000) done = true; 
            
            // Detect end of file logic: 
            // If the generated file is significantly shorter than requested duration (minus overlap)
            // it means we hit the end.
            // Since we can't easily check duration of blob without loading it, 
            // we will rely on the loop eventually failing or producing tiny files if we go past end.
            // With -c copy, ffmpeg usually exits clean.
            
        } catch (e) {
            done = true;
        }
    }

    try {
        await ffmpeg.deleteFile(inputName);
        await ffmpeg.deleteFile('temp_master.mp4');
    } catch (e) {}
    
    ffmpeg.terminate();

    if (outputFiles.length === 0) {
        throw new Error("Processing failed. Try a different video format.");
    }

    onProgress(100, 'Done');
    return outputFiles;
};
