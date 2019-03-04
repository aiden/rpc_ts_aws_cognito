/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { CognitoIdentityServiceProvider, CognitoIdentity } from 'aws-sdk';
import { ExternalResource } from './external_resource';
import { promiseAllInSequence } from '../../utils/errors';

export type CognitoResourcesOptions = {
  /** Environment name (prod, dev, ...) used as a prefix for the AWS SSM parameters */
  envName: string;
  /** AWS Region where to create the Cognito Identity Provider */
  region: string;
};

/**
 * Test cognito resources: a user pool, a user pool client, and an identity pool
 * with the user pool as the sole identity provider.
 */
export class CognitoResources implements ExternalResource {
  constructor(private readonly options: CognitoResourcesOptions) {}

  /** @override */
  async setup() {
    const userPool = await this.ispClient
      .createUserPool(
        {
          PoolName: this.poolName,
          AliasAttributes: ['email'],
          AutoVerifiedAttributes: ['email'],
          AdminCreateUserConfig: {
            // Set to True if only the administrator is allowed to create user profiles.
            // Set to False if users can sign themselves up via an app.
            AllowAdminCreateUserOnly: false,
          },
          Policies: {
            PasswordPolicy: {
              MinimumLength: 8,
              RequireLowercase: true,
              RequireNumbers: true,
              RequireSymbols: false,
              RequireUppercase: true,
            },
          },
        },
        undefined,
      )
      .promise();

    this.userPoolId_ = userPool.UserPool!.Id!;

    const userPoolClient = await this.ispClient
      .createUserPoolClient({
        ClientName: `client ${this.options.envName}`,
        UserPoolId: this.userPoolId,
        GenerateSecret: false,
        ExplicitAuthFlows: ['ADMIN_NO_SRP_AUTH', 'USER_PASSWORD_AUTH'],
      })
      .promise();

    this.userPoolClientId_ = userPoolClient.UserPoolClient!.ClientId!;

    const idPool = await this.idClient
      .createIdentityPool({
        IdentityPoolName: `identity pool ${this.options.envName}`,
        AllowUnauthenticatedIdentities: false,
        CognitoIdentityProviders: [
          {
            ClientId: this.userPoolClientId,
            ProviderName: `cognito-idp.${this.options.region}.amazonaws.com/${
              this.userPoolId
            }`,
            ServerSideTokenCheck: false,
          },
        ],
      })
      .promise();

    this.idPoolId_ = idPool.IdentityPoolId;
  }

  /** @override */
  async teardown() {
    await promiseAllInSequence([
      (async () => {
        if (this.idPoolId_) {
          await this.idClient
            .deleteIdentityPool({
              IdentityPoolId: this.idPoolId,
            })
            .promise();
        }
      })(),
      (async () => {
        if (this.userPoolId_) {
          await this.ispClient
            .deleteUserPool({
              UserPoolId: this.userPoolId,
            })
            .promise();
        }
      })(),
    ]);
  }

  get poolName(): string {
    return `user_pool_${this.options.envName}`;
  }

  get userPoolId(): string {
    if (!this.userPoolId_) {
      throw this.setupNotCalledError();
    }
    return this.userPoolId_;
  }

  get userPoolClientId(): string {
    if (!this.userPoolClientId_) {
      throw this.setupNotCalledError();
    }
    return this.userPoolClientId_;
  }

  get idPoolId(): string {
    if (!this.idPoolId_) {
      throw this.setupNotCalledError();
    }
    return this.idPoolId_;
  }

  get region() {
    return this.options.region;
  }

  private get ispClient() {
    if (!this.ispClient_) {
      this.ispClient_ = new CognitoIdentityServiceProvider();
    }
    return this.ispClient_;
  }

  private get idClient() {
    if (!this.idClient_) {
      this.idClient_ = new CognitoIdentity();
    }
    return this.idClient_;
  }

  private setupNotCalledError() {
    return new Error(
      'setup has not been called yet, so this output is not yet available',
    );
  }

  private ispClient_: CognitoIdentityServiceProvider | undefined;
  private idClient_: CognitoIdentity | undefined;
  private userPoolId_: string | undefined;
  private userPoolClientId_: string | undefined;
  private idPoolId_: string | undefined;
}
