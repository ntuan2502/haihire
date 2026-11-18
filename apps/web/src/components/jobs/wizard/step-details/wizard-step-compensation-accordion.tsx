"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/shared";
import { useI18n } from "@/i18n";
import { cn } from "cn";
import type { Step1TouchedState } from "../wizard-step-details";

interface WizardStepCompensationAccordionProps {
  compensationOpen: boolean;
  setCompensationOpen: (val: boolean) => void;
  payNegotiable: boolean;
  setPayNegotiable: (val: boolean) => void;
  minSalary: string;
  setMinSalary: (val: string) => void;
  maxSalary: string;
  setMaxSalary: (val: string) => void;
  currency: string;
  setCurrency: (val: string) => void;
  salaryPer: string;
  setSalaryPer: (val: string) => void;
  hasSalaryData: boolean;
  showCurrencyError: boolean;
  showSalaryPerError: boolean;
  setTouched: React.Dispatch<React.SetStateAction<Step1TouchedState>>;
}

export function WizardStepCompensationAccordion({
  compensationOpen,
  setCompensationOpen,
  payNegotiable,
  setPayNegotiable,
  minSalary,
  setMinSalary,
  maxSalary,
  setMaxSalary,
  currency,
  setCurrency,
  salaryPer,
  setSalaryPer,
  hasSalaryData,
  showCurrencyError,
  showSalaryPerError,
  setTouched,
}: WizardStepCompensationAccordionProps) {
  const { t } = useI18n();

  return (
    <div className="rounded-lg border border-border bg-muted/30 transition-all">
      <button
        type="button"
        onClick={() => setCompensationOpen(!compensationOpen)}
        className={cn(
          "w-full flex items-center justify-between p-4 text-left cursor-pointer hover:bg-accent/50 transition-colors",
          !compensationOpen ? "rounded-lg" : "rounded-t-lg",
        )}
      >
        <div className="flex items-center gap-2">
          {compensationOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-xs font-semibold text-foreground">
            {t("jobs.wizard.compensationTitle")}
          </span>
          <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-secondary-foreground">
            {t("jobs.wizard.compensationOptional")}
          </span>
        </div>
      </button>

      {!compensationOpen ? (
        <div className="px-4 pb-4 pt-0 text-[11px] text-muted-foreground">
          {t("jobs.wizard.compensationHintClosed")}
        </div>
      ) : (
        <div className="px-4 pb-5 pt-0 space-y-4 border-t border-border">
          <p className="text-[11px] text-muted-foreground pt-3">
            {t("jobs.wizard.compensationHintOpen")}
          </p>

          <label
            htmlFor="pay-negotiable-checkbox"
            className="flex items-center gap-2 cursor-pointer"
          >
            <input
              id="pay-negotiable-checkbox"
              name="payNegotiable"
              aria-label={t("jobs.wizard.payNegotiableDetail")}
              type="checkbox"
              checked={payNegotiable}
              onChange={(e) => setPayNegotiable(e.target.checked)}
              className="rounded border-input accent-primary h-3.5 w-3.5"
            />
            <span className="text-xs text-foreground">
              {t("jobs.wizard.payNegotiableDetail")}
            </span>
          </label>

          {!payNegotiable && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  {t("jobs.wizard.minSalary")}
                </label>
                <Input
                  type="text"
                  placeholder={t("jobs.wizard.placeholders.minSalary")}
                  value={minSalary}
                  onChange={(e) => {
                    setMinSalary(e.target.value);
                    if (e.target.value.trim().length > 0) {
                      setTouched((prev) => ({
                        ...prev,
                        currency: true,
                        salaryPer: true,
                      }));
                    }
                  }}
                  className="h-9 text-xs bg-background"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  {t("jobs.wizard.maxSalary")}
                </label>
                <Input
                  type="text"
                  placeholder={t("jobs.wizard.placeholders.maxSalary")}
                  value={maxSalary}
                  onChange={(e) => {
                    setMaxSalary(e.target.value);
                    if (e.target.value.trim().length > 0) {
                      setTouched((prev) => ({
                        ...prev,
                        currency: true,
                        salaryPer: true,
                      }));
                    }
                  }}
                  className="h-9 text-xs bg-background"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  {t("jobs.wizard.currency")}
                  {hasSalaryData && (
                    <span className="text-destructive ml-0.5">*</span>
                  )}
                </label>
                <CustomSelect
                  value={currency || ""}
                  onChange={(val) => {
                    setCurrency(val);
                    setTouched((prev) => ({ ...prev, currency: true }));
                  }}
                  placeholder={t("jobs.wizard.selectCurrency")}
                  options={[
                    { value: "USD", label: "USD ($)" },
                    { value: "VND", label: "VND (₫)" },
                    { value: "EUR", label: "EUR (€)" },
                    { value: "SGD", label: "SGD (S$)" },
                    { value: "JPY", label: "JPY (¥)" },
                    { value: "NOK", label: "NOK (kr)" },
                    { value: "GBP", label: "GBP (£)" },
                  ]}
                  className="w-full"
                  triggerClassName={cn(
                    "w-full h-9 text-xs font-normal bg-background",
                    showCurrencyError &&
                      "border-destructive ring-1 ring-destructive/30",
                  )}
                />
                {showCurrencyError && (
                  <p className="text-[11px] text-destructive mt-1 font-medium">
                    {t("jobs.wizard.currencyError")}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  {t("jobs.wizard.perPeriod")}
                  {hasSalaryData && (
                    <span className="text-destructive ml-0.5">*</span>
                  )}
                </label>
                <CustomSelect
                  value={salaryPer || ""}
                  onChange={(val) => {
                    setSalaryPer(val);
                    setTouched((prev) => ({ ...prev, salaryPer: true }));
                  }}
                  placeholder={t("jobs.wizard.selectSalaryPer")}
                  options={[
                    { value: "Year", label: t("jobs.wizard.periods.year") },
                    { value: "Month", label: t("jobs.wizard.periods.month") },
                    { value: "Hour", label: t("jobs.wizard.periods.hour") },
                  ]}
                  className="w-full"
                  triggerClassName={cn(
                    "w-full h-9 text-xs font-normal bg-background",
                    showSalaryPerError &&
                      "border-destructive ring-1 ring-destructive/30",
                  )}
                />
                {showSalaryPerError && (
                  <p className="text-[11px] text-destructive mt-1 font-medium">
                    {t("jobs.wizard.salaryPerError")}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
