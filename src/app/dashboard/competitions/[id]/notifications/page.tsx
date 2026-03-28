"use client";

import { use, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Mail, CheckCircle2, XCircle, Clock } from "lucide-react";
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
import { notificationsApi } from "@/lib/api/notifications";
import { sectionsApi } from "@/lib/api/sections";
import { formatTime, getErrorMessage } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useLocale } from "@/contexts/locale-context";

const schema = z.object({
  recipientType: z.enum(["ALL_PAIRS", "SECTION", "INDIVIDUAL"]),
  sectionId: z.string().optional(),
  recipientEmail: z.string().optional(),
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

  const { data: notifications } = useQuery({
    queryKey: ["notifications", id],
    queryFn: () => notificationsApi.list(id),
  });

  const { data: sections } = useQuery({
    queryKey: ["sections", id, "list"],
    queryFn: () => sectionsApi.list(id),
  });

  const send = useMutation({
    mutationFn: (data: NotifForm) =>
      notificationsApi.send(id, {
        subject: data.subject,
        body: data.body,
        recipientType: data.recipientType,
        sectionId: data.sectionId,
        recipientEmail: data.recipientEmail,
      }),
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
                <Card key={n.id}>
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
        </div>
      </div>
    </AppShell>
  );
}
