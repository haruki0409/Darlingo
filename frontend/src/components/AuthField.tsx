"use client";

import { type InputHTMLAttributes, type ReactNode } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon: ReactNode;
};

export function AuthField({ label, icon, id, ...rest }: Props) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 block pl-1 text-xs font-medium text-ink-300">
        {label}
      </span>
      <div className="group relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lilac-400">
          {icon}
        </span>
        <input
          id={id}
          {...rest}
          className="w-full rounded-2xl bg-sakura-50/70 px-11 py-3.5 text-sm font-medium text-ink-700 placeholder:text-ink-300/70 outline-none ring-1 ring-transparent transition focus:bg-white focus:ring-2 focus:ring-lilac-400"
        />
      </div>
    </label>
  );
}
