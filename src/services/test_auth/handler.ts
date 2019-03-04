/**
 * @module
 *
 * This handler implements the Auth service without AWS Cognito, using a simple
 * strategy where every user has the same password and the bearer token is the
 * user ID.  This strategy is useful for speeding up the development and
 * the end-to-end testing of a web app.
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as winston from 'winston';
import * as moment from 'moment';
import { ModuleRpcServer } from 'rpc_ts/lib/server';
import { ModuleRpcCommon } from 'rpc_ts/lib/common';
import { toRFC3339 } from '../../utils/rfc3339';
import { BaseUser, Users } from '../auth/server_types';
import { AuthHandler } from '../auth/handler';
import { AwsTokenInfo } from '../auth/service';

/** Configuration of the test environment. */
export type TestAuthConfig = {
  /**
   * Since we are not connecting to AWS, the AWS access token must be given a
   * mock, invalid value.
   */
  awsAccessToken: string;
  /**
   * We arbitrarily limit the lifespan of tokens to this number.
   */
  tokenLifespanInMinutes: number;
  /**
   * Refresh tokens are of the form `${testConfig.refreshTokenPrefix}${userId}`.
   */
  refreshTokenPrefix: string;
  /**
   * All the users share the same password, given here in plain text.
   */
  password: string;
};

export const DEFAULT_TEST_AUTH_CONFIG: TestAuthConfig = {
  awsAccessToken: '__invalid__',
  tokenLifespanInMinutes: 10,
  refreshTokenPrefix: '__refresh_token__',
  password: 'Password1;',
};

export const getTestAuthHandler = <User extends BaseUser, MeInfo>(
  users: Users<User, MeInfo>,
  testConfig: TestAuthConfig = DEFAULT_TEST_AUTH_CONFIG,
): AuthHandler => {
  return {
    async signIn(request) {
      // https://forums.aws.amazon.com/thread.jspa?threadID=243352: Not possible currently
      // to use email with adminInitiateAuth instead of username...
      const user = await users.findByEmail(request.email);
      if (!user) {
        winston.warn(`no user with email ${request.email}`);
        return {
          status: 'failure',
        };
      }

      if (request.password !== testConfig.password) {
        winston.warn(`wrong password for user ${user.id}`);
        return {
          status: 'failure',
        };
      }

      return {
        status: 'success',
        tokenInfo: getTokenInfo(user.id),
        me: await users.userToMeInfo(user),
      };
    },
    async signUp(request) {
      const user = await users.createFromSignUpRequest(request);

      return { userId: user.id };
    },
    async refreshToken(request) {
      const { userId } = parseRefreshToken(request.refreshToken);
      return getTokenInfo(userId);
    },
  };

  function getTokenInfo(userId: string): AwsTokenInfo {
    return {
      awsAccessToken: testConfig.awsAccessToken,
      token: userId,
      expiryDate: toRFC3339(
        moment.utc().add(testConfig.tokenLifespanInMinutes, 'minutes'),
      ),
      refreshToken: `${testConfig.refreshTokenPrefix}${userId}`,
    };
  }

  function parseRefreshToken(refreshToken: string): { userId: string } {
    if (!refreshToken.startsWith(testConfig.refreshTokenPrefix)) {
      throw new ModuleRpcServer.ServerRpcError(
        ModuleRpcCommon.RpcErrorType.invalidArgument,
        `expected refreshToken to start with ${
          testConfig.refreshTokenPrefix
        }; got refresh token: '${refreshToken}'`,
      );
    }
    return {
      userId: refreshToken.substring(testConfig.refreshTokenPrefix.length),
    };
  }
};
