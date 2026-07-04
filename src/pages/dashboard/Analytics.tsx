import ClientLayout from "./ClientLayout";
import TelemetryPanel from "@/components/TelemetryPanel";

export default function ClientAnalytics() {
  return (
    <ClientLayout>
      <header>
        <p className="text-[10px] uppercase tracking-[0.35em] text-primary">Signals</p>
        <h1 className="font-display text-3xl">Analytics</h1>
        <p className="text-sm text-muted-foreground">Live telemetry across your Lucen deployments.</p>
      </header>
      <TelemetryPanel />
    </ClientLayout>
  );
}
