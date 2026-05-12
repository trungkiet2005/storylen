"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Settings redirects to profile settings tab
export default function SettingsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/profile");
  }, [router]);
  return null;
}
