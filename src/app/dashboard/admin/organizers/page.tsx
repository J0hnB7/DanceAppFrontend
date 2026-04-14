"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Mail, Building2, CheckCircle2, Clock, XCircle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Sidebar } from "@/components/layout/sidebar";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { organizersApi } from "@/lib/api/organizers";
import type { OrganizerUser } from "@/lib/api/organizers";
import { toast } from "@/hooks/use-toast";
import { useLocale } from "@/contexts/locale-context";
import { getErrorMessage } from "@/lib/utils";
import { getInitials, getAvatarColor } from "@/lib/utils";

export default function AdminOrganizersPage() {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  const { data: organizers = [], isLoading } = useQuery({
    queryKey: ["admin", "organizers"],
    queryFn: organizersApi.list,
  });

  const inviteMutation = useMutation({
    mutationFn: organizersApi.invite,
    onSuccess: () => {
      toast({ title: t("organizers.inviteSent") });
      queryClient.invalidateQueries({ queryKey: ["admin", "organizers"] });
      setInviteOpen(false);
      setInviteName("");
      setInviteEmail("");
    },
    onError: (err: unknown) => {
      toast({ title: getErrorMessage(err, t("organizers.inviteError")), variant: "destructive" });
    },
  });

  const handleInvite = () => {
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    inviteMutation.mutate({ name: inviteName.trim(), email: inviteEmail.trim() });
  };

  return (
    <AppShell sidebar={<Sidebar />}>
      <PageHeader
        title={t("organizers.title")}
        description={t("organizers.description")}
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            {t("organizers.inviteButton")}
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-[var(--surface-secondary)]" />
          ))}
        </div>
      ) : organizers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <UserPlus className="h-8 w-8 text-[var(--text-tertiary)]" aria-hidden="true" />
            <p className="text-sm text-[var(--text-secondary)]">{t("organizers.empty")}</p>
            <Button variant="outline" onClick={() => setInviteOpen(true)}>
              {t("organizers.inviteButton")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {organizers.map((org) => (
            <OrganizerRow key={org.id} organizer={org} />
          ))}
        </div>
      )}

      <Dialog open={inviteOpen} onOpenChange={(v) => !v && setInviteOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("organizers.inviteDialog.title")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-1">
            <div>
              <label htmlFor="invite-name" className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                {t("organizers.inviteDialog.name")}
              </label>
              <Input
                id="invite-name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder={t("organizers.inviteDialog.namePlaceholder")}
              />
            </div>
            <div>
              <label htmlFor="invite-email" className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                {t("organizers.inviteDialog.email")}
              </label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="organizator@example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleInvite}
              loading={inviteMutation.isPending}
              disabled={!inviteName.trim() || !inviteEmail.trim()}
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              {t("organizers.inviteDialog.send")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function OrganizerRow({ organizer }: { organizer: OrganizerUser }) {
  const { t } = useLocale();
  const avatarColor = getAvatarColor(organizer.name || "?");

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
        style={{ backgroundColor: avatarColor }}
        aria-hidden="true"
      >
        {getInitials(organizer.name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--text-primary)]">{organizer.name}</p>
        <div className="flex items-center gap-3">
          <span className="truncate text-xs text-[var(--text-secondary)]">{organizer.email}</span>
          {organizer.organizationName && (
            <span className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
              <Building2 className="h-3 w-3" aria-hidden="true" />
              {organizer.organizationName}
            </span>
          )}
        </div>
      </div>
      <StatusBadge pending={organizer.pending} t={t} />
    </div>
  );
}

function StatusBadge({ pending, t }: { pending: boolean; t: (key: string) => string }) {
  if (!pending) {
    return (
      <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[11px] font-medium text-green-400">
        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
        {t("organizers.statusActive")}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
      <Clock className="h-3 w-3" aria-hidden="true" />
      {t("organizers.statusPending")}
    </span>
  );
}
