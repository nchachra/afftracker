all:
	zip -r afftracker.zip * -x *.git* -x *_bak.json -x todo Makefile

clean:
	rm afftracker.zip
