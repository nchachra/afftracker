all:
	zip -r afftracker.zip * -x *.git* -x *_bak -x todo Makefile

clean:
	rm afftracker.zip
