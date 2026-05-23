"use client";

import { useState, useTransition } from "react";
import { sileo } from "sileo";
import { updateProject } from "@/lib/actions";
import {
  WorkflowStatusPicker,
  type WorkflowStatus,
} from "@/components/workflow-status-picker";

/**
 * Thin client wrapper around WorkflowStatusPicker that wires it to a
 * specific project. Lets server components drop in a status picker
 * without taking on the picker's state + transition plumbing.
 */
export function ProjectStatusPicker({
  projectId,
  initialStatus,
  align,
  variant,
}: {
  projectId: string;
  initialStatus: WorkflowStatus | null;
  align?: "start" | "end";
  variant?: "default" | "quiet";
}) {
  const [value, setValue] = useState<WorkflowStatus | null>(initialStatus);
  const [, startTransition] = useTransition();

  const onChange = (next: WorkflowStatus | null) => {
    const prev = value;
    setValue(next);
    startTransition(async () => {
      const res = await updateProject(projectId, { workflowStatus: next });
      if (res.error) {
        sileo.error({ title: res.error });
        setValue(prev);
      }
    });
  };

  return (
    <WorkflowStatusPicker
      value={value}
      onChange={onChange}
      align={align}
      variant={variant}
    />
  );
}
