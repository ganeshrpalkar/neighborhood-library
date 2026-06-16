"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Preloader } from "@/components/loading/Preloader";

const MIN_VISIBLE_MS = 700;

export default function AppBoot({ children }: { children: React.ReactNode }) {
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const start = Date.now();

    // (b) minimum visible duration
    const minDurationDone = new Promise<void>((resolve) => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
      window.setTimeout(resolve, remaining);
    });

    // (a) window finished loading
    const windowLoaded = new Promise<void>((resolve) => {
      if (document.readyState === "complete") {
        resolve();
        return;
      }
      const onLoad = () => resolve();
      window.addEventListener("load", onLoad, { once: true });
    });

    Promise.all([minDurationDone, windowLoaded]).then(() => {
      if (!cancelled) {
        setBooting(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {children}
      <AnimatePresence>
        {booting && (
          <motion.div
            key="app-boot-preloader"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="fixed inset-0 z-[100]"
          >
            <Preloader label="Opening the library…" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
