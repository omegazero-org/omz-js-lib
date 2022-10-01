
const http = require("http");
const url = require("url");

class HttpApiServer{

	constructor(apiEndpoints, {servername, logger, maxPostBodySize, bindAddress, port, handlerPreCall, enableLog}, httpServerInstance){
		if(typeof(apiEndpoints) != "object")
			throw new TypeError("apiEndpoints must be an object");
		this.apiEndpoints = apiEndpoints;
		this.servername = servername || "?";
		this.servername += " omz-js-lib/httpapi/1.1";
		this.logger = logger || null;
		this.maxPostBodySize = maxPostBodySize || 0x100000;
		this.bindAddress = bindAddress || "0.0.0.0";
		this.port = port || 80;
		this.handlerPreCall = handlerPreCall || null;
		this.enableLog = enableLog || false;

		if(!httpServerInstance){
			httpServerInstance = http.createServer();
			httpServerInstance.on("error", (e) => {
				this.logger && this.logger.fatal("Server error: " + (e && e.stack || e));
			});
			httpServerInstance.listen({host: this.bindAddress, port: this.port}, () => {
				this.logger && this.logger.info("Listening on " + this.bindAddress + ":" + this.port);
			});
		}
		httpServerInstance.on("request", this.http_req.bind(this));
		this.httpServerInstance = httpServerInstance;
	}


	http_req(req, res){
		if(this.enableLog){
			this.logger && this.logger.info(((req.headers["x-forwarded-for"] && req.headers["x-forwarded-for"].split(", ")[0]) || (req.connection.remoteAddress + ":" + req.connection.remotePort)) +
					" - '" + req.method + " " + req.url + " HTTP/" + req.httpVersion + "'");
		}
		let surl = url.parse(req.url, true);
		let endpoint = surl.pathname.substring(1);
		let handler = this.apiEndpoints[endpoint];
		if(surl.pathname == "/"){
			this.http_respond(res, 403, {err: "Forbidden", "SERVER_IDENTIFICATION": this.servername});
		}else if(handler){
			const callHandler = async (...args) => {
				try{
					const h_this = {
						respond: (status, json) => {
							this.http_respond(res, status, json);
						}
					};
					let additionalArgs = [];
					if(this.handlerPreCall){
						let aa = await Promise.resolve(this.handlerPreCall.call(h_this, req, res, surl, handler));
						if(res.writableEnded)
							return;
						if(Array.isArray(aa))
							additionalArgs = aa;
					}
					let err = await handler.call(h_this, ...args, ...additionalArgs);
					if(!res.writableEnded){
						if(err && Array.isArray(err))
							this.http_respond(res, err[0] || 500, {err: err[1] || "(no message)", softerr: true});
						else
							this.http_respond(res, 204);
					}
				}catch(e){
					this.logger && this.logger.error("Error while running api endpoint '" + endpoint + "': " + (e && e.stack || e));
					this.http_respond(res, 500, {err: "Internal error"});
				}
			};
			if(handler.length > 3 && this.maxPostBodySize > 0){ // 4th argument: postBody
				if(req.method != "POST"){
					this.http_respond(res, 405, {err: "POST is required"});
					return;
				}
				let dataArray = [];
				let datalen = 0;
				req.on("data", (d) => {
					datalen += d.length;
					if(datalen > this.maxPostBodySize){
						dataArray = false;
						req.destroy();
						return;
					}
					dataArray.push(d);
				});
				req.on("end", () => {
					if(dataArray === false)
						return;
					callHandler(req, res, surl, Buffer.concat(dataArray));
				});
			}else{
				callHandler(req, res, surl);
			}
		}else
			this.http_respond(res, 404, {err: "Invalid endpoint"});
	}

	http_respond(res, status, json){
		if(res.writableEnded)
			return;
		if(json){
			if(json.err){
				json.errmsg = json.err;
				json.err = {
					400: "BadRequest",
					404: "NotFound",
					405: "MethodNotAllowed",
					500: "ServerError"
				}[status] || "Error";
			}
			let data = Buffer.from(JSON.stringify(json));
			res.writeHead(status, this.http_getHeaders({"Content-Length": data.length}));
			res.end(data);
		}else{
			res.writeHead(status, this.http_getHeaders({"Content-Length": 0}));
			res.end();
		}
	}

	http_getHeaders(additional){
		let headers = {"Server": this.servername, "Content-Type": "application/json"};
		if(typeof(additional) == "object"){
			for(let a in additional){
				headers[a] = additional[a];
			}
		}
		return headers;
	}

	close(){
		this.httpServerInstance.close();
	}
}

module.exports = {HttpApiServer};
