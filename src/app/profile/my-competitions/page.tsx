import { redirect } from "next/navigation";

export default function MyCompetitionsRedirect() {
  redirect("/dashboard/results");
}
