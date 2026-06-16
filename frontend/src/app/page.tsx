"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Preloader } from "@/components/loading/Preloader";
import { useAuth } from "@/contexts/AuthContext";

export default function HomePage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(isAuthenticated ? "/dashboard" : "/login");
  }, [loading, isAuthenticated, router]);

  return <Preloader label="Welcome to your library…" />;
}
