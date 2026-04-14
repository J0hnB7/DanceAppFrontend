"use client";

import { use, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Mail, CheckCircle2, XCircle, Clock, X } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { CompetitionSidebar } from "@/components/layout/competition-sidebar";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { notificationsApi, type ComposeNotificationRequest, type NotificationDto } from "@/lib/api/notifications";
import { sectionsApi } from "@/lib/api/sections";
import { formatTime, getErrorMessage } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useLocale } from "@/contexts/locale-context";

const schema = z.object({
  recipientType: z.enum(["ALL_PAIRS", "SECTION", "INDIVIDUAL"]),
  sectionId: z.string().optional(),
  recipientEmail: z.string().email().optional().or(z.literal("")),
  subject: z.string().min(1),
  body: z.string().min(10),
});

type NotifForm = z.infer<typeof schema>;

const statusIcon = {
  SENT: <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />,
  FAILED: <XCircle className="h-4 w-4 text-[var(--destructive)]" />,
  PENDING: <Clock className="h-4 w-4 text-[var(--warning)]" />,
};

export default function NotificationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const { t } = useLocale();
  const [detailNotif, setDetailNotif] = useState<NotificationDto | null>(null);

  const { data: notifications } = useQuery({
    queryKey: ["notifications", id],
    queryFn: () => notificationsApi.list(id),
  });

  const { data: sections } = useQuery({
    queryKey: ["sections", id, "list"],
    queryFn: () => sectionsApi.list(id),
  });

  const send = useMutation({
    mutationFn: (data: NotifForm) => {
      const req: ComposeNotificationRequest = {
        subject: data.subject,
        body: data.body,
        recipientType: data.recipientType,
      };
      if (data.recipientType === "SECTION" && data.sectionId) req.sectionId = data.sectionId;
      if (data.recipientType === "INDIVIDUAL" && data.recipientEmail) req.recipientEmail = data.recipientEmail;
      return notificationsApi.send(id, req);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", id] });
      reset();
      toast({ title: t("notifications.sent"), variant: "success" });
    },
    onError: (err: unknown) => {
      toast({ title: getErrorMessage(err, t("common.error")), variant: "destructive" });
    },
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<NotifForm>({
    resolver: zodResolver(schema),
    defaultValues: { recipientType: "ALL_PAIRS" },
  });

  const recipientType = watch("recipientType");

  return (
    <AppShell sidebar={<CompetitionSidebar competitionId={id} />}>
      <PageHeader title={t("notifications.title")} description={t("notifications.description")} backHref={`/dashboard/competitions/${id}`} />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Compose */}
        <div>
          <h3 className="mb-3 font-semibold text-[var(--text-primary)]">{t("notifications.composeTitle")}</h3>
          <Card>
            <CardContent className="pt-5">
              <form onSubmit={handleSubmit((d) => send.mutate(d))} className="flex flex-col gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">{t("notifications.recipientsLabel")}</label>
                  <Controller
                    control={control}
                    name="recipientType"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL_PAIRS">{t("notifications.allPairs")}</SelectItem>
                          <SelectItem value="SECTION">{t("notifications.specificSection")}</SelectItem>
                          <SelectItem value="INDIVIDUAL">{t("notifications.individualEmail")}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {recipientType === "SECTION" && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">{t("notifications.sectionLabel")}</label>
                    <Controller
                      control={control}
                      name="sectionId"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <SelectTrigger>
                            <SelectValue placeholder={t("notifications.sectionPlaceholder")} />
                          </SelectTrigger>
                          <SelectContent>
                            {sections?.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                )}

                {recipientType === "INDIVIDUAL" && (
                  <Input label={t("notifications.emailLabel")} type="email" {...register("recipientEmail")} />
                )}

                <Input label={t("notifications.subjectLabel")} placeholder={t("notifications.subjectPlaceholder")} error={errors.subject?.message} {...register("subject")} />

                <div>
                  <label className="mb-1.5 block text-sm font-medium">{t("notifications.messageLabel")}</label>
                  <textarea
                    className="flex min-h-[140px] w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 resize-y"
                    placeholder={t("notifications.messagePlaceholder")}
                    {...register("body")}
                  />
                  {errors.body && (
                    <p className="mt-1 text-xs text-[var(--destructive)]">{errors.body.message}</p>
                  )}
                </div>

                <Button type="submit" loading={send.isPending}>
                  <Send className="h-4 w-4" />
                  {t("notifications.sendButton")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* History */}
        <div>
          <h3 className="mb-3 font-semibold text-[var(--text-primary)]">{t("notifications.sentTitle")}</h3>
          {!notifications?.length ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <Mail className="h-8 w-8 text-[var(--text-tertiary)]" />
                <p className="text-sm text-[var(--text-secondary)]">{t("notifications.noEmailsSent")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {notifications.map((n) => (
                <Card
                  key={n.id}
                  className="cursor-pointer transition-colors hover:bg-[var(--surface-secondary)]"
                  onClick={() => setDetailNotif(n)}
                >
                  <CardContent className="py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{n.subject}</p>
                        <p className="text-xs text-[var(--text-tertiary)]">
                          {n.recipientType === "ALL_PAIRS"
                            ? t("notifications.allPairsLabel")
                            : n.recipientType === "INDIVIDUAL"
                            ? n.recipientEmail
                            : t("notifications.sectionRecipient")}
                          {n.sentAt && ` · ${formatTime(n.sentAt)}`}
                        </p>
                      </div>
                      {statusIcon[n.status]}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Email detail modal */}
            {detailNotif && (
              <div
                className="fixed inset-0 z-[150] flex items-end justify-center bg-black/50 sm:items-center"
                onClick={() => setDetailNotif(null)}
              >
                <div
                  className="w-full max-w-lg rounded-t-2xl bg-[var(--surface)] p-5 shadow-xl sm:rounded-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
                        {t("notifications.subjectLabel")}
                      </p>
                      <p className="mt-0.5 text-base font-semibold text-[var(--text-primary)]">
                        {detailNotif.subject}
                      </p>
                    </div>
                    <button
                      onClick={() => setDetailNotif(null)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--text-tertiary)] hover:bg-[var(--surface-secondary)]"
                      aria-label="Zavřít"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="mb-4 flex flex-wrap gap-3 text-xs text-[var(--text-secondary)]">
                    <span>
                      <span className="font-medium">{t("notifications.recipientsLabel")}:</span>{" "}
                      {detailNotif.recipientType === "ALL_PAIRS"
                        ? t("notifications.allPairsLabel")
                        : detailNotif.recipientType === "INDIVIDUAL"
                        ? detailNotif.recipientEmail
                        : t("notifications.sectionRecipient")}
                    </span>
                    {detailNotif.sentAt && (
                      <span>
                        <span className="font-medium">{t("notifications.sentAt")}:</span>{" "}
                        {new Date(detailNotif.sentAt).toLocaleString("cs-CZ")}
                      </span>
                    )}
                  </div>

                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
                      {t("notifications.messageLabel")}
                    </p>
                    {detailNotif.bodyContent ? (
                      <p className="whitespace-pre-wrap text-sm text-[var(--text-primary)]">
                        {detailNotif.bodyContent}
                      </p>
                    ) : (
                      <p className="text-sm italic text-[var(--text-tertiary)]">
                        {t("notifications.templateEmail")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>
    </AppShell>
  );
}
