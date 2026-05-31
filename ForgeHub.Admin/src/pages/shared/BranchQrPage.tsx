import { useRef, useState } from "react";
import { AlertTriangle, FileText } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { useLocation } from "react-router-dom";
import { branchesApi } from "../../api/branchesApi";
import { qrApi } from "../../api/qrApi";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { useApi } from "../../hooks/useApi";

export function BranchQrPage() {
  const location = useLocation();
  const { session } = useAuth();
  const printableRef = useRef<HTMLDivElement>(null);
  const routeBranchId = location.pathname.match(/\/branches\/(\d+)\/qr/)?.[1];
  const canSelectBranch = session?.user.role === "SuperAdmin" || session?.user.role === "GymOwner";
  const branches = useApi(() => canSelectBranch ? branchesApi.getBranches() : Promise.resolve([]), [canSelectBranch]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const firstBranchId = branches.data?.[0]?.id;
  const resolvedBranchId = Number(routeBranchId ?? selectedBranchId ?? session?.user.branchId ?? firstBranchId);
  const canRegenerate = ["SuperAdmin", "GymOwner", "BranchManager"].includes(session?.user.role ?? "");
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [notice, setNotice] = useState("");
  const qr = useApi(() => Number.isFinite(resolvedBranchId) && resolvedBranchId > 0 ? qrApi.getBranchQr(resolvedBranchId) : Promise.resolve(null), [resolvedBranchId]);

  async function regenerate() {
    await qrApi.regenerateBranchQr(resolvedBranchId);
    setConfirmRegenerate(false);
    setNotice("Branch QR regenerated. Replace the printed QR inside the branch.");
    await qr.reload();
  }

  function printQr() {
    window.print();
  }

  function downloadPng() {
    const node = printableRef.current;
    if (!node || !qr.data) return;
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 1100;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 44px Arial";
    ctx.fillText("ForgeHub", 80, 90);
    ctx.font = "bold 36px Arial";
    ctx.fillText(qr.data.branchName, 80, 155);
    ctx.font = "24px Arial";
    ctx.fillText("Scan here to check in", 80, 205);
    ctx.fillText("Open ForgeHub Mobile App > Check In > Scan QR", 80, 245);
    const qrCanvas = node.querySelector("canvas");
    if (qrCanvas) {
      ctx.drawImage(qrCanvas, 230, 310, 440, 440);
    }
    ctx.font = "18px monospace";
    ctx.fillText(qr.data.qrPayload, 80, 1020);
    const link = document.createElement("a");
    link.download = `forgehub-${qr.data.branchName.replace(/\s+/g, "-").toLowerCase()}-qr.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  if (branches.loading) return <LoadingState />;
  if (branches.error) return <ErrorState message={branches.error} />;
  if (canSelectBranch && branches.data?.length === 0) {
    return <EmptyState title="No branches" message="Create a branch before generating branch QR codes." />;
  }

  if (!Number.isFinite(resolvedBranchId) || resolvedBranchId <= 0) {
    return <ErrorState message="No branch is assigned to this user." />;
  }

  if (qr.loading) return <LoadingState />;
  if (qr.error) return <ErrorState message={qr.error} />;
  if (!qr.data) return <ErrorState message="Branch QR is not available." />;

  return (
    <>
      <PageHeader
        title="Branch QR Codes"
        description="Static branch QR for member check-in. Regenerate only if the printed QR is compromised."
      />
      {notice ? <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">{notice}</div> : null}
      {canSelectBranch && branches.data && branches.data.length > 1 ? (
        <Card className="mb-4 max-w-xl">
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Branch
            <Select value={resolvedBranchId} onChange={(event) => setSelectedBranchId(Number(event.target.value))}>
              {branches.data.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name} #{branch.id}</option>
              ))}
            </Select>
          </label>
        </Card>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <div ref={printableRef} className="print-card flex flex-col items-center gap-5 text-center">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-forge-primary">ForgeHub</p>
            <h2 className="text-3xl font-black text-slate-950">{qr.data.branchName}</h2>
            <p className="text-lg font-bold text-slate-700">Scan here to check in</p>
            <div className="rounded-2xl bg-white p-4 shadow-inner">
              <QRCodeCanvas value={qr.data.qrPayload} size={320} level="H" includeMargin />
            </div>
            <p className="text-sm font-semibold text-slate-500">Open ForgeHub Mobile App &gt; Check In &gt; Scan QR</p>
          </div>
        </Card>
        <Card className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase text-forge-muted">Branch ID</p>
            <p className="mb-3 font-black text-slate-900">#{qr.data.branchId}</p>
            <p className="text-xs font-bold uppercase text-forge-muted">Status</p>
            <p className={qr.data.isActive ? "font-black text-emerald-600" : "font-black text-red-600"}>
              {qr.data.isActive ? "Active" : "Inactive"}
            </p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle className="mb-2" size={18} />
            Regenerating invalidates the old printed QR immediately.
          </div>
          <Button className="w-full" onClick={printQr}><FileText size={16} />Print QR</Button>
          <Button className="w-full" variant="secondary" onClick={downloadPng}><FileText size={16} />Download QR PNG</Button>
          {canRegenerate ? (
            <Button className="w-full" variant="danger" onClick={() => setConfirmRegenerate(true)}>
              <FileText size={16} />Regenerate QR
            </Button>
          ) : null}
        </Card>
      </div>
      <ConfirmDialog
        open={confirmRegenerate}
        title="Regenerate branch QR?"
        message="Regenerating this QR will invalidate the old printed QR code. You must print and replace the QR inside the branch."
        onClose={() => setConfirmRegenerate(false)}
        onConfirm={() => void regenerate()}
      />
    </>
  );
}
