/**
 * RPC interface for for the sign-up/sign-in flow.
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ModuleRpcContextCommon } from 'rpc_ts/lib/context/common';

export type AuthService = typeof authServiceDefinition;

/**
 * Authentication service.  This service is used for sign-up and session management
 * (retrieving access and refresh tokens to authenticate remote procedure calls to services
 * requiring authentication).
 *
 * The `signIn`/`refreshToken` methods are not used directly, the authentication mechanism is
 * meant to be abstracted away with, e.g., a `TokenAuthClientContextConnector` added to the list
 * of context connectors to the services requiring authentication.
 */
export const authServiceDefinition = {
  /**
   * Sign up a new user.  The corresponding new user UUID is returned.
   * This method also ALWAYS create a new organization.  Users can be invited by the
   * first signed-up user in an organization using the `UserService.inviteUser` method.
   */
  signUp: {
    request: {} as {
      password: string;
      email: string;
      extra: any;
    },
    response: {} as {
      userId: string;
    },
  },
  /**
   * Sign in with username and password.  A `TokenInfo` is returned, containing a
   * JWT token and a refresh token.  As JWT tokens on AWS Cognito expires after an hour,
   * it is important to call the `refreshToken` method of this service to ensure continuity of
   * service.
   *
   * DONT'T USE DIRECTLY (see comment above `authServiceDefinition`).
   */
  signIn: {
    request: {} as {
      email: string;
      password: string;
    },
    response: {} as
      | {
          status: 'success';
          tokenInfo: AwsTokenInfo;
          me: any;
        }
      | {
          status: 'failure';
        },
  },
  /**
   * Return a refreshed `TokenInfo` (JWT-based) using the given refresh token.
   *
   * DONT'T USE DIRECTLY (see comment above `authServiceDefinition`).
   */
  refreshToken: {
    request: {} as {
      refreshToken: string;
    },
    response: {} as AwsTokenInfo,
  },
};

export type AwsTokenInfo = ModuleRpcContextCommon.TokenInfo & {
  awsAccessToken: string;
};
