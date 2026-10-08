/**
 * ManyChat-style Instagram DM flow types.
 */

export type FlowMatchType = 'contains' | 'exact' | 'keyword' | 'regex';

export type FlowStepType = 'message' | 'condition' | 'end';

export type FlowConditionType = 'none' | 'always' | 'is_follower';

export type FlowQuickReplyButton = {
  /** Button label shown in Instagram (≤20 chars recommended). */
  title: string;
  /** Opaque payload returned on messaging_postbacks / quick_reply. */
  payload: string;
  /** Optional next step after this button is tapped. */
  next_step_id?: string | null;
};

export type FlowCondition = {
  type: FlowConditionType;
  on_true_step_id?: string | null;
  on_false_step_id?: string | null;
};

export type AutomationFlowRow = {
  id: string;
  workspace_id: string;
  user_id: string | null;
  title: string;
  is_active: boolean;
  entry_step_id: string | null;
};

export type FlowTriggerRow = {
  id: string;
  flow_id: string;
  workspace_id: string;
  match_type: FlowMatchType;
  keyword: string;
  case_sensitive: boolean;
};

export type FlowStepRow = {
  id: string;
  flow_id: string;
  workspace_id: string;
  step_type: FlowStepType;
  name: string;
  message_text: string | null;
  link_url: string | null;
  buttons: FlowQuickReplyButton[];
  condition: FlowCondition;
  next_step_id: string | null;
  position: number;
};

/** Incoming Instagram messaging webhook event (normalized). */
export type IncomingDmEvent = {
  senderId: string;
  pageId: string | null;
  igAccountId: string | null;
  text: string | null;
  /** Quick-reply / postback payload when user tapped a button. */
  payload: string | null;
  mid: string | null;
  timestamp: number | null;
};

export type FlowEngineResult = {
  matched: boolean;
  sent: boolean;
  flowId?: string;
  stepId?: string;
  messageId?: string;
  error?: string;
};
