/*
 * Copyright 2021 The Backstage Authors
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

import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { Gitlab } from '@gitbeaker/node';
import { ScmIntegrationRegistry } from '@backstage/integration';
import { DeployTokenScope } from '@gitbeaker/core/dist/types/templates/ResourceDeployTokens';
import { getToken } from '../util';
import { InputError } from '@backstage/errors';

/**
 * Creates a `gitlab:create-project-deploy-token` Scaffolder action.
 *
 * @param options - Templating configuration.
 * @public
 */
export const createGitlabProjectDeployTokenAction = (options: {
  integrations: ScmIntegrationRegistry;
}) => {
  const { integrations } = options;
  return createTemplateAction<{
    repoUrl: string;
    projectId: string | number;
    name: string;
    username: string;
    scopes: string[];
    token?: string;
  }>({
    id: 'gitlab:projectDeployToken:create',
    schema: {
      input: {
        required: ['projectId', 'repoUrl'],
        type: 'object',
        properties: {
          repoUrl: {
            title: 'Repository Location',
            type: 'string',
          },
          projectId: {
            title: 'Project ID',
            type: ['string', 'number'],
          },
          name: {
            title: 'Deploy Token Name',
            type: 'string',
          },
          username: {
            title: 'Deploy Token Username',
            type: 'string',
          },
          scopes: {
            title: 'Scopes',
            type: 'array',
          },
          token: {
            title: 'Authentication Token',
            type: 'string',
            description: 'The token to use for authorization to GitLab',
          },
        },
      },
      output: {
        type: 'object',
        properties: {
          deploy_token: {
            title: 'Deploy Token',
            type: 'string',
          },
          user: {
            title: 'User',
            type: 'string',
          },
        },
      },
    },
    async handler(ctx) {
      ctx.logger.info(`Creating Token for Project "${ctx.input.projectId}"`);
      const { repoUrl, projectId, name, username, scopes } = ctx.input;
      const { token, integrationConfig } = getToken(
        repoUrl,
        ctx.input.token,
        integrations,
      );

      const api = new Gitlab({
        host: integrationConfig.config.baseUrl,
        token: token,
      });

      const deployToken = await api.ProjectDeployTokens.add(
        projectId,
        name,
        scopes as DeployTokenScope[],
        {
          username: username,
        },
      );

      if (!deployToken.hasOwnProperty('token')) {
        throw new InputError(`No deploy_token given from gitlab instance`);
      }

      ctx.output('deploy_token', deployToken.token as string);
      ctx.output('user', deployToken.username);
    },
  });
};
