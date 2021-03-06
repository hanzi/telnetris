#!/usr/bin/env node
/**
Copyright (c) 2011, Christian Kraus <hanzi@hanzi.cc>
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
**/


// port that this server will listen to (< 1024 needs root)
var serverPort = 23;
var serverHost = "0.0.0.0";


/**
 * Telnetris Game class
 *
 * An instance of this class will be created for every client that
 * connects to the server.
 */
var Game = function(socket, num)
{
	var _this      = this;
	this.num       = num;
	this.socket    = socket;
	this.field     = false;
	this.timeout   = false;
	this.lines     = 0;
	this.startTime = (new Date()).getTime();
	this.currentBlock = {
		x:      0,
		y:      0,
		height: 0,
		width:  0,
		type:   false,
		num:    0,
		dir:    0
	};
	this.scheduledBlock = {
		type:   false,
		num:    0,
		dir:    0
	};
	
	
	/**
	 * Initializes a new instance of the game
	 */
	this.initialize = function()
	{
		console.log(">> New client #%d (%s)", num, socket.remoteAddress);
		socket.on('data',  this.handleData);
		socket.on('close', this.handleClose);
		
		// prevent server-side buffering (Nagle algorithm)
		socket.setNoDelay();
		
		// send telnet option negotiation stuff -- this tells the client to
		// send every keystroke immediately instead of waiting for the user
		// to press enter
		socket.write(new Buffer([255, 253, 34, 255, 250, 34, 1, 0, 255, 240, 255, 251, 1]));
		
		// prepare an empty virtual field
		_this.field = new Array(20);
		for (i = 0; i < 20; i++) {
			_this.field[i] = new Array(10);
		}
		
		// and go!
		_this.scheduleBlock();
		_this.nextBlock();
	};
	
	
	/**
	 * Generate next block
	 */
	this.nextBlock = function()
	{
		_this.currentBlock.type   = _this.scheduledBlock.type;
		_this.currentBlock.height = _this.currentBlock.type.length;
		_this.currentBlock.width  = _this.currentBlock.type[0].length;
		_this.currentBlock.x      = 5 - Math.ceil(_this.currentBlock.width / 2);
		_this.currentBlock.y      = 0;
		_this.currentBlock.num    = _this.scheduledBlock.num;
		_this.currentBlock.dir    = _this.scheduledBlock.dir;
		
		_this.scheduleBlock();
		_this.sendField();
		
		if (_this.collisionOccurred()) {
			// game over
			_this.socket.end();
		} else {
			_this.timeout = setTimeout(_this.proceed, _this.getDelay());
		}
	};
	
	
	/**
	 * Schedules the next block
	 */
	this.scheduleBlock = function()
	{
		var type      = Math.floor(Math.random() * blocks.length);
		var direction = Math.floor(Math.random() * blocks[type].length);
		
		_this.scheduledBlock = {
			type:   blocks[type][direction],
			num:    type,
			dir:    direction
		};
	};
	
	
	/**
	 * Sends the current field to the server
	 */
	this.sendField = function()
	{
		if (! _this.socket)
			return;
		
		_this.socket.write("\r\n\t+--------------------+");
		
		var line;
		for (i = 0; i < 20; i++) {
			line = "\r\n\t|";
			
			for (j = 0; j < 10; j++) {
				// check whether to display the current block
				if (_this.currentBlock.type &&
					i >= _this.currentBlock.y && i < _this.currentBlock.y + _this.currentBlock.height &&
					j >= _this.currentBlock.x && j < _this.currentBlock.x + _this.currentBlock.width &&
					_this.currentBlock.type[i - _this.currentBlock.y][j - _this.currentBlock.x]) {
					
					line += "<>";
					
				} else if (_this.field[i][j]) {
					line += "[]";
					
				} else {
					line += "  ";
				}
			}
			
			line += "|";
			
			// display stats
			if (i == 1)
				line += "\tlines: " + _this.lines;
			
			if (i == 3)
				line += "\ttime:  " + _this.displayTime();
			
			// display next scheduled block
			if (i == 8)
				line += "\tnext block:";
			
			if (i >= 10 && i < 14) {
				line += "\t  ";
				for (j = 0; j < 4; j++) {
					if (_this.scheduledBlock.type[i-10] && _this.scheduledBlock.type[i-10][j])
						line += "<>";
					else
						line += "  ";
				}
			}
			
			// display key information
			if (i == 18)
				line += "\tpress space to (un)pause";
			
			if (i == 19)
				line += "\tarrow keys to navigate block";
			
			_this.socket.write(line);
		}
		
		// bottom line, leave spaces where current block is above
		line = "\r\n\t+";
		for (i = 0; i < 10; i++) {
			if (i >= _this.currentBlock.x && i < _this.currentBlock.x + _this.currentBlock.width)
				line += "  ";
			else
				line += "--";
		}
		line += "+";
		_this.socket.write(line);
		
		// reset cursor to top left position
		for (i = 0; i < 30; i++)
			_this.socket.write(new Buffer(cursor_left, 'hex'));
		
		for (i = 0; i < 22; i++)
			_this.socket.write(new Buffer(cursor_up,   'hex'));
	};
	
	
	/**
	 * Check whether the current block collided with something
	 */
	this.collisionOccurred = function()
	{
		// block reached the bottom
		if (_this.currentBlock.y + _this.currentBlock.height > 20)
			return true;
		
		// some part of the block hit a static block
		for (i = 0; i < _this.currentBlock.height; i++) {
			for (j = 0; j < _this.currentBlock.width; j++) {
				if (_this.currentBlock.type &&
					_this.field[_this.currentBlock.y + i][_this.currentBlock.x + j] &&
					_this.currentBlock.type[i][j])
					
					return true;
			}
		}
		
		// no collision occurred
		return false;
	};
	
	
	/**
	 * Move block one line down
	 */
	this.proceed = function()
	{
		_this.currentBlock.y++;
		
		if (_this.collisionOccurred()) {
			_this.currentBlock.y--;
			
			// add block to static blocks
			for (i = 0; i < _this.currentBlock.height; i++) {
				for (j = 0; j < _this.currentBlock.width; j++) {
					if (_this.currentBlock.type[i][j]) {
						_this.field[_this.currentBlock.y + i][_this.currentBlock.x + j] = true;
					}
				}
			}
			
			_this.currentBlock.type = false;
			_this.sendField();
			
			if (_this.hasFullLines()) {
				_this.timeout = setTimeout(_this.clearFullLines, _this.getDelay());
			} else {
				_this.timeout = setTimeout(_this.nextBlock, _this.getDelay());
			}
			
		} else {
			_this.sendField();
			_this.timeout = setTimeout(_this.proceed, _this.getDelay());
		}
	};
	
	
	/**
	 * Check whether full lines exist
	 */
	this.hasFullLines = function()
	{
		var tmp;
		for (i = 0; i < 20; i++) {
			tmp = true;
			for (j = 0; j < 10; j++) {
				if (! _this.field[i][j])
					tmp = false;
			}
			
			if (tmp)
				return true;
		}
		
		return false;
	};
	
	
	/**
	 * Remove all full lines
	 */
	this.clearFullLines = function()
	{
		// check for full lines
		var tmp, k;
		for (i = 0; i < 20; i++) {
			tmp = true;
			for (j = 0; j < 10; j++) {
				if (! _this.field[i][j])
					tmp = false;
			}
			
			// if one is found, move all lines above them one line down
			if (tmp) {
				_this.lines++;
				for (k = i; k >= 0; k--) {
					for (j = 0; j < 10; j++) {
						if (k == 0)
							_this.field[k][j] = false;
						else
							_this.field[k][j] = _this.field[k-1][j];
					}
				}
			}
		}
		
		// send updated field and go on with the game
		_this.sendField();
		_this.timeout = setTimeout(_this.nextBlock, _this.getDelay());
	};
	
	
	/**
	 * Handle incoming data
	 */
	this.handleData = function(data)
	{
		data = data.toString('hex');
		
		// move left
		if (data == cursor_left && _this.currentBlock.x > 0 && ! _this.paused) {
			_this.currentBlock.x--;
			
			if (_this.collisionOccurred())
				// revert change
				_this.currentBlock.x++;
			else
				_this.sendField();
		
		
		// move right
		} else if (data == cursor_right && _this.currentBlock.x + _this.currentBlock.width < 10 && ! _this.paused) {
			_this.currentBlock.x++;
			
			if (_this.collisionOccurred())
				// revert change
				_this.currentBlock.x--;
			else
				_this.sendField();
		
		
		// move down
		} else if (data == cursor_down && ! _this.paused) {
			_this.currentBlock.y++;
			
			if (_this.collisionOccurred())
				// revert change
				_this.currentBlock.y--;
			else
				_this.sendField();
		
		
		// rotate
		} else if (data == cursor_up && ! _this.paused) {
			var oldDirection = _this.currentBlock.dir;
			var oldType      = _this.currentBlock.type;
			var oldHeight    = _this.currentBlock.height;
			var oldWidth     = _this.currentBlock.width;
			
			_this.currentBlock.dir++;
			if (! blocks[_this.currentBlock.num][_this.currentBlock.dir])
				_this.currentBlock.dir = 0;
			_this.currentBlock.type   = blocks[_this.currentBlock.num][_this.currentBlock.dir];
			_this.currentBlock.height = _this.currentBlock.type.length;
			_this.currentBlock.width  = _this.currentBlock.type[0].length;
			
			if (_this.collisionOccurred() || _this.currentBlock.x + _this.currentBlock.width > 10) {
				// revert changes
				_this.currentBlock.dir    = oldDirection;
				_this.currentBlock.type   = oldType;
				_this.currentBlock.height = oldHeight;
				_this.currentBlock.widht  = oldWidth;
				
			} else {
				_this.sendField();
			}
		
		
		// pause (space key)
		} else if (data == '20') {
			if (_this.paused) {
				_this.paused = false;
				_this.proceed();
			} else {
				_this.paused = true;
				clearTimeout(_this.timeout);
			}
		}
	};
	
	
	/**
	 * "Socket closed" callback
	 */
	this.handleClose = function()
	{
		console.log("<< Client #%d left.", _this.num);
		_this.socket = false;
		
		if (_this.timeout)
			clearTimeout(_this.timeout);
	};
	
	
	/**
	 * Calculates how long the client has played and generates a time string
	 */
	this.displayTime = function()
	{
		var string, hours = 0, minutes = 0, seconds;
		
		seconds = (new Date()).getTime() - _this.startTime;
		seconds = Math.floor(seconds / 1000);
		
		hours   = Math.floor(seconds / 3600);
		seconds = seconds % 3600;
		
		minutes = Math.floor(seconds / 60);
		seconds = seconds % 60;
		
		if (hours < 10)
			hours = "0" + hours;
		
		if (minutes < 10)
			minutes = "0" + minutes;
		
		if (seconds < 10)
			seconds = "0" + seconds;
		
		return hours + ":" + minutes + ":" + seconds;
	};
	
	
	/**
	 * Calculates delay by number of solved lines (effects an acceleration
	 * over time)
	 */
	this.getDelay = function()
	{
		var delay = 500 - _this.lines * 5;
		if (delay < 100)
			delay = 100;
		
		return delay;
	};
	
	
	// call constructor
	this.initialize();
};


// check whether we need (and have) root
if (serverPort < 1024 && process.getuid && process.getuid() != 0) {
	console.log("You selected port %d. Using ports < 1024 needs root privileges.", serverPort);
	console.log("Please restart as root or choose different port.");

} else {
	// initiate TCP server
	var server = new require('net').Server();
	server.on('connection', function(socket) {
		new Game(socket, nextClientNumber++);
	});
	server.on('listening', function() {
		// strip off root privileges if we have them
		if (process.getgid && process.getgid() == 0) {
			console.log("giving up root group...");
			try        { process.setgid("nobody"); }
			catch(err) { process.setgid(65534); }
		}

		if (process.getuid && process.getuid() == 0) {
			console.log("giving up root user...");
			try        { process.setuid("nobody"); }
			catch(err) { process.setuid(65534); }
		}
		
		console.log("Telnetris running on port %d", serverPort);
	});
	server.listen(serverPort, serverHost);
}


// a few variables
var i, j, nextClientNumber = 1;


// key codes for cursor keys
var cursor_up    = '1b5b41',
    cursor_down  = '1b5b42',
    cursor_right = '1b5b43',
    cursor_left  = '1b5b44';


// block forms and directions
var blocks = [[[[true,true],[true,true]]],[[[true],[true],[true],[true]],[[true,true,true,true]]],[[[true,false,false],[true,true,true]],[[true,true],[true,false],[true,false]],[[true,true,true],[false,false,true]],[[false,true],[false,true],[true,true]]],[[[false,false,true],[true,true,true]],[[true,false],[true,false],[true,true]],[[true,true,true],[true,false,false]],[[true,true],[false,true],[false,true]]],[[[false,true,true],[true,true,false]],[[true,false],[true,true],[false,true]]],[[[true,true,false],[false,true,true]],[[false,true],[true,true],[true,false]]],[[[false,true,false],[true,true,true]],[[true,false],[true,true],[true,false]],[[true,true,true],[false,true,false]],[[false,true],[true,true],[false,true]]]];
