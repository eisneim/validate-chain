// TODO: 
// 1. check('nested.item') if didn't check('nested') first, will case sanitized.nested === undefined
// 2.options to config error format;

(function (name, definition) {
  if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
    module.exports = definition();
  } else if (typeof define === 'function' && typeof define.amd === 'object') {
      define(definition);
  } else {
    this[name] = definition();
  }
})('VC', function () {

  var vv = require('./validator.js')

  class Validator{
    constructor( target, takeWhatWeHave ){
      this.key = null; // temporarily store field name
      this._errs = [];
      this.errorFields = [];
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
      // ------ 
      this.getter = objectGetMethod;
      this.setter = objectSetMethod;
    }
    get errors(){
      return this._errs[0]?this._errs : null;
    }
    
    get sanitized(){
      return Object.keys(this._san).length>0?this._san : null;
    }

    addError( msg ){    
      // add array of error message
      if(Array.isArray(msg)) {
        this._errs = this._errs.concat(msg)
        return
      }

      if( this.inArrayMode ){

        let {index,arrayKey} = this.inArray;
        var arrayAlias = this._alias[arrayKey];
        var item = objectGetMethod(this.target, arrayKey)[index];

        var alias = this._alias[ arrayKey+"."+index+"."+this.key ]
        // pureArray: [1,2,"ss"]
        var isPureArray = item && !objectGetMethod(item,this.key);
        if(isPureArray){
          alias = (arrayAlias||arrayKey)+
          "."+index;
        }else{
          alias = (arrayAlias||arrayKey)+"."+index+"."+
          (alias||this.key)
        }
        this.errorFields.push( arrayKey+"."+index+( isPureArray? "":"."+this.key) )
        // remove invalid data from _san
        if(objectGetMethod(this._san,arrayKey)[index]){
          objectSetMethod(
            this._san, 
            arrayKey+"."+index+(isPureArray?"":this.key) 
            ,undefined
          )
        }

      }else{
        // remove invalid date from _san
        if(objectGetMethod(this._san,this.key)) objectSetMethod(this._san,this.key,undefined)
        var alias = this._alias[this.key];
        this.errorFields.push( this.key )
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
        var array = objectGetMethod( this.target, this.inArray.arrayKey );
        // nested first:  a.b.c[array]
        // if( this.inArray.arrayKey.indexOf(".")> -1 ){  
        // if( this.key.indexOf(".")> -1 ){ // [{a:{b:v}}]
        
        //only in arrayMode
        var item = array[this.inArray.index];
        var insideArray = objectGetMethod(item,this.key);
        return (item && insideArray)? insideArray : item;
      }
      // normal mode or nested mode
      return objectGetMethod( this.target, this.key )// get nested object value
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
      let val = this.currentVal;

      if( val !== undefined ){
        if( !this.inArrayMode ){
          // save it to _san
          objectSetMethod(this._san,key, val)
        } 
      }else{
        this.opt = true;
      }

      return this
    }
    /**
     * check each item inside an array, set check in array mode;
     * @param  {function} checker callback function
     * @param  {[string]} tip     [description]
     * @return {[object]}         
     */
    array( checker ,tip){
      if( !this.next ) return this;
      let val = this.currentVal;
      if( this.opt && !val ) return this;

      if( !Array.isArray( val ) ){
        this.addError( tip || `${this.key}: 需要为一个数组` )  
      }else if( typeof checker === "function" ){
        this.inArrayMode = true;
        this.inArray.arrayKey = this.key;
        // copy the array to _san
        objectSetMethod(this._san, this.key, val )

        var self = this;
        val.forEach(function(item,index){
          self.inArray.index = index;
          checker( self,index )
        });

        this.inArrayMode = false;
      }

      return this;
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
      if( this.currentVal === undefined ){
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
      if( (type === "string"||Array.isArray(val)) && (val.length > max || val.length< min)  ){
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
    /**
     * pass in custom function for vlidation logic;
     * @param  {function} checker [description]
     * @param  {[string]} tip     [description]
     * @return {[object]}         [description]
     */
    $apply(checker,tip){
      if( !this.next ) return this;
      let val = this.currentVal;
      if( this.opt && !val ) return this;

      if( typeof checker !== "function" ) throw new Error("$apply第一个参数必须为function")
      if( !checker( val ) ){
        this.addError( tip || `${this.key}: ${val}不是正确的格式` );
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
      return this.regx( vv.regx.phone , tip || `${this.key}: ${this.currentVal}不是常规的手机号码` );
    }
    numeric(tip){
      return this.regx( vv.regx.numeric, tip || `${this.key}: ${this.currentVal}必须为纯数字` );
    }
    decimal(tip){
      return this.regx( vv.regx.decimal, tip || `${this.key}: ${this.currentVal}必须为小数格式数字` ); 
    }
    float(tip){
      return this.regx( vv.regx.float, tip || `${this.key}: ${this.currentVal}必须为float格式数字` );  
    }
    hex( tip ){
      return this.regx( vv.regx.hexadecimal, tip || `${this.key}: ${this.currentVal}必须为16进制数字` );
    }
    alpha(tip){
      return this.regx( vv.regx.alpha, tip || `${this.key}: ${this.currentVal}必须为纯字母` );
    }
    alphanumeric(tip){
      return this.regx( vv.regx.alphanumeric, tip || `${this.key}: ${this.currentVal}必须为纯字母和数字的组合` );
    }
    ascii(tip){
      return this.regx( vv.regx.ascii, tip || `${this.key}: ${this.currentVal}必须为符合规范的ASCII码` );
    }
    objectId( tip ){
      return this.regx( vv.regx.objectId , tip || `${this.currentVal}不是常规的ObjectId` );
    }
    base64(tip){
      return this.regx( vv.regx.base64, tip || `${this.key}: ${this.currentVal}必须为符合规范的Base64编码` );
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
    

    // ----------------- sanitizers ---------------
    setSanitizedVal( value ){
      if( this.inArrayMode ){
        let {index,arrayKey} = this.inArray;
        var item = objectGetMethod(this.target,arrayKey)[index]
        // pureArray: [1,2,"ss"]
        var isPureArray = item && !objectGetMethod(item,this.key);
        if(isPureArray){
          // this._san[arrayKey][index] = value;
          objectSetMethod(this._san, arrayKey+"."+index, value )
        }else{
          // this._san[arrayKey][index][this.key] = value;
          objectSetMethod(this._san, arrayKey+"."+index+"."+this.key , value )
        }

      } else {
        objectSetMethod(this._san, this.key, value )
      }
    }

    sanitize( func ){
      if( !this.next ) return this;
      let val = this.currentVal;
      if( this.opt && !val ) return this;

      if( typeof func !== "function" ) throw new Error("sanitize第一个参数必须为function")
      this.setSanitizedVal( func(val) )
      
      return this;
    }

    trim(){
      if( !this.next ) return this;
      let val = this.currentVal;
      if( this.opt && !val ) return this;

      this.setSanitizedVal(val.trim? val.trim() : val);
      
      return this;
    }

    whitelist( chars ){
      if( !this.next ) return this;
      let val = this.currentVal;
      if( this.opt && !val ) return this;

      this.setSanitizedVal(val.replace(new RegExp('[^' + chars + ']+', 'g'), ''));
      
      return this;
    }
    blacklist( chars ){
      if( !this.next ) return this;
      let val = this.currentVal;
      if( this.opt && !val ) return this;

      this.setSanitizedVal(val.replace(new RegExp('[' + chars + ']+', 'g'), ''))
      
      return this;
    }

    escape(){
      if( !this.next ) return this;
      let val = this.currentVal;
      if( this.opt && !val ) return this;

      this.setSanitizedVal( val.replace(/&/g, '&amp;')
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
          this.setSanitizedVal( val === '1' || val === 'true' );
      }
      this.setSanitizedVal( val !== '0' && val !== 'false' && val !== '')
      
      return this;
    }
    toDate(){
      if( !this.next ) return this;
      let val = this.currentVal;
      if( this.opt && !val ) return this;

      if (Object.prototype.toString.call(val) === '[object Date]') {
          this.setSanitizedVal(val);
      }else{
        let tt = Date.parse(val);
        this.setSanitizedVal(!isNaN(tt) ? new Date(tt) : null);
      }
      
      return this;
    }
    toFloat(){
      if( !this.next ) return this;
      let val = this.currentVal;
      if( this.opt && !val ) return this;

      this.setSanitizedVal(parseFloat(val));
      
      return this;
    }
    toInt(radix){
      if( !this.next ) return this;
      let val = this.currentVal;
      if( this.opt && !val ) return this;

      this.setSanitizedVal(parseInt(val, radix || 10));
      
      return this;
    }
    toString(){
      if( !this.next ) return this;
      let val = this.currentVal;
      if( this.opt && !val ) return this;
      if (typeof val === 'object' && val !== null && val.toString) {
          this.setSanitizedVal(val.toString());
      } else if (val === null || typeof val === 'undefined' || (isNaN(val) && !val.length)) {
          this.setSanitizedVal( '' );
      } else if (typeof val !== 'string') {
          this.setSanitizedVal(val + '');
      }
      
      return this;
    }

    // -------------------------------- more features -----------------
    compose(field, fn) {
      this.key = field;
      var childVC = new Validator(this.currentVal, this.takeWhatWeHave)
      // execute it
      var parsed = fn(childVC)
      var {sanitized,errors} = parsed || childVC
      this.setSanitizedVal(sanitized)
      if(errors && errors.length>0) {
        var alias = this._alias[field] || field
        this.addError(errors.map(e => alias+'.'+e))
      }

      return this
    }

    flatedArray(arg1,fn) {
      // flatedArray('fields',function(){})
      if(typeof arg1 === 'string') {
        this.key = arg1
        var targetObj = this.currentVal

        Object.keys(targetObj).forEach((key,index) => {
          var childVC = new Validator(targetObj[key], this.takeWhatWeHave)
          // execute it
          var parsed = fn(childVC, targetObj[key])
          var {sanitized,errors} = parsed || childVC
          objectSetMethod(this._san, arg1 + '.'+key, sanitized)
          
          if(errors && errors.length>0) {
            var alias = (this._alias[arg1] || arg1) + '.'+key
            this.addError(errors.map(e => alias+'.'+e))
          }
        })

      } else { // flatedArray(function(){})
        Object.keys(this.target).forEach((key,index) => {
          this.key = key
          var childVC = new Validator(this.currentVal, this.takeWhatWeHave)
          // execute it
          var parsed = arg1(childVC, this.currentVal)
          var {sanitized,errors} = parsed || childVC
          this.setSanitizedVal(sanitized)
          
          if(errors && errors.length>0) {
            this.addError(errors.map(e => key+'.'+e))
          }
        })
      }
      return this
    }



  }// end of class
  

  /**
   * get nested property for an object or array
   * @param  {[type]} obj   [description]
   * @param  {[type]} key   [description]
   * @param  {[type]} keys  [description]
   * @param  {[type]} index [description]
   * @return {[type]}       [description]
   */
  function objectGetMethod(obj,key ,keys,index){
    if(!obj || !key ) return undefined;
    if(!keys && key.indexOf(".")> -1){
      keys = key.split(".");  
      return objectGetMethod( obj[ keys[0] ], keys[0], keys, 1 );
    }
    // recursive
    if( keys &&  keys[index+1] ){
      return objectGetMethod( obj[ keys[index] ], keys[index], keys, index+1 );
    }else if( keys &&  keys[index ] ){
      return obj [keys[index] ]
    }

    return obj[ key ];
  }
  /**
   * set nested property for an object or array
   * @param  {[type]} obj   [description]
   * @param  {[type]} key   [description]
   * @param  {[type]} value [description]
   * @return {[type]}       [description]
   */
  function objectSetMethod(obj,key,value ){
    if(!obj || !key ) throw new Error("objectSetMethod 需要object和key参数");
    var keys = key.split(".");
    try{
      keys.reduce( (object,field,index)=> {
        if( keys[index+1]!==undefined ){ // not last key
          if( !object[field] ) 
            object[field] = vv.regx.numeric.test(keys[index+1])? [] : {};
          return object[field]
        } 
        // this is the last key;
        object[field]=value
        return object
      }, obj )
      return true;
    }catch(e){
      return false;
    }
  }

  if(process.browser){
    window.VC = Validator;
    window.Validator = vv;
  }

  return Validator;
  
});
  
