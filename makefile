build:
	- rm consts.js
	echo "export const debug = false\nexport const ws_url = 'wss://a2z-scorecard.herokuapp.com/websocket'\n" > consts.js
	- rm -rf dist
	mkdir dist
	jspm bundle-sfx appl/main dist/appl.js
	uglifyjs dist/appl.js -o dist/appl.min.js
	html-dist index.html --remove-all --minify --insert appl.min.js -o dist/index.html
	mkdir -p dist/images
	cp -r images/* dist/images/
	cp loading.css dist/loading.css
	mkdir -p dist/jspm_packages/npm/font-awesome@4.4.0/fonts
	cp -r jspm_packages/npm/font-awesome@4.4.0/fonts/* dist/jspm_packages/npm/font-awesome@4.4.0/fonts/
	- rm consts.js
	echo "export const debug = true\nexport const ws_url = 'ws://localhost:8888/websocket'\n" > consts.js
deploy:
	scp -r -i ~/.ssh/i-Dynamics/idynamics-aws.pem dist/* root@54.171.121.214:/var/www/scorecard/
