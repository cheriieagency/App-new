/** Collect-info checkout field model for Stan-style product forms. */

export type CollectFieldType = 'text' | 'email' | 'phone' | 'textarea' | 'dropdown';

export type CollectField = {
  id: string;
  label: string;
  type: CollectFieldType;
  required: boolean;
  visible: boolean;
  /** Dropdown choices (only for type === 'dropdown'). */
  options?: string[];
  /** Built-in Name / Email / Phone — cannot be deleted. */
  isDefault?: boolean;
};

export type OrderBump = {
  enabled: boolean;
  title: string;
  price: number;
  description?: string;
};

export const DEFAULT_COLLECT_FIELDS: CollectField[] = [
  {
    id: 'name',
    label: 'Name',
    type: 'text',
    required: true,
    visible: true,
    isDefault: true,
  },
  {
    id: 'email',
    label: 'Email',
    type: 'email',
    required: true,
    visible: true,
    isDefault: true,
  },
  {
    id: 'phone',
    label: 'Phone Number',
    type: 'phone',
    required: false,
    visible: true,
    isDefault: true,
  },
];

export const DEFAULT_ORDER_BUMP: OrderBump = {
  enabled: false,
  title: '⚡ Lägg till arbetsbok för +49 kr',
  price: 49,
  description: 'Bonus-PDF med övningar och templates',
};

let fieldSeq = 1;

export function nextCollectFieldId(): string {
  return `custom-${Date.now().toString(36)}-${fieldSeq++}`;
}

export function normalizeCollectFields(raw: unknown): CollectField[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_COLLECT_FIELDS.map((f) => ({ ...f }));
  }
  const parsed = raw
    .map((item): CollectField | null => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const id = String(row.id ?? '').trim();
      const label = String(row.label ?? '').trim();
      if (!id || !label) return null;
      const type = (
        ['text', 'email', 'phone', 'textarea', 'dropdown'] as CollectFieldType[]
      ).includes(row.type as CollectFieldType)
        ? (row.type as CollectFieldType)
        : 'text';
      return {
        id,
        label,
        type,
        required: Boolean(row.required),
        visible: row.visible !== false,
        options: Array.isArray(row.options)
          ? row.options.map(String).filter(Boolean)
          : type === 'dropdown'
            ? ['Option 1', 'Option 2']
            : undefined,
        isDefault: Boolean(row.isDefault),
      };
    })
    .filter((f): f is CollectField => f != null);

  // Ensure default trio exists if creators wiped them somehow.
  const hasName = parsed.some((f) => f.id === 'name');
  const hasEmail = parsed.some((f) => f.id === 'email');
  const hasPhone = parsed.some((f) => f.id === 'phone');
  const defaults = DEFAULT_COLLECT_FIELDS.filter((d) => {
    if (d.id === 'name') return !hasName;
    if (d.id === 'email') return !hasEmail;
    if (d.id === 'phone') return !hasPhone;
    return false;
  }).map((f) => ({ ...f }));

  return [...defaults, ...parsed];
}

export function normalizeOrderBump(raw: unknown): OrderBump | null {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_ORDER_BUMP };
  const row = raw as Record<string, unknown>;
  return {
    enabled: Boolean(row.enabled),
    title: String(row.title ?? DEFAULT_ORDER_BUMP.title),
    price: Number(row.price ?? DEFAULT_ORDER_BUMP.price) || 0,
    description:
      typeof row.description === 'string'
        ? row.description
        : DEFAULT_ORDER_BUMP.description,
  };
}

export function visibleCollectFields(fields: CollectField[]): CollectField[] {
  return fields.filter((f) => f.visible);
}
