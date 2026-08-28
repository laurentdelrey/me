import { redirect } from "next/navigation";

// The cloud moved to the root — keep old /cloud links working.
export default function CloudRedirect() {
  redirect("/");
}
