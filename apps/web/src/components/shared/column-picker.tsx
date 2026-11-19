"use client";

import { Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";

export interface ColumnPickerItem {
  key: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
}

export interface ColumnPickerProps {
  columns: ColumnPickerItem[];
  onToggle: (key: string) => void;
  label: string;
  menuTitle: string;
  align?: "start" | "center" | "end";
}

export function ColumnPicker({
  columns,
  onToggle,
  label,
  menuTitle,
  align = "end",
}: ColumnPickerProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 px-3 text-xs font-semibold gap-1.5 shrink-0 cursor-pointer"
        >
          <Columns3 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-48">
        <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {menuTitle}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((col) => (
          <DropdownMenuCheckboxItem
            key={col.key}
            checked={col.checked}
            disabled={col.disabled}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={() => onToggle(col.key)}
            className="text-xs font-medium cursor-pointer"
          >
            {col.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
