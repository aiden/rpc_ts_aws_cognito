/**
 * Helpers for `io-ts`.
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as t from 'io-ts';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { ValueError } from './errors';

export function throwOnValidationError<T>(validation: t.Validation<T>): T {
  if (validation.isLeft()) {
    throw new ValueError(PathReporter.report(validation).join('\n'));
  }
  return validation.value;
}
