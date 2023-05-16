# usage: make it so 
# ;-P 

NAME   := quay.io/cloud-architecture-workshop/backstage
TAG    := $$(git log -1 --pretty=%h)
IMG    := ${NAME}:${TAG}
LATEST := ${NAME}:latest

tags: 
	@echo -e "\033[0;31mTag: \033[0m" ${TAG}
	@echo "Image: " ${IMG}

it:
	@echo "-- yarn install ------------------------------------"
	@yarn install --frozen-lockfile
	@echo "-- yarn tsc ----------------------------------------"
	@yarn tsc
	@echo "-- yarn build:backend ------------------------------"
	@yarn build:backend
	@echo "-- docker build ------------------------------------"
	@docker build -t ${IMG} .
	@echo "-- docker tag --------------------------------------"
	@docker tag ${IMG} ${LATEST}

so:
	@echo "-- docker push -------------------------------------"
	@docker push --all-tags ${NAME}
	@echo -e "-- \033[0;31mApproaching rendezvous coordinates, sir!\033[0m --------"
