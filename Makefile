all:
	zip -r afftracker.zip css/*.css js/*.js *.html icon*.png icons LICENSE manifest.json README.md

clean:
	rm afftracker.zip
