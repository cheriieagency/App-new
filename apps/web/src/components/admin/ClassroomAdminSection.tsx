'use client';

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  GraduationCap,
  Plus,
  Trash2,
  ImageIcon,
  X,
  Loader2,
  BookOpen,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  FileText,
  Video,
} from 'lucide-react';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import useUpload from '@/utils/useUpload';
import {
  COURSE_CATEGORIES,
  registerManagedCourse,
  type AdminCourse,
  type AdminLesson,
} from '@/lib/mock-classroom-admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FeatureGate } from '@/components/common/FeatureGate';
import { useSubscription } from '@/components/common/useSubscription';
import { UNLIMITED } from '@/lib/config/plans';
import { toast } from 'sonner';
import AdminEmptyState from '@/components/admin/AdminEmptyState';

type ClassroomResponse = {
  courses: AdminCourse[];
  categories: string[];
  demo?: boolean;
};

const EMPTY_FORM = {
  title: '',
  description: '',
  category: 'Marketing',
  cover_image: '' as string,
  video_url: '',
  pdf_url: '' as string,
  pdf_name: '' as string,
  is_published: true,
};

export default function ClassroomAdminSection({
  communityId,
}: {
  communityId?: number;
}) {
  const { locale } = useLocale();
  const queryClient = useQueryClient();
  const { hasFeature, limits, requestUpgrade } = useSubscription();
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [form, setForm] = useState(EMPTY_FORM);
  const [customCategory, setCustomCategory] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDescription, setLessonDescription] = useState('');
  const [lessonVideo, setLessonVideo] = useState('');
  const [lessonPdf, setLessonPdf] = useState<{ url: string; name: string } | null>(null);
  const [lessonVideoName, setLessonVideoName] = useState('');
  const [courseVideoName, setCourseVideoName] = useState('');
  const [upload, { loading: uploading }] = useUpload();
  const coverRef = useRef<HTMLInputElement>(null);
  const coursePdfRef = useRef<HTMLInputElement>(null);
  const courseVideoRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const lessonVideoRef = useRef<HTMLInputElement>(null);

  const queryKey = ['admin-classroom', communityId ?? 'all'] as const;

  const { data, isLoading } = useQuery<ClassroomResponse>({
    queryKey,
    queryFn: async () => {
      const qs = communityId ? `?community_id=${communityId}` : '';
      const r = await fetch(`/api/admin/classroom${qs}`);
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
  });

  const categories = useMemo(() => {
    const list = data?.categories?.length
      ? data.categories
      : [...COURSE_CATEGORIES];
    return Array.from(new Set(list));
  }, [data?.categories]);

  const courses = useMemo(() => {
    const list = data?.courses ?? [];
    if (categoryFilter === 'all') return list;
    return list.filter((c) => c.category === categoryFilter);
  }, [data?.courses, categoryFilter]);

  const mutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const r = await fetch('/api/admin/classroom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        const msg =
          json?.message ||
          json?.error ||
          (r.status === 403 ? 'Upgrade required to save courses' : 'Failed to save');
        throw new Error(typeof msg === 'string' ? msg : 'Failed to save');
      }
      return json;
    },
    onSuccess: (res, variables) => {
      const emptyPrev: ClassroomResponse = {
        courses: [],
        categories: [...COURSE_CATEGORIES],
      };

      queryClient.setQueryData<ClassroomResponse>(queryKey, (prev) => {
        const base = prev ?? emptyPrev;
        const action = String(variables.action);

        if (action === 'create_course') {
          const course: AdminCourse = res.course ?? {
            id: Number(res.id ?? Date.now()),
            title: String(variables.title ?? ''),
            description: (variables.description as string) || null,
            category: String(variables.category || 'General'),
            community_id: communityId ?? null,
            cover_image: (variables.cover_image as string) || null,
            video_url: (variables.video_url as string) || null,
            pdf_url: (variables.pdf_url as string) || null,
            is_published: Boolean(variables.is_published ?? true),
            sort_order: 0,
            lessons: [],
          };
          registerManagedCourse(course);
          const categoriesNext = Array.from(
            new Set([...(base.categories ?? []), course.category])
          );
          return {
            ...base,
            categories: categoriesNext,
            courses: [course, ...(base.courses ?? []).filter((c) => c.id !== course.id)],
          };
        }

        if (action === 'delete_course') {
          const id = Number(variables.id);
          return {
            ...base,
            courses: (base.courses ?? []).filter((c) => c.id !== id),
          };
        }

        if (action === 'toggle_publish' || action === 'update_course') {
          const id = Number(variables.id);
          return {
            ...base,
            courses: (base.courses ?? []).map((c) =>
              c.id === id
                ? {
                    ...c,
                    ...(action === 'toggle_publish'
                      ? { is_published: Boolean(variables.is_published) }
                      : {}),
                    ...(action === 'update_course'
                      ? {
                          title: String(variables.title ?? c.title),
                          description:
                            (variables.description as string) ?? c.description,
                          category: String(variables.category ?? c.category),
                          cover_image:
                            (variables.cover_image as string) ?? c.cover_image,
                        }
                      : {}),
                  }
                : c
            ),
          };
        }

        if (action === 'add_lesson') {
          const courseId = Number(variables.course_id);
          const lesson: AdminLesson = res.lesson ?? {
            id: Date.now(),
            course_id: courseId,
            title: String(variables.title ?? ''),
            description: (variables.description as string) || null,
            video_url: (variables.video_url as string) || null,
            pdf_url: (variables.pdf_url as string) || null,
            order: 99,
            duration_sec: null,
            is_published: true,
          };
          return {
            ...base,
            courses: (base.courses ?? []).map((c) =>
              c.id === courseId
                ? { ...c, lessons: [...(c.lessons ?? []), lesson] }
                : c
            ),
          };
        }

        if (action === 'delete_lesson') {
          const lessonId = Number(variables.id);
          return {
            ...base,
            courses: (base.courses ?? []).map((c) => ({
              ...c,
              lessons: (c.lessons ?? []).filter((l) => l.id !== lessonId),
            })),
          };
        }

        return base;
      });

      if (String(variables.action) === 'create_course') {
        toast.success('Course saved');
      }

      // Soft revalidate — cache already has the new course.
      void queryClient.invalidateQueries({
        queryKey: ['classroom'],
        refetchType: 'none',
      });
      void queryClient.invalidateQueries({
        queryKey: ['admin-classroom'],
        refetchType: 'active',
      });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Could not save course');
    },
  });

  const handleCover = async (file: File) => {
    const result = await upload({ file });
    if (result.url) {
      setForm((f) => ({ ...f, cover_image: result.url! }));
      return;
    }
    setForm((f) => ({ ...f, cover_image: URL.createObjectURL(file) }));
  };

  const handleLessonPdf = async (file: File) => {
    if (file.type && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return;
    }
    const result = await upload({ file });
    if (result.url) {
      setLessonPdf({ url: result.url, name: file.name });
      return;
    }
    setLessonPdf({ url: URL.createObjectURL(file), name: file.name });
  };

  const handleCoursePdf = async (file: File) => {
    if (file.type && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return;
    }
    const result = await upload({ file });
    if (result.url) {
      setForm((f) => ({ ...f, pdf_url: result.url!, pdf_name: file.name }));
      return;
    }
    setForm((f) => ({
      ...f,
      pdf_url: URL.createObjectURL(file),
      pdf_name: file.name,
    }));
  };

  const handleCourseVideo = async (file: File) => {
    if (file.type && !file.type.startsWith('video/')) {
      return;
    }
    const result = await upload({ file });
    const url = result.url || URL.createObjectURL(file);
    setForm((f) => ({ ...f, video_url: url }));
    setCourseVideoName(file.name);
  };

  const handleLessonVideo = async (file: File) => {
    if (file.type && !file.type.startsWith('video/')) {
      return;
    }
    const result = await upload({ file });
    const url = result.url || URL.createObjectURL(file);
    setLessonVideo(url);
    setLessonVideoName(file.name);
  };

  const resetLessonForm = () => {
    setLessonTitle('');
    setLessonDescription('');
    setLessonVideo('');
    setLessonVideoName('');
    setLessonPdf(null);
  };

  const resolvedCategory = () => {
    const custom = customCategory.trim();
    if (custom) return custom;
    return form.category.trim() || categories[0] || 'Marketing';
  };

  const submitCourse = () => {
    if (!form.title.trim()) return;
    if (!communityId) {
      toast.error('Select a community before saving a course');
      return;
    }
    mutation.mutate(
      {
        action: 'create_course',
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: resolvedCategory(),
        community_id: communityId,
        cover_image: form.cover_image || null,
        video_url: form.video_url.trim() || null,
        pdf_url: form.pdf_url || null,
        is_published: form.is_published,
      },
      {
        onSuccess: () => {
          setForm(EMPTY_FORM);
          setCustomCategory('');
          setCourseVideoName('');
          setShowForm(false);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="nc-glass rounded-[1.5rem] p-10 text-center text-sm font-medium text-zinc-400">
        {t('loadingCourses', locale)}
      </div>
    );
  }

  // Demo storage estimate: ~0.8 GB per course video + ~0.4 GB per lesson video.
  const usedGb =
    Math.round(
      (courses.filter((c) => Boolean(c.video_url)).length * 0.8 +
        courses.reduce(
          (sum, c) =>
            sum + (c.lessons?.filter((l) => Boolean(l.video_url)).length ?? 0) * 0.4,
          0
        )) *
        10
    ) / 10;
  const storageCap = limits.maxVideoStorageGb;
  const storageNearLimit =
    storageCap > 0 && storageCap < UNLIMITED && usedGb / storageCap >= 0.9;

  if (!hasFeature('coursesAndVideoHosting')) {
    return (
      <FeatureGate
        feature="coursesAndVideoHosting"
        title="Unlock Classroom & Video Hosting"
        description="Upgrade to Creator to host courses and upload video. Starter supports embeds only (YouTube / Vimeo / Loom)."
      />
    );
  }

  return (
    <div className="space-y-4">
      {storageCap > 0 && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs font-semibold flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${
            storageNearLimit
              ? 'border-amber-200 bg-amber-50 text-amber-900'
              : 'border-slate-200 bg-white text-slate-600'
          }`}
        >
          <span>
            Video storage: {usedGb.toFixed(1)} GB / {storageCap} GB used
            {storageNearLimit ? ' — approaching plan limit' : ''}
          </span>
          {storageNearLimit && (
            <button
              type="button"
              onClick={() => requestUpgrade('pro')}
              className="inline-flex items-center justify-center min-h-[36px] px-3 rounded-lg bg-[#0F172A] text-white text-[11px] font-bold"
            >
              Upgrade for more storage
            </button>
          )}
        </div>
      )}
      {/* Header + filters */}
      <div className="nc-glass rounded-[1.5rem] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between mb-4">
          <div>
            <h3 className="text-sm font-black text-[#2c3340] flex items-center gap-2">
              <GraduationCap size={16} className="text-[var(--nc-coral)]" />
              {t('classroom', locale)}
            </h3>
            <p className="text-xs text-zinc-400 mt-1">{t('classroomAdminHint', locale)}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center justify-center gap-1.5 h-11 min-h-[44px] px-4 rounded-xl bg-[var(--nc-coral)] text-white text-xs font-extrabold"
          >
            {showForm ? (
              <>
                <X size={14} /> {t('cancel', locale)}
              </>
            ) : (
              <>
                <Plus size={14} /> {t('addCourse', locale)}
              </>
            )}
          </button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1 pb-0.5">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`h-10 min-h-[44px] px-3 rounded-xl text-[11px] font-extrabold whitespace-nowrap flex-shrink-0 transition-all ${
              categoryFilter === 'all'
                ? 'bg-[#2c3340] text-white'
                : 'bg-zinc-50 text-zinc-500 hover:bg-zinc-100'
            }`}
          >
            {t('allCategories', locale)}
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`h-10 min-h-[44px] px-3 rounded-xl text-[11px] font-extrabold whitespace-nowrap flex-shrink-0 transition-all ${
                categoryFilter === cat
                  ? 'bg-[#2c3340] text-white'
                  : 'bg-zinc-50 text-zinc-500 hover:bg-zinc-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Create course form */}
      {showForm && (
        <div className="nc-glass rounded-[1.5rem] p-5 space-y-3">
          <h4 className="text-sm font-black text-[#2c3340]">{t('addCourse', locale)}</h4>
          <input
            ref={coverRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleCover(f);
              e.target.value = '';
            }}
          />
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => coverRef.current?.click()}
              disabled={uploading}
              className="w-24 h-24 rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 flex flex-col items-center justify-center gap-1 flex-shrink-0 overflow-hidden hover:border-[var(--nc-coral)] transition-colors"
            >
              {form.cover_image ? (
                <img src={form.cover_image} alt="" className="w-full h-full object-cover" />
              ) : uploading ? (
                <Loader2
                  size={18}
                  className="text-zinc-400"
                  style={{ animation: 'spin 1s linear infinite' }}
                />
              ) : (
                <>
                  <ImageIcon size={18} className="text-zinc-300" />
                  <span className="text-[9px] font-bold text-zinc-400">
                    {t('uploadImage', locale)}
                  </span>
                </>
              )}
            </button>
            <div className="flex-1 space-y-2.5 min-w-0">
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={t('courseTitle', locale)}
                className="rounded-xl border-zinc-200 text-sm h-11"
              />
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={t('description', locale)}
                className="rounded-xl border-zinc-200 text-sm resize-none min-h-[64px]"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                {t('category', locale)}
              </label>
              <select
                value={
                  categories.includes(form.category)
                    ? form.category
                    : categories[0] || 'Marketing'
                }
                onChange={(e) => {
                  setCustomCategory('');
                  setForm((f) => ({ ...f, category: e.target.value }));
                }}
                className="w-full h-11 min-h-[44px] rounded-xl border border-zinc-200 bg-white px-3 text-sm font-extrabold text-[#2c3340] focus:outline-none focus:border-[var(--nc-coral)]"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                {t('orCustomCategory', locale)}
              </label>
              <Input
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder={t('customCategoryPlaceholder', locale)}
                className="rounded-xl border-zinc-200 text-sm h-11"
              />
            </div>
          </div>

          <div className="space-y-2 pt-1 border-t border-zinc-50">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pt-2">
              {t('courseMediaOptional', locale)}
            </p>
            <Input
              value={form.video_url}
              onChange={(e) => {
                setForm((f) => ({ ...f, video_url: e.target.value }));
                setCourseVideoName('');
              }}
              placeholder={t('courseVideoUrl', locale)}
              className="rounded-xl border-zinc-200 text-sm h-11"
            />
            <input
              ref={courseVideoRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleCourseVideo(f);
                e.target.value = '';
              }}
            />
            <input
              ref={coursePdfRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleCoursePdf(f);
                e.target.value = '';
              }}
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => courseVideoRef.current?.click()}
                disabled={uploading}
                className="h-11 min-h-[44px] px-4 rounded-xl border border-zinc-200 bg-white text-xs font-extrabold text-zinc-600 hover:border-[var(--nc-coral)] hover:text-[var(--nc-coral)] inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Video size={14} />
                )}
                {t('addVideo', locale)}
              </button>
              <button
                type="button"
                onClick={() => coursePdfRef.current?.click()}
                disabled={uploading}
                className="h-11 min-h-[44px] px-4 rounded-xl border border-zinc-200 bg-white text-xs font-extrabold text-zinc-600 hover:border-[var(--nc-coral)] hover:text-[var(--nc-coral)] inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <FileText size={14} />
                )}
                {t('addPdf', locale)}
              </button>
            </div>
            {form.video_url ? (
              <div className="flex items-center gap-2 p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
                <Video size={16} className="text-[var(--nc-coral)] flex-shrink-0" />
                <span className="text-xs font-bold text-zinc-600 flex-1 truncate">
                  {courseVideoName || form.video_url}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setForm((f) => ({ ...f, video_url: '' }));
                    setCourseVideoName('');
                  }}
                  className="h-11 w-11 min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-400 hover:text-red-500"
                >
                  <X size={14} />
                </button>
              </div>
            ) : null}
            {form.pdf_url ? (
              <div className="flex items-center gap-2 p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
                <FileText size={16} className="text-[var(--nc-coral)] flex-shrink-0" />
                <span className="text-xs font-bold text-zinc-600 flex-1 truncate">
                  {form.pdf_name || 'PDF'}
                </span>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, pdf_url: '', pdf_name: '' }))}
                  className="h-11 w-11 min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-400 hover:text-red-500"
                >
                  <X size={14} />
                </button>
              </div>
            ) : null}
          </div>

          <label className="flex items-center gap-2 h-11 min-h-[44px] text-xs font-extrabold text-zinc-600 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) =>
                setForm((f) => ({ ...f, is_published: e.target.checked }))
              }
              className="rounded border-zinc-300"
            />
            {t('published', locale)}
          </label>
          <Button
            type="button"
            disabled={!form.title.trim() || mutation.isPending || uploading}
            onClick={submitCourse}
            className="w-full sm:w-auto rounded-full bg-[var(--nc-coral)] text-white font-black h-11 px-6"
          >
            {mutation.isPending ? t('saving', locale) : t('saveCourse', locale)}
          </Button>
        </div>
      )}

      {/* Course list */}
      {courses.length === 0 ? (
        <AdminEmptyState
          icon={GraduationCap}
          headline="No courses yet"
          description="Build your first classroom module for this community — lessons, PDFs, and videos."
          ctaLabel="+ Create First Course"
          onCta={() => setShowForm(true)}
        />
      ) : (
        <div className="space-y-3">
          {courses.map((course) => {
            const open = expandedId === course.id;
            const lessonCount = course.lessons?.length ?? 0;
            return (
              <div key={course.id} className="nc-glass rounded-[1.5rem] overflow-hidden">
                <div className="p-4 sm:p-5 flex items-start gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {course.cover_image ? (
                      <img
                        src={course.cover_image}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <BookOpen size={20} className="text-zinc-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-black text-[#2c3340]">{course.title}</p>
                      <span className="text-[9px] font-black uppercase tracking-wide bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded-full">
                        {course.category || 'General'}
                      </span>
                      <span
                        className={`text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full ${
                          course.is_published
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {course.is_published
                          ? t('published', locale)
                          : t('draft', locale)}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 line-clamp-2">
                      {course.description || t('noDescription', locale)}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <p className="text-[11px] font-bold text-zinc-400">
                        {lessonCount} {t('lessons', locale)}
                      </p>
                      {course.video_url && (
                        <span className="text-[10px] font-extrabold text-zinc-400">
                          ▶ Video
                        </span>
                      )}
                      {course.pdf_url && (
                        <a
                          href={course.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[var(--nc-coral)] hover:underline"
                        >
                          <FileText size={11} /> PDF
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button
                      type="button"
                      disabled={mutation.isPending}
                      onClick={() =>
                        mutation.mutate({
                          action: 'toggle_publish',
                          id: course.id,
                          is_published: !course.is_published,
                        })
                      }
                      className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-zinc-50 hover:bg-zinc-100 text-zinc-500 flex items-center justify-center"
                      title={
                        course.is_published
                          ? t('unpublish', locale)
                          : t('publish', locale)
                      }
                    >
                      {course.is_published ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button
                      type="button"
                      disabled={mutation.isPending}
                      onClick={() => {
                        if (!window.confirm(t('confirmDeleteCourse', locale))) return;
                        mutation.mutate({ action: 'delete_course', id: course.id });
                      }}
                      className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center"
                      title={t('deleteCourse', locale)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setExpandedId(open ? null : course.id)}
                  className="w-full flex items-center justify-between px-5 h-11 min-h-[44px] border-t border-zinc-50 text-xs font-extrabold text-[var(--nc-coral)]"
                >
                  <span>
                    {t('manageLessons', locale)} ({lessonCount})
                  </span>
                  {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {open && (
                  <div className="border-t border-zinc-50 bg-zinc-50/50 px-4 sm:px-5 py-4 space-y-3">
                    {(course.lessons ?? []).length === 0 ? (
                      <p className="text-xs text-zinc-400 font-medium">
                        {t('noLessonsYet', locale)}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {(course.lessons ?? []).map((lesson, idx) => (
                          <div
                            key={lesson.id}
                            className="flex items-start gap-3 bg-white rounded-xl border border-zinc-100 px-3 py-2.5"
                          >
                            <span className="w-7 h-7 rounded-lg bg-[#f2eeff] text-[#6b5bb8] text-[11px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-black text-[#2c3340] truncate">
                                {lesson.title}
                              </p>
                              {lesson.description && (
                                <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2">
                                  {lesson.description}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                {lesson.video_url && (
                                  <span className="text-[10px] font-bold text-zinc-400 truncate max-w-[200px]">
                                    ▶ {lesson.video_url}
                                  </span>
                                )}
                                {lesson.pdf_url && (
                                  <a
                                    href={lesson.pdf_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[var(--nc-coral)] hover:underline"
                                  >
                                    <FileText size={11} /> PDF
                                  </a>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={mutation.isPending}
                              onClick={() => {
                                if (!window.confirm(t('confirmDeleteLesson', locale)))
                                  return;
                                mutation.mutate({
                                  action: 'delete_lesson',
                                  id: lesson.id,
                                });
                              }}
                              className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl hover:bg-red-50 text-zinc-300 hover:text-red-500 flex items-center justify-center flex-shrink-0"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2 pt-1">
                      <input
                        ref={pdfRef}
                        type="file"
                        accept="application/pdf,.pdf"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void handleLessonPdf(f);
                          e.target.value = '';
                        }}
                      />
                      <input
                        ref={lessonVideoRef}
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void handleLessonVideo(f);
                          e.target.value = '';
                        }}
                      />
                      <Input
                        value={expandedId === course.id ? lessonTitle : ''}
                        onChange={(e) => setLessonTitle(e.target.value)}
                        placeholder={t('lessonTitle', locale)}
                        className="rounded-xl border-zinc-200 text-sm h-11"
                      />
                      <Textarea
                        value={expandedId === course.id ? lessonDescription : ''}
                        onChange={(e) => setLessonDescription(e.target.value)}
                        placeholder={t('lessonDescription', locale)}
                        className="rounded-xl border-zinc-200 text-sm resize-none min-h-[72px]"
                      />
                      <Input
                        value={expandedId === course.id ? lessonVideo : ''}
                        onChange={(e) => {
                          setLessonVideo(e.target.value);
                          setLessonVideoName('');
                        }}
                        placeholder={t('lessonVideoUrl', locale)}
                        className="rounded-xl border-zinc-200 text-sm h-11"
                      />
                      {lessonVideo && expandedId === course.id && lessonVideoName ? (
                        <div className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-zinc-100">
                          <Video size={16} className="text-[var(--nc-coral)] flex-shrink-0" />
                          <span className="text-xs font-bold text-zinc-600 flex-1 truncate">
                            {lessonVideoName}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setLessonVideo('');
                              setLessonVideoName('');
                            }}
                            className="h-11 w-11 min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-400 hover:text-red-500"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : null}
                      {lessonPdf && expandedId === course.id && (
                        <div className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-zinc-100">
                          <FileText size={16} className="text-[var(--nc-coral)] flex-shrink-0" />
                          <span className="text-xs font-bold text-zinc-600 flex-1 truncate">
                            {lessonPdf.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => setLessonPdf(null)}
                            className="h-11 w-11 min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-400 hover:text-red-500"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          type="button"
                          onClick={() => lessonVideoRef.current?.click()}
                          disabled={uploading}
                          className="h-11 min-h-[44px] px-4 rounded-xl border border-zinc-200 bg-white text-xs font-extrabold text-zinc-600 hover:border-[var(--nc-coral)] hover:text-[var(--nc-coral)] flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {uploading ? (
                            <Loader2
                              size={14}
                              style={{ animation: 'spin 1s linear infinite' }}
                            />
                          ) : (
                            <Video size={14} />
                          )}
                          {t('addVideo', locale)}
                        </button>
                        <button
                          type="button"
                          onClick={() => pdfRef.current?.click()}
                          disabled={uploading}
                          className="h-11 min-h-[44px] px-4 rounded-xl border border-zinc-200 bg-white text-xs font-extrabold text-zinc-600 hover:border-[var(--nc-coral)] hover:text-[var(--nc-coral)] flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {uploading ? (
                            <Loader2
                              size={14}
                              style={{ animation: 'spin 1s linear infinite' }}
                            />
                          ) : (
                            <FileText size={14} />
                          )}
                          {t('addPdf', locale)}
                        </button>
                        <button
                          type="button"
                          disabled={!lessonTitle.trim() || mutation.isPending || uploading}
                          onClick={() => {
                            mutation.mutate(
                              {
                                action: 'add_lesson',
                                course_id: course.id,
                                title: lessonTitle.trim(),
                                description: lessonDescription.trim() || null,
                                video_url: lessonVideo.trim() || null,
                                pdf_url: lessonPdf?.url ?? null,
                              },
                              { onSuccess: resetLessonForm }
                            );
                          }}
                          className="h-11 min-h-[44px] px-4 rounded-xl bg-[var(--nc-coral)] text-white text-xs font-extrabold disabled:opacity-40 flex items-center justify-center gap-1.5 sm:ml-auto"
                        >
                          <Plus size={14} /> {t('addLesson', locale)}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
