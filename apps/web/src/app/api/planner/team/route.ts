import {
  addTeamMember,
  getWorkspacePlan,
  listTeamMembers,
  removeTeamMember,
  setWorkspacePlan,
  updateTeamMember,
  type TeamRole,
  type WorkspacePlan,
} from '@/lib/mock-content-planner';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const project = searchParams.get('project') || undefined;
  return Response.json({
    members: listTeamMembers(project),
    all_members: listTeamMembers(),
    plan: getWorkspacePlan(),
    demo: true,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = String(body.action ?? 'add');

    if (action === 'set_plan') {
      const plan = body.plan as WorkspacePlan;
      if (!['starter', 'creator', 'pro'].includes(plan)) {
        return Response.json({ error: 'Invalid plan' }, { status: 400 });
      }
      return Response.json({
        plan: setWorkspacePlan(plan),
        members: listTeamMembers(),
      });
    }

    if (action === 'remove') {
      const ok = removeTeamMember(String(body.id ?? ''));
      if (!ok) {
        return Response.json(
          { error: 'Cannot remove owner or missing member' },
          { status: 400 }
        );
      }
      return Response.json({
        ok: true,
        members: listTeamMembers(),
        plan: getWorkspacePlan(),
      });
    }

    if (action === 'update') {
      const member = updateTeamMember(String(body.id ?? ''), {
        name: typeof body.name === 'string' ? body.name : undefined,
        email: typeof body.email === 'string' ? body.email : undefined,
        role: body.role as TeamRole | undefined,
        project: typeof body.project === 'string' ? body.project : undefined,
        status: body.status,
      });
      if (!member) return Response.json({ error: 'Not found' }, { status: 404 });
      return Response.json({
        member,
        members: listTeamMembers(),
        plan: getWorkspacePlan(),
      });
    }

    // add / invite
    const email = String(body.email ?? '').trim();
    const name = String(body.name ?? '').trim();
    if (!email || !email.includes('@')) {
      return Response.json({ error: 'Valid email required' }, { status: 400 });
    }
    const result = addTeamMember({
      name,
      email,
      role: (body.role as TeamRole) || 'editor',
      project: String(body.project ?? ''),
    });
    return Response.json({
      ...result,
      members: listTeamMembers(),
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}
