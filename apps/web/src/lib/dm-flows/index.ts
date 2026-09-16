/**
 * Public API for Instagram DM chat flows (ManyChat-style).
 */

export { ensureDmFlowSchema } from './schema';
export { extractMessagingEventsFromWebhook } from './parse-webhook';
export { processDmFlowEvent } from './engine';
export type {
  AutomationFlowRow,
  FlowCondition,
  FlowEngineResult,
  FlowQuickReplyButton,
  FlowStepRow,
  FlowTriggerRow,
  IncomingDmEvent,
} from './types';
