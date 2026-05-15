import { redirect } from "next/navigation";

/** /search was a duplicate of /browse — keep the route alive but redirect. */
export default function SearchRedirect() {
  redirect("/browse");
}
