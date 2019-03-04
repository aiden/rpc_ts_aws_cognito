/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as express from 'express';
import { bankingServiceDefinition } from './services/banking/service';
import { getBankingHandler } from './services/banking/handler';
import { ModuleRpcProtocolServer } from 'rpc_ts/lib/protocol/server';
import { ModuleRpcContextServer } from 'rpc_ts/lib/context/server';
import { getAuthHandler } from '../services/auth/handler';
import { authServiceDefinition } from '../services/auth/service';
import { ROUTES } from './routing';
import { AuthClaims, getAuthClaimsHandler } from '../services/auth/auth_claims';
import winston = require('winston');
import { AuthConfig } from '../services/auth/server_types';
import { BankingUsers } from './models/users';
import {
  DEFAULT_TEST_AUTH_CONFIG,
  TestAuthConfig,
  getTestAuthHandler,
} from '../services/test_auth/handler';
import { getTestAuthClaimsHandler } from '../services/test_auth/auth_claims';

/**
 * Get the Express routes for all the services.
 */
export function getServerRoutes(
  authConfig: AuthConfig,
  users: BankingUsers,
): express.Express {
  const app = express();

  app.use(
    ROUTES.auth,
    ModuleRpcProtocolServer.registerRpcRoutes(
      authServiceDefinition,
      getAuthHandler(authConfig, users),
      {
        captureError,
        serverContextConnector: new ModuleRpcContextServer.EmptyServerContextConnector(),
      },
    ),
  );

  addServerRoutesBehindAuth(
    app,
    users,
    new ModuleRpcContextServer.TokenAuthServerContextConnector<AuthClaims>(
      getAuthClaimsHandler(authConfig, users),
    ),
  );

  return app;
}

export function getServerRoutesWithTestAuth(
  users: BankingUsers,
  testAuthConfig: TestAuthConfig = DEFAULT_TEST_AUTH_CONFIG,
): express.Express {
  const app = express();

  app.use(
    ROUTES.auth,
    ModuleRpcProtocolServer.registerRpcRoutes(
      authServiceDefinition,
      getTestAuthHandler(users, testAuthConfig),
      {
        captureError,
        serverContextConnector: new ModuleRpcContextServer.EmptyServerContextConnector(),
      },
    ),
  );

  addServerRoutesBehindAuth(
    app,
    users,
    new ModuleRpcContextServer.TokenAuthServerContextConnector<AuthClaims>(
      getTestAuthClaimsHandler(users),
    ),
  );

  return app;
}

function addServerRoutesBehindAuth(
  app: express.Express,
  users: BankingUsers,
  serverContextConnector: ModuleRpcContextServer.TokenAuthServerContextConnector<
    AuthClaims
  >,
) {
  app.use(
    ROUTES.banking,
    ModuleRpcProtocolServer.registerRpcRoutes(
      bankingServiceDefinition,
      getBankingHandler(users),
      {
        captureError,
        serverContextConnector,
      },
    ),
  );
}

function captureError(
  err: Error,
  errorContext: {
    url?: string;
  },
) {
  winston.error('RPC ERROR: ', err, errorContext);
}
