import { redirect } from "next/navigation";
import { auth } from "@/shared/auth/config";
import type { SessionUser } from "@/shared/auth/types";

export default async function RootPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as SessionUser;

  if (user.roles.includes("HEALTHCARE_WORKER")) {
    redirect("/hw");
  } else if (user.roles.includes("DOCTOR")) {
    redirect("/doctor");
  } else if (user.roles.includes("ADMIN")) {
    redirect("/admin");
  }

  redirect("/login");
}
