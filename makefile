# build:
# 	- rm consts.js
# 	echo "export const debug = false\nexport const ws_url = 'wss://a2z-scorecard.herokuapp.com/websocket'\n" > consts.js
# 	- rm -rf built
# 	mkdir built
# 	jspm bundle-sfx appl/main built/appl.js
# 	uglifyjs built/appl.js -o built/appl.min.js
# 	html-dist index.html --remove-all --minify --insert appl.min.js -o built/index.html
# 	mkdir -p built/images
# 	cp -r images/* built/images/
# 	cp loading.css built/loading.css
# 	mkdir -p built/jspm_packages/npm/font-awesome@4.4.0/fonts
# 	cp -r jspm_packages/npm/font-awesome@4.4.0/fonts/* built/jspm_packages/npm/font-awesome@4.4.0/fonts/
# 	- rm consts.js
# 	echo "export const debug = true\nexport const ws_url = 'ws://localhost:8888/websocket'\n" > consts.js
# deploy-demo:
# 	echo "Not Implemented"
# deploy-production:
# 	aws s3 sync --profile a2zcloud built/ s3://com-a2zcloud-scorecard
	# aws cloudfront --profile a2zcloud create-invalidation --distribution-id E16720FWT3HSR6 --paths "/*"


THIS_FILE := $(lastword $(MAKEFILE_LIST))

S3_NAME_LIVE = com-a2zcloud-scorecard
CF_DIST_LIVE = E16720FWT3HSR6

build:
	# e.g. make build t=live
	$(eval lower_target := $(shell X="${t}"; echo "$t" | tr '[:upper:]' '[:lower:]'))
	# Destory and create targets subfolder in dist
	- rm -rf dist/$(lower_target)
	mkdir -p dist/$(lower_target)
	# Switch out the correct const ready for build (if not already correct)
	@if [ $(lower_target) != "local" ]; then\
        mv consts/local.js consts/temp.js && mv consts/$(lower_target).js consts/local.js;\
    fi
	# Build
	./node_modules/.bin/jspm bundle-sfx appl/main dist/$(lower_target)/appl.js
	./node_modules/.bin/uglifyjs dist/$(lower_target)/appl.js -o dist/$(lower_target)/appl.min.js
	./node_modules/.bin/html-dist index.html --remove-all --minify --insert appl.min.js -o dist/$(lower_target)/index.html
	mv dist/index.html dist/$(lower_target)/index.html

	mkdir -p dist/$(lower_target)/images
	cp -r images/* dist/$(lower_target)/images/

	cp loading.css dist/$(lower_target)/loading.css

	mkdir -p dist/$(lower_target)/jspm_packages/npm/font-awesome@4.4.0/fonts
	cp -r jspm_packages/npm/font-awesome@4.4.0/fonts/* dist/$(lower_target)/jspm_packages/npm/font-awesome@4.4.0/fonts/

	# Switch back consts
	@if [ $(lower_target) != "local" ]; then\
        mv consts/local.js consts/$(lower_target).js && mv consts/temp.js consts/local.js;\
    fi
deploy:
	# e.g. make deploy t=live
	$(eval lower_target := $(shell X="${t}"; echo "$t" | tr '[:upper:]' '[:lower:]'))
	$(eval upper_target := $(shell X="${t}"; echo "$t" | tr '[:lower:]' '[:upper:]'))
	# Call build with target
	@$(MAKE) -f $(THIS_FILE) build t=$(upper_target)
	# Updload to s3 and invalidate cloudfront cache if not local
	@if [ $(lower_target) != "local" ]; then\
        aws s3 sync --profile a2zcloud dist/$(lower_target)/ s3://${S3_NAME_$(upper_target)};\
		aws cloudfront create-invalidation --profile a2zcloud --distribution-id ${CF_DIST_$(upper_target)} --invalidation-batch "{\"Paths\": {\"Quantity\": 1,\"Items\": [\"/*\"]},\"CallerReference\": \"make deploy "`date +%Y-%m-%d:%H:%M:%S`"\"}";\
    fi
