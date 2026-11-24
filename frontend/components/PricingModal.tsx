"use client";

import React, { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import PricingSection from "./PricingSection";
import type { SubscriptionTier } from "@/lib/types";
import type { ReactElement } from "react";

interface PricingModalProps {
  subscriptionTier?: SubscriptionTier;
  children: ReactElement;
  nativeButton?: boolean;
}

export default function PricingModal({
  subscriptionTier = "free",
  children,
  nativeButton = true,
}: PricingModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const canOpen = subscriptionTier === "free";

  return (
    <Dialog
      open={isOpen}
      onOpenChange={canOpen ? setIsOpen : undefined}
    >
      <DialogTrigger
        render={children}
        nativeButton={nativeButton}
      />

      <DialogContent className="p-8 pt-4 sm:max-w-4xl">
        <DialogTitle />

        <div>
          <PricingSection
            subscriptionTier={subscriptionTier}
            isModal={true}
            onClose={() => setIsOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}