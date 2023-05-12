/*
 * Copyright 2020 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import AWS, { Credentials } from 'aws-sdk';
import { sign } from 'aws4';
import { AWSClusterDetails } from '../types/types';
import { KubernetesAuthTranslator } from './types';

/**
 *
 * @public
 */
export type SigningCreds = {
  accessKeyId: string | undefined;
  secretAccessKey: string | undefined;
  sessionToken: string | undefined;
};

/**
 *
 * @public
 */
export class AwsIamKubernetesAuthTranslator
  implements KubernetesAuthTranslator
{
  validCredentials(creds: SigningCreds): boolean {
    return (creds?.accessKeyId && creds?.secretAccessKey) as unknown as boolean;
  }

  awsGetCredentials = async (): Promise<Credentials> => {
    return new Promise((resolve, reject) => {
      AWS.config.getCredentials(err => {
        if (err) {
          return reject(err);
        }

        return resolve(AWS.config.credentials as Credentials);
      });
    });
  };

  async getCredentials(
    assumeRole?: string,
    externalId?: string,
  ): Promise<SigningCreds> {
    const awsCreds = await this.awsGetCredentials();

    if (!(awsCreds instanceof Credentials))
      throw new Error('No AWS credentials found.');

    let creds: SigningCreds = {
      accessKeyId: awsCreds.accessKeyId,
      secretAccessKey: awsCreds.secretAccessKey,
      sessionToken: awsCreds.sessionToken,
    };

    if (!this.validCredentials(creds))
      throw new Error('Invalid AWS credentials found.');
    if (!assumeRole) return creds;

    try {
      const params: AWS.STS.Types.AssumeRoleRequest = {
        RoleArn: assumeRole,
        RoleSessionName: 'backstage-login',
      };
      if (externalId) params.ExternalId = externalId;

      const assumedRole = await new AWS.STS().assumeRole(params).promise();

      if (!assumedRole.Credentials) {
        throw new Error(`No credentials returned for role ${assumeRole}`);
      }

      creds = {
        accessKeyId: assumedRole.Credentials.AccessKeyId,
        secretAccessKey: assumedRole.Credentials.SecretAccessKey,
        sessionToken: assumedRole.Credentials.SessionToken,
      };
    } catch (e) {
      console.warn(`There was an error assuming the role: ${e}`);
      throw new Error(`Unable to assume role: ${e}`);
    }
    return creds;
  }
  async getBearerToken(
    clusterName: string,
    assumeRole?: string,
    externalId?: string,
  ): Promise<string> {
    const credentials = await this.getCredentials(assumeRole, externalId);

    const request = {
      host: `sts.amazonaws.com`,
      path: `/?Action=GetCallerIdentity&Version=2011-06-15&X-Amz-Expires=60`,
      headers: {
        'x-k8s-aws-id': clusterName,
      },
      signQuery: true,
    };

    const signed = sign(request, credentials);
    const url = `https://${signed.host}${signed.path}`;
    const base64Url = Buffer.from(url, 'binary').toString('base64');
    const urlSafeBase64Url = base64Url
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    return `k8s-aws-v1.${urlSafeBase64Url}`;
  }

  async decorateClusterDetailsWithAuth(
    clusterDetails: AWSClusterDetails,
  ): Promise<AWSClusterDetails> {
    const clusterDetailsWithAuthToken: AWSClusterDetails = Object.assign(
      {},
      clusterDetails,
    );

    clusterDetailsWithAuthToken.serviceAccountToken = await this.getBearerToken(
      clusterDetails.name,
      clusterDetails.assumeRole,
      clusterDetails.externalId,
    );
    return clusterDetailsWithAuthToken;
  }
}
