 "use client";

  import { ClubDataProvider } from "@/components/club-core/ClubDataContext";
  import MemberRegister from "@/components/club-core/MemberRegister";

  export default function MemberRegisterPage() {
    return (
      <ClubDataProvider>
        <MemberRegister />
      </ClubDataProvider>
    );
  }