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

import { VM } from 'vm2';
import { resolvePackagePath } from '@backstage/backend-common';
import fs from 'fs-extra';
import { JsonValue } from '@backstage/types';

// language=JavaScript
const mkScript = (nunjucksSource: string) => `
const { render, renderCompat } = (() => {
  const module = {};
  const process = { env: {} };
  const require = (pkg) => { if (pkg === 'events') { return function (){}; }};

  ${nunjucksSource}

  const env = module.exports.configure({
    autoescape: false,
    tags: {
      variableStart: '\${{',
      variableEnd: '}}',
    },
  });

  const compatEnv = module.exports.configure({
    autoescape: false,
    tags: {
      variableStart: '{{',
      variableEnd: '}}',
    },
  });
  compatEnv.addFilter('jsonify', compatEnv.getFilter('dump'));

  if (typeof templateFilters !== 'undefined') {
    for (const [filterName, filterFn] of Object.entries(templateFilters)) {
      env.addFilter(filterName, (...args) => JSON.parse(filterFn(...args)));
    }
  }

  if (typeof templateGlobals !== 'undefined') {
    for (const [globalName, global] of Object.entries(templateGlobals)) {
      if (typeof global === 'function') {
        env.addGlobal(globalName, (...args) => JSON.parse(global(...args)));
      } else {
        env.addGlobal(globalName, JSON.parse(global));
      }
    }
  }

  let uninstallCompat = undefined;

  function render(str, values) {
    try {
      if (uninstallCompat) {
        uninstallCompat();
        uninstallCompat = undefined;
      }
      return env.renderString(str, JSON.parse(values));
    } catch (error) {
      // Make sure errors don't leak anything
      throw new Error(String(error.message));
    }
  }

  function renderCompat(str, values) {
    try {
      if (!uninstallCompat) {
        uninstallCompat = module.exports.installJinjaCompat();
      }
      return compatEnv.renderString(str, JSON.parse(values));
    } catch (error) {
      // Make sure errors don't leak anything
      throw new Error(String(error.message));
    }
  }

  return { render, renderCompat };
})();
`;

/** @public */
export type TemplateFilter = (...args: JsonValue[]) => JsonValue | undefined;

/** @public */
export type TemplateGlobal =
  | ((...args: JsonValue[]) => JsonValue | undefined)
  | JsonValue;

export interface SecureTemplaterOptions {
  /* Enables jinja compatibility and the "jsonify" filter */
  cookiecutterCompat?: boolean;
  /* Extra user-provided nunjucks filters */
  templateFilters?: Record<string, TemplateFilter>;
  /* Extra user-provided nunjucks globals */
  templateGlobals?: Record<string, TemplateGlobal>;
}

export type SecureTemplateRenderer = (
  template: string,
  values: unknown,
) => string;

export class SecureTemplater {
  static async loadRenderer(options: SecureTemplaterOptions = {}) {
    const { cookiecutterCompat, templateFilters, templateGlobals } = options;
    const sandbox: Record<string, any> = {};

    if (templateFilters) {
      sandbox.templateFilters = Object.fromEntries(
        Object.entries(templateFilters)
          .filter(([_, filterFunction]) => !!filterFunction)
          .map(([filterName, filterFunction]) => [
            filterName,
            (...args: JsonValue[]) => JSON.stringify(filterFunction(...args)),
          ]),
      );
    }
    if (templateGlobals) {
      sandbox.templateGlobals = Object.fromEntries(
        Object.entries(templateGlobals)
          .filter(([_, global]) => !!global)
          .map(([globalName, global]) => {
            if (typeof global === 'function') {
              return [
                globalName,
                (...args: JsonValue[]) => JSON.stringify(global(...args)),
              ];
            }
            return [globalName, JSON.stringify(global)];
          }),
      );
    }
    const vm = new VM({ sandbox });

    const nunjucksSource = await fs.readFile(
      resolvePackagePath(
        '@backstage/plugin-scaffolder-backend',
        'assets/nunjucks.js.txt',
      ),
      'utf-8',
    );

    vm.run(mkScript(nunjucksSource));

    const render: SecureTemplateRenderer = (template, values) => {
      if (!vm) {
        throw new Error('SecureTemplater has not been initialized');
      }
      vm.setGlobal('templateStr', template);
      vm.setGlobal('templateValues', JSON.stringify(values));

      if (cookiecutterCompat) {
        return vm.run(`renderCompat(templateStr, templateValues)`);
      }

      return vm.run(`render(templateStr, templateValues)`);
    };
    return render;
  }
}
