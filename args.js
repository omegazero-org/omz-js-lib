

class Args{

	constructor(pargv){
		if(!Array.isArray(pargv))
			throw new Error("Argument must be an array");
		this.argv = {};

		for(let i = 2; i < pargv.length; i++){
			let arg = pargv[i];
			if(arg.startsWith("--")){
				let key = arg.substring(2);
				this.argv[key] = pargv[i + 1];
				i++;
			}else if(arg.startsWith("-")){
				let key = arg.substring(1);
				this.argv[key] = true;
			}
		}
	}
	
	getValue(key){
		return this.argv[key];
	}

	getValueOrDefault(key, def){
		let v = this.getValue(key);
		if(v != undefined)
			return v;
		else
			return def;
	}

	getNumberOrDefault(key, def){
		let n = parseFloat(this.argv[key]);
		if(Number.isNaN(n))
			return def;
		else
			return n;
	}

	requireArgument(key, type){
		if(this.argv[key] == undefined){
			throw new Error("Missing required argument '" + key + "'");
		}
	}
}

module.exports = Args;

