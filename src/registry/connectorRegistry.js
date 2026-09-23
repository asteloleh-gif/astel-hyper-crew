const DEFAULT_CONNECTORS = Object.freeze([
  Object.freeze({
    id: "social-engine",
    name: "Astel Social Engine",
    capabilities: ["threads.publish", "instagram.publish", "facebook.publish", "social.analytics"],
    ownsCredentials: true,
  }),
  Object.freeze({
    id: "distribution-engine",
    name: "Astel Distribution Engine",
    capabilities: ["youtube.read", "pinterest.publish", "distribution.analytics"],
    ownsCredentials: true,
  }),
  Object.freeze({
    id: "video-editor",
    name: "Video Editor",
    capabilities: ["video.rough-cut", "video.edit-plan"],
    ownsCredentials: false,
  }),
]);

function createConnectorRegistry(connectors = DEFAULT_CONNECTORS) {
  const registry = new Map(connectors.map(connector => [connector.id, Object.freeze({ ...connector })]));
  return {
    get(connectorId) {
      return registry.get(String(connectorId || "").trim()) || null;
    },
    list() {
      return [...registry.values()];
    },
    findByCapability(capability) {
      return [...registry.values()].filter(connector => connector.capabilities.includes(capability));
    },
  };
}

module.exports = { DEFAULT_CONNECTORS, createConnectorRegistry };
