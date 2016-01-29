build:
	- rm consts.js
	echo "export const debug = false\nexport const ws_url = 'wss://a2z-scorecard.herokuapp.com/websocket'\n" > consts.js
	- rm -rf built
	mkdir built
	jspm bundle-sfx appl/main built/appl.js
	uglifyjs built/appl.js -o built/appl.min.js
	html-dist index.html --remove-all --minify --insert appl.min.js -o built/index.html
	mkdir -p built/images
	cp -r images/* built/images/
	cp loading.css built/loading.css
	mkdir -p built/jspm_packages/npm/font-awesome@4.4.0/fonts
	cp -r jspm_packages/npm/font-awesome@4.4.0/fonts/* built/jspm_packages/npm/font-awesome@4.4.0/fonts/
	- rm consts.js
	echo "export const debug = true\nexport const ws_url = 'ws://localhost:8888/websocket'\n" > consts.js
deploy-demo:
	echo "Not Implemented"
deploy-production:
	aws s3 sync --profile a2zcloud built/ s3://com-a2zcloud-scorecard
	# aws cloudfront --profile a2zcloud create-invalidation --distribution-id E16720FWT3HSR6 --paths /*
