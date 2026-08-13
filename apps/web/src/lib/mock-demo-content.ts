/** Demo content stubs — intentionally empty (no fake feed/products/courses). */

export const MOCK_POSTS: Array<Record<string, unknown>> = [];

export const MOCK_COURSES: Array<{
  id: number;
  title: string;
  description: string;
  category: string;
  cover_image: string | null;
  is_published: boolean;
  lessons: Array<Record<string, unknown>>;
}> = [];

export const MOCK_EVENTS: Array<Record<string, unknown>> = [];

export { MOCK_PRODUCTS } from '@/lib/mock-store';

export const MOCK_COMMENTS: Record<number, Array<Record<string, unknown>>> = {};
