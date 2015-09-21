Validate-Chain(完善API中... don't use in production)
==============
表单验证链，以及中文验证错误反馈信息

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
	var vc = new V( objectData )
	vc.check("opt").optional().max(2,"must not bigger than 2");
	vc.check("name").required("名字为必填项");
	vc.check("description").alias("描述").required()
	vc.check("age").required().min(23)
	vc.check("gender").alias("性别").regx(/male|female/)
	vc.check("email").email()

	console.log( vc.errors )
	//["描述: 为必填字段", "age: 最小值为23", "性别: 不合格/male|female/的格式", "ss.kjk不是常规的email"]
	console.log( vc.sanitized )
	// {name: "eisneim"}
}
```

