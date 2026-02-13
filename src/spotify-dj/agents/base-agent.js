/**
 * Base Agent class for the DJ Agent Team
 *
 * Each agent is a specialized decision-maker that contributes
 * to the overall DJ experience. They communicate through a
 * shared message bus and can propose/veto track selections.
 */

export class BaseAgent {
  constructor(name, role) {
    this.name = name;
    this.role = role;
    this.active = true;
    this.confidence = 0.5; // How confident the agent is in its current decisions
    this.lastAction = null;
    this.messageHandlers = new Map();
  }

  /**
   * Register a handler for a specific message type
   */
  on(messageType, handler) {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, []);
    }
    this.messageHandlers.get(messageType).push(handler);
  }

  /**
   * Receive and process a message from the coordinator
   */
  async receiveMessage(message) {
    const handlers = this.messageHandlers.get(message.type) || [];
    const results = [];
    for (const handler of handlers) {
      results.push(await handler(message));
    }
    return results;
  }

  /**
   * Each agent must implement this to evaluate a candidate track
   * Returns { score: number, reasoning: string, veto: boolean }
   */
  async evaluate(candidate, context) {
    throw new Error(`${this.name}: evaluate() not implemented`);
  }

  /**
   * Each agent can suggest tracks to add to the candidate pool
   * Returns Track[]
   */
  async suggest(context) {
    return [];
  }

  /**
   * Update agent state based on what was played and user feedback
   */
  async onTrackPlayed(track, reaction) {
    // Override in subclasses
  }

  getStatus() {
    return {
      name: this.name,
      role: this.role,
      active: this.active,
      confidence: this.confidence,
      lastAction: this.lastAction,
    };
  }
}
