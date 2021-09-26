

let fs = require("fs");

let omzutil = require("./util.js");
let meta = require("./meta.json");


const logSaveIntervalTime = 300000;
const logBufferMaxLen = 1024;

let logSaveInterval;
let logBuffer = [];
let logFile;


let logMessageCallback;


let internal = {log, log0, logLevel: 3};


function log(level, str, color){
	let time = Date.now();
	internal.log0(new Date(time).toString().substring(0, 24) + "." + omzutil.pad(time % 1000, 3) + " [" + level + "] " + str, color);
	if(typeof(logMessageCallback) == "function")
		logMessageCallback(str, level);
}

function log0(str, color){
	if(logFile){
		logBuffer.push(str);
		if(logBuffer.length > logBufferMaxLen)
			log_save();
	}
	process.stdout.write((color || "") + str + "\x1b[0m\n");
}

let logLevels = [
	{
		"name": "fatal",
		"level": 0,
		"color": "\x1b[41;97m"
	},
	{
		"name": "error",
		"level": 1,
		"color": "\x1b[0;91m"
	},
	{
		"name": "warn",
		"level": 2,
		"color": "\x1b[0;93m"
	},
	{
		"name": "info",
		"level": 3,
		"color": "\x1b[0;97m"
	},
	{
		"name": "debug",
		"level": 4,
		"color": "\x1b[0;37m"
	},
	{
		"name": "trace",
		"level": 5,
		"color": "\x1b[0;90m"
	}
];

function log_save(){
	if(!logFile || logBuffer.length < 1)
		return;
	fs.appendFile(logFile, logBuffer.join("\n") + "\n", (err) => {
		if(err)
			module.exports.error("[logger] Error while saving log to " + logFile + ": " + err);
	});
	logBuffer = [];
}

function initLogSaveInterval(){
	logSaveInterval = setInterval(() => {
		log_save();
	}, logSaveIntervalTime);
}

function registerLogFunction(i){
	module.exports[logLevels[i].name] = (...str) => {
		if(internal.logLevel < logLevels[i].level)
			return;
		for(let s of str){
			internal.log(logLevels[i].name, s, logLevels[i].color);
		}
	};
}

for(let i = 0; i < logLevels.length; i++){
	registerLogFunction(i);
}

let consoleLog = console.log;
module.exports.consoleLog = (obj) => {
	consoleLog(obj);
};

module.exports.init = (loglevel, logfile) => {
	console.log = (str) => {
		internal.log("stdout", str);
	};
	logFile = logfile;
	if(logFile)
		initLogSaveInterval();
	internal.logLevel = loglevel;
	module.exports.info("omz-js-lib version " + meta.version + " (log level " + loglevel + ")");
};

module.exports.copy = (name, includeConsoleLog = true) => {
	const logLevels = ["trace", "debug", "info", "warn", "error", "fatal"];
	let nlogger = {};
	let addLevel = (level) => {
		nlogger[level] = (str) => {
			module.exports[level]("[" + name + "] " + str);
		}
	};
	for(let l of logLevels){
		addLevel(l);
	}
	if(includeConsoleLog)
		nlogger.consoleLog = module.exports.consoleLog;
	return nlogger;
};

module.exports.close = () => {
	if(logFile){
		module.exports.info("[logger] Saving log to " + logFile);
		log_save();
	}
	clearInterval(logSaveInterval);
};

module.exports.getLogBuffer = () => {
	return logBuffer;
};

module.exports.setLogCallback = (handler) => {
	logMessageCallback = handler;
};

module.exports.internal = internal;

