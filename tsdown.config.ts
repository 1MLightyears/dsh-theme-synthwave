/**
 * Standalone build config for the dsh-theme-synthwave plugin.
 * Reuses the vendored DSH client-bundle preset (build/tsdown.client.ts):
 * node-half lib/index.js plus the browser bundle lib/client.js.
 */
import { clientBundle } from './build/tsdown.client.ts'

export default clientBundle('dsh-theme-synthwave', ['src/host/index.ts'])
