"use client";

import { use } from "react";
import { ClubDataProvider } from "@/components/club-core/ClubDataContext";
import CourtForm from "@/components/club-core/CourtForm";

export default function EditCourtPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <ClubDataProvider>
      <CourtForm courtId={id} />
    </ClubDataProvider>
  );
}
