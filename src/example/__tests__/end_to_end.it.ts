/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { CognitoResources } from './cognito_resources';
import { getUniqueId } from './aws_helpers';
import { ServerResource } from './server_resource';
import { AuthConfig } from '../../services/auth/server_types';
import { BankingUsers } from '../models/users';
import { configureWinston } from './logging';
import { getServerRoutes } from '../server';
import { testAuth } from './auth_test';

describe('rpc_ts_aws_cognito', () => {
  describe('end-to-end', function() {
    this.timeout(20000);

    const uniqueId = getUniqueId();
    let users: BankingUsers;
    let cognito: CognitoResources;
    let server: ServerResource;

    before(async () => {
      configureWinston();

      const region = 'eu-west-1';

      cognito = new CognitoResources({
        envName: uniqueId,
        region,
      });

      await cognito.setup();
    });

    after(async () => {
      await cognito.teardown();
    });

    beforeEach(async () => {
      users = new BankingUsers();
      server = new ServerResource(
        getServerRoutes(getAuthConfig(cognito), users),
      );
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

function getAuthConfig(cognito: CognitoResources): AuthConfig {
  return {
    userPoolId: cognito.userPoolId,
    userPoolWebClientId: cognito.userPoolClientId,
    userPoolWebClientSecretHash: '',
    region: cognito.region,
  };
}
