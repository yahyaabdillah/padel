"use client";

// PadelHub — staff Check-in. DB-backed. Manual member check-in, plus a QR area
// whose direction follows the company "Staff scan booking" toggle: ON → staff
// scans member QR (CameraScanner); OFF → staff shows a static QR for members to
// scan (RealQrCode). Walk-ins are handled via the New Booking flow (register a
// member on a free/walk-in plan), not here.

import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, XCircle, ScanLine, QrCode } from "lucide-react";
import PageScaffold from "@/components/club-engage/PageScaffold";
import Card from "@/components/ui/card/Card";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Select from "@/components/ui/select/Select";
import RealQrCode from "@/components/checkin/RealQrCode";
import CameraScanner from "@/components/checkin/CameraScanner";
import { useToast } from "@/components/ui/toast/ToastContext";
import { useAccess } from "@/context/AccessContext";
import {
  getCheckinPageDataAction,
  searchMembersAction,
  manualCheckinAction,
  qrStaffScanAction,
  type CheckinPageData,
  type MemberOption,
  type CheckinActionResult,
} from "./actions";

export default function CheckinClient() {
  const toast = useToast();
  const { can, isSuper } = useAccess();
  const canCreate = isSuper || can("checkin", "create");

  const [data, setData] = useState<CheckinPageData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const d = await getCheckinPageDataAction();
    setData(d);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (loading || !data) {
    return (
      <PageScaffold title="Check-in" subtitle="Catat kehadiran member & tamu.">
        <div className="h-[420px] animate-pulse rounded-2xl bg-[var(--surface-muted)]" />
      </PageScaffold>
    );
  }

  return (
    <PageScaffold title="Check-in" subtitle="Catat kehadiran member & tamu.">
      {/* stat strip */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Check-in hari ini" value={data.successCount} tone="success" />
        <StatCard label="Ditolak" value={data.rejectCount} tone="error" />
        <StatCard
          label="Mode scan"
          value={data.settings.scanStaffBooking ? "Staff scan" : "Member scan"}
          tone="neutral"
        />
        <StatCard
          label={data.settings.strictWindow ? "Jendela ketat" : "Jendela bebas"}
          value={data.settings.strictWindow ? `±${data.settings.checkinWindowMin}m` : "—"}
          tone="warning"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* LEFT — QR / scanner */}
        <QrPanel data={data} canCreate={canCreate} onResult={refresh} />

        {/* MIDDLE — manual check-in */}
        <div className="space-y-6 lg:col-span-1">
          <ManualCheckinCard canCreate={canCreate} onDone={refresh} />
        </div>

        {/* RIGHT — today's log */}
        <Card className="lg:col-span-1" padding="lg">
          <div className="mb-4">
            <h3 className="text-base font-bold text-[var(--text-heading)]">Log Check-in Hari Ini</h3>
            <p className="text-xs text-[var(--text-muted)]">{data.log.length} aktivitas</p>
          </div>
          {data.log.length === 0 ? (
            <EmptyLog />
          ) : (
            <div className="max-h-[560px] space-y-2.5 overflow-y-auto pr-1">
              {data.log.map((r) => (
                <LogRow key={r.id} row={r} />
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageScaffold>
  );
}

/* ── QR / scanner panel ─────────────────────────────────── */
const QrPanel: React.FC<{
  data: CheckinPageData;
  canCreate: boolean;
  onResult: () => void;
}> = ({ data, canCreate, onResult }) => {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const handleScan = useCallback(
    async (token: string) => {
      if (busy) return;
      setBusy(true);
      const res = await qrStaffScanAction(token);
      setBusy(false);
      reportResult(res, toast);
      onResult();
    },
    [busy, onResult, toast],
  );

  return (
    <Card className="lg:col-span-1" padding="lg">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary-light)] text-[var(--color-primary)]">
          {data.settings.scanStaffBooking ? <ScanLine className="h-4.5 w-4.5" /> : <QrCode className="h-4.5 w-4.5" />}
        </span>
        <div>
          <h3 className="text-base font-bold text-[var(--text-heading)]">
            {data.settings.scanStaffBooking ? "Pindai QR Member" : "QR Check-in"}
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            {data.settings.scanStaffBooking
              ? "Arahkan kamera ke QR booking member."
              : "Member memindai QR ini dari aplikasinya."}
          </p>
        </div>
      </div>

      {data.settings.scanStaffBooking ? (
        canCreate ? (
          <CameraScanner onDecode={handleScan} />
        ) : (
          <p className="rounded-xl bg-[var(--surface-muted)] px-4 py-6 text-center text-xs text-[var(--text-muted)]">
            Anda tidak punya izin untuk melakukan check-in.
          </p>
        )
      ) : (
        <div className="flex flex-col items-center gap-4 text-center">
          <RealQrCode text={data.staffQr} size={220} />
          <Badge color="primary" variant="light" size="sm">
            Berlaku selama jam operasional
          </Badge>
          <p className="break-all font-mono text-xs text-[var(--text-muted)]">{data.staffQr}</p>
        </div>
      )}
    </Card>
  );
};

/* ── manual check-in ────────────────────────────────────── */
const ManualCheckinCard: React.FC<{ canCreate: boolean; onDone: () => void }> = ({
  canCreate,
  onDone,
}) => {
  const toast = useToast();
  const [options, setOptions] = useState<MemberOption[]>([]);
  const [memberId, setMemberId] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void searchMembersAction("").then((rows) => active && setOptions(rows));
    return () => {
      active = false;
    };
  }, []);

  const confirm = async () => {
    if (!memberId || busy) return;
    setBusy(true);
    const res = await manualCheckinAction(memberId);
    setBusy(false);
    reportResult(res, toast);
    if (res.success) {
      setMemberId("");
      onDone();
    }
  };

  return (
    <Card padding="lg">
      <h3 className="mb-1 text-base font-bold text-[var(--text-heading)]">Check-in Manual</h3>
      <p className="mb-4 text-xs text-[var(--text-muted)]">Cari member lalu validasi booking-nya.</p>
      <div className="space-y-4">
        <Select
          label="Member"
          searchable
          options={options}
          value={memberId}
          onChange={(v) => setMemberId(v as string)}
          placeholder="Cari nama / no. HP…"
          disabled={!canCreate}
        />
        <Button
          size="sm"
          variant="primary"
          disabled={!memberId || busy || !canCreate}
          onClick={confirm}
        >
          {busy ? "Memproses…" : "Check-in"}
        </Button>
      </div>
    </Card>
  );
};

/* ── helpers ────────────────────────────────────────────── */
function reportResult(
  res: CheckinActionResult,
  toast: ReturnType<typeof useToast>,
) {
  if (!res.success) {
    toast.error(res.error || "Gagal melakukan check-in.");
    return;
  }
  if (res.alreadyCheckedIn) {
    toast.info(`${res.memberName ?? "Member"} sudah check-in sebelumnya.`, "Sudah check-in");
    return;
  }
  if (res.result === "success") {
    toast.success(
      `${res.memberName ?? "Tamu"} check-in${res.courtName ? ` di ${res.courtName}` : ""}.`,
      "Check-in berhasil",
    );
  } else {
    toast.error(`${res.memberName ?? "Member"}: ${res.reason ?? "Ditolak"}`, "Check-in ditolak");
  }
}

const toneStyles: Record<"success" | "error" | "warning" | "neutral", string> = {
  success: "text-emerald-600 dark:text-emerald-400",
  error: "text-rose-600 dark:text-rose-400",
  warning: "text-amber-600 dark:text-amber-400",
  neutral: "text-[var(--text-heading)]",
};

const StatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  tone: "success" | "error" | "warning" | "neutral";
}> = ({ label, value, tone }) => (
  <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4">
    <p className="text-xs text-[var(--text-muted)]">{label}</p>
    <p className={`mt-1 text-2xl font-semibold ${toneStyles[tone]}`}>{value}</p>
  </div>
);

const methodLabel: Record<string, string> = {
  manual: "Manual",
  qr: "QR",
  walkin: "Walk-in",
};

const LogRow: React.FC<{
  row: CheckinPageData["log"][number];
}> = ({ row }) => {
  const ok = row.result === "success";
  const time = new Date(row.at).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-3">
      <span className={`mt-0.5 ${ok ? "text-emerald-500" : "text-rose-500"}`}>
        {ok ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-[var(--text-heading)]">{row.memberName}</p>
          <span className="shrink-0 text-[10px] text-[var(--text-muted)]">{time}</span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <Badge size="sm" color={ok ? "success" : "error"} variant="light">
            {ok ? "Berhasil" : "Ditolak"}
          </Badge>
          <Badge size="sm" color="neutral" variant="light">
            {methodLabel[row.method] ?? row.method}
          </Badge>
          {row.courtName && (
            <span className="text-xs text-[var(--text-muted)]">{row.courtName}</span>
          )}
        </div>
        {!ok && row.reason && (
          <p className="mt-1 text-xs text-rose-500">{row.reason}</p>
        )}
      </div>
    </div>
  );
};

const EmptyLog: React.FC = () => (
  <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)]">
      <CheckCircle2 className="h-6 w-6" />
    </span>
    <p className="text-sm font-medium text-[var(--text-body)]">Belum ada check-in</p>
    <p className="text-xs text-[var(--text-muted)]">Check-in member atau walk-in akan muncul di sini.</p>
  </div>
);
