"use client";

import React, { useState } from "react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import TextInput from "@/components/ui/input/TextInput";
import { useRole } from "@/context/RoleContext";
import { useToast } from "@/components/ui/toast/ToastContext";

export default function MemberProfilePage() {
  const { currentUser } = useRole();
  const toast = useToast();
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [phone, setPhone] = useState(currentUser.phone ?? "");

  return (
    <div>
      <PageBreadCrumb pageTitle="Profile" />
      <div className="max-w-2xl rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-6">
        <h1 className="text-xl font-semibold text-[var(--text-heading)]">Personal information</h1>
        <div className="mt-5 space-y-4">
          <TextInput label="Full name" value={name} onChange={setName} />
          <TextInput label="Email" type="email" value={email} onChange={setEmail} />
          <TextInput label="Phone" value={phone} onChange={setPhone} />
        </div>
        <div className="mt-6 flex justify-end">
          <Button variant="primary" onClick={() => toast.success("Profile saved.")}>Save changes</Button>
        </div>
      </div>
    </div>
  );
}
