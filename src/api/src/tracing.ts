import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-node';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';

// Export slow requests (>=50ms) always, sample 1% of fast requests
class AdaptiveSamplingProcessor extends BatchSpanProcessor {
  constructor(exporter: SpanExporter) {
    super(exporter);
  }

  override onEnd(span: ReadableSpan): void {
    const [secs, nanos] = span.duration;
    const durationMs = secs * 1000 + nanos / 1_000_000;
    if (durationMs >= 50 || Math.random() < 0.01) {
      super.onEnd(span);
    }
  }
}

const exporter: SpanExporter = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
  ? new OTLPTraceExporter()
  : new ConsoleSpanExporter();

const sdk = new NodeSDK({
  serviceName: process.env.OTEL_SERVICE_NAME ?? 'family-hub',
  spanProcessor: new AdaptiveSamplingProcessor(exporter),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metricReader: process.env.OTEL_EXPORTER_OTLP_ENDPOINT
    ? (new PeriodicExportingMetricReader({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        exporter: new OTLPMetricExporter() as any,
        exportIntervalMillis: 30_000,
      }) as any)
    : undefined,
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().catch(console.error);
});
