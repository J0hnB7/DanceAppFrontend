import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { CompetitionWizard } from "@/components/competition/competition-wizard";

export default function NewCompetitionPage() {
  return (
    <AppShell>
      <PageHeader
        title="New competition"
        description="Fill in the details to create a new competition"
      />
      <CompetitionWizard />
    </AppShell>
  );
}
