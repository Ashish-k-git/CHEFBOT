"use client";

import PricingModal from "@/components/PricingModal";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

interface ProLockedSectionProps {
  isPro: boolean;
  lockText: string;
  ctaText?: string;
  children: ReactNode;
}

export default function ProLockedSection({
  isPro,
  lockText,
  ctaText = "Upgrade to Pro →",
  children,
}: ProLockedSectionProps) {
  return (
    <div className="relative">
      {/* LOCKED CONTENT */}
      <div className={!isPro ? "blur-sm pointer-events-none" : ""}>
        {children}
      </div>

      {/* OVERLAY */}
      {!isPro && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="bg-white/90 border border-stone-200 rounded-xl px-4 py-3 text-center shadow-sm">
            <div className="text-sm font-semibold text-stone-900">
              🔒 {lockText}
            </div>
            <PricingModal nativeButton={true}>
              <Button
                variant="ghost"
                className="text-orange-600 hover:text-orange-600"
              >
                {ctaText}
              </Button>
            </PricingModal>
          </div>
        </div>
      )}
    </div>
  );
}