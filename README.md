Telnetris
=========

This is a small Telnet server that offers a game of Tetris to its clients.
It is written in JavaScript and requires [Node.js](https://nodejs.org/) to
run.


Usage
-----

```
node telnetris.sh [port] [host]
```

By default, it will bind to **port 10023** and **host 0.0.0.0** (i.e. all
interfaces.)

If you want it to listen to the default Telnet port (23), you will likely
have to run the script as root (`sudo node telnetris.sh 23`.)

If run as root, the script will change its user and group to `nobody` after
creating the server socket.


### Using Docker

Alternatively, you can create a Docker container for this script like this:

```bash
# This will bind the server to port 23, the default Telnet port.
docker run --name telnetris --expose "0.0.0.0:23:10023" ghcr.io/hanzi/telnetris:latest
```


### Using Docker Compose

```yml
services:
  telnetris:
    image: ghcr.io/hanzi/telnetris:latest
    ports: [ "0.0.0.0:23:10023/tcp" ]
    restart: unless-stopped
```


License
-------

Copyright (c) 2011, [Tino](https://github.com/hanzi)    
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright
   notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright
   notice, this list of conditions and the following disclaimer in the
   documentation and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.
