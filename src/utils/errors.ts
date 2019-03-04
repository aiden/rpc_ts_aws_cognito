/**
 * Error types and helpers around errors.
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { BaseError } from 'make-error';

/** Error occuring during value serialization/deserialization/manipulation */
export class ValueError extends BaseError {}

/**
 * This runs sequentially all the promises in an array, even if some of them
 * error.  At the end of the sequence, all the errors are reported as a single
 * batch.
 *
 * This is useful for the tearing down logic in tests.
 */
export async function promiseAllInSequence(
  promises: Promise<void>[],
): Promise<void> {
  const errors: Error[] = [];
  for (const promise of promises) {
    try {
      await promise;
    } catch (err) {
      errors.push(err);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `errors in the sequence: ${errors.map(it => it.stack).join('++++++')}`,
    );
  }
}
