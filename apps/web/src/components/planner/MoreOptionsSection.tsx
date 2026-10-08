'use client';

/**
 * More Options accordion for Post Studio — matches Post Details warm canvas.
 */

import { useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { isValidInstagramUsername } from '@/lib/planner/more-options';

export type MoreOptionsValue = {
  collaborators: string[];
  firstComment: string;
  locationName: string;
  locationId: string;
  linkInBioUrl: string;
  postTags: string[];
  campaignTag: string;
};

type Props = {
  value: MoreOptionsValue;
  onChange: (next: MoreOptionsValue) => void;
  /** Existing campaign label names for quick-pick suggestions. */
  campaignSuggestions?: string[];
};

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8A857D] mb-1">
      {children}
    </p>
  );
}

const UNDERLINE_INPUT =
  'w-full h-9 min-h-[36px] bg-transparent border-0 border-b border-[#E6E3DB] rounded-none px-0 text-xs text-[#2C2621] placeholder:text-[#C4BFB6] focus:outline-none focus:border-[#2C2621]';
const OUTLINE_BTN =
  'inline-flex items-center justify-center h-8 min-h-[32px] px-2.5 border border-[#1C1917] bg-white text-[9px] font-semibold uppercase tracking-[0.1em] text-[#1C1917] hover:bg-[#F5F4F0] transition-colors';
const CHIP =
  'inline-flex items-center h-7 px-2 border border-[#E6E3DB] text-[10px] font-medium text-[#2C2621]';

export function MoreOptionsSection({
  value,
  onChange,
  campaignSuggestions = [],
}: Props) {
  const [collabOpen, setCollabOpen] = useState(false);
  const [draftHandles, setDraftHandles] = useState<string[]>(['', '', '']);
  const [collabError, setCollabError] = useState<string | null>(null);
  const [tagDraft, setTagDraft] = useState('');

  const patch = (partial: Partial<MoreOptionsValue>) =>
    onChange({ ...value, ...partial });

  const openCollaboratorModal = () => {
    const padded = [...value.collaborators, '', '', ''].slice(0, 3);
    setDraftHandles(padded);
    setCollabError(null);
    setCollabOpen(true);
  };

  const saveCollaborators = () => {
    const cleaned: string[] = [];
    const seen = new Set<string>();
    for (const raw of draftHandles) {
      const handle = raw.trim().replace(/^@+/, '');
      if (!handle) continue;
      if (!isValidInstagramUsername(handle)) {
        setCollabError(`Invalid Instagram username: @${handle}`);
        return;
      }
      const key = handle.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      cleaned.push(key);
    }
    if (cleaned.length > 3) {
      setCollabError('You can invite up to 3 collaborators.');
      return;
    }
    patch({ collaborators: cleaned });
    setCollabOpen(false);
  };

  const addTag = () => {
    const tag = tagDraft.trim().replace(/^#+/, '');
    if (!tag) return;
    if (value.postTags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      setTagDraft('');
      return;
    }
    patch({ postTags: [...value.postTags, tag].slice(0, 24) });
    setTagDraft('');
  };

  const removeTag = (tag: string) => {
    patch({
      postTags: value.postTags.filter(
        (t) => t.toLowerCase() !== tag.toLowerCase()
      ),
    });
  };

  const summaryBits: string[] = [];
  if (value.collaborators.length)
    summaryBits.push(`${value.collaborators.length} collab`);
  if (value.firstComment.trim()) summaryBits.push('1st comment');
  if (value.locationName.trim() || value.locationId.trim())
    summaryBits.push('location');
  if (value.linkInBioUrl.trim()) summaryBits.push('link in bio');
  if (value.postTags.length || value.campaignTag.trim())
    summaryBits.push('tags');

  return (
    <>
      <Accordion type="single" collapsible className="border-t border-[#E6E3DB]">
        <AccordionItem value="more-options" className="border-0">
          <AccordionTrigger className="py-3 hover:no-underline gap-2 min-h-[44px]">
            <span className="flex flex-col items-start gap-0.5 text-left">
              <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#2C2621]">
                More options
              </span>
              {summaryBits.length ? (
                <span className="text-[10px] font-normal normal-case tracking-normal text-[#A8A29E]">
                  {summaryBits.join(' · ')}
                </span>
              ) : null}
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <FieldLabel>Invite collaborator</FieldLabel>
                <p className="text-[11px] text-[#8A857D] -mt-0.5 leading-snug">
                  Up to 3 Instagram usernames.
                </p>
                {value.collaborators.length ? (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {value.collaborators.map((u) => (
                      <span key={u} className={CHIP}>
                        @{u}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className={`${OUTLINE_BTN} shrink-0`}
                onClick={openCollaboratorModal}
              >
                {value.collaborators.length ? 'Edit' : 'Add'}
              </button>
            </div>

            <div>
              <FieldLabel>First comment</FieldLabel>
              <textarea
                value={value.firstComment}
                onChange={(e) => patch({ firstComment: e.target.value })}
                rows={2}
                placeholder="Posted on Instagram right after publish"
                className="w-full min-h-[72px] px-2.5 py-2 border border-[#E6E3DB] rounded-sm bg-white text-xs text-[#2C2621] placeholder:text-[#C4BFB6] focus:outline-none focus:border-[#2C2621] resize-y"
              />
            </div>

            <div className="space-y-3">
              <div>
                <FieldLabel>Location</FieldLabel>
                <input
                  type="text"
                  value={value.locationName}
                  onChange={(e) => patch({ locationName: e.target.value })}
                  placeholder="e.g. Stockholm, Sweden"
                  className={UNDERLINE_INPUT}
                />
              </div>
              <input
                type="text"
                value={value.locationId}
                onChange={(e) => patch({ locationId: e.target.value })}
                placeholder="Location ID (optional)"
                className={UNDERLINE_INPUT}
              />
            </div>

            <div>
              <FieldLabel>Link in bio URL</FieldLabel>
              <input
                type="url"
                value={value.linkInBioUrl}
                onChange={(e) => patch({ linkInBioUrl: e.target.value })}
                placeholder="https://…"
                className={UNDERLINE_INPUT}
              />
            </div>

            <div className="space-y-3">
              <div>
                <FieldLabel>Internal tags</FieldLabel>
                <div className="flex gap-2 items-end">
                  <input
                    type="text"
                    value={tagDraft}
                    onChange={(e) => setTagDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="Add tag…"
                    className={`flex-1 ${UNDERLINE_INPUT}`}
                  />
                  <button type="button" className={OUTLINE_BTN} onClick={addTag}>
                    Add
                  </button>
                </div>
                {value.postTags.length ? (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {value.postTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => removeTag(tag)}
                        className={`${CHIP} hover:border-[#1C1917]`}
                        title="Remove tag"
                      >
                        {tag}
                        <span className="ml-1 text-[#A8A29E]">×</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <div>
                <FieldLabel>Campaign tag</FieldLabel>
                <input
                  type="text"
                  value={value.campaignTag}
                  onChange={(e) => patch({ campaignTag: e.target.value })}
                  placeholder="e.g. Q3 launch"
                  list="planner-campaign-tag-suggestions"
                  className={UNDERLINE_INPUT}
                />
                {campaignSuggestions.length ? (
                  <datalist id="planner-campaign-tag-suggestions">
                    {campaignSuggestions.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                ) : null}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Dialog open={collabOpen} onOpenChange={setCollabOpen}>
        <DialogContent className="sm:max-w-md rounded-sm border-[#E6E3DB]">
          <DialogHeader>
            <DialogTitle className="font-clikd-wordmark text-[#2C2621]">
              Invite collaborator
            </DialogTitle>
            <DialogDescription className="text-[#8A857D]">
              Add up to 3 Instagram usernames. Invited when the post publishes to
              Instagram.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {draftHandles.map((handle, idx) => (
              <label key={idx} className="block">
                <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8A857D]">
                  Collaborator {idx + 1}
                </span>
                <div className="relative mt-1">
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 text-xs text-[#A8A29E]">
                    @
                  </span>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => {
                      const next = [...draftHandles];
                      next[idx] = e.target.value.replace(/^@+/, '');
                      setDraftHandles(next);
                      setCollabError(null);
                    }}
                    placeholder="username"
                    className="w-full h-9 min-h-[36px] pl-4 pr-0 bg-transparent border-0 border-b border-[#E6E3DB] rounded-none text-xs text-[#2C2621] placeholder:text-[#C4BFB6] focus:outline-none focus:border-[#2C2621]"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
              </label>
            ))}
            {collabError ? (
              <p className="text-xs font-medium text-[#B85C38]">{collabError}</p>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              className={OUTLINE_BTN}
              onClick={() => setCollabOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center h-8 min-h-[32px] px-3 bg-[#1C1917] text-white text-[9px] font-semibold uppercase tracking-[0.1em] hover:bg-[#2C2621] transition-colors"
              onClick={saveCollaborators}
            >
              <Check size={12} className="mr-1.5" strokeWidth={2.5} />
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
