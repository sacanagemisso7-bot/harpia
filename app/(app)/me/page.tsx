import type { Route } from "next";
import { redirect } from "next/navigation";

export default function MePage() {
  redirect("/me/policies" as Route);
}
