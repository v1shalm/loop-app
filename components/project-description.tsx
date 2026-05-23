"use client";

import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { sileo } from "sileo";
import { updateProject } from "@/lib/actions";

/**
 * Inline description editor for a project. Mirrors the AutoTextarea
 * pattern from the task drawer: textarea grows with content, blur
 * saves the change with optimistic UI + toast on error.
 */
export function ProjectDescription({
  projectId,
  initial,
}: {
  projectId: string;
  initial: string | null;
}) {
  const [value, setValue] = useState(initial ?? "");
  const [pending, startTransition] = useTransition();
  const lastSavedRef = useRef(initial ?? "");

  const save = () => {
    const next = value;
    if (next === lastSavedRef.current) return;
    lastSavedRef.current = next;
    startTransition(async () => {
      const res = await updateProject(projectId, {
        description: next || null,
      });
      if (res.error) sileo.error({ title: res.error });
    });
  };

  return (
    <div className="relative">
      <AutoTextarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        placeholder="Add a short description so this project tells its own story on the index..."
        minRows={2}
        className="w-full resize-none rounded-lg border border-border/60 bg-card p-3 text-[13.5px] leading-relaxed text-foreground outline-none transition-colors focus:border-ring/40 placeholder:text-muted-foreground/50"
      />
      {pending && (
        <span className="pointer-events-none absolute right-3 top-3 text-[10.5px] text-muted-foreground/70">
          Saving...
        </span>
      )}
    </div>
  );
}

interface AutoTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number;
}

const AutoTextarea = forwardRef<HTMLTextAreaElement, AutoTextareaProps>(
  function AutoTextarea(
    { minRows = 1, onInput, value, defaultValue, ...rest },
    ref
  ) {
    const innerRef = useRef<HTMLTextAreaElement | null>(null);
    useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement);

    const resize = () => {
      const el = innerRef.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    };

    useLayoutEffect(() => {
      resize();
    }, [value, defaultValue]);

    return (
      <textarea
        ref={innerRef}
        rows={minRows}
        value={value}
        defaultValue={defaultValue}
        onInput={(e) => {
          resize();
          onInput?.(e);
        }}
        {...rest}
      />
    );
  }
);
