/**
 * validator util to make form validation chainable for both serverside and clientside
 */
import vv from "validator";
var regx = {
	phone: /^(\+?0?86\-?)?1[345789]\d{9}$/,
	// email: /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i,
	objectId: /^[0-9a-fA-F]{24}$/,
}

export default class Validator{
	constructor( target, isUpdate ){
		this.key = null; // temporarily store field name
		this._errs = [];
		this._san = {}; // sanitized object
		this._alias = {}; // key: 中文名
		this.opt = isUpdate? true: false;
		this.target = target;
	}
	get errors(){
		return this._errs
	}
	get sanitized(){
		return this._san;
	}
	addError( msg ){
		if(this._san[this.key]) delete this._san[this.key]

		var alias = this._alias[this.key];	
		if( alias ){
			msg = alias+": "+ msg.replace(/\S+\:\s/,"")
		}

		this._errs.push( msg )
		this.next = false;
	}
	/**
	 * set alias for a key and store them in a map: this._alias = {}
	 * @param  {[type]} name [description]
	 * @return {[type]}      [description]
	 */
	alias( name ){
		if(!this.key) {
			this.next = false; 
			return this;
		}
		this._alias[ this.key ] = name;
		return this;
	}
	// ----------------- start a validation chain with this method -----
	check( key ){
		this.key = key;
		this.next = true;
		this.opt = false;
		if( this.target[ key ] !== undefined ){
			this._san[key] = this.target[ key ];
		} else{
			this.opt = true;
		}

		return this
	}
	// ----------------- must in the beginning of the chain --------
	required( tip ){
		if( !this.next ) return this;
		this.opt = false;
		if( !this.target[ this.key ] ) {
			this.addError( tip || `${this.key}: 为必填字段` )
			this.next = false;
		}
		return this;
	}
	optional(){
		if( !this.next ) return this;
		this.opt = true;
		return this;
	}
	// ----------------- property validate methods ------------------
	between(min,max,tip){
		if( !this.next ) return this;
		let val = this.target[this.key];
		if( this.opt && !val ) return this;
		
		let type = typeof val;
		if( type === "string" ){
			(val.length > max || val.lenth< min) ? this.addError(tip || `${this.key}: 长度应该在${min}-${max}个字符之间`) : ""
		}else if( type === "number" ){
			(val > max || val< min) ? this.addError(tip || `${this.key}: 大小应该在${min}-${max}之间`) : ""
		}
		return this;
	}
	max(num,tip){
		if( !this.next ) return this;
		let val = this.target[this.key];
		if( this.opt && !val ) return this;
		
		let type = typeof val;
		if( type === "string" ){
			val.length > num ? this.addError(tip || `${this.key}: 最多${num}个字符`) : ""
		}else if( type === "number" ){
			val > num ? this.addError(tip || `${this.key}: 最大值为${num}`) :""
		}
		return this;
	}
	min(num,tip){
		if( !this.next ) return this;
		let val = this.target[this.key];
		if( this.opt && !val ) return this;

		let type = typeof val;
		if( type === "string" ){
			val.length < num ? this.addError(tip || `${this.key}: 最少${num}个字符`) : ""
		}else if( type === "number" ){
			val < num ? this.addError(tip || `${this.key}: 最小值为${num}`) : ""
		}

		return this;
	}
	regx( pattern, tip ){
		if( !this.next ) return this;
		let val = this.target[this.key];
		if( this.opt && !val ) return this;

		if( !pattern.test( val ) ){
			this.addError( tip || `${this.key}: 不合格${pattern.toString()}的格式` )	
		}

		return this;
	}
	phone( tip ){
		return this.regx( regx.phone , tip || `${this.target[this.key]}不是常规的手机号码` );
	}
	email( tip ){
		if( !this.next ) return this;
		let val = this.target[this.key];
		if( this.opt && !val ) return this;

		if( !vv.isEmail( val ) ){
			this.addError( tip || `${val}不是常规的email` )	
		}

		return this;
	}
	objectId( tip ){
		return this.regx( regx.objectId , tip || `${this.target[this.key]}不是常规的ObjectId` );
	}
	date( tip ){
		if( !this.next ) return this;
		let val = this.target[this.key];
		if( this.opt && !val ) return this;

		if( vv.isEmail( val ) ){
			this.addError( tip || `不合格${pattern.toString()}的格式` )	
		}

		return this;
	}
	earlier( time, tip ){
		if( !this.next ) return this;
		let val = this.target[this.key];
		if( this.opt && !val ) return this;

		if( vv.isEmail( val ) ){
			this.addError( tip || `不合格${pattern.toString()}的格式` )	
		}

		return this;
	}
	later( time, tip ){
		if( !this.next ) return this;
		let val = this.target[this.key];
		if( this.opt && !val ) return this;

		if( vv.isEmail( val ) ){
			this.addError( tip || `不合格${pattern.toString()}的格式` )	
		}

		return this;
	}

	// ----------------- sanitizers ---------------
	trim(){

	}



}// end of class
