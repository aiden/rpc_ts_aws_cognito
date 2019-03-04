# Users and policies used in Continuous Integration

variable iam_username {
  description = "The name of the user used in continuous integration"
}

variable pgp_key {
  description = "The PGP key used to encrypt the IAM access key"
}

resource aws_iam_user ci {
  name = "${var.iam_username}"
}

resource aws_iam_access_key ci {
  user    = "${aws_iam_user.ci.name}"
  pgp_key = "${var.pgp_key}"
}

resource aws_iam_user_policy ci {
  name = "circle_ci"
  user = "${aws_iam_user.ci.name}"

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
        "cognito-idp:*",
        "cognito-identity:*"
      ],
      "Effect": "Allow",
      "Resource": "*"
    },
    {
      "Action": [
        "cognito-idp:ListUserPools",
        "cognito-identity:ListIdentityPools"
      ],
      "Effect": "Deny",
      "Resource": "*"
    }
  ]
}
EOF
}

output "access_keys" {
  value = <<EOF
# Continuous Integration
export AWS_ACCESS_KEY_ID=${aws_iam_access_key.ci.id}
export AWS_SECRET_ACCESS_KEY=$(echo "${aws_iam_access_key.ci.encrypted_secret}" | base64 --decode | keybase pgp decrypt)
EOF
}
