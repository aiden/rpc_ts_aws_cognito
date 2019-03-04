/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * An external resource is a test fixture that sets up some test external resource.
 * It has to be cleaned up.
 *
 * Examples of external resources:
 *
 * - New DB instance
 * - New database in an existing DB instance
 * - Truncation of the tables in a test database
 * - Single Docker container
 * - Docker compose
 */
export interface ExternalResource {
  setup(): Promise<void>;
  teardown(): Promise<void>;
}
