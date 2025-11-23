
import React, { useState, useEffect, useRef, useCallback } from "react";
// FIX: Changed import to wildcard to resolve module resolution issues.
import * as ReactRouterDom from 'react-router-dom';
const { useParams, useNavigate, useLocation } = ReactRouterDom;
import { db } from "../../firebase";
// FIX: Switched to v9 modular imports.
import { ref, get } from "firebase/database";
import { Material, Course } from "../../types";
import { useAuth } from "../../context/AuthContext";
import CourseLock from "../../components/CourseLock";
import LoadingIndicator from "../../components/LoadingIndicator";
import {
  Download,
  Maximize,
  Minimize,
  FileText,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Menu,
  RotateCw,
  MoreVertical,
  Shrink,
  Expand,
  Minimize2,
  Maximize2
} from "lucide-react";
import { getTelegramFileUrl, assembleChunkedFile } from "../../utils/telegram";
import PDFLoader3D from "../../components/PDFLoader3D";
import * as pdfjsLib from "pdfjs-dist/build/pdf.mjs";

const PDFViewerPage: React.FC = () => {
  const { courseId, subjectId, chapterId, materialId } =
    useParams<{ courseId: string; subjectId: string; chapterId: string; materialId: string; }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [materialName, setMaterialName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [rotation, setRotation] = useState(0);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set());

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<{ [key: number]: HTMLCanvasElement | null }>({});
  const thumbnailRefs = useRef<{ [key: number]: HTMLCanvasElement | null }>({});
  const pdfUrlRef = useRef<string | null>(null);
  // FIX: Changed ref type to number to be explicit about browser environment and resolve type errors.
  const pageRenderTimeouts = useRef<{ [key: string]: number }>({});
  const renderTasks = useRef<{ [key: number]: any }>({});
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const PDFJS_VERSION = '5.4.394';
      const PDFJS_BASE_URL = `https://aistudiocdn.com/pdfjs-dist@${PDFJS_VERSION}`;
      
      pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE_URL}/build/pdf.worker.mjs`;
      pdfjsLib.GlobalWorkerOptions.cMapUrl = `${PDFJS_BASE_URL}/cmaps/`;
      pdfjsLib.GlobalWorkerOptions.cMapPacked = true;
      pdfjsLib.GlobalWorkerOptions.standardFontDataUrl = `${PDFJS_BASE_URL}/standard_fonts/`;
      pdfjsLib.GlobalWorkerOptions.isEvalSupported = false;
    } catch (e) {
      console.warn("PDF.js worker load warning:", e);
    }
  }, []);

  const fetchAndLoadPdf = useCallback(async () => {
    if (!courseId || !subjectId || !chapterId || !materialId) {
      setError("Required information is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setPdfDoc(null);

    try {
      // FIX: Use v9 database syntax.
      const courseRefDb = ref(db, `courses/${courseId}`);
      const courseSnap = await get(courseRefDb);
      if(courseSnap.exists()) setCourse({ ...courseSnap.val(), id: courseSnap.key });
      else {
        setError("Course not found.");
        setLoading(false);
        return;
      }

      const queryParams = new URLSearchParams((window as any).location.search);
      const lectureId = queryParams.get("lectureId");
      
      const lectureMaterialPath = `courses/${courseId}/subjects/${subjectId}/chapters/${chapterId}/lectures/${lectureId}/materials/${materialId}`;
      const chapterMaterialPath = `courses/${courseId}/subjects/${subjectId}/chapters/${chapterId}/materials/${materialId}`;
      
      let snapshot;
      if (lectureId) {
          // FIX: Use v9 database syntax.
          snapshot = await get(ref(db, lectureMaterialPath));
      }
      if (!snapshot || !snapshot.exists()) {
          // FIX: Use v9 database syntax.
          snapshot = await get(ref(db, chapterMaterialPath));
      }

      if (snapshot.exists()) {
        const material: Material = snapshot.val();
        setMaterialName(material.filename);

        let finalPdfUrl: string | null = null;
        
        if (material.url?.startsWith("telegram-chunked:")) {
            // Handle chunked file for large PDFs
            const blob = await assembleChunkedFile(material.url);
            if (blob) {
                finalPdfUrl = URL.createObjectURL(blob);
                // Store original URL or blob URL for download? 
                // Blob URL is transient, we can't easily offer a single download link for chunked files without assembly.
                // pdfUrlRef will use the Blob URL for viewing.
            } else {
                setError("Failed to assemble chunked PDF file.");
                setLoading(false);
                return;
            }
        } else if (material.url?.startsWith("telegram:")) {
          const fileId = material.url.split(":")[1];
          finalPdfUrl = await getTelegramFileUrl(fileId);
        } else {
          finalPdfUrl = material.url;
        }

        if (finalPdfUrl) {
          pdfUrlRef.current = finalPdfUrl;
          
          // Only proxy if it's a remote URL, not a Blob URL
          const urlToLoad = finalPdfUrl.startsWith('blob:') 
              ? finalPdfUrl 
              : `${(window as any).location.origin}/api/proxy?url=${encodeURIComponent(finalPdfUrl)}`;
              
          const loadingTask = pdfjsLib.getDocument({ url: urlToLoad });
          const doc = await loadingTask.promise;
          setPdfDoc(doc);
          setNumPages(doc.numPages);
        } else {
          setError("Failed to resolve the PDF's URL.");
        }
      } else {
        setError("The requested PDF material could not be found.");
      }
    } catch (err) {
      console.error("Error loading PDF:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to load PDF. ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [courseId, subjectId, chapterId, materialId, location.search]);
  
  useEffect(() => {
    fetchAndLoadPdf();
    return () => {
        // Cleanup blob URL if we created one
        if (pdfUrlRef.current && pdfUrlRef.current.startsWith('blob:')) {
            URL.revokeObjectURL(pdfUrlRef.current);
        }
    }
  }, [fetchAndLoadPdf]);

  const renderPage = useCallback(async (num: number, isThumbnail = false) => {
    if (!pdfDoc) return;
    try {
      if (renderTasks.current[num]) (renderTasks.current[num] as any).cancel();
      if (pageRenderTimeouts.current[num]) clearTimeout(pageRenderTimeouts.current[num]);
      
      const page = await pdfDoc.getPage(num);
      const viewport = page.getViewport({ scale: isThumbnail ? 0.2 : scale, rotation: rotation });
      const canvas = isThumbnail ? thumbnailRefs.current[num] : canvasRefs.current[num];
      if (!canvas) return;
      
      const context = (canvas as any).getContext("2d", { alpha: false });
      if (!context) return;
      
      (canvas as any).height = viewport.height;
      (canvas as any).width = viewport.width;
      
      const renderContext = { canvasContext: context, viewport };
      const renderTask = page.render(renderContext);
      renderTasks.current[num] = renderTask;
      await renderTask.promise;
      delete renderTasks.current[num];
      
      if (!isThumbnail) setRenderedPages(prev => new Set(prev).add(num));
    } catch (e) {
      if (e instanceof Error && e.name !== 'RenderingCancelledException') console.error("Page render error:", e);
    }
  }, [pdfDoc, scale, rotation]);

  const rerenderAllPages = useCallback(() => {
    if (!pdfDoc || numPages === 0) return;
    Object.values(renderTasks.current).forEach(task => (task as any).cancel());
    renderTasks.current = {};
    // FIX: Replaced Object.values().forEach with a for...in loop to ensure correct type inference for timeout IDs, resolving an issue where `timeout` was typed as `unknown`.
    for (const key in pageRenderTimeouts.current) {
        clearTimeout(pageRenderTimeouts.current[key]);
    }
    pageRenderTimeouts.current = {};
    setRenderedPages(new Set());

    if (showThumbnails) {
        for (let i = 1; i <= numPages; i++) {
            pageRenderTimeouts.current[`thumb-${i}`] = setTimeout(() => renderPage(i, true), i * 50);
        }
    }
    for (let i = 1; i <= numPages; i++) {
        pageRenderTimeouts.current[`main-${i}`] = setTimeout(() => renderPage(i), i * 100);
    }
  }, [pdfDoc, numPages, renderPage, showThumbnails]);

  useEffect(() => {
    rerenderAllPages();
    return () => {
      Object.values(renderTasks.current).forEach(task => (task as any).cancel());
      // FIX: Replaced Object.values().forEach with a for...in loop to ensure correct type inference for timeout IDs, resolving an issue where `timeout` was typed as `unknown`.
      for (const key in pageRenderTimeouts.current) {
        clearTimeout(pageRenderTimeouts.current[key]);
      }
    };
  }, [pdfDoc, numPages, scale, rotation, showThumbnails, rerenderAllPages]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current || !pdfDoc) return;
    const container = containerRef.current;
    const pageElements = (container as any).querySelectorAll('.pdf-page');
    let mostVisiblePage = pageNum;
    let maxVisibility = 0;
    pageElements.forEach((el: any, index: number) => {
        const rect = el.getBoundingClientRect();
        const containerRect = (container as any).getBoundingClientRect();
        const visibleHeight = Math.max(0, Math.min(rect.bottom, containerRect.bottom) - Math.max(rect.top, containerRect.top));
        if (visibleHeight > maxVisibility) {
            maxVisibility = visibleHeight;
            mostVisiblePage = index + 1;
        }
    });
    if (mostVisiblePage !== pageNum) setPageNum(mostVisiblePage);
  }, [pageNum, pdfDoc]);

  useEffect(() => setPageInput(String(pageNum)), [pageNum]);
  const goToPrevPage = () => { if (pageNum > 1) goToPage(pageNum - 1); };
  const goToNextPage = () => { if (pageNum < numPages) goToPage(pageNum + 1); };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= numPages) {
      setPageNum(page);
      (containerRef.current as any)?.querySelector(`[data-page="${page}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setPageInput((e.target as any).value);
  const handlePageInputKeydown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const newPage = parseInt(pageInput, 10);
      if (!isNaN(newPage) && newPage >= 1 && newPage <= numPages) goToPage(newPage);
      else setPageInput(String(pageNum));
      (e.currentTarget as any).blur();
    }
  };

  const fitToPage = async () => {
    if (!pdfDoc || !containerRef.current) return;
    const page = await pdfDoc.getPage(1);
    const viewport = page.getViewport({ scale: 1, rotation });
    setScale((containerRef.current as any).clientHeight / viewport.height * 0.95);
  };
  const fitToWidth = async () => {
    if (!pdfDoc || !containerRef.current) return;
    const page = await pdfDoc.getPage(1);
    const viewport = page.getViewport({ scale: 1, rotation });
    setScale((containerRef.current as any).clientWidth / viewport.width * 0.95);
  };
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const toggleFullscreen = () => {
    if (!(window as any).document.fullscreenElement) (window as any).document.documentElement.requestFullscreen();
    else (window as any).document.exitFullscreen();
  };

  useEffect(() => {
    const fn = () => setIsFullscreen(!!(window as any).document.fullscreenElement);
    (window as any).document.addEventListener("fullscreenchange", fn);
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !(moreMenuRef.current as any).contains(event.target as any)) setShowMoreMenu(false);
    };
    (window as any).document.addEventListener("mousedown", handleClickOutside);
    return () => {
      (window as any).document.removeEventListener("fullscreenchange", fn);
      (window as any).document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const isEnrolled = user?.enrolledCourses.includes(courseId!);
  const isPaidCourse = course && course.price > 0;

  if (loading && !pdfDoc) return <div className="fixed inset-0 flex flex-col bg-gray-100"><PDFLoader3D /></div>;

  if (isPaidCourse && !isEnrolled) {
    return <CourseLock course={course} />;
  }

  if (error && !loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="p-8 bg-white rounded-xl shadow-lg text-center max-w-lg animate-fade-in-up">
          <h2 className="text-2xl font-bold text-red-600 mb-3">Error loading document</h2>
          <p className="text-slate-600 mb-6 whitespace-pre-wrap break-words">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => navigate(-1)} className="bg-slate-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-slate-700 transition-colors">
              Go Back
            </button>
            <button onClick={fetchAndLoadPdf} className="bg-primary text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-primary-dark transition-colors">Retry</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-100">
      <header className="flex-shrink-0 flex justify-between items-center bg-slate-200 text-slate-800 px-2 sm:px-4 border-b border-slate-300 shadow-sm h-12">
        <div className="flex items-center gap-1"><button onClick={() => setShowThumbnails(!showThumbnails)} className="btn-icon" aria-label="Toggle Thumbnails"><Menu size={22} /></button></div>
        <div className="flex items-center gap-1 sm:gap-2">
            <div className="flex items-center gap-1">
                <button onClick={goToPrevPage} disabled={pageNum <= 1} className="btn-icon"><ChevronLeft size={20} /></button>
                <div className="flex items-center bg-white border border-slate-300 rounded-md shadow-sm text-sm">
                    <input type="text" value={pageInput} onChange={handlePageInputChange} onKeyDown={handlePageInputKeydown} className="w-10 text-center font-medium focus:outline-none bg-transparent"/>
                    <span className="pr-2 text-slate-500">/ {numPages}</span>
                </div>
                <button onClick={goToNextPage} disabled={pageNum >= numPages} className="btn-icon"><ChevronRight size={20} /></button>
            </div>
            <div className="h-6 border-l border-slate-400 mx-1 sm:mx-2"></div>
            <div className="flex items-center gap-1">
                <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="btn-icon"><Minus size={20} /></button>
                <div className="bg-white border border-slate-300 rounded-md shadow-sm px-3 py-1 cursor-pointer w-[70px] text-center" onClick={() => setScale(1)}><span className="text-sm font-semibold">{Math.round(scale * 100)}%</span></div>
                <button onClick={() => setScale(s => Math.min(5, s + 0.2))} className="btn-icon"><Plus size={20} /></button>
            </div>
            <div className="h-6 border-l border-slate-400 mx-1 sm:mx-2"></div>
            <div className="hidden sm:flex items-center gap-1">
                <button onClick={fitToPage} className="btn-icon" aria-label="Fit to Page"><Minimize2 size={18} /></button>
                <button onClick={fitToWidth} className="btn-icon" aria-label="Fit to Width"><Maximize2 size={18} /></button>
                <button onClick={handleRotate} className="btn-icon" aria-label="Rotate"><RotateCw size={18} /></button>
            </div>
        </div>
        <div className="flex items-center gap-1">
            <a href={pdfUrlRef.current || "#"} download={materialName || "document.pdf"} target="_blank" rel="noopener noreferrer" className={`btn-icon ${!pdfUrlRef.current && "opacity-40 pointer-events-none"}`} aria-label="Download PDF"><Download size={20} /></a>
             <div className="relative" ref={moreMenuRef}>
                <button onClick={() => setShowMoreMenu(!showMoreMenu)} className="btn-icon" aria-label="More options"><MoreVertical size={20} /></button>
                {showMoreMenu && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 p-1 z-10 animate-fade-in-up">
                        <button onClick={() => { toggleFullscreen(); setShowMoreMenu(false); }} className="w-full text-left px-3 py-2 text-sm rounded-md text-violet-800 bg-violet-100 hover:bg-violet-200 flex items-center gap-2 transition-colors font-semibold">
                            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                            {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
                        </button>
                    </div>
                )}
            </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {showThumbnails && (
          <aside className="w-48 bg-white border-r overflow-y-auto p-2">
            <div className="space-y-2">
              {Array.from({ length: numPages }, (_, i) => i + 1).map((page) => (
                <div key={page} className={`cursor-pointer p-1 rounded-md border-2 ${pageNum === page ? 'border-primary' : 'border-transparent hover:bg-slate-100'}`} onClick={() => goToPage(page)}>
                  <canvas ref={(el) => { thumbnailRefs.current[page] = el; }} className="w-full border shadow-sm"/>
                  <div className="text-xs text-center mt-1 text-slate-600"> {page}</div>
                </div>
              ))}
            </div>
          </aside>
        )}
        <main ref={containerRef} className="flex-1 overflow-y-auto p-4 bg-gray-100" onScroll={handleScroll}>
          {(loading || !pdfDoc) ? (
            <PDFLoader3D />
          ) : (
            <div className="flex flex-col items-center">
              {Array.from({ length: numPages }, (_, i) => i + 1).map((page) => (
                <div key={page} className="pdf-page relative bg-white shadow-lg rounded mb-4" data-page={page}>
                  <canvas ref={(el) => { canvasRefs.current[page] = el; }} style={{ maxWidth: '100%', height: 'auto', display: 'block' }}/>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default PDFViewerPage;
