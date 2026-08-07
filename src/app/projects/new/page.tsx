import { redirect } from "next/navigation";

/** Creates a fresh guest project ID and redirects into its editor with `?new=1` so the client seeds a blank document. */
export default function NewProjectPage() {
  const projectId = crypto.randomUUID();
  redirect(`/projects/${projectId}?new=1`);
}
