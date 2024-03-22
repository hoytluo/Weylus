user=$(ps -ef |grep Xwayland | grep -v grep | awk '{print $1}' | head -n 1 )
id=$(id -u)
if [ "x${user}" == "x" ] ; then
	echo "Can't find the user run X/Wayland!"
	exit 1
fi

if [ "x$id" != "x0" ] ; then
	echo please run the script as root!
	exit 1
fi

groupadd -r uinput
usermod -aG uinput ${user}
echo "Change $user to uinput group"
echo 'KERNEL=="uinput", MODE="0660", GROUP="uinput", OPTIONS+="static_node=uinput"' \
| tee /etc/udev/rules.d/60-weylus.rules
udevadm control --reload
udevadm trigger
echo "Please logout or reboot"
