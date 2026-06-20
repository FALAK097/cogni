interface TaskTypeConfig {
  bgColor: string;
  dotColor: string;
  label: string;
}

export type TaskTypeKey = "REMINDER" | "CALL_BACK_AGAIN" | "SEND_DOCUMENTS";

export const KNOWN_TASK_TYPES: TaskTypeKey[] = ["REMINDER", "CALL_BACK_AGAIN", "SEND_DOCUMENTS"];

export const TASK_TYPE_CONFIG: Record<string, TaskTypeConfig> = {
  REMINDER: {
    bgColor: "bg-green-50 dark:bg-green-500/10",
    dotColor: "bg-green-500",
    label: "Reminder",
  },
  SEND_DOCUMENTS: {
    bgColor: "bg-blue-50 dark:bg-blue-500/10",
    dotColor: "bg-blue-500",
    label: "Send documents",
  },
  CALL_BACK_AGAIN: {
    bgColor: "bg-amber-50 dark:bg-amber-500/10",
    dotColor: "bg-amber-500",
    label: "Callback required",
  },
};

export const TASK_TYPES = Object.keys(TASK_TYPE_CONFIG);

/**
 * Normalizes API task shape: prefers `task_types` array, falls back to legacy `task_type`.
 */
export function taskTypeStrings(task: {
  task_types?: string[];
  task_type?: string;
  taskTypes?: string[];
}): string[] {
  if (Array.isArray(task.taskTypes) && task.taskTypes.length > 0) {
    return task.taskTypes;
  }
  if (Array.isArray(task.task_types) && task.task_types.length > 0) {
    return task.task_types;
  }
  if (typeof task.task_type === "string" && task.task_type) {
    return [task.task_type];
  }
  return [];
}

export function taskHasType(
  task: { task_types?: string[]; task_type?: string },
  t: string,
): boolean {
  return taskTypeStrings(task).includes(t);
}

export function taskMatchesAny(
  task: { task_types?: string[]; task_type?: string },
  types: string[],
): boolean {
  const ts = taskTypeStrings(task);
  return types.some((x) => ts.includes(x));
}

/**
 * Gets the configuration for a specific task type key.
 */
export const getTaskTypeConfig = (taskType: string): TaskTypeConfig => {
  return (
    TASK_TYPE_CONFIG[taskType] || {
      bgColor: "bg-gray-50 dark:bg-gray-500/10",
      dotColor: "bg-gray-500",
      label: taskType,
    }
  );
};

export const isDisplayableTaskType = (taskType: string): boolean => {
  return TASK_TYPES.includes(taskType);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const filterDisplayableTasks = (tasks: any[]): any[] => {
  if (!tasks) return [];
  return tasks.filter((task) => taskTypeStrings(task).some((tt) => isDisplayableTaskType(tt)));
};
