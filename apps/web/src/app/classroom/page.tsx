'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ArrowLeft } from 'lucide-react';
import ClassroomView from '@/components/classroom/ClassroomView';

function ClassroomPageInner() {
  const searchParams = useSearchParams();
  const courseId = searchParams.get('course');
  const initialCourseId = courseId ? Number(courseId) : undefined;

  return (
    <div className="nc-app nc-app-shell min-h-screen">
      <header className="sticky top-0 z-20 px-3 sm:px-4 pt-3 bg-transparent">
        <div className="nc-glass rounded-[1.5rem] max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 h-11 min-h-[44px] text-xs font-extrabold text-zinc-500 hover:text-[#2c3340]"
          >
            <ArrowLeft size={14} /> Dashboard
          </Link>
          <p className="text-sm font-display font-extrabold text-[#2c3340]">Classroom</p>
          <div className="w-20" />
        </div>
      </header>
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-20">
        <ClassroomView initialCourseId={initialCourseId} />
      </main>
    </div>
  );
}

export default function ClassroomPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sm text-zinc-400">
          Laddar...
        </div>
      }
    >
      <ClassroomPageInner />
    </Suspense>
  );
}
