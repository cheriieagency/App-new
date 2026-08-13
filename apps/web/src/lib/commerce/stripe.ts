/**
 * Shared Stripe client for Checkout + Connect + Transfers.
 */

import Stripe from 'stripe';
import { stripeEnv } from '@/lib/config/env';

let client: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = stripeEnv.secretKey();
  if (!key) return null;
  if (!client) {
    client = new Stripe(key, {
      apiVersion: '2026-07-29.dahlia',
      typescript: true,
    });
  }
  return client;
}
