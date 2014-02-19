all:
	zip -r afftracker.zip * -x *.git* Makefile

clean:
	rm afftracker.zip
