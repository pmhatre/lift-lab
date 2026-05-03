"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Option {
  value: string;
  label: string;
}

export function RangeSelect({
  paramKey,
  defaultValue,
  options,
  className,
}: {
  paramKey: string;
  defaultValue: string;
  options: Option[];
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get(paramKey) ?? defaultValue;

  return (
    <Select
      value={current}
      onValueChange={(v) => {
        if (!v) return;
        const params = new URLSearchParams(searchParams.toString());
        params.set(paramKey, v);
        router.push(`${pathname}?${params.toString()}`);
      }}
    >
      <SelectTrigger className={className ?? "w-[170px]"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
