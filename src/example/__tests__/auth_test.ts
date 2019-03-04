/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect } from 'chai';
import { ServerResource } from './server_resource';
import { Client } from '../client';
import { BankingUsers } from '../models/users';

export async function testAuth(users: BankingUsers, server: ServerResource) {
  const displayName = 'John Smith';
  const email = 'johnsmith@example.test';
  const password = 'Password1;';

  const client = new Client(
    server.url,
    // Force `refreshToken` to be called before every API call (so that
    // we can test the behavior).
    1e6,
  );
  const { userId } = await client.signUp({
    extra: {
      displayName,
    },
    password,
    email,
  });
  await client.signIn({
    email,
    password,
  });
  expect(
    client.me.userId,
    'the userId was properly populated on sign in',
  ).to.equal(userId);
  expect(
    client.me.displayName,
    'the displayName was properly populated on sign in',
  ).to.equal(displayName);

  const { value } = await client.banking.getBalance({});
  expect(value, 'on sign up, the client gets 1000').to.equal(1000);

  await users.create({
    id: 'u2',
    name: 'Jane Doe',
    email: 'jane.doe@example.test',
    balance: 0,
  });

  await client.banking.transfer({ toUserId: 'u2', amount: 200 });
  const { value: valueAfter } = await client.banking.getBalance({});
  expect(
    valueAfter,
    'after transferring 200, the client only has 800 remaining',
  ).to.equal(800);

  const u2 = await users.findById('u2');
  expect(u2, 'Jane Doe user can be access').to.be.ok;
  expect(
    u2!.balance,
    'Jane Doe now has 200, which is the amount of the transfer',
  ).to.equal(200);
}
