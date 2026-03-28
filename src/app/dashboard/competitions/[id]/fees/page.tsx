"use client";

import { use, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Tag, Pencil } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { CompetitionSidebar } from "@/components/layout/competition-sidebar";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { feesApi } from "@/lib/api/fees";
import { sectionsApi, type SectionDto } from "@/lib/api/sections";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useLocale } from "@/contexts/locale-context";

const feeSchema = z.object({
  amount: z.string().min(1),
  currency: z.string().min(1),
  dueDate: z.string().optional(),
});

const discountSchema = z.object({
  code: z.string().min(3).toUpperCase(),
  type: z.enum(["PERCENTAGE", "FIXED"]),
  value: z.string().min(1),
  maxUses: z.string().optional(),
  expiresAt: z.string().optional(),
});

type FeeForm = z.infer<typeof feeSchema>;
type DiscountForm = z.infer<typeof discountSchema>;

export default function FeesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const { t } = useLocale();
  const [editSection, setEditSection] = useState<SectionDto | null>(null);
  const [discountDialog, setDiscountDialog] = useState(false);

  const { data: sections = [] } = useQuery({
    queryKey: ["sections", id, "list"],
    queryFn: () => sectionsApi.list(id),
  });

  const { data: discounts } = useQuery({
    queryKey: ["discounts", id],
    queryFn: () => feesApi.listDiscounts(id),
  });

  const upsertFee = useMutation({
    mutationFn: (d: FeeForm & { sectionId: string }) =>
      feesApi.upsertSectionFee(d.sectionId, {
        amount: parseFloat(d.amount),
        currency: d.currency,
        dueDate: d.dueDate || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sections", id, "list"] });
      setEditSection(null);
      feeForm.reset();
      toast({ title: t("fees.feeSaved"), variant: "success" });
    },
    onError: () => toast({ title: t("fees.feeSaveFailed"), variant: "destructive" }),
  });

  const createDiscount = useMutation({
    mutationFn: (d: DiscountForm) =>
      feesApi.createDiscount(id, {
        code: d.code,
        type: d.type,
        value: parseFloat(d.value),
        maxUses: d.maxUses ? parseInt(d.maxUses) : undefined,
        expiresAt: d.expiresAt,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["discounts", id] });
      setDiscountDialog(false);
      discountForm.reset();
      toast({ title: t("fees.discountCreated"), variant: "success" });
    },
  });

  const deactivateDiscount = useMutation({
    mutationFn: (discountId: string) => feesApi.deactivateDiscount(id, discountId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["discounts", id] }),
  });

  const feeForm = useForm<FeeForm>({
    resolver: zodResolver(feeSchema),
    defaultValues: { currency: "EUR" },
  });

  const discountForm = useForm<DiscountForm>({
    resolver: zodResolver(discountSchema),
    defaultValues: { type: "FIXED" },
  });

  const openEditSection = (section: SectionDto) => {
    setEditSection(section);
    feeForm.reset({
      amount: section.entryFee ? String(section.entryFee) : "",
      currency: section.entryFeeCurrency ?? "EUR",
      dueDate: "",
    });
  };

  return (
    <AppShell
      sidebar={<CompetitionSidebar competitionId={id} />}
      headerActions={
        <Button size="sm" variant="outline" onClick={() => setDiscountDialog(true)}>
          <Tag className="h-4 w-4" />
          {t("fees.addDiscount")}
        </Button>
      }
    >
      <PageHeader title={t("fees.title")} description={t("fees.description")} />

      {/* Section fees */}
      <div className="mb-8">
        <h3 className="mb-3 font-semibold text-[var(--text-primary)]">{t("fees.sectionFeesTitle")}</h3>
        {sections.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-[var(--text-secondary)]">
              {t("fees.noSections")}
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {sections.map((section) => (
              <Card key={section.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium text-sm">{section.name}</p>
                    {section.entryFee ? (
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {formatCurrency(section.entryFee, section.entryFeeCurrency ?? "EUR")} {t("fees.perPair")}
                      </p>
                    ) : (
                      <p className="text-xs text-[var(--text-tertiary)]">{t("fees.noFee")}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {section.entryFee ? (
                      <span className="text-lg font-bold text-[var(--text-primary)]">
                        {formatCurrency(section.entryFee, section.entryFeeCurrency ?? "EUR")}
                      </span>
                    ) : (
                      <Badge variant="secondary">{t("fees.free")}</Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-[var(--text-tertiary)] hover:text-[var(--accent)]"
                      onClick={() => openEditSection(section)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Separator className="mb-8" />

      {/* Discounts */}
      <div>
        <h3 className="mb-3 font-semibold text-[var(--text-primary)]">{t("fees.discountsTitle")}</h3>
        {!discounts?.length ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-[var(--text-secondary)]">
              {t("fees.noDiscounts")}
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {discounts.map((d) => (
              <Card key={d.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <code className="rounded bg-[var(--surface-secondary)] px-2 py-1 text-sm font-bold">
                      {d.code}
                    </code>
                    <div>
                      <p className="text-sm font-medium">
                        {d.type === "PERCENTAGE" ? t("fees.percentOff", { value: d.value }) : formatCurrency(d.value)} {t("fees.discount")}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {d.maxUses ? t("fees.usesOf", { used: d.usedCount, max: d.maxUses }) : t("fees.uses", { used: d.usedCount })}
                        {d.expiresAt && ` ${t("fees.expires", { date: d.expiresAt })}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={d.active ? "success" : "secondary"}>
                      {d.active ? t("fees.active") : t("fees.inactive")}
                    </Badge>
                    {d.active && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[var(--text-tertiary)]"
                        onClick={() => deactivateDiscount.mutate(d.id)}
                      >
                        {t("fees.deactivate")}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Section Fee Dialog */}
      <Dialog open={!!editSection} onOpenChange={(open) => { if (!open) setEditSection(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("fees.setFeeTitle", { section: editSection?.name ?? "" })}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={feeForm.handleSubmit((d) =>
              upsertFee.mutate({ ...d, sectionId: editSection!.id })
            )}
            className="flex flex-col gap-4"
          >
            <Input
              label={t("fees.amountLabel")}
              type="number"
              min="0"
              step="0.01"
              placeholder="15.00"
              {...feeForm.register("amount")}
              error={feeForm.formState.errors.amount?.message}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium">{t("fees.currencyLabel")}</label>
              <Controller
                control={feeForm.control}
                name="currency"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="CZK">CZK</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <Input label={t("fees.dueDateLabel")} type="date" {...feeForm.register("dueDate")} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditSection(null)}>{t("common.cancel")}</Button>
              <Button type="submit" loading={upsertFee.isPending}>{t("common.save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Discount Dialog */}
      <Dialog open={discountDialog} onOpenChange={setDiscountDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("fees.createDiscountTitle")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={discountForm.handleSubmit((d) => createDiscount.mutate(d))} className="flex flex-col gap-4">
            <Input
              label={t("fees.codeLabel")}
              placeholder={t("fees.codePlaceholder")}
              {...discountForm.register("code")}
              error={discountForm.formState.errors.code?.message}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium">{t("fees.typeLabel")}</label>
              <Controller
                control={discountForm.control}
                name="type"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FIXED">{t("fees.fixedAmount")}</SelectItem>
                      <SelectItem value="PERCENTAGE">{t("fees.percentage")}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <Input label={t("fees.valueLabel")} type="number" min="0" step="0.01" {...discountForm.register("value")} error={discountForm.formState.errors.value?.message} />
            <Input label={t("fees.maxUsesLabel")} type="number" min="1" {...discountForm.register("maxUses")} />
            <Input label={t("fees.expiresAtLabel")} type="date" {...discountForm.register("expiresAt")} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDiscountDialog(false)}>{t("common.cancel")}</Button>
              <Button type="submit" loading={createDiscount.isPending}>{t("common.create")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
