---
title: OpenTelemetry Signals
tags:
- opentelemetry
- observability
- tech
description: OpenTelemetry is the most widely adopted standard for observability and
  telemetry collection from resources. It consists of multiple constituents and ways
  to instrument your code with them to allow for a better understanding of system.
publishDate: 2024-07-03 21:42:00+05:30
coverImage:
  src: telemetry.webp
  alt: OpenTelemetry Signals
---

**Observability** is the ability to measure the **internal states** of a system by examining its outputs. A good observability system allows to easily **identify problem** source and troubleshoot them.

Observability **extends** the concept of **monitoring** by not just telling **when** something goes wrong but also providing information about **why** and **how**.

**OpenTelemetry** is an open standard for telemetry collection that was created as a successor to previously existing standards [OpenTracing](https://opentracing.io/) and [Opencensus](https://opencensus.io/) by Cloud Native Computing Foundation (CNCF).

## Telemetry Signals
Signals comprise of various system and application monitoring information that we collect as part of our **telemetry data**. A signal can be a value or a event that you want to be observable.

We can group different signals together to get idea about the health of our system at any particular time. Opentelemetry specification constitutes of the following signals:
- Trace
- Metric
- Log
- Baggage

### Traces
A distributed trace or just trace is a representation of a **series** of causally related **events** that encode the end-to-end **request flow** through a distributed system. A distributed trace contains events that cross process, network and security boundaries.

In particular, a **Trace** can be thought of as a Directed Acyclic Graph (DAG) of **Spans**.
```mermaid
gantt
	title Trace
	dateFormat mm:ss
	axisFormat %M:%S
	Span A :t1, 00:00, 1m
	Span B :t2, 00:10, 20s
	Span C :t3, 00:25, 5s
	Span D :t4, 00:30, 10s
	Span E :t5, 00:40, 15s
	Span F :t6, 00:45, 5s
```

#### Span
**Spans** represent a single logical operation within a trace. For example, a function call during a user request can be represented by a span.

```mermaid
flowchart TD
	A(span A) --> B(Span B) & D(Span D) & E(Span E)
	B --> C(span C)
	E --> F(span F)
```

A span object primarily consists of information about time duration, structured logs/events, attributes, parent span (optional), trace id, etc. We can also create casual relationships between spans across different trace using **Links**.

To create a span we need a tracer which is globally created in your application.
```rust
let span = tracer
	.span_builder("Greeter/client")
	.with_kind(SpanKind::Client)
	.with_attributes([KeyValue::new("component", "grpc")])
	.start(&tracer);
```

We can create four kinds of spans primarily:
- **Client**: A synchronous outgoing request to another service, e.g. HTTP call, database query, etc.
- **Server**: An incoming request that needs to be processed synchronously, e.g. HTTP request, RPC call, etc.
- **Internal**: Anything that doesn't leave a particular service during operation, e.g. processing data, reading from a file, etc.
- **Producer**: It can be used for representing creation of a job for asynchronous processing later. The job created can be within or outside the service boundary.
- **Consumer**: Handling of an asynchronous job which was created by a producer.

A span can have an associated **status** after execution of operation it can be `Ok`, `Error`, or `Unset`. A span can also hold additional information about it's operation in the **attributes**.
```json
"attributes": {
    "net.transport": "IP.TCP",
    "net.peer.ip": "172.17.0.1",
    "net.peer.port": "51820"
}
```

**Span Events** are structured log message on a span. They denote a meaningful event that happened at a particular time in the duration of span execution.
```json
"events": [
	{
	  "name": "",
	  "message": "we are done here",
	  "timestamp": "2021-10-22 16:04:01.209512872 +0000 UTC"
	}
]
```
#### Span Analysis
There are some common patters in spans to look out for which provide information related to anomalies/shortcomings in your application.
- Span taking to long to complete are cause of **latency**.
- Spans finishing at the same time can be a sign of **timeouts** or locks held too long.
- Gap Between spans shows **un-instrumented** code which can use a better coverage.
- **Temporal Coverage** is the measure of trace time covered by leaf spans which tells about granularity of coverage.

### Metrics
A metric is the **measurement** of system's working that provides outlook on its health. A **metric event** is generated at the time of metric collection consisting of time at which it happened and associated metadata.

Apart from general metrics like Memory consumption, CPU utilization, etc we can instrument our application with custom metrics using **Meter Provider**, **Meter**, **Metric Instrument** and **Metric Exporter**.
```rust
// Create a Histogram Instrument.
let histogram = meter
	.f64_histogram("my_histogram")
	.with_description("My histogram example description")
	.init();

// Record measurements using the histogram with attributes
histogram.record(
	10.5,
	&[
		KeyValue::new("mykey1", "myvalue1"),
		KeyValue::new("mykey2", "myvalue2"),
	],
);
```

A metric instrument is created with a name, unit, kind and description. Otel supports different kinds of metric instruments with each having a default form of aggregation (combining large number of measurements):
- **Counter** (Monotonically Increasing) & **Asynchronous Counter** (Async)
- **UpDownCounter** (Integral Summation) & **Asynchronous UpDownCounter** (Async)
- **Gauge** (Value at Time)
- **Histogram** (Statistical Measurement)

```mermaid
flowchart TD
	mp(MeterProvider) --> ma(Meter A) & mb(Meter B)
	ma --> mia(Counter) & mib(Gauge)
	mb --> mic(UpDownCounter) & mid(Histogram)
```

### Logs
A log is an **immutable**, timestamped record of discrete events that happened over time. It can be in structured or unstructured (plain text) format.
```
[2021-02-23T13:26:23.505892] INFO rich_obsevability.printer : [6459ffe1-ea53-4044-aaa3-bf902868f730] Started GET "/" for ::1 now processing.
```

Logs are very **easy** to generate and can be represented in whatever format we want providing **flexibility**. The logging libraries have very **small memory** footprint and are extremely **fast**.
```rust
info!("i responded to the message");
error!("I am not working right now!");
```

With tracing and metrics otel defined a new standard but for logs given the large landscape of legacy systems it acts as **bridge**. The raw logs are attached to the executing trace and span with added information about time, severity, resource, etc finally emitting a **LogRecord**.

```mermaid
flowchart TD
	logger(Log4j) --> bridge(Logs Bridge)
	bridge --> api(Logs Bridge API)
	api --> sdk(Logs SDK)
```

### Baggage
Baggage is a **key value** store used to add additional contextual information about the operation and service for access to **downstream** paths.

To add baggage entries to attributes, you need to explicitly read the data from baggage and add it as attributes to your spans, metrics, or logs.

## Instrumentation
We have to instrument our code using the signals described above to make it observable. There are primarily two ways:
- Code based solution
- Zero code solution

Zero code solution provide rich telemetry from libraries you use and/or the environment your application runs in. This means that **requests** and responses, **database** calls, message queue calls, and so forth are what gets instrumented. Don't you love to work a little less :P
![lazy gif](https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNTZ3cmF2MWE4bHQ0OWhpanV0NGJhbWcxYzEzcHJ3MjhqeGl0M3BmMiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/caRTi6g1ketAA/giphy.gif)

Code based solution allow you to generate **deeper** more custom insights and rich telemetry from your application. We can use instrumentation libraries which provide us easy to use **macros** which generate spans for us.
```rust
#[instrument(
    name = "handle_init_request",
    skip(init_handler, request),
    fields(message_name),
    err(Debug)
)]
fn handle_init_request(
    init_handler: &mut InitHandler,
    request: SignerRequest,
    request_id: u64,
) -> StdResult<(bool, Option<SignerResponse>), Error> {
    let msg = msgs::from_vec(request.message)?;
    Span::current().record("message_name", msg.inner().name());
```

## Conclusion
To develop a highly **scalable** and **distributed** system its not just good enought to write good code and tests but also important to ensure monitoring and observability. The system however good is **fallible** due to its interaction with other components, hardware, user, etc.

At any point of time your system should be able to answer...

![how you doin](https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExY2czMzRjYWttaW1vYXc0c3djNnE5NzYyanh4emo1MjQwdXJoMWJtdSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/jOmQmJkjcvB3Bc8CRb/giphy-downsized.gif)

Thanks for reading as always expect more stuff coming in on opentelemetry as its peaked my interest recently.
