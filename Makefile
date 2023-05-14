# usage: make it so 
# ;-P 

NAME   := quay.io/cloud-architecture-workshop/backstage
TAG    := $$(git log -1 --pretty=%h)
IMG    := ${NAME}:${TAG}
LATEST := ${NAME}:latest

tags: 
	@echo "Tag: " ${TAG}
	@echo "Image: " ${IMG}

it:
	@yarn install --frozen-lockfile
	@yarn tsc
	@yarn build:backend
	@docker build -t ${IMG} .
	@docker tag ${IMG} ${LATEST}

so:
	@docker push --all-tags ${NAME}
