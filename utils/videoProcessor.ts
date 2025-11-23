
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export const splitVideo = async (
    file: File, 
    segmentDuration: number, // This is the "Step" duration (unique content per clip)
    onProgress: (progress: number, stage: string) => void
): Promise<File[]> => {
    const ffmpeg = new FFmpeg();
    const OVERLAP = 2; // 2 Seconds overlap for gapless playback
    
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
    
    // Let's use a more robust approach: Stream Copy splitting in a loop.
    // We first re-encode audio to AAC to ensure compatibility, then copy video.
    
    const outputFiles: File[] = [];
    let startTime = 0;
    let part = 0;
    let done = false;

    // Optimization: Re-encode audio once to a temp file so we don't do it every chunk
    onProgress(15, 'Preparing Audio...');
    await ffmpeg.exec(['-i', inputName, '-c:v', 'copy', '-c:a', 'aac', '-ar', '44100', 'temp_master.mp4']);

    while (!done) {
        const fileName = `part_${String(part).padStart(3, '0')}.mp4`;
        
        // IMPORTANT: Duration of this clip = segmentDuration + OVERLAP
        // This ensures the end of this clip matches the start of the next clip
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
            outputFiles.push(new File([blob], fileName, { type: 'video/mp4' }));
            await ffmpeg.deleteFile(fileName);
            
            // Calculate next start time
            // We advance by segmentDuration (the unique content), not clipDuration
            startTime += segmentDuration;
            part++;

            if (part > 1000) done = true; // Safety break
            
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
