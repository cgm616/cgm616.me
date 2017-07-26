build: node_modules
	node index.js

serve: build
	node index.js serve

node_modules: package.json
	npm install

.PHONY: build
