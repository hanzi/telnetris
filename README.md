Telnetris
=========

This is a small Telnet server that offers a game of Tetris to its clients.
It is written in JavaScript, so [Node.js](http://nodejs.org/) is required to run it.


Usage
-----

Edit telnetris.js (line 31) if you want it to listen to a different port
than 23. The interface the server listens to can be configured there as
well.

After that, just do

    ./telnetris.js

or

    node telnetris.js

to start the server. It needs root privileges if you want to use a port
< 1024.


License
-------

Telnetris is BSD licensed. Feel free to use it any way you'd like to.


Demo
----

Currently, a demo version is running at `hanzi.cc`:

    telnet hanzi.cc