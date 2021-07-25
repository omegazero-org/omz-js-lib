

let fs = require("fs");

let omzutil = require("./util.js");
let meta = require("./meta.json");


const logSaveIntervalTime = 300000;

let logSaveInterval;
let logCache = "";
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
	if(logFile)
		logCache += str + "\n";
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
	if(!logCache)
		return;
	try{
		fs.appendFileSync(logFile, logCache);
		logCache = "";
	}catch(e){
		module.exports.error("[logger] Error while saving log to " + logFile + ": " + e);
	}
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
	if(logFile)
		logCache += obj + "\n";
	consoleLog(obj);
};

module.exports.init = (loglevel, logfile) => {
	let lastSave = 0;

	console.log = (str) => {
		internal.log("stdout", str);
	};
	logFile = logfile;
	if(logFile){
		setInterval(() => {
			let time = Date.now();
			let roundTime = time - time % logSaveIntervalTime;
			if(time - lastSave > logSaveIntervalTime){
				lastSave = roundTime;
				log_save();
			}
		}, 500).unref();
	}
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

module.exports.getLogCache = () => {
	return logCache;
};

module.exports.setLogCallback = (handler) => {
	logMessageCallback = handler;
};

module.exports.internal = internal;

