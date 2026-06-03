"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Stepper from "@/components/ui/stepper/Stepper";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import TextInput from "@/components/ui/input/TextInput";
import UiSelect from "@/components/ui/select/Select";
import { useToast } from "@/components/ui/toast/ToastContext";
import PadelWordmark from "@/components/marketing/PadelWordmark";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import { subscriptionPlans } from "@/data/padel";
import { idr } from "@/data/padel/member";

const steps = [
  { label: "Club", description: "Name & city" },
  { label: "Courts", description: "Your setup" },
  { label: "Hours", description: "Opening times" },
  { label: "Plan", description: "Choose tier" },
];

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function OnboardingPage() {
  const toast = useToast();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  // form state
  const [clubName, setClubName] = useState("");
  const [city, setCity] = useState("");
  const [courtCount, setCourtCount] = useState(4);
  const [zone, setZone] = useState("mixed");
  const [openTime, setOpenTime] = useState("07:00");
  const [closeTime, setCloseTime] = useState("23:00");
  const [openDays, setOpenDays] = useState<string[]>(days);
  const [plan, setPlan] = useState("pro");

  const canNext =
    step === 0 ? clubName.trim().length > 1 && city.trim().length > 1 : true;

  const next = () => {
    if (step < steps.length - 1) setStep((s) => s + 1);
    else {
      setDone(true);
      toast.success(`${clubName} is ready to go!`, "Club created");
    }
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const toggleDay = (d: string) =>
    setOpenDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const hourOptions = Array.from({ length: 18 }, (_, i) => {
    const h = String(6 + i).padStart(2, "0") + ":00";
    return { value: h, label: h };
  });

  return (
    <div className="min-h-screen bg-[var(--surface-bg)]">
      {/* top bar */}
      <header className="border-b border-[var(--border-light)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <Link href="/landing">
            <PadelWordmark />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggleButton />
            <Link href="/landing">
              <Button variant="ghost" size="sm">
                Exit
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-10">
        {done ? (
          <SuccessCard clubName={clubName} plan={plan} onLaunch={() => router.push("/")} />
        ) : (
          <>
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold text-[var(--text-heading)]">Set up your club</h1>
              <p className="text-sm text-[var(--text-caption)]">
                A few quick steps and you'll be taking bookings.
              </p>
            </div>

            <div className="mb-8">
              <Stepper steps={steps} currentStep={step} onStepClick={(i) => i < step && setStep(i)} />
            </div>

            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-6 sm:p-8">
              {step === 0 && (
                <div className="space-y-5">
                  <h3 className="font-semibold text-[var(--text-heading)]">Tell us about your club</h3>
                  <TextInput
                    label="Club name"
                    placeholder="e.g. SmashCourt Padel Club"
                    value={clubName}
                    onChange={setClubName}
                    required
                  />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <TextInput label="City" placeholder="Jakarta Selatan" value={city} onChange={setCity} required />
                    <UiSelect
                      label="Country"
                      value="id"
                      onChange={() => {}}
                      options={[
                        { value: "id", label: "Indonesia" },
                        { value: "sg", label: "Singapore" },
                        { value: "my", label: "Malaysia" },
                      ]}
                    />
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-5">
                  <h3 className="font-semibold text-[var(--text-heading)]">How many courts?</h3>
                  <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={() => setCourtCount((c) => Math.max(1, c - 1))}>
                      −
                    </Button>
                    <span className="w-12 text-center text-3xl font-bold text-[var(--text-heading)]">
                      {courtCount}
                    </span>
                    <Button variant="outline" onClick={() => setCourtCount((c) => Math.min(20, c + 1))}>
                      +
                    </Button>
                    <span className="text-sm text-[var(--text-caption)]">courts</span>
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-medium text-[var(--text-heading)]">Court type</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { v: "indoor", l: "Mostly indoor" },
                        { v: "outdoor", l: "Mostly outdoor" },
                        { v: "mixed", l: "Mixed" },
                      ].map((o) => (
                        <Button key={o.v} variant="chip" active={zone === o.v} onClick={() => setZone(o.v)}>
                          {o.l}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-caption)]">
                    💡 We'll auto-create {courtCount} courts named Court 1–{courtCount}. You can rename and
                    set pricing later.
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <h3 className="font-semibold text-[var(--text-heading)]">Operating hours</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <UiSelect label="Opens at" value={openTime} onChange={(v) => setOpenTime(v as string)} options={hourOptions} />
                    <UiSelect label="Closes at" value={closeTime} onChange={(v) => setCloseTime(v as string)} options={hourOptions} />
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-medium text-[var(--text-heading)]">Open days</p>
                    <div className="flex flex-wrap gap-2">
                      {days.map((d) => (
                        <button
                          key={d}
                          onClick={() => toggleDay(d)}
                          className={`h-10 w-12 rounded-lg border text-sm font-medium transition-all ${
                            openDays.includes(d)
                              ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                              : "border-[var(--border-default)] text-[var(--text-caption)]"
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-[var(--text-heading)]">Choose your plan</h3>
                  <div className="space-y-3">
                    {subscriptionPlans.map((p) => {
                      const active = plan === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => setPlan(p.id)}
                          className={`flex w-full items-center justify-between gap-4 rounded-xl border p-4 text-left transition-all ${
                            active
                              ? "border-[var(--color-primary)] bg-[var(--color-primary-light)]"
                              : "border-[var(--border-default)] hover:border-[var(--color-primary)]"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                                active ? "border-[var(--color-primary)]" : "border-[var(--border-strong)]"
                              }`}
                            >
                              {active && <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]" />}
                            </span>
                            <div>
                              <p className="flex items-center gap-2 font-semibold text-[var(--text-heading)]">
                                {p.name}
                                {p.highlighted && (
                                  <Badge variant="light" color="primary" size="sm">
                                    Popular
                                  </Badge>
                                )}
                              </p>
                              <p className="text-xs text-[var(--text-caption)]">{p.blurb}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-[var(--text-heading)]">{idr(p.priceMonthly)}</p>
                            <p className="text-xs text-[var(--text-muted)]">/mo</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-center text-xs text-[var(--text-muted)]">
                    14-day free trial · cancel anytime · no card required
                  </p>
                </div>
              )}

              <div className="mt-8 flex items-center justify-between border-t border-[var(--border-light)] pt-5">
                <Button variant="ghost" onClick={back} disabled={step === 0}>
                  Back
                </Button>
                <span className="text-xs text-[var(--text-muted)]">
                  Step {step + 1} of {steps.length}
                </span>
                <Button onClick={next} disabled={!canNext} glow>
                  {step === steps.length - 1 ? "Create club" : "Continue"}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SuccessCard({
  clubName,
  plan,
  onLaunch,
}: {
  clubName: string;
  plan: string;
  onLaunch: () => void;
}) {
  const planName = subscriptionPlans.find((p) => p.id === plan)?.name ?? "Pro";
  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-10 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary-light)] text-3xl">
        🎉
      </div>
      <h2 className="mt-5 text-2xl font-bold text-[var(--text-heading)]">{clubName} is live!</h2>
      <p className="mt-2 text-[var(--text-caption)]">
        Your {planName} trial has started. Time to set up courts and take your first booking.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button size="lg" onClick={onLaunch} glow>
          Go to dashboard
        </Button>
        <Link href="/landing">
          <Button size="lg" variant="outline">
            Back to site
          </Button>
        </Link>
      </div>
    </div>
  );
}
