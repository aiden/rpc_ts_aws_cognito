/**
 * Manipulation of RFC3339-formatted date-time strings.
 *
 * We use branding for type safety and use `io-ts` for encoding/decoding.
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as t from 'io-ts';
import * as moment from 'moment';
import { ValueError } from './errors';
import { throwOnValidationError } from './io';

export type RFC3339 = t.TypeOf<typeof RFC3339>;

export function toRFC3339(date: Date | moment.Moment): RFC3339 {
  if (!date) {
    throw new ValueError('falsey date');
  }
  const m = moment(date);
  if (!m.isValid()) {
    throw new ValueError('invalid date');
  }

  return throwOnValidationError(RFC3339.decode(m.utc().format()));
}

// -----------------------------------------------------------------------------
// Internals

interface RFC3339Brand {
  readonly RFC3339: unique symbol;
}

const RFC3339 = t.brand(
  t.string,
  (s): s is t.Branded<string, RFC3339Brand> => isRFC3339(s),
  'RFC3339',
);

function momentFromRFC3339(s: string): moment.Moment {
  if (!s) {
    throw new ValueError('falsey date');
  }
  const m = moment(s).utc();
  if (!m.isValid()) {
    throw new ValueError(`invalid date '${s}'`);
  }
  return m;
}

function isRFC3339(s: string): boolean {
  try {
    momentFromRFC3339(s);
    return true;
  } catch (err) {
    if (err instanceof ValueError) {
      return false;
    }
    throw err;
  }
}
