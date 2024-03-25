# infogo

on some uos(wayland) platform the  XGetImage/XShmGetImage function return a blank screenshot, use the xgetimg to test this.

# depends
org.kde.kwin.Screenshot->screenshotFullscreen to caputure screen
convert(imagemagick) to bmp under /dev/shm/kwin.bmp

# change 

1. change the xcapture.c
2. chagne the build.rs
3. add the lib.js

# uinput
please run the weylus-init.sh to add uinput auto

# run
./weylus.arm64 --auto-start --access-code=1234a --no-gui
