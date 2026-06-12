"use client";

import { ClubDataProvider } from "@/components/club-core/ClubDataContext";
import CourtForm from "@/components/club-core/CourtForm";

export default function NewCourtPage() {
  return (
    <ClubDataProvider>
      <CourtForm />
    </ClubDataProvider>
  );
}
