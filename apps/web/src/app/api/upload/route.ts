/** Local upload handler — returns a data URL so photos work without cloud storage. */

import {
  currentWorkspacePlan,
  hasFeature,
  minPlanForFeature,
  upgradeRequiredResponse,
} from '@/lib/plan-guard';

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') ?? '';

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('file');
      if (!(file instanceof File)) {
        return Response.json({ error: 'file required' }, { status: 400 });
      }

      // Video hosting uploads require Creator+ (Starter is embeds-only).
      const isVideo =
        file.type.startsWith('video/') ||
        form.get('purpose') === 'video' ||
        form.get('kind') === 'video';
      if (isVideo && !hasFeature(currentWorkspacePlan(), 'coursesAndVideoHosting')) {
        return upgradeRequiredResponse(minPlanForFeature('coursesAndVideoHosting'), {
          feature: 'coursesAndVideoHosting',
          message: 'Video hosting requires Creator plan',
        });
      }

      // Allow lesson PDFs / images up to 10 MB as data URLs for local demo.
      if (file.size > 10 * 1024 * 1024) {
        return Response.json({ error: 'File too large' }, { status: 413 });
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const mimeType = file.type || 'application/octet-stream';
      const url = `data:${mimeType};base64,${buffer.toString('base64')}`;
      return Response.json({ url, mimeType });
    }

    if (contentType.includes('application/json')) {
      const body = await request.json();
      if (typeof body?.base64 === 'string') {
        const mimeType = body.mimeType || 'image/jpeg';
        const raw = body.base64.replace(/^data:[^;]+;base64,/, '');
        return Response.json({
          url: `data:${mimeType};base64,${raw}`,
          mimeType,
        });
      }
      if (typeof body?.url === 'string') {
        return Response.json({ url: body.url, mimeType: body.mimeType ?? null });
      }
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    return Response.json({ error: 'Unsupported content type' }, { status: 415 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Upload failed' }, { status: 500 });
  }
}
