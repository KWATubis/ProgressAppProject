import { redirect } from "next/navigation";

export default function WorkoutRedirect() {
  redirect("/health/activity/gym");
}
