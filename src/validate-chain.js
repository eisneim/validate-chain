/**
 * validator util to make form validation chainable for both serverside and clientside
 */
(function (name, definition) {
    if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
        module.exports = definition();
    } else if (typeof define === 'function' && typeof define.amd === 'object') {
        define(definition);
    } else {
        this[name] = definition();
    }
})('VC', function () {

	var vv = require("validator");

	var regx = {
		phone: /^(\+?0?86\-?)?1[345789]\d{9}$/,
		// email: /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i,
		// creditCard: /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11})$/,
		objectId: /^[0-9a-fA-F]{24}$/,
		alpha: /^[A-Z]+$/i,
	  alphanumeric: /^[0-9A-Z]+$/i,
	  numeric: /^[-+]?[0-9]+$/,
	  int: /^(?:[-+]?(?:0|[1-9][0-9]*))$/,
	  float: /^(?:[-+]?(?:[0-9]+))?(?:\.[0-9]*)?(?:[eE][\+\-]?(?:[0-9]+))?$/,
	  hexadecimal: /^[0-9A-F]+$/i,
	  decimal:/^[-+]?([0-9]+|\.[0-9]+|[0-9]+\.[0-9]+)$/,
	  hexcolor: /^#?([0-9A-F]{3}|[0-9A-F]{6})$/i, 
		ascii: /^[\x00-\x7F]+$/,
		base64: /^(?:[A-Z0-9+\/]{4})*(?:[A-Z0-9+\/]{2}==|[A-Z0-9+\/]{3}=|[A-Z0-9+\/]{4})$/i,
	}

	class Validator{
		constructor( target, takeWhatWeHave ){
			this.key = null; // temporarily store field name
			this._errs = [];
			this._san = {}; // sanitized object
			this._alias = {}; // key: 中文名
			this.opt = takeWhatWeHave? true: false;
			this.target = target;
			// modes:
			this.takeWhatWeHave = takeWhatWeHave;
			this.inArrayMode = false;
			this.inArray = {
				index:0,
				arrayKey: null,
			}

		}
		get errors(){
			return this._errs[0]?this._errs : null;
		}
		get sanitized(){
			return Object.keys(this._san).length>0?this._san : null;
		}
		addError( msg ){
			if(this._san[this.key]) delete this._san[this.key]

			if( this.inArrayMode ){
				let {index,arrayKey} = this.inArray;
				var arrayAlias = this._alias[arrayKey];
				var item = this.target[arrayKey][index]

				var alias = this._alias[ arrayKey+"."+index+"."+this.key ]
				// pureArray: [1,2,"ss"]
				var isPureArray = item && !item[this.key];
				if(isPureArray){
					alias = (arrayAlias||arrayKey)+
					"."+index;
				}else{
					alias = (arrayAlias||arrayKey)+"."+index+"."+
					(alias||this.key)
				}
				

			}else{
				var alias = this._alias[this.key];
			}

			if( alias ){
				msg = alias+": "+ msg.replace(/\S+\:\s/,"")
			}

			this._errs.push( msg )
			// this.next = false;
		}
		// prevent accidently change original value;
		get currentVal(){
			
			if( this.inArrayMode ){
				let array = this.target[this.inArray.arrayKey];
				let item = array[this.inArray.index];
				return (item && item[this.key])? item[this.key] : item;
			}

			return this.target[this.key];;
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
			if( this.inArrayMode ){
				let {index,arrayKey} = this.inArray;
				this._alias[ arrayKey+"."+index+"."+this.key ] = name;
			}else{
				this._alias[ this.key ] = name;	
			}
			
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
			// skip require if only take what is provided for sanitize;
			if( this.takeWhatWeHave ){
				this.opt = true;
				return this;
			}
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
			let val = this.currentVal;
			if( this.opt && !val ) return this;
			
			let type = typeof val;
			if( (type === "string"||Array.isArray(val)) && (val.length > max || val.lenth< min)  ){
				this.addError(tip || `${this.key}: 长度应该在${min}-${max}个字符之间`);
			}else if( type === "number" && (val > max || val< min) ){
				 this.addError(tip || `${this.key}: 大小应该在${min}-${max}之间`)
			}
			return this;
		}
		max(num,tip){
			if( !this.next ) return this;
			let val = this.currentVal;
			if( this.opt && !val ) return this;
			let type = typeof val;
			if( (type === "string"||Array.isArray(val)) && val.length > num ){
				this.addError(tip || `${this.key}: 最多${num}个字符`); 
			}else if( type === "number" && val > num ){
				this.addError(tip || `${this.key}: 最大值为${num}`)
			}
			return this;
		}
		min(num,tip){
			if( !this.next ) return this;
			let val = this.currentVal;
			if( this.opt && !val ) return this;

			let type = typeof val;
			if( (type === "string"||Array.isArray(val)) && val.length < num ){
				 this.addError(tip || `${this.key}: 最少${num}个字符`)
			}else if( type === "number" && val < num ){
				 this.addError(tip || `${this.key}: 最小值为${num}`)
			}

			return this;
		}
		regx( pattern, tip,modifiers){
			if( !this.next ) return this;
			let val = this.currentVal;
			if( this.opt && !val ) return this;
			if (Object.prototype.toString.call(pattern) !== '[object RegExp]') {
	        pattern = new RegExp(pattern, modifiers);
	    }
			if( !pattern.test( val ) ){
				this.addError( tip || `${this.key}: 不合格${pattern.toString()}的格式` )	
			}

			return this;
		}
		array( checker ,tip){
			if( !this.next ) return this;
			let val = this.currentVal;
			if( this.opt && !val ) return this;

			if( !Array.isArray( val ) ){
				this.addError( tip || `${this.key}: 需要为一个数组` )	
			}else if( typeof checker === "function" ){
				this.inArrayMode = true;
				this.inArray.arrayKey = this.key;

				var self = this;
				val.forEach(function(item,index){
					self.inArray.index = index;
					checker( self,index )
				});

				this.inArrayMode = false;
			}

			return this;
		}
		date( tip ){
			if( !this.next ) return this;
			let val = this.currentVal;
			if( this.opt && !val ) return this;
			if( !vv.isDate( val ) ){
				this.addError( tip || `${this.key}: ${val}不符合日期格式` )	
			}

			return this;
		}
		before( time, tip ){
			if( !this.next ) return this;
			let val = this.currentVal;
			if( this.opt && !val ) return this;
			if( !vv.isBefore( val, time ) ){
				this.addError( tip || `${this.key}: ${val}需要在${time}之前` )	
			}

			return this;
		}
		after( time, tip ){
			if( !this.next ) return this;
			let val = this.currentVal;
			if( this.opt && !val ) return this;

			if( !vv.isAfter(val ,time  ) ){
				this.addError( tip || `${this.key}: ${val}需要在${time}之后` )	
			}
			return this;
		}
		in( values,tip ){
			if( !this.next ) return this;
			let val = this.currentVal;
			if( this.opt && !val ) return this;

			if( !vv.isIn( val, values ) ){
				this.addError( tip || `${this.key}: ${val}需要在[${values.toString()}]之中` )	
			}
			return this;
		}
		email( tip, options ){
			if( !this.next ) return this;
			let val = this.currentVal;
			if( this.opt && !val ) return this;

			if( !vv.isEmail( val, options ) ){
				this.addError( tip || `${this.key}: ${val}不是常规的email` )	
			}

			return this;
		}
		JSON( tip ){
			if( !this.next ) return this;
			let val = this.currentVal;
			if( this.opt && !val ) return this;

			if( !vv.isJSON( val ) ){
				this.addError( tip || `${this.key}: ${val}不是JSON格式字符串` )	
			}
			return this;
		}
		URL( tip,options ){
			if( !this.next ) return this;
			let val = this.currentVal;
			if( this.opt && !val ) return this;

			if( !vv.isURL( val,options) ){
				this.addError( tip || `${this.key}: ${val}不符合URL的格式` )	
			}
			return this;
		}
		phone( tip ){
			return this.regx( regx.phone , tip || `${this.key}: ${this.target[this.key]}不是常规的手机号码` );
		}
		numeric(tip){
			return this.regx( regx.numeric, tip || `${this.key}: ${this.target[this.key]}必须为纯数字` );
		}
		decimal(tip){
			return this.regx( regx.decimal, tip || `${this.key}: ${this.target[this.key]}必须为小数格式数字` );	
		}
		float(tip){
			return this.regx( regx.float, tip || `${this.key}: ${this.target[this.key]}必须为float格式数字` );	
		}
		hex( tip ){
			return this.regx( regx.hexadecimal, tip || `${this.key}: ${this.target[this.key]}必须为16进制数字` );
		}
		alpha(tip){
			return this.regx( regx.alpha, tip || `${this.key}: ${this.target[this.key]}必须为纯字母` );
		}
		alphanumeric(tip){
			return this.regx( regx.alphanumeric, tip || `${this.key}: ${this.target[this.key]}必须为纯字母和数字的组合` );
		}
		ascii(tip){
			return this.regx( regx.ascii, tip || `${this.key}: ${this.target[this.key]}必须为符合规范的ASCII码` );
		}
		objectId( tip ){
			return this.regx( regx.objectId , tip || `${this.target[this.key]}不是常规的ObjectId` );
		}
		base64(tip){
			return this.regx( regx.base64, tip || `${this.key}: ${this.target[this.key]}必须为符合规范的Base64编码` );
		}
		creditCard(tip){
			if( !this.next ) return this;
			let val = this.currentVal;
			if( this.opt && !val ) return this;

			if( !vv.isCreditCard( val ) ){
				this.addError( tip || `${this.key}: ${val}不符合信用卡的格式` )	
			}
			return this;
		}
		currency( options,tip ){
			if( !this.next ) return this;
			let val = this.currentVal;
			if( this.opt && !val ) return this;

			if( !vv.isCurrency( val, options|| {symbol: '￥'} )){
				this.addError( tip || `${this.key}: ${val}不符合信用卡的格式` )	
			}
			return this;
		}
		

		// ----------------- sanitizers ---------------
		trim(){
			if( !this.next ) return this;
			let val = this.currentVal;
			if( this.opt && !val ) return this;

			this._san[this.key] = val.trim? val.trim() : val;
			
			return this;
		}

		whitelist( chars ){
			if( !this.next ) return this;
			let val = this.currentVal;
			if( this.opt && !val ) return this;

			this._san[this.key] = val.replace(new RegExp('[^' + chars + ']+', 'g'), '');
			
			return this;
		}
		blacklist( chars ){
			if( !this.next ) return this;
			let val = this.currentVal;
			if( this.opt && !val ) return this;

			this._san[this.key] = val.replace(new RegExp('[' + chars + ']+', 'g'), '');
			
			return this;
		}

		escape(){
			if( !this.next ) return this;
			let val = this.currentVal;
			if( this.opt && !val ) return this;

			this._san[this.key] = (val.replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\//g, '&#x2F;')
            .replace(/\`/g, '&#96;'));
			
			return this;
		}
		toBoolean( strict ){
			if( !this.next ) return this;
			let val = this.currentVal;
			if( this.opt && !val ) return this;
			if (strict) {
			    this._san[this.key] = val === '1' || val === 'true';
			}
			this._san[this.key] = val !== '0' && val !== 'false' && val !== '';
			
			return this;
		}
		toDate(){
			if( !this.next ) return this;
			let val = this.currentVal;
			if( this.opt && !val ) return this;

			if (Object.prototype.toString.call(val) === '[object Date]') {
			    this._san[this.key] =  val;
			}else{
				let tt = Date.parse(val);
				this._san[this.key] =  !isNaN(tt) ? new Date(tt) : null;
			}
			
			return this;
		}
		toFloat(){
			if( !this.next ) return this;
			let val = this.currentVal;
			if( this.opt && !val ) return this;

			this._san[this.key] = parseFloat(val);
			
			return this;
		}
		toInt(radix){
			if( !this.next ) return this;
			let val = this.currentVal;
			if( this.opt && !val ) return this;

			this._san[this.key] = parseInt(val, radix || 10);
			
			return this;
		}
		toString(){
			if( !this.next ) return this;
			let val = this.currentVal;
			if( this.opt && !val ) return this;
			if (typeof val === 'object' && val !== null && val.toString) {
			    this._san[this.key] = val.toString();
			} else if (val === null || typeof val === 'undefined' || (isNaN(val) && !val.length)) {
			    this._san[this.key] = '';
			} else if (typeof val !== 'string') {
			    this._san[this.key] = val + '';
			}
			
			return this;
		}


	}// end of class
	if(process.browser){
		window.VC = Validator;
		window.Validator = vv;
	}

	return Validator;
	
});
	
