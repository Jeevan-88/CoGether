/**
 * Platform Metrics Collector
 * Collects runtime Golden Signals (requests, latency, active sockets, errors)
 * with Prometheus exposition format helper.
 */

class MetricsRegistry {
  constructor() {
    this.counters = new Map();
    this.gauges = new Map();
    this.histograms = new Map();
  }

  incrementCounter(name, value = 1, labels = {}) {
    const key = this._formatKey(name, labels);
    this.counters.set(key, (this.counters.get(key) || 0) + value);
  }

  setGauge(name, value, labels = {}) {
    const key = this._formatKey(name, labels);
    this.gauges.set(key, value);
  }

  recordHistogram(name, value, labels = {}) {
    const key = this._formatKey(name, labels);
    if (!this.histograms.has(key)) {
      this.histograms.set(key, []);
    }
    const samples = this.histograms.get(key);
    samples.push(value);
    if (samples.length > 1000) samples.shift(); // Bound memory
  }

  _formatKey(name, labels) {
    const labelEntries = Object.entries(labels);
    if (labelEntries.length === 0) return name;
    const labelStr = labelEntries.map(([k, v]) => `${k}="${v}"`).join(',');
    return `${name}{${labelStr}}`;
  }

  toPrometheusFormat() {
    const lines = [];

    lines.push('# TYPE cogether_http_requests_total counter');
    for (const [key, val] of this.counters.entries()) {
      lines.push(`${key} ${val}`);
    }

    lines.push('# TYPE cogether_gauges gauge');
    for (const [key, val] of this.gauges.entries()) {
      lines.push(`${key} ${val}`);
    }

    return lines.join('\n') + '\n';
  }

  getSnapshot() {
    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges)
    };
  }
}

const metrics = new MetricsRegistry();

module.exports = {
  MetricsRegistry,
  metrics
};
