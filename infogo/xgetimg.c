#include <X11/X.h>
#include <X11/Xlib.h>
#include <stdio.h>
#include <X11/Xutil.h>

int main(int argc, char **argv)
{
	Window desktop;
	Display* dsp;
	XImage* img;
	int i, j;
	int screen_width;
	int screen_height;
	unsigned char *pData;

	//dsp = XOpenDisplay(NULL);       /* Connect to a local display */
	dsp = XOpenDisplay(":0");
	if(NULL==dsp)
	{
		return 0;
	}
	desktop = RootWindow(dsp,0);/* Refer to the root window */
	if(0==desktop)
	{
		return 0;
	}

	/* Retrive the width and the height of the screen */
	screen_width = DisplayWidth(dsp,0);
	screen_height = DisplayHeight(dsp,0);

	/* Get the Image of the root window */
	img = XGetImage(dsp,desktop,0,0,screen_width,screen_height,~0,ZPixmap);
	if(img == NULL){
		return 0;
	}
	//JpegWriteFileFromImage(filename,img);
	printf("Width = %d Height = %d, Color Value(R,G,B)\n", screen_width, screen_height);
	pData = img->data;
	for(i = 0; i < 20; i ++){
		for(j = 0; j < 10; j ++){
			printf("(%02x,%02x,%02x) ", *pData, *(pData + 1), *(pData + 2));
			pData += 4;
		}
		printf("\n");
	}
	XCloseDisplay(dsp);

	return 1;
}
