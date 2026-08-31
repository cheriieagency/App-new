'use client';

/**
 * Later-style More Options accordion for the Content Planner post drawer.
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
import { Button } from '@/components/ui/button';
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
    <p className="text-[11px] font-medium text-slate-500 mb-1">{children}</p>
  );
}

const inputClass =
  'w-full h-10 min-h-[40px] px-3 rounded-md border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400';

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
      <Accordion
        type="single"
        collapsible
        className="rounded-md border border-slate-200 px-3"
      >
        <AccordionItem value="more-options" className="border-0">
          <AccordionTrigger className="py-3 text-sm font-medium text-slate-600 hover:no-underline min-h-[44px]">
            <span className="flex flex-col items-start gap-0.5 text-left">
              <span>More options</span>
              {summaryBits.length ? (
                <span className="text-[11px] font-normal text-slate-400">
                  {summaryBits.join(' · ')}
                </span>
              ) : null}
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <FieldLabel>Invite collaborator</FieldLabel>
                <p className="text-[11px] text-slate-400 -mt-0.5">
                  Up to 3 Instagram usernames.
                </p>
                {value.collaborators.length ? (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {value.collaborators.map((u) => (
                      <span
                        key={u}
                        className="inline-flex items-center h-7 px-2 rounded-md border border-slate-200 text-xs text-slate-700"
                      >
                        @{u}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 min-h-[40px] shrink-0 rounded-md"
                onClick={openCollaboratorModal}
              >
                {value.collaborators.length ? 'Edit' : 'Add'}
              </Button>
            </div>

            <div>
              <FieldLabel>First comment</FieldLabel>
              <textarea
                value={value.firstComment}
                onChange={(e) => patch({ firstComment: e.target.value })}
                rows={2}
                placeholder="Posted on Instagram right after publish"
                className="w-full min-h-[72px] px-3 py-2 rounded-md border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 resize-y"
              />
            </div>

            <div className="space-y-2">
              <div>
                <FieldLabel>Location</FieldLabel>
                <input
                  type="text"
                  value={value.locationName}
                  onChange={(e) => patch({ locationName: e.target.value })}
                  placeholder="e.g. Stockholm, Sweden"
                  className={inputClass}
                />
              </div>
              <input
                type="text"
                value={value.locationId}
                onChange={(e) => patch({ locationId: e.target.value })}
                placeholder="Location ID (optional)"
                className={inputClass}
              />
            </div>

            <div>
              <FieldLabel>Link in bio URL</FieldLabel>
              <input
                type="url"
                value={value.linkInBioUrl}
                onChange={(e) => patch({ linkInBioUrl: e.target.value })}
                placeholder="https://…"
                className={inputClass}
              />
            </div>

            <div className="space-y-2">
              <div>
                <FieldLabel>Internal tags</FieldLabel>
                <div className="flex gap-2">
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
                    className={`flex-1 ${inputClass}`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 min-h-[40px] rounded-md px-3"
                    onClick={addTag}
                  >
                    Add
                  </Button>
                </div>
                {value.postTags.length ? (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {value.postTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-slate-200 text-xs text-slate-700 hover:border-slate-400"
                        title="Remove tag"
                      >
                        {tag}
                        <span className="text-slate-400">×</span>
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
                  className={inputClass}
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
        <DialogContent className="sm:max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle>Invite collaborator</DialogTitle>
            <DialogDescription>
              Add up to 3 Instagram usernames. Invited when the post publishes to
              Instagram.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-1">
            {draftHandles.map((handle, idx) => (
              <label key={idx} className="block">
                <span className="text-[11px] font-medium text-slate-500">
                  Collaborator {idx + 1}
                </span>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
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
                    className="w-full h-10 min-h-[40px] pl-7 pr-3 rounded-md border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
              </label>
            ))}
            {collabError ? (
              <p className="text-xs font-medium text-rose-600">{collabError}</p>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 min-h-[40px] rounded-md"
              onClick={() => setCollabOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-10 min-h-[40px] rounded-md bg-slate-900 hover:bg-slate-800"
              onClick={saveCollaborators}
            >
              <Check size={16} className="mr-1.5" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
