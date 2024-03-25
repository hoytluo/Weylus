#define DBUS_API_SUBJECT_TO_CHANGE
#include <dbus/dbus.h>
#include <stdbool.h>
#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>

/**
 * Call a method on a remote object
 */
void query(char* param) 
{
   DBusMessage* msg;
   DBusMessageIter args;
   DBusConnection* conn;
   DBusError err;
   DBusPendingCall* pending;
   int ret;
   char *pName = NULL;

   // initialiset the errors
   dbus_error_init(&err);

   // connect to the system bus and check for errors
   conn = dbus_bus_get(DBUS_BUS_SESSION, &err);
   if (dbus_error_is_set(&err)) { 
      fprintf(stderr, "Connection Error (%s)\n", err.message); 
      dbus_error_free(&err);
   }
   if (NULL == conn) { 
      exit(1); 
   }

   // request our name on the bus
   ret = dbus_bus_request_name(conn, "infogo.cli.snapshort", DBUS_NAME_FLAG_REPLACE_EXISTING , &err);
   if (dbus_error_is_set(&err)) { 
      fprintf(stderr, "Name Error (%s)\n", err.message); 
      dbus_error_free(&err);
   }
   if (DBUS_REQUEST_NAME_REPLY_PRIMARY_OWNER != ret) { 
      exit(1);
   }

   // create a new method call and check for errors
   msg = dbus_message_new_method_call("org.kde.KWin", // target for the method call
                                      "/Screenshot", // object to call on
                                      "org.kde.kwin.Screenshot", // interface to call on
                                      "screenshotFullscreen"); // method name
   if (NULL == msg) { 
      fprintf(stderr, "Message Null\n");
      exit(1);
   }

   // append arguments
   if(param){
	   dbus_message_iter_init_append(msg, &args);
	   if (!dbus_message_iter_append_basic(&args, DBUS_TYPE_STRING, &param)) {
  		fprintf(stderr, "Out Of Memory!\n"); 
      		exit(1);
   	}
   }
   // send message and get a handle for a reply
   if (!dbus_connection_send_with_reply (conn, msg, &pending, -1)) { // -1 is default timeout
      fprintf(stderr, "Out Of Memory!\n"); 
      exit(1);
   }
   if (NULL == pending) { 
      fprintf(stderr, "Pending Call Null\n"); 
      exit(1); 
   }
   dbus_connection_flush(conn);
   
   // free message
   dbus_message_unref(msg);
   
   // block until we recieve a reply
   dbus_pending_call_block(pending);

   // get the reply message
   msg = dbus_pending_call_steal_reply(pending);
   if (NULL == msg) {
      fprintf(stderr, "Reply Null\n"); 
      exit(1); 
   }
   // free the pending message handle
   dbus_pending_call_unref(pending);

   // read the parameters
   if (!dbus_message_iter_init(msg, &args))
      fprintf(stderr, "Message has no arguments!\n"); 
   else if (DBUS_TYPE_STRING != dbus_message_iter_get_arg_type(&args)) 
      fprintf(stderr, "Argument is not string!\n"); 
   else
      dbus_message_iter_get_basic(&args, &pName);

   {
	   char buffer[1024];

	   sprintf(buffer, "convert -rotate 180  -flop -transparent red  '%s' /dev/shm/kwin.bmp; rm -f '%s'", pName, pName);
	   system(buffer);
   }

   // free reply and close connection
   dbus_message_unref(msg);   
   //dbus_connection_close(conn);
}


int main(int argc, char** argv)
{
	if(argc > 1){
		printf("This program will use org.kde.kwin.Screenshot->screenshotFullscreen to caputure screen\n");
		printf("after successed capture image, will call convert(imagemagick) to bmp under /dev/shm/kwin.bmp\n");
	}
	query(NULL);
   	return 0;
}
