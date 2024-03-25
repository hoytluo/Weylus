# infogo

on some uos(wayland) platform the  XGetImage/XShmGetImage function return a blank screenshot, use the xgetimg to test this.

# depends
org.kde.kwin.Screenshot->screenshotFullscreen to caputure screen
convert(imagemagick/imagemagick-6.q16) to bmp under /dev/shm/kwin.bmp

# change 

1. change the xcapture.c
2. chagne the build.rs
3. add the lib.js

# uinput
please run the weylus-init.sh to add uinput auto

# run
0. check the xgetimg output, if it can get captueimage skip setp 1,2 otherwise run step1,2
1. apt install imagemagick-6.q16 # ensure the convert command is ok
2. add dbus-capture to the run PATH # ensure the dbs-capture 
3. run weylus-init.sh once and reboot the system
4. run ./weylus.arm64 --auto-start --access-code=1234a --no-gui
5. on another computer open chrome to explore the http://$IP:1702 to control the machine
6. kill the weylus.arm64 when you finished the  remote


# todo
1. merege the code into the infogodesk
