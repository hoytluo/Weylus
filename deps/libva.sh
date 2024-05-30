#!/usr/bin/env bash

set -ex

cd libva

# required to make ffmpeg's configure work
sed -i -e "s/-lva$/-lva -ldrm -ldl/" pkgconfig/libva.pc.in
sed -i -e 's/-lva-\${display}$/-lva-\${display} -lX11 -lXext -lXfixes -ldrm/' pkgconfig/libva-x11.pc.in
sed -i -e 's/-lva-\${display}$/-lva-\${display} -ldrm/' pkgconfig/libva-drm.pc.in

export CFLAGS=-fPIC
./autogen.sh --prefix=$(readlink -f "$DIST") \
    --enable-static=yes \
    --enable-shared=no \
    --enable-pic \
    --enable-drm \
    --enable-x11 \
    --with-drivers-path="/usr/lib/dri"

make -j$NPROCS
make install
