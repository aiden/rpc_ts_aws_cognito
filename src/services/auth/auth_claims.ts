/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ModuleRpcContextServer } from 'rpc_ts/lib/context/server';
import { ModuleRpcServer } from 'rpc_ts/lib/server';
import { ModuleRpcCommon } from 'rpc_ts/lib/common';
import { BaseUser, Users, AuthConfig } from './server_types';

const USER_ID_CLAIM = 'cognito:username';

export type AuthClaims = { userId: string };

export const getAuthClaimsHandler = <User extends BaseUser, MeInfo>(
  authConfig: AuthConfig,
  users: Users<User, MeInfo>,
) =>
  ModuleRpcContextServer.getJwtAuthClaimsHandler(
    getCognitoJwksUrl(authConfig),
    getCognitoExpectedAudiences(authConfig),
    decodeAuthClaims(users),
  );

/**
 * Return the well-known URL used by AWS Cognito to expose the JSON Web Key Set
 * for a given user pool.
 */
function getCognitoJwksUrl(config: AuthConfig) {
  return `https://cognito-idp.${config.region}.amazonaws.com/${
    config.userPoolId
  }/.well-known/jwks.json`;
}

/**
 * Return the audiences expected to be found in a JWT token issued by AWS Cognito.
 */
function getCognitoExpectedAudiences(config: AuthConfig) {
  return [config.userPoolWebClientId];
}

/** Decode auth claims coming from the token auth server context. */
const decodeAuthClaims = <User extends BaseUser, MeInfo>(
  users: Users<User, MeInfo>,
): ModuleRpcContextServer.JwtAuthClaimsDecoder<
  AuthClaims
> => async encodedClaims => {
  const userId = encodedClaims[USER_ID_CLAIM];
  if (!userId) {
    throw new ModuleRpcContextServer.TokenValidationError(
      `${USER_ID_CLAIM} is not set`,
    );
  }
  const user = await users.findById(userId);
  if (!user) {
    throw new ModuleRpcServer.ServerRpcError(
      ModuleRpcCommon.RpcErrorType.unauthenticated,
      `expected user ${userId} to exist`,
    );
  }
  return {
    userId,
  };
};
