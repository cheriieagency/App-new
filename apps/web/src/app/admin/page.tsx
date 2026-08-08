'use client';

import { useState, useEffect, useCallback, useRef, useId } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  BarChart3,
  Users,
  Calendar,
  ShoppingBag,
  Download,
  Plus,
  Settings,
  TrendingUp,
  FileText,
  Palette,
  CheckCircle2,
  LogOut,
  Sparkles,
  Copy,
  CheckCheck,
  X,
  Shield,
  ShieldCheck,
  ShieldOff,
  Radio,
  Mic,
  Video,
  Activity,
  Send,
  GripVertical,
  Eye,
  EyeOff,
  Link as LinkIcon,
  Crown,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  Save,
  Trash2,
  Edit3,
  Check,
  Smartphone,
  Home,
  Camera,
  Globe as GlobeIcon,
} from 'lucide-react';
import useHandleStreamResponse from '@/utils/useHandleStreamResponse';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import useUpload from '@/utils/useUpload';

type AdminTab = 'analytics' | 'content' | 'moderators' | 'broadcast' | 'biobuilder' | 'customizer';

const THEMES = [
  {
    id: 'nordic',
    label: 'Nordic Minimal',
    bg: '#FAFAFA',
    accent: '#000000',
    desc: 'Ren och minimalistisk',
  },
  { id: 'dark', label: 'Dark Slate', bg: '#0F172A', accent: '#6366F1', desc: 'Djupt och modern' },
  {
    id: 'cyber',
    label: 'Cyber Purple',
    bg: '#1A0533',
    accent: '#A855F7',
    desc: 'Futuristisk och djärv',
  },
  {
    id: 'forest',
    label: 'Forest Green',
    bg: '#F0FDF4',
    accent: '#16A34A',
    desc: 'Naturlig och lugn',
  },
  { id: 'rose', label: 'Rose Gold', bg: '#FFF1F2', accent: '#E11D48', desc: 'Varm och inbjudande' },
];

interface BioBlock {
  id: string;
  type: 'lead_magnet' | 'course' | 'coaching' | 'community' | 'link' | 'divider';
  title: string;
  subtitle: string;
  emoji: string;
  color: string;
  visible: boolean;
  url?: string;
}

interface SocialLink {
  platform: string;
  url: string;
}

const BLOCK_TYPES = [
  {
    type: 'lead_magnet' as const,
    label: 'Lead Magnet',
    emoji: '📘',
    color: '#3B82F6',
    defaultTitle: 'Gratis E-bok',
    defaultSubtitle: 'Ladda ned gratis',
  },
  {
    type: 'course' as const,
    label: 'Kurs',
    emoji: '🎓',
    color: '#8B5CF6',
    defaultTitle: 'Online Kurs',
    defaultSubtitle: '12 lektioner · Börja idag',
  },
  {
    type: 'coaching' as const,
    label: 'Coaching',
    emoji: '🤝',
    color: '#10B981',
    defaultTitle: '1:1 Coaching',
    defaultSubtitle: 'Boka ett samtal',
  },
  {
    type: 'community' as const,
    label: 'Community',
    emoji: '🏠',
    color: '#F59E0B',
    defaultTitle: 'Gå med i Community',
    defaultSubtitle: 'Gratis & öppet',
  },
  {
    type: 'link' as const,
    label: 'Länk',
    emoji: '🔗',
    color: '#6B7280',
    defaultTitle: 'Extern länk',
    defaultSubtitle: 'Klicka för mer info',
  },
  {
    type: 'divider' as const,
    label: 'Avdelare',
    emoji: '—',
    color: '#E5E7EB',
    defaultTitle: '',
    defaultSubtitle: '',
  },
];

const SOCIAL_PLATFORMS = [
  {
    id: 'instagram',
    label: 'Instagram',
    icon: '📸',
    color: '#E1306C',
    prefix: 'https://instagram.com/',
  },
  { id: 'tiktok', label: 'TikTok', icon: '🎵', color: '#010101', prefix: 'https://tiktok.com/@' },
  {
    id: 'youtube',
    label: 'YouTube',
    icon: '▶️',
    color: '#FF0000',
    prefix: 'https://youtube.com/@',
  },
  { id: 'twitter', label: 'X (Twitter)', icon: '𝕏', color: '#000000', prefix: 'https://x.com/' },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    icon: '💼',
    color: '#0A66C2',
    prefix: 'https://linkedin.com/in/',
  },
  {
    id: 'spotify',
    label: 'Podcast / Spotify',
    icon: '🎙️',
    color: '#1DB954',
    prefix: 'https://open.spotify.com/',
  },
  { id: 'custom', label: 'Anpassad URL', icon: '🔗', color: '#6B7280', prefix: '' },
];

// Deterministic ID generator to avoid Math.random() in render path
let _idCounter = 1000;
function nextId() {
  return String(++_idCounter);
}

// Chat simulation data — module-level to avoid useEffect dependency issues
const CHAT_NAMES = ['Emma L.', 'Lars B.', 'Astrid K.', 'Marcus J.', 'Sofia R.', 'Björn H.'];
const CHAT_MSGS = [
  '🔥 Fantastiskt!',
  'Tack för tipsen!',
  'Kan du repetera?',
  '💯 Toppen!',
  'Var köper jag kursen?',
  'Genialt! 🙌',
];

// ── Mobile preview ─────────────────────────────────────────────────────────────
function MobilePreview({
  blocks,
  handle,
  displayName,
  bioText,
  avatarUrl,
  socialLinks,
}: {
  blocks: BioBlock[];
  handle: string;
  displayName: string;
  bioText: string;
  avatarUrl: string;
  socialLinks: SocialLink[];
}) {
  return (
    <div className="flex items-center justify-center py-2">
      <div style={{ width: 240 }}>
        <div className="bg-zinc-900 rounded-[34px] p-2.5 shadow-2xl">
          <div className="bg-white rounded-[26px] overflow-hidden" style={{ height: 490 }}>
            <div className="h-7 bg-zinc-900 flex items-center justify-between px-5">
              <span className="text-white text-[8px] font-bold">9:41</span>
              <div className="w-20 h-3.5 bg-zinc-700 rounded-full" />
              <div className="flex gap-0.5">
                <div className="w-2.5 h-2 bg-white/50 rounded-sm" />
                <div className="w-2 h-2 bg-white/50 rounded-full" />
              </div>
            </div>
            <div
              className="overflow-y-auto px-3 pt-4 pb-4 space-y-2 bg-[#F8F8F8]"
              style={{ height: 463 }}
            >
              <div className="text-center mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-2 overflow-hidden border-2 border-white shadow">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Crown size={18} className="text-white" />
                  )}
                </div>
                <p className="text-[10px] font-black text-zinc-900">
                  {displayName || 'Creator Name'}
                </p>
                <p className="text-[8px] text-zinc-400 font-medium">@{handle || 'creator'}</p>
                <p className="text-[8px] text-zinc-500 mt-1 leading-relaxed px-2">
                  {bioText || 'Bio text here...'}
                </p>
                {socialLinks.length > 0 && (
                  <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
                    {socialLinks.slice(0, 5).map((sl, i) => {
                      const plat =
                        SOCIAL_PLATFORMS.find((p) => p.id === sl.platform) ?? SOCIAL_PLATFORMS[6];
                      return (
                        <div
                          key={i}
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[11px]"
                          style={{ background: `${plat.color}18` }}
                        >
                          {plat.icon}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {blocks
                .filter((b) => b.visible)
                .map((block) => {
                  if (block.type === 'divider')
                    return <div key={block.id} className="h-px bg-zinc-200 mx-2" />;
                  return (
                    <div
                      key={block.id}
                      className="bg-white rounded-xl p-2.5 shadow-sm flex items-center gap-2 border border-zinc-100"
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs flex-shrink-0"
                        style={{ background: `${block.color}18` }}
                      >
                        {block.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black text-zinc-900 truncate">
                          {block.title}
                        </p>
                        <p className="text-[7px] text-zinc-400 truncate">{block.subtitle}</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
        <p className="text-center text-[10px] font-bold text-zinc-400 mt-2">
          app.se/@{handle || 'creator'}
        </p>
      </div>
    </div>
  );
}

// ── Bio drag block ─────────────────────────────────────────────────────────────
function BioDragBlock({
  block,
  index,
  dragging,
  onDragStart,
  onDragOver,
  onDrop,
  onUpdate,
  onDelete,
  onToggle,
}: {
  block: BioBlock;
  index: number;
  dragging: number | null;
  onDragStart: (i: number) => void;
  onDragOver: (i: number) => void;
  onDrop: () => void;
  onUpdate: (i: number, b: Partial<BioBlock>) => void;
  onDelete: (i: number) => void;
  onToggle: (i: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  if (block.type === 'divider') {
    return (
      <div
        draggable
        onDragStart={() => onDragStart(index)}
        onDragOver={(e) => {
          e.preventDefault();
          onDragOver(index);
        }}
        onDrop={onDrop}
        className={`flex items-center gap-3 px-3 py-2 rounded-xl border border-dashed border-zinc-200 group cursor-grab ${dragging === index ? 'opacity-40' : ''}`}
      >
        <GripVertical size={14} className="text-zinc-300" />
        <div className="flex-1 h-px bg-zinc-200" />
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
          Avdelare
        </span>
        <button
          onClick={() => onDelete(index)}
          className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center transition-opacity"
        >
          <X size={10} className="text-red-400" />
        </button>
      </div>
    );
  }
  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(index);
      }}
      onDrop={onDrop}
      className={`group bg-white rounded-2xl border transition-all cursor-grab ${dragging === index ? 'opacity-40 scale-95' : 'hover:border-zinc-200 hover:shadow-sm'} ${block.visible ? 'border-zinc-100' : 'border-dashed border-zinc-200 opacity-60'}`}
    >
      <div className="flex items-center gap-3 p-3">
        <GripVertical size={15} className="text-zinc-300 hover:text-zinc-500 flex-shrink-0" />
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ background: `${block.color}18` }}
        >
          {block.emoji}
        </div>
        {editing ? (
          <div className="flex-1 space-y-1.5">
            <input
              value={block.title}
              onChange={(e) => onUpdate(index, { title: e.target.value })}
              className="w-full text-xs font-black text-zinc-900 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-300"
            />
            <input
              value={block.subtitle}
              onChange={(e) => onUpdate(index, { subtitle: e.target.value })}
              className="w-full text-[10px] text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-300"
            />
            {(block.type === 'link' || block.type === 'lead_magnet') && (
              <input
                value={block.url ?? ''}
                onChange={(e) => onUpdate(index, { url: e.target.value })}
                placeholder="https://..."
                className="w-full text-[10px] text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-300"
              />
            )}
            <div className="flex gap-1.5 flex-wrap">
              {['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6B7280'].map(
                (c) => (
                  <button
                    key={c}
                    onClick={() => onUpdate(index, { color: c })}
                    className={`w-4 h-4 rounded-full transition-transform hover:scale-110 ${block.color === c ? 'ring-2 ring-offset-1 ring-zinc-400 scale-110' : ''}`}
                    style={{ background: c }}
                  />
                )
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-zinc-900 truncate">
              {block.title || '(Inget namn)'}
            </p>
            <p className="text-[10px] text-zinc-400 truncate">{block.subtitle}</p>
          </div>
        )}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setEditing((v) => !v)}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${editing ? 'bg-indigo-100 text-indigo-600' : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'}`}
          >
            {editing ? <Check size={11} /> : <Edit3 size={11} />}
          </button>
          <button
            onClick={() => onToggle(index)}
            className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition-colors"
          >
            {block.visible ? (
              <ToggleRight size={13} className="text-green-500" />
            ) : (
              <ToggleLeft size={13} className="text-zinc-400" />
            )}
          </button>
          <button
            onClick={() => onDelete(index)}
            className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 size={11} className="text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Avatar uploader ────────────────────────────────────────────────────────────
function AvatarUploader({
  avatarUrl,
  onUpdate,
}: {
  avatarUrl: string;
  onUpdate: (url: string) => void;
}) {
  const [upload, { loading: uploading }] = useUpload();
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(avatarUrl);
  useEffect(() => {
    setPreviewUrl(avatarUrl);
  }, [avatarUrl]);
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    const result = await upload({ file });
    if (result.url) {
      onUpdate(result.url);
      setPreviewUrl(result.url);
    } else if (result.error) {
      console.error('Upload error:', result.error);
      setPreviewUrl(avatarUrl);
    }
    e.target.value = '';
  };
  return (
    <div className="flex items-center gap-5">
      <div className="relative flex-shrink-0">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg ring-2 ring-zinc-100">
          {previewUrl ? (
            <img src={previewUrl} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <Crown size={28} className="text-white" />
          )}
        </div>
        {uploading && (
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
            <div
              className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
              style={{ animation: 'spin 1s linear infinite' }}
            />
          </div>
        )}
      </div>
      <div className="space-y-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all disabled:opacity-60 active:scale-95"
        >
          <Camera size={13} /> {previewUrl ? 'Byt foto' : 'Ladda upp foto'}
        </button>
        {previewUrl && (
          <button
            type="button"
            onClick={() => {
              setPreviewUrl('');
              onUpdate('');
            }}
            className="flex items-center gap-2 h-9 px-4 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 text-xs font-black transition-all border border-red-100"
          >
            <X size={12} /> Ta bort
          </button>
        )}
        <p className="text-[10px] text-zinc-400 font-medium">JPG, PNG eller WebP · Max 5 MB</p>
      </div>
    </div>
  );
}

// ── Social links editor ────────────────────────────────────────────────────────
function SocialLinksEditor({
  links,
  onChange,
}: {
  links: SocialLink[];
  onChange: (links: SocialLink[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newPlatform, setNewPlatform] = useState('instagram');
  const [newUrl, setNewUrl] = useState('');
  const handleAdd = () => {
    if (!newUrl.trim()) return;
    const platform = SOCIAL_PLATFORMS.find((p) => p.id === newPlatform);
    let finalUrl = newUrl.trim();
    if (platform && platform.prefix && !finalUrl.startsWith('http'))
      finalUrl = platform.prefix + finalUrl.replace('@', '');
    onChange([...links, { platform: newPlatform, url: finalUrl }]);
    setNewUrl('');
    setAdding(false);
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
          <span>🌐</span> Sociala Medier-länkar
        </h4>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 h-7 px-3 rounded-xl bg-blue-100 text-blue-600 text-[11px] font-black hover:bg-blue-200 transition-colors"
          >
            <Plus size={11} /> Lägg till länk
          </button>
        )}
      </div>
      <div className="space-y-2 mb-3">
        {links.length === 0 && !adding && (
          <div className="text-center py-5 text-zinc-300">
            <GlobeIcon size={20} className="mx-auto mb-1.5" />
            <p className="text-xs font-bold">Inga sociala medielänkar ännu</p>
            <p className="text-[10px]">Lägg till din första länk</p>
          </div>
        )}
        {links.map((link, i) => {
          const plat = SOCIAL_PLATFORMS.find((p) => p.id === link.platform) ?? SOCIAL_PLATFORMS[6];
          return (
            <div
              key={i}
              className="flex items-center gap-2 p-2 rounded-xl bg-zinc-50 border border-zinc-100 group"
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                style={{ background: `${plat.color}15` }}
              >
                <span>{plat.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-0.5">
                  {plat.label}
                </p>
                <input
                  value={link.url}
                  onChange={(e) =>
                    onChange(links.map((l, idx) => (idx === i ? { ...l, url: e.target.value } : l)))
                  }
                  className="w-full text-xs text-zinc-700 bg-transparent focus:outline-none truncate"
                  placeholder="https://..."
                />
              </div>
              <button
                onClick={() => onChange(links.filter((_, idx) => idx !== i))}
                className="w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              >
                <X size={10} className="text-red-400" />
              </button>
            </div>
          );
        })}
      </div>
      {adding && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 space-y-3">
          <div>
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1.5">
              Välj plattform
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {SOCIAL_PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setNewPlatform(p.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all ${newPlatform === p.id ? 'border-indigo-400 bg-white shadow-sm' : 'border-zinc-200 bg-white hover:border-zinc-300'}`}
                >
                  <span className="text-base">{p.icon}</span>
                  <span className="text-[9px] font-bold text-zinc-600 leading-tight">
                    {p.label.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1.5">
              URL eller användarnamn
            </label>
            <input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder={
                SOCIAL_PLATFORMS.find((p) => p.id === newPlatform)?.prefix ?? 'https://...'
              }
              className="w-full h-9 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-medium focus:outline-none focus:border-indigo-300"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
                if (e.key === 'Escape') setAdding(false);
              }}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!newUrl.trim()}
              className="flex-1 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black disabled:opacity-40 transition-all flex items-center justify-center gap-1.5"
            >
              <Plus size={12} /> Lägg till
            </button>
            <button
              onClick={() => {
                setAdding(false);
                setNewUrl('');
              }}
              className="h-9 px-4 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-500 hover:bg-zinc-50 transition-colors"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main admin page ────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { locale } = useLocale();
  const [activeTab, setActiveTab] = useState<AdminTab>('analytics');
  const [activeTheme, setActiveTheme] = useState('nordic');
  const [saved, setSaved] = useState('');

  // Forms
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    type: 'ebook',
  });
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    start_time: '',
    stream_url: '',
    speaker_name: '',
  });
  const [postForm, setPostForm] = useState({ content: '' });
  const [bioForm, setBioForm] = useState({ name: '', bio: '', handle: '' });

  // Moderators
  const [searchMember, setSearchMember] = useState('');

  // useId gives a stable unique ID that matches between server and client
  const uid = useId();

  // Broadcast — NO Math.random() in render path; all randomness is in useEffect
  const [liveTitle, setLiveTitle] = useState('');
  const [streamKey, setStreamKey] = useState('nc-live-xxxxxxxx');
  const [isLive, setIsLive] = useState(false);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [liveChat, setLiveChat] = useState<{ name: string; msg: string }[]>([]);
  const [chatMsg, setChatMsg] = useState('');
  const [keyCopied, setKeyCopied] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  // Bio builder
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [blocks, setBlocks] = useState<BioBlock[]>([
    {
      id: '1',
      type: 'lead_magnet',
      title: 'Gratis E-bok',
      subtitle: 'Ladda ned gratis',
      emoji: '📘',
      color: '#3B82F6',
      visible: true,
    },
    {
      id: '2',
      type: 'course',
      title: 'Kurs: Nordic Creator',
      subtitle: 'Onlinekurs · 12 lektioner',
      emoji: '🎓',
      color: '#8B5CF6',
      visible: true,
    },
    {
      id: '3',
      type: 'coaching',
      title: '1:1 Coaching',
      subtitle: 'Boka ett samtal',
      emoji: '🤝',
      color: '#10B981',
      visible: true,
    },
    {
      id: '4',
      type: 'community',
      title: 'Gå med i Community',
      subtitle: 'Gratis & öppet',
      emoji: '🏠',
      color: '#F59E0B',
      visible: true,
    },
  ]);
  const [bioHandle, setBioHandle] = useState('');
  const [bioDisplayName, setBioDisplayName] = useState('');
  const [bioBioText, setBioBioText] = useState('');
  const [bioAvatarUrl, setBioAvatarUrl] = useState('');
  const [bioLinkCopied, setBioLinkCopied] = useState(false);
  const [bioSaved, setBioSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [addBlockOpen, setAddBlockOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Set stream key once on mount using stable uid (no Math.random / Date.now in render path)
  useEffect(() => {
    const safe = uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'nclivekey';
    setStreamKey(`nc-live-${safe}`);
  }, [uid]);

  // Broadcast simulation — cycle through predefined values (no Math.random)
  const chatTickRef = useRef(0);

  useEffect(() => {
    if (!isLive) return;
    const timer = setInterval(() => {
      setAttendeeCount((n) => n + 3);
      chatTickRef.current += 1;
      if (chatTickRef.current % 2 === 0) {
        const nameIdx = chatTickRef.current % CHAT_NAMES.length;
        const msgIdx = (chatTickRef.current + 1) % CHAT_MSGS.length;
        setLiveChat((prev) => [
          ...prev.slice(-30),
          { name: CHAT_NAMES[nameIdx], msg: CHAT_MSGS[msgIdx] },
        ]);
      }
    }, 1800);
    return () => clearInterval(timer);
  }, [isLive]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [liveChat]);

  // AI Copilot
  const [showCreatorAI, setShowCreatorAI] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiOutput, setAiOutput] = useState('');
  const [aiStreamingOutput, setAiStreamingOutput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCopied, setAiCopied] = useState(false);
  const handleFinishAI = useCallback((msg: string) => {
    setAiOutput(msg);
    setAiStreamingOutput('');
    setAiLoading(false);
  }, []);
  const handleAIStream = useHandleStreamResponse({
    onChunk: setAiStreamingOutput,
    onFinish: handleFinishAI,
  });

  // Bio block handlers
  const handleDragStart = (i: number) => setDragIndex(i);
  const handleDragOver = (i: number) => setDragOverIndex(i);
  const handleDrop = () => {
    if (dragIndex === null || dragOverIndex === null || dragIndex === dragOverIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const arr = [...blocks];
    const [m] = arr.splice(dragIndex, 1);
    arr.splice(dragOverIndex, 0, m);
    setBlocks(arr);
    setDragIndex(null);
    setDragOverIndex(null);
  };
  const updateBlock = (i: number, patch: Partial<BioBlock>) =>
    setBlocks((prev) => prev.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  const toggleBlock = (i: number) =>
    setBlocks((prev) => prev.map((b, idx) => (idx === i ? { ...b, visible: !b.visible } : b)));
  const deleteBlock = (i: number) => setBlocks((prev) => prev.filter((_, idx) => idx !== i));
  const addBlock = (type: BioBlock['type']) => {
    const def = BLOCK_TYPES.find((bt) => bt.type === type) ?? BLOCK_TYPES[0];
    setBlocks((prev) => [
      ...prev,
      {
        id: nextId(),
        type,
        title: def.defaultTitle,
        subtitle: def.defaultSubtitle,
        emoji: def.emoji,
        color: def.color,
        visible: true,
      },
    ]);
    setAddBlockOpen(false);
  };

  // Queries
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const r = await fetch('/api/admin/stats');
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    enabled: !!session,
  });
  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const r = await fetch('/api/products');
      const data = await r.json();
      // API may return [] on success or `{ error }` on failure — always normalize.
      if (!r.ok || !Array.isArray(data)) return [];
      return data;
    },
  });
  const { data: moderatorData } = useQuery({
    queryKey: ['moderators'],
    enabled: !!session && activeTab === 'moderators',
    queryFn: async () => {
      const r = await fetch('/api/admin/moderators');
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
  });
  const { data: bioData } = useQuery({
    queryKey: ['bio'],
    enabled: !!session && activeTab === 'biobuilder',
    queryFn: async () => {
      const r = await fetch('/api/admin/bio');
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
  });

  useEffect(() => {
    if (bioData) {
      if (bioData.blocks?.length) setBlocks(bioData.blocks);
      if (bioData.handle) setBioHandle(bioData.handle);
      if (bioData.display_name) setBioDisplayName(bioData.display_name);
      if (bioData.bio_text) setBioBioText(bioData.bio_text);
      if (bioData.avatar_url) setBioAvatarUrl(bioData.avatar_url);
      if (bioData.social_links?.length) setSocialLinks(bioData.social_links);
    }
  }, [bioData]);

  // Mutations
  const addProductMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...productForm, price: Number(productForm.price) }),
      });
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setProductForm({ name: '', description: '', price: '', type: 'ebook' });
      setSaved('product');
      setTimeout(() => setSaved(''), 2200);
    },
  });
  const addEventMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventForm),
      });
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setEventForm({
        title: '',
        description: '',
        start_time: '',
        stream_url: '',
        speaker_name: '',
      });
      setSaved('event');
      setTimeout(() => setSaved(''), 2200);
    },
  });
  const addPostMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch('/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postForm),
      });
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      setPostForm({ content: '' });
      setSaved('post');
      setTimeout(() => setSaved(''), 2200);
    },
  });
  const moderatorMutation = useMutation({
    mutationFn: async ({ user_id, action }: { user_id: string; action: 'assign' | 'remove' }) => {
      const r = await fetch('/api/admin/moderators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id, community_id: 1, action }),
      });
      return r.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['moderators'] }),
  });
  const saveBioMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch('/api/admin/bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blocks,
          handle: bioHandle,
          display_name: bioDisplayName,
          bio_text: bioBioText,
          avatar_url: bioAvatarUrl,
          social_links: socialLinks,
        }),
      });
      return r.json();
    },
    onSuccess: () => {
      setBioSaved(true);
      setTimeout(() => setBioSaved(false), 2500);
    },
  });

  const exportEmails = () => {
    if (typeof document === 'undefined') return;
    if (!stats?.emails?.length) return;
    const csv = ['Email,Name,Joined']
      .concat(stats.emails.map((e: any) => `${e.email},${e.name},${e.created_at}`))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nordic-creator-members.csv';
    a.click();
  };

  const runCreatorAI = async (action: string) => {
    setAiLoading(true);
    setAiOutput('');
    setAiStreamingOutput('');
    try {
      const res = await fetch('/api/ai/creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, topic: aiTopic }),
      });
      if (!res.ok) throw new Error('AI request failed');
      handleAIStream(res);
    } catch (err) {
      console.error(err);
      setAiLoading(false);
    }
  };

  const startBroadcast = useCallback(() => {
    setAttendeeCount(28);
    setLiveChat([]);
    chatTickRef.current = 0;
    setIsLive(true);
  }, []);

  const moderators = (moderatorData?.moderators ?? []) as any[];
  const allMembers = (moderatorData?.members ?? []) as any[];
  const members = searchMember
    ? allMembers.filter(
        (m: any) =>
          m.name?.toLowerCase().includes(searchMember.toLowerCase()) ||
          m.email?.toLowerCase().includes(searchMember.toLowerCase())
      )
    : allMembers;

  if (isPending)
    return (
      <div className="min-h-screen flex items-center justify-center font-plus-jakarta-sans text-zinc-400">
        {t('loading', locale)}
      </div>
    );
  if (!session) {
    router.push('/account/signin');
    return null;
  }

  const TABS: { key: AdminTab; label: string; icon: React.ElementType }[] = [
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'content', label: 'Content', icon: FileText },
    { key: 'moderators', label: 'Moderatorer', icon: Shield },
    { key: 'broadcast', label: 'Sänd Live', icon: Radio },
    { key: 'biobuilder', label: 'Bio Builder', icon: Smartphone },
    { key: 'customizer', label: 'Customizer', icon: Palette },
  ];

  return (
    <div className="min-h-screen bg-[#F4F4F6] font-plus-jakarta-sans">
      {/* ── Header ── */}
      <header className="bg-white border-b border-zinc-100 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <Crown size={14} className="text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-black text-zinc-900 leading-none">
                {t('creatorAdmin', locale)}
              </p>
              <p className="text-[10px] text-zinc-400 font-medium mt-0.5">{session.user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreatorAI(true)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-black transition-all shadow-sm"
            >
              <Sparkles size={13} /> {t('aiCopilot', locale)}
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              <Home size={12} className="hidden sm:inline" />{' '}
              <span className="hidden sm:inline">{t('dashboard', locale)}</span>
            </button>
            <button
              onClick={() =>
                authClient.signOut({ fetchOptions: { onSuccess: () => router.push('/') } })
              }
              className="w-8 h-8 rounded-xl border border-zinc-200 flex items-center justify-center text-zinc-400 hover:bg-zinc-50 hover:text-zinc-700 transition-colors"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-0.5 overflow-x-auto scrollbar-none pb-0">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-[11px] sm:text-xs font-black whitespace-nowrap border-b-2 transition-all flex-shrink-0 ${activeTab === key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-zinc-400 hover:text-zinc-700'}`}
            >
              <Icon size={12} /> {label}
              {key === 'broadcast' && isLive && (
                <span
                  className="w-1.5 h-1.5 bg-red-500 rounded-full"
                  style={{ animation: 'livePulse 1s ease-in-out infinite' }}
                />
              )}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-16">
        {/* ── ANALYTICS ── */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: t('totalRevenue', locale),
                  value: `${stats?.revenue ?? 0} SEK`,
                  icon: TrendingUp,
                  color: '#10B981',
                },
                {
                  label: t('activeMembers', locale),
                  value: stats?.members ?? 0,
                  icon: Users,
                  color: '#3B82F6',
                },
                {
                  label: t('eventRsvps', locale),
                  value: stats?.rsvps ?? 0,
                  icon: Calendar,
                  color: '#8B5CF6',
                },
                {
                  label: 'Produkter',
                  value: stats?.products ?? 0,
                  icon: ShoppingBag,
                  color: '#F59E0B',
                },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.label}
                    className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                        {s.label}
                      </p>
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ background: `${s.color}18` }}
                      >
                        <Icon size={14} style={{ color: s.color }} />
                      </div>
                    </div>
                    <p className="text-2xl font-black text-zinc-900">{s.value}</p>
                  </div>
                );
              })}
            </div>
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-sm font-black text-zinc-900">
                    {t('revenueOverview', locale)}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">{t('last7days', locale)}</p>
                </div>
                <p className="text-xs text-green-500 font-black">{t('vsLastWeek', locale)}</p>
              </div>
              <div className="flex items-end gap-2 h-28">
                {[40, 65, 45, 80, 60, 90, 75].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-lg"
                      style={{
                        height: `${h}%`,
                        background: 'linear-gradient(180deg, #818CF8, #6366F1)',
                      }}
                    />
                    <span className="text-[9px] font-bold text-zinc-400">
                      {['M', 'T', 'O', 'T', 'F', 'L', 'S'][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-50">
                <div>
                  <h3 className="text-sm font-black text-zinc-900">{t('emailList', locale)}</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {stats?.members ?? 0} {t('registered', locale)}
                  </p>
                </div>
                <Button
                  onClick={exportEmails}
                  size="sm"
                  className="rounded-xl bg-zinc-900 text-white font-bold flex items-center gap-2 h-8 text-xs"
                >
                  <Download size={12} /> {t('exportCsv', locale)}
                </Button>
              </div>
              <div className="divide-y divide-zinc-50">
                {(stats?.emails ?? []).slice(0, 8).map((e: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 px-6 py-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-sm font-black text-indigo-600 flex-shrink-0">
                      {e.name?.[0] ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-zinc-900 truncate">{e.name}</p>
                      <p className="text-xs text-zinc-400 truncate">{e.email}</p>
                    </div>
                    <p className="text-xs text-zinc-300 flex-shrink-0">
                      {e.created_at?.slice(0, 10)}
                    </p>
                  </div>
                ))}
                {!stats?.emails?.length && (
                  <div className="py-10 text-center text-sm text-zinc-400">Inga members ännu</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── CONTENT ── */}
        {activeTab === 'content' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
              <h3 className="text-sm font-black text-zinc-900 mb-4 flex items-center gap-2">
                <ShoppingBag size={14} /> {t('addProduct', locale)}
              </h3>
              <div className="space-y-3">
                <Input
                  placeholder={t('productName', locale)}
                  value={productForm.name}
                  onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))}
                  className="rounded-xl bg-zinc-50 border-zinc-100"
                />
                <Textarea
                  placeholder={t('description', locale)}
                  value={productForm.description}
                  onChange={(e) => setProductForm((p) => ({ ...p, description: e.target.value }))}
                  className="rounded-xl bg-zinc-50 border-zinc-100 min-h-[80px] resize-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder={t('price', locale)}
                    value={productForm.price}
                    onChange={(e) => setProductForm((p) => ({ ...p, price: e.target.value }))}
                    className="rounded-xl bg-zinc-50 border-zinc-100"
                  />
                  <select
                    value={productForm.type}
                    onChange={(e) => setProductForm((p) => ({ ...p, type: e.target.value }))}
                    className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 text-sm text-zinc-700 focus:outline-none"
                  >
                    {['ebook', 'course', 'coaching', 'community'].map((tp) => (
                      <option key={tp} value={tp}>
                        {tp}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  onClick={() => addProductMutation.mutate()}
                  disabled={!productForm.name || addProductMutation.isPending}
                  className="w-full rounded-xl bg-zinc-900 text-white font-black h-10 flex items-center justify-center gap-2"
                >
                  {saved === 'product' ? (
                    <>
                      <CheckCircle2 size={14} /> {t('saved', locale)}
                    </>
                  ) : (
                    <>
                      <Plus size={14} /> {t('addProductBtn', locale)}
                    </>
                  )}
                </Button>
              </div>
              <div className="mt-4 space-y-2">
                {(Array.isArray(products) ? products : []).slice(0, 5).map((p: any) => (
                  <div key={p.id} className="flex items-center gap-2 p-2 rounded-xl bg-zinc-50">
                    <ShoppingBag size={11} className="text-zinc-400 flex-shrink-0" />
                    <p className="text-xs font-bold text-zinc-700 flex-1 truncate">{p.name}</p>
                    <span className="text-xs font-black text-zinc-400">
                      {p.price === 0 ? t('freeLabel', locale) : `${Math.round(p.price)} SEK`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
              <h3 className="text-sm font-black text-zinc-900 mb-4 flex items-center gap-2">
                <Calendar size={14} /> {t('scheduleEvent', locale)}
              </h3>
              <div className="space-y-3">
                <Input
                  placeholder={t('eventTitle', locale)}
                  value={eventForm.title}
                  onChange={(e) => setEventForm((p) => ({ ...p, title: e.target.value }))}
                  className="rounded-xl bg-zinc-50 border-zinc-100"
                />
                <Textarea
                  placeholder={t('description', locale)}
                  value={eventForm.description}
                  onChange={(e) => setEventForm((p) => ({ ...p, description: e.target.value }))}
                  className="rounded-xl bg-zinc-50 border-zinc-100 min-h-[70px] resize-none"
                />
                <Input
                  type="datetime-local"
                  value={eventForm.start_time}
                  onChange={(e) => setEventForm((p) => ({ ...p, start_time: e.target.value }))}
                  className="rounded-xl bg-zinc-50 border-zinc-100"
                />
                <Input
                  placeholder={t('streamUrl', locale)}
                  value={eventForm.stream_url}
                  onChange={(e) => setEventForm((p) => ({ ...p, stream_url: e.target.value }))}
                  className="rounded-xl bg-zinc-50 border-zinc-100"
                />
                <Input
                  placeholder={t('speakerName', locale)}
                  value={eventForm.speaker_name}
                  onChange={(e) => setEventForm((p) => ({ ...p, speaker_name: e.target.value }))}
                  className="rounded-xl bg-zinc-50 border-zinc-100"
                />
                <Button
                  onClick={() => addEventMutation.mutate()}
                  disabled={!eventForm.title || !eventForm.start_time || addEventMutation.isPending}
                  className="w-full rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-black h-10 flex items-center justify-center gap-2"
                >
                  {saved === 'event' ? (
                    <>
                      <CheckCircle2 size={14} /> {t('saved', locale)}
                    </>
                  ) : (
                    <>
                      <Calendar size={14} /> {t('scheduleEventBtn', locale)}
                    </>
                  )}
                </Button>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6 lg:col-span-2">
              <h3 className="text-sm font-black text-zinc-900 mb-4 flex items-center gap-2">
                <FileText size={14} /> {t('communityPost', locale)}
              </h3>
              <Textarea
                placeholder={t('communityPlaceholder', locale)}
                value={postForm.content}
                onChange={(e) => setPostForm({ content: e.target.value })}
                className="rounded-xl bg-zinc-50 border-zinc-100 min-h-[120px] resize-none mb-3"
              />
              <Button
                onClick={() => addPostMutation.mutate()}
                disabled={!postForm.content || addPostMutation.isPending}
                className="rounded-xl bg-zinc-900 text-white font-black h-10 px-6 flex items-center gap-2"
              >
                {saved === 'post' ? (
                  <>
                    <CheckCircle2 size={14} /> {t('publishedPost', locale)}
                  </>
                ) : (
                  <>
                    <Send size={14} /> {t('publishPost', locale)}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── MODERATORS ── */}
        {activeTab === 'moderators' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-zinc-50">
                <h3 className="text-sm font-black text-zinc-900 mb-3 flex items-center gap-2">
                  <Users size={14} className="text-blue-500" /> {t('chooseModerators', locale)}
                </h3>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={t('searchMembers', locale)}
                    value={searchMember}
                    onChange={(e) => setSearchMember(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 rounded-xl border border-zinc-200 text-xs bg-zinc-50 focus:outline-none focus:border-indigo-300"
                  />
                  <Users
                    size={13}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                  />
                </div>
              </div>
              <div className="divide-y divide-zinc-50 max-h-[420px] overflow-y-auto">
                {members.length === 0 ? (
                  <div className="py-12 text-center text-zinc-400 text-sm font-medium">
                    {allMembers.length === 0 ? t('loading', locale) : 'Inga träffar'}
                  </div>
                ) : (
                  members.map((m: any) => {
                    const isMod = moderators.some((mod: any) => mod.user_id === m.id);
                    return (
                      <div
                        key={m.id}
                        className={`flex items-center gap-3 px-5 py-3.5 hover:bg-zinc-50 transition-colors ${isMod ? 'bg-violet-50/40' : ''}`}
                      >
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-sm font-black text-indigo-600 flex-shrink-0">
                          {m.name?.[0] ?? '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-black text-zinc-900 truncate">{m.name}</p>
                            {isMod && (
                              <span className="flex items-center gap-0.5 text-[9px] font-black text-violet-600 bg-violet-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                <ShieldCheck size={8} /> MOD
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 truncate">{m.email}</p>
                        </div>
                        <button
                          onClick={() =>
                            moderatorMutation.mutate({
                              user_id: m.id,
                              action: isMod ? 'remove' : 'assign',
                            })
                          }
                          disabled={moderatorMutation.isPending}
                          className={`flex items-center gap-1 h-8 px-3 rounded-xl text-xs font-black transition-all disabled:opacity-60 flex-shrink-0 ${isMod ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-violet-100 text-violet-600 hover:bg-violet-200'}`}
                        >
                          {isMod ? (
                            <>
                              <ShieldOff size={11} /> {t('remove', locale)}
                            </>
                          ) : (
                            <>
                              <ShieldCheck size={11} /> {t('assign', locale)}
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-zinc-50">
                  <h3 className="text-sm font-black text-zinc-900 flex items-center gap-2">
                    <ShieldCheck size={14} className="text-violet-500" />{' '}
                    {t('activeModerators', locale)}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    {moderators.length} {t('moderatorsAssigned', locale)}
                  </p>
                </div>
                {moderators.length === 0 ? (
                  <div className="py-10 text-center">
                    <Shield size={28} className="text-zinc-200 mx-auto mb-2" />
                    <p className="text-sm text-zinc-400">{t('noModeratorsYet', locale)}</p>
                    <p className="text-xs text-zinc-300 mt-1">{t('chooseFromList', locale)}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-50">
                    {moderators.map((mod: any) => (
                      <div key={mod.user_id} className="flex items-center gap-3 px-5 py-3.5">
                        <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center text-sm font-black text-violet-600 flex-shrink-0">
                          {mod.name?.[0] ?? '?'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-black text-zinc-900">{mod.name}</p>
                            <span className="text-[9px] font-black text-violet-600 bg-violet-100 px-1.5 py-0.5 rounded-full">
                              MOD
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            moderatorMutation.mutate({ user_id: mod.user_id, action: 'remove' })
                          }
                          className="w-7 h-7 rounded-xl bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-400 transition-colors"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-violet-50 border border-violet-100 rounded-2xl p-5">
                <h4 className="text-xs font-black text-violet-800 mb-3 flex items-center gap-2">
                  <Shield size={11} /> {t('moderatorPerms', locale)}
                </h4>
                {[
                  t('pinPosts', locale),
                  t('deleteComments', locale),
                  t('hideInappropriate', locale),
                  t('seeReported', locale),
                  t('moderateLiveChat', locale),
                ].map((p) => (
                  <div key={p} className="flex items-center gap-2 text-xs text-violet-700 mb-1.5">
                    <Check size={10} className="text-violet-500 flex-shrink-0" /> {p}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── BROADCAST STUDIO ── */}
        {activeTab === 'broadcast' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-zinc-900 rounded-2xl overflow-hidden">
                <div className="aspect-video bg-zinc-950 flex items-center justify-center relative">
                  {isLive ? (
                    <div className="text-center text-white">
                      <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-3">
                        <Radio
                          size={32}
                          className="text-red-400"
                          style={{ animation: 'livePulse 1s ease-in-out infinite' }}
                        />
                      </div>
                      <p className="text-lg font-black">{liveTitle || 'Live Sändning'}</p>
                      <div className="flex items-center justify-center gap-2 mt-2">
                        <span className="flex items-center gap-1.5 bg-red-500 text-white text-xs font-black px-3 py-1 rounded-full">
                          <div
                            className="w-1.5 h-1.5 bg-white rounded-full"
                            style={{ animation: 'livePulse 1s ease-in-out infinite' }}
                          />{' '}
                          LIVE
                        </span>
                        <span className="flex items-center gap-1.5 bg-white/10 text-white text-xs font-bold px-3 py-1 rounded-full">
                          <Users size={11} /> {attendeeCount} {t('viewers', locale).toLowerCase()}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Video size={48} className="text-zinc-700 mx-auto mb-3" strokeWidth={1} />
                      <p className="text-zinc-500 text-sm font-bold">
                        {t('readyToBroadcast', locale)}
                      </p>
                    </div>
                  )}
                </div>
                <div className="p-4 flex items-center gap-3">
                  <button className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                    <Mic size={15} className="text-white" />
                  </button>
                  <button className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                    <Video size={15} className="text-white" />
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={() => {
                      if (isLive) {
                        setIsLive(false);
                      } else {
                        startBroadcast();
                      }
                    }}
                    className={`flex items-center gap-2 h-10 px-5 rounded-xl font-black text-sm transition-all ${isLive ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
                  >
                    <Radio size={13} />{' '}
                    {isLive ? t('endBroadcast', locale) : t('startBroadcast', locale)}
                  </button>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
                <h3 className="text-sm font-black text-zinc-900 mb-4 flex items-center gap-2">
                  <Activity size={14} className="text-red-500" /> {t('broadcastSettings', locale)}
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                      {t('broadcastTitle', locale)}
                    </label>
                    <Input
                      value={liveTitle}
                      onChange={(e) => setLiveTitle(e.target.value)}
                      placeholder={t('broadcastTitlePlaceholder', locale)}
                      className="rounded-xl border-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                      {t('streamKeyLabel', locale)}
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={streamKey}
                        readOnly
                        className="rounded-xl border-zinc-200 font-mono text-xs bg-zinc-50 flex-1"
                      />
                      <button
                        onClick={async () => {
                          await navigator.clipboard.writeText(streamKey);
                          setKeyCopied(true);
                          setTimeout(() => setKeyCopied(false), 2000);
                        }}
                        className={`h-10 px-3 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${keyCopied ? 'bg-green-100 text-green-600' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'}`}
                      >
                        {keyCopied ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-black text-zinc-900">{attendeeCount}</p>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        {t('viewers', locale)}
                      </p>
                    </div>
                    <div className="bg-zinc-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-black text-zinc-900">{liveChat.length}</p>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        {t('chatMessages', locale)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div
              className="bg-white rounded-2xl border border-zinc-100 shadow-sm flex flex-col overflow-hidden"
              style={{ height: 560 }}
            >
              <div className="p-4 border-b border-zinc-50 flex items-center gap-2 flex-shrink-0">
                <Radio size={13} className={isLive ? 'text-red-500' : 'text-zinc-300'} />
                <h3 className="text-sm font-black text-zinc-900">{t('liveChat', locale)}</h3>
                {isLive && (
                  <span className="ml-auto text-[10px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                    LIVE
                  </span>
                )}
              </div>
              <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {liveChat.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center">
                    <div>
                      <Radio size={28} className="text-zinc-200 mx-auto mb-2" />
                      <p className="text-sm text-zinc-400 font-medium">
                        {isLive ? t('waitingMessages', locale) : t('startForChat', locale)}
                      </p>
                    </div>
                  </div>
                ) : (
                  liveChat.map((msg, i) => (
                    <div key={i} className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-black text-indigo-600 flex-shrink-0">
                        {msg.name[0]}
                      </div>
                      <div>
                        <span className="text-xs font-black text-indigo-600">{msg.name}: </span>
                        <span className="text-xs text-zinc-600">{msg.msg}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-3 border-t border-zinc-50 flex gap-2 flex-shrink-0">
                <input
                  value={chatMsg}
                  onChange={(e) => setChatMsg(e.target.value)}
                  placeholder={t('writeToAudience', locale)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && chatMsg.trim()) {
                      setLiveChat((p) => [...p, { name: session.user.name, msg: chatMsg }]);
                      setChatMsg('');
                    }
                  }}
                  className="flex-1 h-9 rounded-xl bg-zinc-50 border border-zinc-200 px-3 text-xs focus:outline-none focus:border-indigo-300"
                />
                <button
                  onClick={() => {
                    if (chatMsg.trim()) {
                      setLiveChat((p) => [...p, { name: session.user.name, msg: chatMsg }]);
                      setChatMsg('');
                    }
                  }}
                  disabled={!chatMsg.trim()}
                  className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center disabled:opacity-40 hover:bg-indigo-700 transition-colors flex-shrink-0"
                >
                  <Send size={12} className="text-white" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── BIO BUILDER ── */}
        {activeTab === 'biobuilder' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {/* Profile card */}
              <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
                <h3 className="text-sm font-black text-zinc-900 mb-5 flex items-center gap-2">
                  <Crown size={14} className="text-violet-500" /> {t('profileInfo', locale)}
                </h3>
                <div className="mb-5 pb-5 border-b border-zinc-50">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-3">
                    {t('profilePhoto', locale)}
                  </label>
                  <AvatarUploader avatarUrl={bioAvatarUrl} onUpdate={setBioAvatarUrl} />
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                      {t('displayName', locale)}
                    </label>
                    <Input
                      value={bioDisplayName}
                      onChange={(e) => setBioDisplayName(e.target.value)}
                      placeholder={session.user.name}
                      className="rounded-xl border-zinc-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                      {t('handleLabel', locale)}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-sm">
                        @
                      </span>
                      <Input
                        value={bioHandle}
                        onChange={(e) =>
                          setBioHandle(e.target.value.toLowerCase().replace(/\s/g, ''))
                        }
                        placeholder="creator"
                        className="rounded-xl border-zinc-200 pl-7 text-sm"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                    {t('bioLabel', locale)}
                  </label>
                  <Textarea
                    value={bioBioText}
                    onChange={(e) => setBioBioText(e.target.value)}
                    placeholder="Beskriv dig kortfattat..."
                    className="rounded-xl border-zinc-200 resize-none min-h-[60px] text-sm"
                  />
                </div>
              </div>

              {/* Social links card */}
              <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
                <SocialLinksEditor links={socialLinks} onChange={setSocialLinks} />
              </div>

              {/* Content blocks card */}
              <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-zinc-900 flex items-center gap-2">
                    <GripVertical size={14} className="text-zinc-400" />{' '}
                    {t('contentBlocks', locale)}
                  </h3>
                  <div className="relative">
                    <button
                      onClick={() => setAddBlockOpen((v) => !v)}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-indigo-100 text-indigo-600 text-xs font-black hover:bg-indigo-200 transition-colors"
                    >
                      <Plus size={12} /> {t('addBlock', locale)}{' '}
                      <ChevronDown
                        size={11}
                        className={`transition-transform ${addBlockOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {addBlockOpen && (
                      <div className="absolute right-0 top-full mt-1 bg-white border border-zinc-100 rounded-2xl shadow-xl overflow-hidden z-10 min-w-[160px]">
                        {BLOCK_TYPES.map((bt) => (
                          <button
                            key={bt.type}
                            onClick={() => addBlock(bt.type)}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors text-left"
                          >
                            <span>{bt.emoji}</span> {bt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">
                  {t('dragToReorder', locale)}
                </p>
                <div className="space-y-2" onDragEnd={handleDrop}>
                  {blocks.map((block, i) => (
                    <BioDragBlock
                      key={block.id}
                      block={block}
                      index={i}
                      dragging={dragIndex}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onUpdate={updateBlock}
                      onDelete={deleteBlock}
                      onToggle={toggleBlock}
                    />
                  ))}
                </div>
                {blocks.length === 0 && (
                  <div className="text-center py-10 text-zinc-300">
                    <GripVertical size={24} className="mx-auto mb-2" />
                    <p className="text-sm font-bold">{t('noBlocks', locale)}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => saveBioMutation.mutate()}
                  disabled={saveBioMutation.isPending}
                  className={`flex items-center gap-2 h-11 px-6 rounded-xl font-black text-sm transition-all disabled:opacity-60 ${bioSaved ? 'bg-green-600 text-white' : 'bg-zinc-900 hover:bg-black text-white'}`}
                >
                  {bioSaved ? (
                    <>
                      <Check size={14} /> {t('savedBio', locale)}
                    </>
                  ) : (
                    <>
                      <Save size={14} /> {t('saveBio', locale)}
                    </>
                  )}
                </button>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(
                      `${window.location.origin}/@${bioHandle || 'creator'}`
                    );
                    setBioLinkCopied(true);
                    setTimeout(() => setBioLinkCopied(false), 2500);
                  }}
                  className={`flex items-center gap-2 h-11 px-5 rounded-xl font-black text-sm border transition-all ${bioLinkCopied ? 'bg-green-50 border-green-200 text-green-600' : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'}`}
                >
                  {bioLinkCopied ? (
                    <>
                      <Check size={14} /> {t('linkCopied', locale)}
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> {t('copyLink', locale)}
                    </>
                  )}
                </button>
                <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-xl px-3 h-11 text-xs font-mono text-zinc-400">
                  <LinkIcon size={10} className="text-zinc-300" /> app.se/@{bioHandle || 'creator'}
                </div>
                <button
                  onClick={() => setShowPreview((v) => !v)}
                  className={`h-11 px-4 rounded-xl border text-xs font-black transition-colors flex items-center gap-2 ${showPreview ? 'border-indigo-200 bg-indigo-50 text-indigo-600' : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50'}`}
                >
                  {showPreview ? <EyeOff size={13} /> : <Eye size={13} />} {t('preview', locale)}
                </button>
              </div>
            </div>

            {/* Mobile preview panel */}
            <div>
              {showPreview ? (
                <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6 sticky top-24">
                  <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Smartphone size={12} /> {t('livePreview', locale)}
                  </h3>
                  <MobilePreview
                    blocks={blocks}
                    handle={bioHandle}
                    displayName={bioDisplayName}
                    bioText={bioBioText}
                    avatarUrl={bioAvatarUrl}
                    socialLinks={socialLinks}
                  />
                </div>
              ) : (
                <div className="bg-zinc-50 border border-dashed border-zinc-200 rounded-2xl p-10 text-center">
                  <Eye size={24} className="text-zinc-300 mx-auto mb-2" />
                  <p className="text-sm text-zinc-400 font-bold">{t('previewHidden', locale)}</p>
                  <button
                    onClick={() => setShowPreview(true)}
                    className="mt-2 text-xs font-bold text-indigo-500 hover:underline"
                  >
                    {t('showPreview', locale)}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CUSTOMIZER ── */}
        {activeTab === 'customizer' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-3xl">
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
              <h3 className="text-sm font-black text-zinc-900 mb-4 flex items-center gap-2">
                <Palette size={14} /> {t('chooseTheme', locale)}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setActiveTheme(theme.id)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${activeTheme === theme.id ? 'border-indigo-500 shadow-md' : 'border-zinc-100 hover:border-zinc-200'}`}
                    style={{ background: theme.bg }}
                  >
                    <div className="w-8 h-8 rounded-lg mb-2" style={{ background: theme.accent }} />
                    <p className="text-xs font-black text-zinc-900">{theme.label}</p>
                    <p className="text-[10px] text-zinc-400">{theme.desc}</p>
                    {activeTheme === theme.id && (
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] font-black text-indigo-600">
                        <Check size={10} /> Aktivt
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <Button
                className="w-full mt-4 rounded-xl bg-zinc-900 text-white font-black h-10"
                onClick={() => {
                  setSaved('theme');
                  setTimeout(() => setSaved(''), 2000);
                }}
              >
                {saved === 'theme' ? t('themeSaved', locale) : t('applyTheme', locale)}
              </Button>
            </div>
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
              <h3 className="text-sm font-black text-zinc-900 mb-4 flex items-center gap-2">
                <Settings size={14} /> {t('editProfile', locale)}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                    {t('displayName', locale)}
                  </label>
                  <Input
                    value={bioForm.name || session.user.name}
                    onChange={(e) => setBioForm((p) => ({ ...p, name: e.target.value }))}
                    className="rounded-xl bg-zinc-50 border-zinc-100"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                    Handle
                  </label>
                  <Input
                    value={bioForm.handle}
                    onChange={(e) => setBioForm((p) => ({ ...p, handle: e.target.value }))}
                    placeholder={t('handlePlaceholder', locale)}
                    className="rounded-xl bg-zinc-50 border-zinc-100"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                    {t('bioLabel', locale)}
                  </label>
                  <Textarea
                    value={bioForm.bio}
                    onChange={(e) => setBioForm((p) => ({ ...p, bio: e.target.value }))}
                    className="rounded-xl bg-zinc-50 border-zinc-100 resize-none min-h-[80px]"
                  />
                </div>
                <Button
                  onClick={() => {
                    setSaved('bio');
                    setTimeout(() => setSaved(''), 2000);
                  }}
                  className="w-full rounded-xl bg-zinc-900 text-white font-black h-10 flex items-center justify-center gap-2"
                >
                  {saved === 'bio' ? (
                    <>
                      <CheckCircle2 size={14} /> {t('saved', locale)}
                    </>
                  ) : (
                    t('saveProfile', locale)
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── AI COPILOT DRAWER ── */}
      {showCreatorAI && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowCreatorAI(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <Sparkles size={16} className="text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white">{t('aiCopilot', locale)}</h2>
                  <p className="text-[10px] text-white/70">{t('generating', locale)}</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreatorAI(false)}
                className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X size={16} className="text-white" />
              </button>
            </div>
            <div className="px-5 py-3.5 border-b border-zinc-100 bg-zinc-50 flex-shrink-0">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
                {t('topicLabel', locale)}
              </p>
              <Input
                placeholder={t('topicPlaceholder', locale)}
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                className="rounded-xl bg-white border-zinc-200 text-sm h-9"
              />
            </div>
            <div className="px-5 py-4 border-b border-zinc-100 flex-shrink-0">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">
                {t('quickActions', locale)}
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  {
                    id: 'course-outline',
                    label: t('courseOutline', locale),
                    color: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100',
                  },
                  {
                    id: 'community-post',
                    label: t('communityPostAction', locale),
                    color: 'bg-green-50 text-green-700 hover:bg-green-100 border-green-100',
                  },
                  {
                    id: 'sales-email',
                    label: t('salesEmail', locale),
                    color: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-100',
                  },
                  {
                    id: 'headlines',
                    label: t('headlines', locale),
                    color: 'bg-violet-50 text-violet-700 hover:bg-violet-100 border-violet-100',
                  },
                ].map(({ id, label, color }) => (
                  <button
                    key={id}
                    onClick={() => runCreatorAI(id)}
                    disabled={aiLoading}
                    className={`flex items-start gap-2 p-3 rounded-xl border text-xs font-bold text-left transition-all disabled:opacity-50 ${color}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {aiLoading && !aiStreamingOutput && (
                <div className="flex items-center gap-3 text-zinc-400">
                  <div
                    className="w-5 h-5 border-2 border-violet-200 border-t-violet-600 rounded-full flex-shrink-0"
                    style={{ animation: 'spin 1s linear infinite' }}
                  />
                  <span className="text-sm font-medium">{t('generating', locale)}</span>
                </div>
              )}
              {aiStreamingOutput || aiOutput ? (
                <div className="text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap bg-zinc-50 rounded-xl p-4 border border-zinc-100 font-mono">
                  {aiStreamingOutput || aiOutput}
                </div>
              ) : (
                !aiLoading && (
                  <div className="text-center py-10">
                    <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-3">
                      <Sparkles size={26} className="text-violet-300" />
                    </div>
                    <p className="text-sm font-black text-zinc-400">
                      {t('selectActionFirst', locale)}
                    </p>
                    <p className="text-xs text-zinc-300 mt-1">{t('addTopicForCustom', locale)}</p>
                  </div>
                )
              )}
            </div>
            {(aiOutput || aiStreamingOutput) && (
              <div className="px-5 py-4 border-t border-zinc-100 flex gap-2.5 flex-shrink-0">
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(aiOutput || aiStreamingOutput);
                    setAiCopied(true);
                    setTimeout(() => setAiCopied(false), 2200);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-black transition-colors"
                >
                  {aiCopied ? (
                    <>
                      <CheckCheck size={13} /> {t('copiedToClipboard', locale)}
                    </>
                  ) : (
                    <>
                      <Copy size={13} /> {t('copyToClipboard', locale)}
                    </>
                  )}
                </button>
                {!aiLoading && (
                  <button
                    onClick={() => {
                      setAiOutput('');
                      setAiStreamingOutput('');
                    }}
                    className="w-10 h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center flex-shrink-0"
                  >
                    <X size={14} className="text-zinc-500" />
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}

      <style jsx global>{`
        @keyframes livePulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
