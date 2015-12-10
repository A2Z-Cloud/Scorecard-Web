build:
	- rm -rf dist
	mkdir dist
	jspm bundle-sfx appl/main dist/appl.js
	./node_modules/.bin/uglifyjs dist/appl.js -o dist/appl.min.js
	./node_modules/.bin/html-dist index.html --remove-all --minify --insert appl.min.js -o dist/index.html
	mkdir -p dist/images
	cp -r images/* dist/images/
	cp loading.css dist/loading.css
