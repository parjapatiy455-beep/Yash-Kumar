import React from 'react';

const Shimmer: React.FC = () => (
  <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-slate-200/50 to-transparent"></div>
);

export const CourseCardSkeleton: React.FC<{ count: number, isHero?: boolean }> = ({ count, isHero = false }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        isHero ? (
          <div key={i} className="mb-12">
            <div className="h-8 w-1/3 bg-slate-200 rounded mb-4 relative overflow-hidden"><Shimmer/></div>
             <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                <div className="bg-white p-4 border border-slate-200/80 rounded-xl flex items-center gap-4">
                    <div className='w-24 h-20 bg-slate-200 rounded-lg flex-shrink-0 relative overflow-hidden'><Shimmer/></div>
                    <div className='space-y-2 flex-1'>
                        <div className='h-4 w-full bg-slate-200 rounded'></div>
                        <div className='h-3 w-2/3 bg-slate-200 rounded'></div>
                    </div>
                </div>
                 <div className="bg-white p-4 border border-slate-200/80 rounded-xl flex items-center gap-4">
                    <div className='w-24 h-20 bg-slate-200 rounded-lg flex-shrink-0 relative overflow-hidden'><Shimmer/></div>
                    <div className='space-y-2 flex-1'>
                        <div className='h-4 w-full bg-slate-200 rounded'></div>
                        <div className='h-3 w-2/3 bg-slate-200 rounded'></div>
                    </div>
                </div>
                 <div className="bg-white p-4 border border-slate-200/80 rounded-xl flex items-center gap-4">
                    <div className='w-24 h-20 bg-slate-200 rounded-lg flex-shrink-0 relative overflow-hidden'><Shimmer/></div>
                    <div className='space-y-2 flex-1'>
                        <div className='h-4 w-full bg-slate-200 rounded'></div>
                        <div className='h-3 w-2/3 bg-slate-200 rounded'></div>
                    </div>
                </div>
            </div>
          </div>
        ) : (
          <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg">
            <div className="w-full h-44 bg-slate-200 relative overflow-hidden"><Shimmer/></div>
            <div className="p-5 space-y-3">
              <div className="h-6 w-3/4 bg-slate-200 rounded relative overflow-hidden"><Shimmer/></div>
              <div className="h-4 w-1/2 bg-slate-200 rounded relative overflow-hidden"><Shimmer/></div>
              <div className="h-2 w-full bg-slate-200 rounded-full mt-2 relative overflow-hidden"><Shimmer/></div>
            </div>
          </div>
        )
      ))}
    </>
  );
};

export const CourseDetailSkeleton: React.FC = () => {
    return (
        <div className="animate-fade-in">
             <div className="h-8 w-48 bg-slate-200 rounded mb-6 relative overflow-hidden"><Shimmer/></div>
             <div className="h-20 w-full bg-slate-200 rounded-2xl mb-8 relative overflow-hidden"><Shimmer/></div>
            
            <div className="flex flex-col lg:flex-row gap-8">
                <div className="w-full lg:w-1/3 xl:w-1/4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-2 relative overflow-hidden">
                        <div className="h-10 w-full bg-slate-200 rounded"></div>
                        <div className="h-10 w-full bg-slate-200 rounded opacity-70"></div>
                        <div className="h-10 w-full bg-slate-200 rounded opacity-50"></div>
                        <Shimmer/>
                    </div>
                </div>
                <div className="flex-1">
                     <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-3 relative overflow-hidden">
                        <div className="h-12 w-full bg-slate-200 rounded"></div>
                        <div className="h-12 w-full bg-slate-200 rounded"></div>
                        <div className="h-12 w-full bg-slate-200 rounded"></div>
                        <Shimmer/>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const WatchPageSkeleton: React.FC = () => {
    return (
        <div className="min-h-screen bg-light flex flex-col font-sans">
            <div className="bg-white flex-shrink-0 z-10 p-4 border-b border-slate-200 flex justify-between items-center">
                 <div className="h-6 w-48 bg-slate-200 rounded relative overflow-hidden"><Shimmer/></div>
                 <div className="h-6 w-24 bg-slate-200 rounded relative overflow-hidden hidden sm:block"><Shimmer/></div>
            </div>
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-4 sm:p-6 md:p-8 gap-8">
                <main className="flex-1 flex flex-col gap-4 overflow-y-auto">
                    <div className="w-full aspect-video rounded-xl bg-slate-200 relative overflow-hidden"><Shimmer/></div>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-200 rounded-lg flex-shrink-0 relative overflow-hidden"><Shimmer/></div>
                        <div className="flex-1 space-y-2">
                            <div className="h-8 w-3/4 bg-slate-200 rounded relative overflow-hidden"><Shimmer/></div>
                        </div>
                    </div>
                </main>
                <aside className="w-full md:w-96 bg-white border border-slate-200 rounded-xl shadow-lg flex flex-col flex-shrink-0">
                    <div className="h-14 border-b border-slate-200 flex items-center p-1">
                        <div className="h-full flex-1 bg-slate-100 rounded relative overflow-hidden"><Shimmer/></div>
                    </div>
                     <div className="p-3 space-y-2 flex-1 relative overflow-hidden divide-y divide-slate-100">
                        {Array.from({length: 4}).map((_, i) => (
                            <div key={i} className="flex items-start gap-4 pt-2">
                                <div className="w-32 h-20 bg-slate-200 rounded-md flex-shrink-0"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-full bg-slate-200 rounded"></div>
                                    <div className="h-3 w-1/2 bg-slate-200 rounded"></div>
                                </div>
                            </div>
                        ))}
                        <Shimmer/>
                    </div>
                </aside>
            </div>
        </div>
    )
}