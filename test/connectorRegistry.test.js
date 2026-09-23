const test = require("node:test");
const assert = require("node:assert/strict");
const { createConnectorRegistry } = require("../src/registry/connectorRegistry");

test("resolves execution services by capability", () => {
  const registry = createConnectorRegistry();
  assert.equal(registry.get("social-engine").ownsCredentials, true);
  assert.deepEqual(
    registry.findByCapability("pinterest.publish").map(connector => connector.id),
    ["distribution-engine"]
  );
});
