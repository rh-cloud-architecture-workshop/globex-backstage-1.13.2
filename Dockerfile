
# This dockerfile builds an image for the backend package.
# It should be executed with the root of the repo as docker context.
#
# Before building this image, be sure to have run the following commands in the repo root:
#
# yarn install --frozen-lockfile
# yarn tsc
# yarn build:backend
#
# Check out the Makefile: 
#   Usage: make it so 
#   - builds the app package, runs the docker build and pushes the image
#
# NODE_ENV is already set to "production" by default, see: 
# https://catalog.redhat.com/software/containers/ubi9/nodejs-18/62e8e7ed22d1d3c2dfe2ca01

FROM registry.access.redhat.com/ubi9/nodejs-18:latest 
USER 0

# Install yarn
 RUN \
     curl --silent --location https://dl.yarnpkg.com/rpm/yarn.repo | tee /etc/yum.repos.d/yarn.repo && \
     dnf install -y yarn
 
# For the tar command 
# RUN dnf install -y gzip && dnf clean all

USER 1001

# Copy over Yarn 3 configuration, release, and plugins
COPY --chown=1001:1001 .yarn ./.yarn
COPY --chown=1001:1001 .yarnrc.yml ./

COPY --chown=1001:1001 packages/catalog-model/examples ./catalog-model/examples
COPY --chown=1001:1001 plugins/scaffolder-backend/sample-templates ./sample-templates 

COPY --chown=1001:1001 yarn.lock package.json packages/backend/dist/skeleton.tar.gz ./
RUN tar xzf skeleton.tar.gz && rm skeleton.tar.gz

RUN yarn workspaces focus --all --production

COPY --chown=node:node packages/backend/dist/bundle.tar.gz app-config*.yaml ./
RUN tar xzf bundle.tar.gz && rm bundle.tar.gz

# The fix-permissions script is important when operating in environments that dynamically use a random UID at runtime, such as OpenShift.
# The upstream backstage image does not account for this and it causes the container to fail at runtime.
RUN fix-permissions ./

CMD ["node", "packages/backend", "--config", "app-config.yaml"]

