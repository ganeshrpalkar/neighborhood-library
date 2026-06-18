"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { BookOpen, Lock, Mail, User } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Preloader } from "@/components/loading/Preloader";
import { useAuth } from "@/contexts/AuthContext";
import { errorMessage } from "@/lib/api";
import {
  collectErrors,
  email as validateEmail,
  isValid,
  required,
  type Errors,
} from "@/lib/validation";
import { cn } from "@/lib/cn";

const HeroScene = dynamic(() => import("@/components/three/HeroScene"), { ssr: false });

// Warm aged-paper page (no notebook rules — this should read as a printed book page).
const PAGE: React.CSSProperties = {
  backgroundImage:
    "radial-gradient(120% 100% at 50% 0%, #fbf6ea 0%, #f0e7cf 60%, #e4d8b8 100%)",
};
// Page-block (fore-edge) striations shown on the outer vertical edge of each page.
const FORE_EDGE =
  "repeating-linear-gradient(to bottom, rgba(120,90,40,0.22) 0 1px, transparent 1px 3px)";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const { login, register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<Errors<"email" | "password">>({});
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const isRegister = mode === "register";

  // Pointer-driven tilt for the whole book.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-14, 14]), { stiffness: 110, damping: 16 });
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [12, -12]), { stiffness: 110, damping: 16 });

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = collectErrors<"email" | "password">({
      email: validateEmail(email),
      password: required(password, "Password"),
    });
    setErrors(found);
    if (!isValid(found)) return;
    setLoading(true);
    try {
      if (isRegister) {
        await register(email, password, name || undefined);
        toast.success("Welcome aboard!");
      } else {
        await login(email, password);
        toast.success("Welcome back!");
      }
      // Show the branded loader and keep it on screen briefly while the
      // authenticated app chunk loads, so the transition never flashes blank.
      setRedirecting(true);
      await new Promise((r) => setTimeout(r, 900));
      router.push("/dashboard");
    } catch (err) {
      toast.error(errorMessage(err, "Authentication failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      onMouseMove={onMove}
      className="relative min-h-screen overflow-hidden bg-ink-950"
      style={{ perspective: "2400px" }}
    >
      {redirecting && <Preloader label="Preparing your library…" />}

      {/* full-screen, cursor-interactive 3D book scene */}
      <div className="absolute inset-0">
        <HeroScene variant="background" />
      </div>
      {/* vignette weighted to the right so the book reads clearly */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 80% at 78% 50%, rgba(2,6,23,0.78) 0%, transparent 70%), linear-gradient(to right, transparent 25%, rgba(2,6,23,0.45) 100%)",
        }}
      />

      {/* RIGHT-aligned overlay; pointer-events-none lets the cursor reach the 3D books,
          while the book card itself re-enables pointer events for the form. */}
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4 md:justify-end md:pr-[7vw]">
        <motion.div
          animate={{ y: [0, -10, 0], rotateZ: [0, -0.5, 0] }}
          transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none w-full max-w-[760px]"
        >
          {/* soft glow pad under the book */}
          <motion.div
            aria-hidden
            animate={{ opacity: [0.35, 0.6, 0.35] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="pointer-events-none absolute -inset-6 -z-10 rounded-[36px]"
            style={{ background: "radial-gradient(ellipse at center, rgba(124,58,237,0.35), transparent 70%)", filter: "blur(20px)" }}
          />

          {/* HARDCOVER */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 32 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            className="pointer-events-auto relative rounded-[16px] p-3 font-book"
          >
            {/* leather cover with debossed gold frame */}
            <div
              className="absolute inset-0 rounded-[16px]"
              style={{
                background: "linear-gradient(135deg,#5b3a21,#3a2414 55%,#231307)",
                boxShadow:
                  "inset 0 0 0 2px rgba(212,175,55,0.30), inset 0 0 34px rgba(0,0,0,0.55), 0 44px 90px -24px rgba(0,0,0,0.85)",
              }}
            />
            {/* ribbon bookmark */}
            <div
              aria-hidden
              className="absolute -top-2 right-16 z-20 h-24 w-3.5"
              style={{
                background: "linear-gradient(to bottom,#b91c1c,#7f1d1d)",
                clipPath: "polygon(0 0,100% 0,100% 100%,50% 84%,0 100%)",
                boxShadow: "0 6px 10px -4px rgba(0,0,0,0.6)",
              }}
            />

            {/* PAGES */}
            <div className="relative flex overflow-hidden rounded-[7px]">
              {/* LEFT PAGE — title page (hidden on small screens) */}
              <motion.div
                initial={{ rotateY: 80, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                transition={{ duration: 0.95, delay: 0.2, ease: "easeOut" }}
                style={{ ...PAGE, transformOrigin: "right center", transformStyle: "preserve-3d" }}
                className="relative hidden w-1/2 flex-col justify-between p-9 md:flex"
              >
                <div aria-hidden className="absolute inset-y-1 left-0 w-[7px]" style={{ backgroundImage: FORE_EDGE }} />
                <div>
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-700 to-amber-900 text-amber-100 shadow">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <h2 className="text-4xl font-semibold leading-tight text-stone-800">Neighborhood Library</h2>
                  <div className="my-4 flex items-center gap-2 text-amber-800/70">
                    <span className="h-px w-10 bg-amber-800/40" />
                    <span className="text-sm">❧</span>
                    <span className="h-px flex-1 bg-amber-800/40" />
                  </div>
                  <p className="max-w-xs text-[17px] italic leading-relaxed text-stone-600">
                    Every book, member, and loan — kept in one beautifully bound place.
                  </p>
                </div>
                <p className="text-xs italic text-stone-500">
                  Demo desk — staff@bookhaven.org · library123
                </p>
              </motion.div>

              {/* center gutter / binding crease */}
              <div
                aria-hidden
                className="hidden w-px shrink-0 md:block"
                style={{ boxShadow: "0 0 26px 12px rgba(80,50,10,0.28)", background: "rgba(80,50,10,0.35)" }}
              />

              {/* RIGHT PAGE — the form */}
              <motion.div
                initial={{ rotateY: -80, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                transition={{ duration: 0.95, delay: 0.2, ease: "easeOut" }}
                style={{ ...PAGE, transformOrigin: "left center", transformStyle: "preserve-3d" }}
                className="relative flex w-full flex-col justify-center p-9 md:w-1/2"
              >
                <div aria-hidden className="absolute inset-y-1 right-0 w-[7px]" style={{ backgroundImage: FORE_EDGE }} />

                <motion.div
                  initial="hidden"
                  animate="show"
                  variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.95 } } }}
                >
                  <Item>
                    <h1 className="text-3xl font-semibold text-stone-800">
                      {isRegister ? "Begin a new chapter" : "Welcome back"}
                    </h1>
                    <p className="mt-1 text-[15px] italic text-stone-500">
                      {isRegister ? "Open your librarian account" : "Sign in to your library desk"}
                    </p>
                  </Item>

                  <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
                    {isRegister && (
                      <Item>
                        <Field icon={<User className="h-4 w-4" />} placeholder="Full name (optional)" value={name} onChange={setName} type="text" />
                      </Item>
                    )}
                    <Item>
                      <Field
                        icon={<Mail className="h-4 w-4" />}
                        placeholder="you@example.com"
                        value={email}
                        onChange={(v) => {
                          setEmail(v);
                          setErrors((e) => (e.email ? { ...e, email: undefined } : e));
                        }}
                        error={errors.email}
                        type="email"
                        required
                      />
                    </Item>
                    <Item>
                      <Field
                        icon={<Lock className="h-4 w-4" />}
                        placeholder="Password"
                        value={password}
                        onChange={(v) => {
                          setPassword(v);
                          setErrors((e) => (e.password ? { ...e, password: undefined } : e));
                        }}
                        error={errors.password}
                        type="password"
                        required
                      />
                    </Item>
                    <Item>
                      <Button type="submit" loading={loading} className="w-full font-sans">
                        {isRegister ? "Create account" : "Sign in"}
                      </Button>
                    </Item>
                  </form>

                  <Item>
                    <p className="mt-6 text-center text-[15px] text-stone-500">
                      {isRegister ? (
                        <>
                          Already enrolled?{" "}
                          <Link href="/login" className="font-semibold text-amber-800 hover:text-amber-900">
                            Sign in
                          </Link>
                        </>
                      ) : (
                        <>
                          New here?{" "}
                          <Link href="/register" className="font-semibold text-amber-800 hover:text-amber-900">
                            Create an account
                          </Link>
                        </>
                      )}
                    </p>
                  </Item>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

function Item({ children }: { children: React.ReactNode }) {
  return <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>{children}</motion.div>;
}

function Field({
  icon,
  value,
  onChange,
  error,
  ...props
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  error?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <div>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-800/60">{icon}</span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          suppressHydrationWarning
          className={cn(
            "w-full rounded-md border border-amber-900/25 bg-amber-50/60 py-2.5 pl-10 pr-4 text-[15px] text-stone-800 outline-none transition-all placeholder:text-stone-400 focus:border-amber-700/50 focus:bg-white focus:ring-2 focus:ring-amber-600/20",
            error && "border-red-500/60 focus:border-red-500/70 focus:ring-red-500/20"
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-1 pl-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
