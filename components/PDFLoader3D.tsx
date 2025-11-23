import React from "react";

export default function PDFLoader3D() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-black/5 backdrop-blur-sm">
      
      {/* 3D Flip Box */}
      <div className="w-14 h-14 mb-4 perspective-[800px]">
        <div className="w-full h-full bg-blue-500/80 rounded-xl animate-flip3D shadow-xl"></div>
      </div>

      <p className="text-gray-700 text-lg font-medium tracking-wide animate-pulse">
        Loading PDF…
      </p>
    </div>
  );
}
