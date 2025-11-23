import React, { useState, useEffect } from 'react';
import { getTelegramFileUrl } from '../utils/telegram';
import { AlertTriangle } from 'lucide-react';

interface TelegramImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src?: string;
    skeleton?: React.ReactNode;
}

const ImageSkeleton: React.FC<{className?: string}> = ({ className }) => (
    <div className={`w-full h-full bg-slate-200 animate-pulse ${className}`}></div>
);

const TelegramImage: React.FC<TelegramImageProps> = ({ src, skeleton, ...props }) => {
    const [finalSrc, setFinalSrc] = useState<string | undefined>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setError(null);
        setFinalSrc(undefined);

        const resolveUrl = async (source: string) => {
            try {
                if (source.startsWith('telegram:')) {
                    const fileId = source.split(':')[1];
                    const realUrl = await getTelegramFileUrl(fileId);
                    if (isMounted) {
                        if (realUrl) {
                            setFinalSrc(realUrl);
                        } else {
                            setError("Failed to get a valid URL from Telegram.");
                            setLoading(false);
                        }
                    }
                } else {
                    if (isMounted) {
                        setFinalSrc(source);
                    }
                }
            } catch (e) {
                const errorMessage = e instanceof Error ? e.message : "An unknown error occurred while fetching the image.";
                console.error(`Failed to resolve Telegram URL for src: ${source}`, e);
                if (isMounted) {
                    setError(errorMessage);
                    setLoading(false);
                }
            }
        };

        if (src) {
            resolveUrl(src);
        } else {
            if (isMounted) {
                setError("No image source provided.");
                setLoading(false);
            }
        }

        return () => {
            isMounted = false;
        };
    }, [src]);

    if (error) {
        const title = `Failed to load image.\n\nReason: ${error}`;
        return (
             <div title={title} className={`w-full h-full bg-rose-50 border border-rose-200 flex flex-col items-center justify-center text-rose-500 text-xs text-center p-2 ${props.className}`}>
                <AlertTriangle size={24} className="mb-2" />
                <span>Image Error</span>
             </div>
        );
    }

    if (!finalSrc) {
        return (skeleton ? <>{skeleton}</> : <ImageSkeleton className={props.className} />);
    }

    return (
        <>
            {loading && (skeleton ? <>{skeleton}</> : <ImageSkeleton className={props.className} />)}
            <img 
                src={finalSrc} 
                {...props} 
                onLoad={() => setLoading(false)}
                onError={(e) => { 
                    setLoading(false); 
                    setError(`The browser failed to load the image from the resolved URL. This might be a network issue or the URL is invalid.`);
                    console.error("Image load error for URL:", finalSrc, e);
                }}
                style={{ display: loading ? 'none' : 'block', ...props.style }}
                alt={props.alt || ''}
            />
        </>
    );
};

export default TelegramImage;