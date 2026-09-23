function createUnconfiguredAgentExecutor() {
  return {
    async execute({ agent }) {
      throw new Error(`Agent executor is not configured for: ${agent.id}`);
    },
  };
}

module.exports = { createUnconfiguredAgentExecutor };
