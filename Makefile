all:
	zip -r afftracker.zip *.css *.js *.html icon.png icons LICENSE manifest.json README.md

clean:
	rm afftracker.zip
