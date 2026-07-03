import { PageWrapper } from '@/components/page-wrapper';

export default async function WorkspaceInterviews(
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;
  return <PageWrapper view="interviews" workspaceId={workspaceId} />;
}
