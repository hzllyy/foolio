import { ProjectEditorPage } from "./ProjectEditorPage";

type PageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ new?: string }>;
};

export default async function ProjectPage({ params, searchParams }: PageProps) {
  const { projectId } = await params;
  const { new: newFlag } = await searchParams;

  return <ProjectEditorPage projectId={projectId} isNew={newFlag === "1"} />;
}
