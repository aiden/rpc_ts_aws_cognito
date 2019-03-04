/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ServerResource } from './server_resource';
import { BankingUsers } from '../models/users';
import { configureWinston } from './logging';
import { getServerRoutesWithTestAuth } from '../server';
import { testAuth } from './auth_test';

describe('rpc_ts_aws_cognito', () => {
  describe('TestAuth service', function() {
    let users: BankingUsers;
    let server: ServerResource;

    before(async () => {
      configureWinston();
    });

    beforeEach(async () => {
      users = new BankingUsers();
      server = new ServerResource(getServerRoutesWithTestAuth(users));
      await server.setup();
    });

    afterEach(async () => {
      await server.teardown();
    });

    specify('a user can access the API after they have signed up', async () => {
      await testAuth(users, server);
    });
  });
});
