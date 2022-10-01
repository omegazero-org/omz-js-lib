

let logger = require("./logger.js");

function pad(n, width, z) {
	z = z || '0';
	n = n + '';
	return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function randomHex8(){
	return Math.random().toString(16).substring(2, 10);
}

function randomHex16(){
	return randomHex8() + randomHex8();
}

function randomHex32(){
	return randomHex16() + randomHex16();
}

module.exports.pad = pad;
module.exports.randomHex8 = randomHex8;
module.exports.randomHex16 = randomHex16;
module.exports.randomHex32 = randomHex32;

module.exports.initPrototypes = () => {
	String.prototype.insert = function(index, str){
		return this.slice(0, index) + str + this.slice(index);
	};

	String.prototype.deleteCharAt = function(index){
		return this.slice(0, index) + this.slice(index + 1);
	};

	Array.prototype.deleteElementAt = function(index){
		return this.splice(index, 1);
	};

	const fs = require("fs");
	fs.promises.exists = function(path){
		return new Promise((resolve, reject) => {
			fs.access(path, fs.constants.F_OK, (e) => {
				resolve(!e);
			});
		});
	};
};

module.exports.initHandlers = (onClose, onUncaught, onRejection) => {
	let closed = false;

	let close = () => {
		if(!closed){
			closed = true;
			if(typeof(onClose) == "function")
				onClose();
			else
				process.exit(1);
		}
	};

	process.on("unhandledRejection", function(reason, promise){
		logger.fatal("Unhandled promise rejection: " + reason);
		logger.consoleLog(promise);
		if(typeof(onRejection) == "function")
			onRejection(reason, promise);
		else
			close();
	});

	process.on("uncaughtException", function(err){
		logger.fatal("Uncaught exception:");
		logger.fatal("	" + err.name);
		logger.fatal("	" + err.message);
		logger.fatal("	Stack:");
		logger.fatal("	" + err.stack);
		if(typeof(onUncaught) == "function")
			onUncaught(err);
		else
			close();
	});

	process.on('SIGINT', close);
	process.on('SIGUSR1', close);
	process.on('SIGUSR2', close);
};

