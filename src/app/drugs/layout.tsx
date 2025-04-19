import { type ReactNode } from "react";
import { auth } from "@/server/auth";
import { redirect } from "next/navigation";

export default async function DrugsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    // Not signed in; redirect to NextAuth sign-in page
    redirect("/signin?callbackUrl=/drugs");
  }
  return <>{children}</>;
}
