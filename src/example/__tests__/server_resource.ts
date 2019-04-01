/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as express from 'express';
import * as http from 'http';
import { ExternalResource } from './external_resource';

const API_BASE = '/api';

export class ServerResource implements ExternalResource {
  constructor(private readonly apiRoutes: express.Express) {}

  /** @override */
  async setup() {
    const app = express();
    app.use(API_BASE, this.apiRoutes);

    await new Promise((resolve, reject) => {
      this.server = http.createServer(app).listen((err: any) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
    if (!this.server) {
      throw new Error('Unreachable: server should have been initialized');
    }
    const port = this.server.address().port;
    app.set('port', port);
  }

  /** @override */
  async teardown() {
    if (this.server) {
      this.server.close();
    }
  }

  get url() {
    if (!this.server) {
      throw this.setupNotCalledError();
    }
    return `http://localhost:${this.server.address().port}${API_BASE}`;
  }

  private setupNotCalledError() {
    return new Error(
      'setup has not been called yet, so this output is not yet available',
    );
  }

  private server: http.Server | undefined;
}
