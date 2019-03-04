/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { CredentialsOptions } from 'aws-sdk/lib/credentials';
import { ModuleRpcCommon } from 'rpc_ts/lib/common';
import { AuthService } from './service';

export interface AuthConfig {
  /** The AWS Cognito user pool ID. */
  userPoolId: string;

  /** The AWS Cognito app ID. */
  userPoolWebClientId: string;

  /**
   * The AWS Cognito secret hash for the app.  This is currently ignored as the JavaScript SDK
   * does not handle secret hashes very well (therefore the app must be set up without a secret
   * hash).
   *
   * TODO: use `userPoolWebClientSecretHash` once the AWS team has properly implemented it.
   */
  userPoolWebClientSecretHash: string;

  /** The AWS region for the AWS Cognito user pool. */
  region?: string;

  /** The AWS credentials. */
  credentials?: CredentialsOptions;
}

/** The users of a `Users` repository must include some required fields. */
export type BaseUser = {
  id: string;
  email: string;
};

/**
 * The Auth service relies on a repository of users that must implement
 * the `User` interface. It is used for persisting user info outside of Cognito.
 */
export interface Users<User extends BaseUser, MeInfo> {
  /**
   * Create a new user. The ID provided in the `user` argument (example: UUID v5)
   * must be used as the ID of the created user (for instance, it is not valid
   * to ignore the `id` field and to use an auto-incremented ID in a SQL table).
   *
   * It is an error to call `create` with the ID of a user that already exists.
   */
  create(user: User): Promise<void>;

  /**
   * Create a new user from a `signUp` request coming from the Auth service.
   * This function is provided to manipulate the `signUp` extras (typed as
   * `any` in the Auth service).
   */
  createFromSignUpRequest(
    request: ModuleRpcCommon.RequestFor<AuthService, 'signUp'>,
  ): Promise<User>;

  /**
   * Update a user.
   *
   * It is an error to call `update` with the ID of a user that does not exist.
   */
  update(user: User): Promise<void>;

  /** Find a user by ID. */
  findById(id: string): Promise<User | undefined>;

  /** Find a user by email. */
  findByEmail(email: string): Promise<User | undefined>;

  /** Convert a user to a `MeInfo` that is returned as user info at `signIn`. */
  userToMeInfo(user: User): Promise<MeInfo>;
}
