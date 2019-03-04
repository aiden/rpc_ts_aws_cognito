/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as Chance from 'chance';

const chance = new Chance();

const base62chars =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const uniqueIDLength = 6; // Should be good for 62^6 = 56+ billion combinations

export function getUniqueId(): string {
  return chance.pickset(base62chars.split(''), uniqueIDLength).join('');
}
