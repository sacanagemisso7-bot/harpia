import { SavedViewType } from "@prisma/client";

export function getSavedViewBasePath(type: SavedViewType) {
  switch (type) {
    case SavedViewType.JOBS:
      return "/jobs";
    case SavedViewType.CANDIDATES:
      return "/candidates";
    case SavedViewType.PIPELINE:
      return "/pipeline";
    case SavedViewType.EMPLOYEES:
      return "/employees";
    case SavedViewType.REQUESTS:
      return "/requests";
    case SavedViewType.PEOPLE_TASKS:
      return "/people/tasks";
    default:
      return "/dashboard";
  }
}
