import type { Domain, Term } from "./types";

export const DUMMY_DOMAIN: Domain = {
  id: "swe",
  name: "SWE Jargon",
  icon: "💻",
};

export const DUMMY_TERMS: Term[] = [
  {
    term: "Abstraction",
    category: "Architecture",
    definition:
      "Hiding complex implementation details behind a simpler interface, so callers only need to know what something does — not how it does it.",
    example:
      "You drive a car using a steering wheel and pedals without knowing how the engine works internally.",
    discussion:
      "Good abstractions leak eventually — the trick is choosing boundaries where the hidden complexity rarely matters to the caller.",
  },
  {
    term: "Encapsulation",
    category: "Architecture",
    definition:
      "Bundling data and the methods that operate on it together, while restricting direct access to internal state from outside.",
    example:
      "A bank account class exposes deposit() and withdraw() but keeps the balance field private.",
    discussion:
      "Encapsulation and abstraction often go hand in hand — hiding state is one of the most common reasons to introduce an abstraction boundary.",
  },
  {
    term: "Coupling",
    category: "Architecture",
    definition:
      "The degree to which one component depends on another's internals — the tighter the coupling, the more a change on one side risks breaking the other.",
    example:
      "Billing code that directly reads fields from the user-profile table breaks if that table changes.",
    discussion:
      "Teams usually reduce coupling by communicating through a stable API or event contract instead of reaching into another service's internal data model directly.",
  },
  {
    term: "Cohesion",
    category: "Architecture",
    definition:
      "How tightly a module's responsibilities relate to one single purpose, rather than being a grab-bag of unrelated tasks.",
    example:
      "A module that only sends emails is more cohesive than one that also handles payments and analytics.",
    discussion:
      "High cohesion and low coupling tend to go together — a module that does one thing well rarely needs to know much about its neighbors.",
  },
  {
    term: "Separation of concerns",
    category: "Architecture",
    definition:
      "Structuring a system so each part owns one distinct responsibility, with minimal overlap between parts.",
    example:
      "The code that renders a page shouldn't also decide business rules like discount eligibility.",
    discussion:
      "Layered architectures — presentation, business logic, data access — are a direct application of this; mixing layers is usually where tangled 'god classes' come from.",
  },
  {
    term: "Single source of truth (SSOT)",
    category: "Architecture",
    definition:
      "Designating one system or table as the definitive record for a piece of data, so every other copy defers to it instead of drifting out of sync.",
    example: "Storing a user's email in one canonical table instead of three that can disagree.",
    discussion:
      "Distributed systems complicate this ideal, since services often keep local copies for performance — the trick is making one source authoritative and treating the rest as derived caches.",
  },
  {
    term: "Composition over inheritance",
    category: "Architecture",
    definition:
      "Building behavior by assembling small, independent objects instead of extending a shared base class, avoiding deep and fragile class hierarchies.",
    example: "Building with swappable Lego-like pieces instead of a rigid class hierarchy.",
    discussion:
      "Inheritance tightly couples a subclass to its parent's implementation details, so a change deep in the hierarchy can ripple unpredictably; composition keeps that coupling explicit and swappable.",
    controversy:
      "Not universal — this advice, popularized to fix inheritance abuse in Java-era OOP, is sometimes applied too dogmatically today, when a shallow, well-understood inheritance hierarchy is genuinely simpler than a pile of composed objects.",
  },
  {
    term: "Dependency injection (DI)",
    category: "Architecture",
    definition:
      "Supplying an object's dependencies from the outside instead of having it construct them itself, so those dependencies are easy to swap or mock.",
    example:
      "Passing an Engine into a Car instead of the Car building its own, so you can swap engines later.",
    discussion:
      "Frameworks like Spring, Angular, and NestJS implement this via a container that resolves and injects dependencies automatically by type, instead of requiring manual wiring everywhere.",
  },
  {
    term: "Inversion of control (IoC)",
    category: "Architecture",
    definition:
      "A design principle where a framework calls into your code (rather than your code calling the framework), so the framework — not you — drives the overall flow of execution.",
    example: "A hotel's housekeeping schedule decides when your room gets serviced, not you.",
    discussion:
      "Dependency injection is one specific form of IoC — the broader pattern also covers plugin architectures and template methods, where the framework decides when your code runs.",
  },
  {
    term: "Interface",
    category: "Architecture",
    definition:
      "A defined set of operations something promises to support, without specifying how those operations are implemented internally.",
    example:
      "A USB port — any device that fits the shape and protocol works, regardless of what's inside.",
    discussion:
      "Programming against an interface rather than a concrete class is what makes mocking, dependency injection, and swapping implementations at runtime possible in the first place.",
  },
  {
    term: "Trade-off",
    category: "Design",
    definition:
      "A decision where gaining more of one desirable property necessarily means giving up some of another.",
    example: "Faster load times at the cost of higher memory use.",
    discussion:
      "Naming the trade-off explicitly in a design doc or ADR is usually more valuable than debating which option is 'better' in the abstract, since the right answer depends on which cost the team can actually afford.",
  },
  {
    term: "Scalability",
    category: "Design",
    definition:
      "A system's ability to handle growth in users, data, or traffic by adding resources, rather than needing a redesign.",
    example:
      "A restaurant chain built to handle a rush of 500 vs. a food truck serving 20 people an hour.",
    discussion:
      "Horizontal scaling (more machines) and vertical scaling (a bigger machine) solve this differently — horizontal scaling usually requires the system to be stateless or partition-aware first.",
  },
];

/** Pre-seeded known terms for demo progress bar */
export const INITIAL_KNOWN_TERMS = new Set(["Separation of concerns", "Cohesion", "Trade-off"]);
