/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import winston = require('winston');

export function configureWinston() {
  winston.configure({
    transports: [
      new winston.transports.Console({
        level: 'debug',
        silent: false,
        format: winston.format.simple(),
      }),
    ],
  });
}
