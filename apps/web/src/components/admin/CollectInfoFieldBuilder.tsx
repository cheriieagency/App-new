'use client';

import { useState } from 'react';
import {
  Plus,
  Trash2,
  GripVertical,
  Eye,
  EyeOff,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
} from 'lucide-react';
import {
  nextCollectFieldId,
  type CollectField,
  type CollectFieldType,
  type OrderBump,
} from '@/lib/store-collect-fields';
import { Input } from '@/components/ui/input';

const FIELD_TYPES: { value: CollectFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Text area' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
];

type Props = {
  fields: CollectField[];
  onChange: (fields: CollectField[]) => void;
  orderBump: OrderBump;
  onOrderBumpChange: (bump: OrderBump) => void;
};

export default function CollectInfoFieldBuilder({
  fields,
  onChange,
  orderBump,
  onOrderBumpChange,
}: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const updateField = (id: string, patch: Partial<CollectField>) => {
    onChange(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const removeField = (id: string) => {
    onChange(fields.filter((f) => f.id !== id || f.isDefault));
  };

  const addField = (type: CollectFieldType) => {
    const field: CollectField = {
      id: nextCollectFieldId(),
      label:
        type === 'textarea'
          ? 'Please provide additional context on how I can help you!'
          : type === 'dropdown'
            ? 'Choose an option'
            : 'Custom field',
      type,
      required: false,
      visible: true,
      options: type === 'dropdown' ? ['Option 1', 'Option 2'] : undefined,
    };
    onChange([...fields, field]);
    setAddOpen(false);
  };

  const onDrop = (toIndex: number) => {
    if (dragIndex == null || dragIndex === toIndex) {
      setDragIndex(null);
      return;
    }
    const next = [...fields];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(toIndex, 0, moved);
    onChange(next);
    setDragIndex(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-black text-[#2c3340]">4. Collect Info</h4>
        <p className="text-xs text-zinc-400 mt-0.5">
          Fields shown in 1-tap checkout when a buyer purchases this offer.
        </p>
      </div>

      <div className="space-y-2">
        {fields.map((field, index) => (
          <div
            key={field.id}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(index)}
            className={`rounded-xl border bg-white p-3 transition-opacity ${
              dragIndex === index ? 'opacity-40' : 'border-zinc-200'
            } ${!field.visible ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start gap-2">
              <button
                type="button"
                className="mt-2 text-zinc-300 cursor-grab hover:text-zinc-500 flex-shrink-0"
                aria-label="Reorder field"
              >
                <GripVertical size={14} />
              </button>

              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Input
                    value={field.label}
                    onChange={(e) => updateField(field.id, { label: e.target.value })}
                    className="h-10 rounded-lg text-sm font-bold flex-1 min-w-[140px]"
                    placeholder="Field label"
                  />
                  {!field.isDefault && (
                    <select
                      value={field.type}
                      onChange={(e) =>
                        updateField(field.id, {
                          type: e.target.value as CollectFieldType,
                          options:
                            e.target.value === 'dropdown'
                              ? field.options ?? ['Option 1', 'Option 2']
                              : undefined,
                        })
                      }
                      className="h-10 min-h-[40px] rounded-lg border border-zinc-200 bg-zinc-50 px-2 text-xs font-bold text-zinc-600"
                    >
                      {FIELD_TYPES.filter((t) =>
                        ['text', 'textarea', 'dropdown'].includes(t.value)
                      ).map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  )}
                  {field.isDefault && (
                    <span className="text-[10px] font-extrabold uppercase tracking-wide text-zinc-400 bg-zinc-50 px-2 py-1 rounded-md">
                      {field.type}
                    </span>
                  )}
                </div>

                {field.type === 'dropdown' && (
                  <Input
                    value={(field.options ?? []).join(', ')}
                    onChange={(e) =>
                      updateField(field.id, {
                        options: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="Options separated by comma"
                    className="h-9 rounded-lg text-xs"
                  />
                )}

                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() =>
                      updateField(field.id, { required: !field.required })
                    }
                    className="inline-flex items-center gap-1.5 h-9 min-h-[36px] text-xs font-bold text-zinc-600"
                  >
                    {field.required ? (
                      <ToggleRight size={18} className="text-[var(--nc-coral)]" />
                    ) : (
                      <ToggleLeft size={18} className="text-zinc-300" />
                    )}
                    Required
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => updateField(field.id, { visible: !field.visible })}
                  className="h-10 w-10 min-h-[40px] min-w-[40px] rounded-lg bg-zinc-50 text-zinc-500 flex items-center justify-center hover:bg-zinc-100"
                  title={field.visible ? 'Hide field' : 'Show field'}
                >
                  {field.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                {!field.isDefault && (
                  <button
                    type="button"
                    onClick={() => removeField(field.id)}
                    className="h-10 w-10 min-h-[40px] min-w-[40px] rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100"
                    title="Delete field"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setAddOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 h-11 min-h-[44px] px-3 rounded-xl border border-dashed border-zinc-300 bg-white text-xs font-extrabold text-zinc-600 hover:border-[var(--nc-coral)] hover:text-[var(--nc-coral)]"
        >
          <Plus size={14} /> Add Field
          <ChevronDown
            size={12}
            className={`transition-transform ${addOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {addOpen && (
          <div className="absolute left-0 top-full mt-1 z-20 w-48 rounded-xl border border-zinc-100 bg-white shadow-xl overflow-hidden">
            {FIELD_TYPES.filter((t) =>
              ['text', 'textarea', 'dropdown'].includes(t.value)
            ).map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => addField(t.value)}
                className="w-full text-left px-3 h-11 min-h-[44px] text-xs font-bold text-zinc-700 hover:bg-zinc-50"
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Order bump */}
      <div className="rounded-xl border border-zinc-200 bg-white p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-black text-[#2c3340]">Order bump</p>
            <p className="text-[10px] text-zinc-400 font-medium">
              Optional upsell checkbox at checkout
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              onOrderBumpChange({ ...orderBump, enabled: !orderBump.enabled })
            }
            className="h-11 min-h-[44px] px-2"
            aria-label="Toggle order bump"
          >
            {orderBump.enabled ? (
              <ToggleRight size={22} className="text-[var(--nc-coral)]" />
            ) : (
              <ToggleLeft size={22} className="text-zinc-300" />
            )}
          </button>
        </div>
        {orderBump.enabled && (
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px] gap-2">
            <Input
              value={orderBump.title}
              onChange={(e) =>
                onOrderBumpChange({ ...orderBump, title: e.target.value })
              }
              placeholder="⚡ Lägg till arbetsbok för +49 kr"
              className="h-10 rounded-lg text-xs"
            />
            <Input
              type="number"
              min={0}
              value={orderBump.price}
              onChange={(e) =>
                onOrderBumpChange({
                  ...orderBump,
                  price: Number(e.target.value) || 0,
                })
              }
              className="h-10 rounded-lg text-xs"
            />
          </div>
        )}
      </div>
    </div>
  );
}
