Validate-Chain
==============
表单验证链，以及中文验证错误反馈信息(完善API中... don't use in production)

###Motivation 为啥要写这个工具？


### 之前
重复的if return, 以及大量的错误提示信息。。。。。
```javascript
validator.loginForm = ({credential,password,email}) => {
	if( !credential ) return err("手机号或者Email地址，你忘了吧");
	if( !password ) return err("你是不是忘了填写密码了");
	if( /emailRegx/.test(email)) return err("这个不是Email地址。。。")
 	....
 	.... blah blah blah

	var san = {credential,password};
	return { san }
}

function err( msg ){
	return { verr:msg }
}
```
###使用 Validate-Chain
```javascript
import VC from "validate-chain";

var objectData = {age:22,name:"eisneim",gender:"guy",email:"ss.kjk"}
validator.loginForm() => {	
	var vc = new VC( objectData )
	vc.check("opt").optional().max(2,"must not bigger than 2");
	vc.check("name").required("名字为必填项");
	vc.check("desc").alias("描述").required()
	vc.check("age").required().min(23)
	vc.check("gender").alias("性别").regx(/male|female/)
	vc.check("email").email()

	console.log( vc.errors )
	//["描述: 为必填字段", "age: 最小值为23", "性别: 不合格/male|female/的格式", "ss.kjk不是常规的email"]
	console.log( vc.sanitized )
	// {name: "eisneim"}
}
```

###浏览器中使用
```html
<script src="路径/validate-chain-browser.js"></script>
```
```javascript
// VC 为全局变量
var vc = new VC( objectData )
vc.check("name").required("名字为必填项");
//console.log( vc.errors )

```
###API
 - check(key) 以它作为开始
 - errors 检查完后，读取这个属性即可获取所有的错误提示
 - sanitized 检查完后读取这个属性即可获得消毒后的属性
 - alias(name)
 - required([tip])
 - optional()
 - between(min,max,[tip])
 - max(number,[tip])
 - min(number,[tip])
 - regx( /regx/,[tip] )
 - date(dateString,[tip])
 - before(dateString,[tip])
 - after(dateString,[tip])
 - in(Array,[tip])
 - email([tip],[options])
 - JSON([tip])
 - URL([tip],[options])
 - phone([tip])
 - numeric([tip])
 - float([tip])
 - alpha([tip])
 - alphanumeric([tip])
 - ascii([tip])
 - objectId([tip])
 - base64([tip])
 - creditCard([tip])
 - currency(options,[tip])
 -


### sanitizers 消毒器
```javascript
// data = { name:"  小明 "}
vc.check("name").required("名字为必填项").trim();

console.log( vc.sanitized ) // {name:"小明"}
```

 - trim() 
 - escape() 
 - 
 - 
 - 
 - 
 - 
 - 
 - 