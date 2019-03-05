# rpc_ts_aws_cognito: Example authentication for rpc_ts with AWS Cognito

[![CircleCI](https://circleci.com/gh/aiden/rpc_ts_aws_cognito/tree/master.svg?style=svg)](https://circleci.com/gh/aiden/rpc_ts_aws_cognito/tree/master) [![typescript](./docs/typescript.svg)](https://aleen42.github.io/badges/src/typescript.svg) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)

This is an example of how to use [AWS Cognito](https://aws.amazon.com/cognito/) to provide authentication for [rpc_ts](https://github.com/aiden/rpc_ts) APIs. It is also a set of best practices.

## Usage

```bash
git clone https://github.com/aiden/rpc_ts_aws_cognito.git
cd rpc_ts_aws_cognito
yarn

# As we use AWS Cognito, an AWS service, we must provide credentials. See
# `terraform/permissions.tf` for the required IAM permissions.
export AWS_ACCESS_KEY_ID='XXXXXX'
export AWS_SECRET_KEY='xxxxxx'

# Test that an example API behind an AWS Cognito authentication middleware can be accessed.
yarn test
```

## License

rpc_ts_aws_cognito is licensed under the MIT License.
