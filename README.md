Validate-Chain
==============
表单验证链，以及中文验证错误反馈信息

### 安装
```javascript
npm install --save validate-chain

// es5
var VC = require("validate-chain")

// es6
import VC form "validate-chain"

```

### 浏览器中使用
```
bower install --save validate-chain
```
```html
<script src="路径/validate-chain-browser.js"></script>
```
```javascript
// VC 为全局变量
var vc = new VC( objectData )
vc.check("name").required("名字为必填项");
//console.log( vc.errors )

```

### Motivation 为啥要写这个工具？

以NODE作为后端开发单页应用时，前后端对表单的验证和消毒的逻辑以及返回的提示信息其实是一样的，应该做到前后端共用验证逻辑。目前后端可以使用的koa-validate,express-validate等验证中间件不能在前端使用。验证器应该去检查多个字段并在最后返回一个提示信息的数组，和已经消毒后的数据；

### TODO

 - migrate 'a.b' style to compose style
 - localization
 - error message template

### 使用 Validate-Chain

```javascript
import VC from "validate-chain";

var objectData = {age:22,name:"eisneim",gender:"guy",email:"ss.kjk",nested:{a:{b:{v:33}}}}
validator.loginForm() => {
	var vc = new VC( objectData )
	vc.check("email").email()
		.check("desc").alias("描述").required()
		.check("opt").optional().max(2,"must not bigger than 2");
	//或者
	vc.check("name").required("名字为必填项").$apply(function(value){
		// 自定义的判断逻辑
		return value && value.length>2
	},"名字的长度至少两个字符");
	vc.check("age").required().min(23).numeric().in([22,33,44])//可以一直链下去
	vc.check("gender").alias("性别").regx(/male|female/).in(["男","女"])
	// 多层结构
	vc.check("nested.a.b.v").max(30)

	console.log( vc.errors )
  // 如果没有任何错误，vc.errors === null
	//["描述: 为必填字段", "age: 最小值为23", "性别: 不合格/male|female/的格式", "ss.kjk不是常规的email"]
	console.log( vc.sanitized )
	// {name: "eisneim"}
	// vc.errorFields: [ "desc", "age", ... ]
}
```
### 复合Compose，用于处理子对象，合并child checker function

```javascript
const mock = {
	sub: {
		age: 10,
		name: 'terry'
	}
}
it('compose and check sub doc', function() {
	var vc = new VC(mock)
	vc.compose('sub', function(child) {
		child.check('age').min(18)
		child.check('name').min(2)
	})
	expect(vc.errors).to.have.length(1)
	expect(vc.sanitized.sub.name).to.equal('terry')
})

it('use stand alone vc function', function() {
	var childChecker = function(){
		var vv = new VC(mock.sub)
		vv.check('age').min(18)
			.check('name').min(2)
		return vv
	}

	var vc = new VC(mock)
	vc.compose('sub', childChecker)
	expect(vc.errors).to.have.length(1)
	expect(vc.sanitized.sub.name).to.equal('terry')
})
```

### flatedArray被转换成对象的数组
```javascript
describe('vc.flatedArray', function() {
	var flated = {
		'id1':{name:'eisneim',age:17},
		'id2':{name:'terry',age:22},
	}
	var data = {
		flated: flated,
	}

	it('check flatedArray for each child', function() {
		var vc = new VC(flated)
		vc.flatedArray(function(each) {
			each.check('name').required()
				.check('age').min(18)
		})
		expect(vc.errors).to.have.length(1)
		expect(vc.sanitized.id2.age).to.equal(22)
	})

	it('deal with flatedArray as a child', function() {
		var vc = new VC(data)
		vc.flatedArray('flated', function(each) {
			each.check('name').required()
				.check('age').min(18)
		})
		expect(vc.errors).to.have.length(1)
		expect(vc.sanitized.flated.id2.age).to.equal(22)
	})

	it('accept stand alone function', function() {
		var childChecker = function(checker, eachData){
			var vv = new VC(eachData)
			return vv
				.check('name').required()
				.check('age').min(18)
		}
		var vc = new VC(data)
		vc.flatedArray('flated', childChecker)
		expect(vc.errors).to.have.length(1)
		expect(vc.sanitized.flated.id2.age).to.equal(22)
	})
})
```

### 检查数组字段
如果一个字段的值为数组，可以使用array(callback)来进行检查
```javascript
var data = {
	levels:[ 1,3,4,5],
	posts:[
		{title:"some title ",date:"2014-20-3 12:22" },//错误日期
		{title:"不和谐的标题",date:"2014-12-3 12:22" }],
}
var vc = new VC( data );

vc.check("levels").alias("等级").array(function(item,index){
	// 对于数组里的没一个值都检查一遍，如果fail，错误信息将被记录
	item.max(3)
})

vc.check("posts").array( function( item,index ){
	// 如果数组了的元素是一个对象，则使用.check来进行检查(目前不支持数组内部元素的消毒);
	item.check("date").date();
	item.check("name").required();
})

expect(vc.errors).to.have.length(5); // -> pass
/**
[ '等级.2: 最大值为3',
  '等级.3: 最大值为3',
  'posts.0.date: 2014-20-3 12:22不符合日期格式',
  'posts.0: 为必填字段',
  'posts.1: 为必填字段'
] **/
```


### API
 - **check(key)** 以它作为开始，如果对象数据有多层，可使用"a.b.c"来检查内部元素
 - **errors** 检查完后，读取这个属性即可获取所有的错误提示
 - **errorFields** 包含所有出错的字段的一个数组：["age","user.username","array.0.name"]
 - **sanitized** 检查完后读取这个属性即可获得消毒后的属性
 - **alias(name)** 如果设置了别名，错误信息将以这个别名开始
 - **required([tip],[devaultValue])** 必填，大部分情况下需要在链中指明，可以指定devaultValue
 - **optional()** 可选，大部分情况下需要在链中指明，
 - **between(min,max,[tip],[devaultValue])** 如果value是字符串则比较长度，数字则比较大小
 - **max(number,[tip],[devaultValue])** 如果value是字符串则比较长度，数字则比较大小
 - **min(number,[tip],[devaultValue])** 如果value是字符串则比较长度，数字则比较大小
 - **regx( /regx/,[tip],[devaultValue])** 传入正则表达式对象，或者字符串的正则：\w.?end$不加首尾的/
 - **array([callback],[tip],[devaultValue])** 检查数组
 - **$apply(callback,[tip],[devaultValue])** 自定义逻辑function(value){return true}
 - **date(dateString,[tip],[devaultValue])** 是否为时间格式
 - **before(dateString,[tip],[devaultValue])** 时间在dateString之前
 - **after(dateString,[tip],[devaultValue])** 时间在dateString之后
 - **in(Array,[tip],[devaultValue])** 在一个数组值之一
 - **email([tip],[options],[devaultValue])** options: allow_display_name:false 是否匹配 “姓名 <email-地址>”; allow_utf8_local_part:true 是否限定只能使用英文字母和数字；
 - **JSON([tip],[devaultValue])** 是否是格式没有错误的JSON
 - **URL([tip],[options],[devaultValue])** 检查是否是正常的URL，options:  protocols: ['http','https','ftp']指定可以用的协议， require_protocol:false 是否可以不用指定协议
 - **phone([tip],[devaultValue])** 检查手机号
 - **numeric([tip],[devaultValue])** 检查是否为数字
 - **float([tip],[devaultValue])** 是否为浮点数
 - **alpha([tip],[devaultValue])** 是否为纯字母
 - **alphanumeric([tip],[devaultValue])** 是否为字母+数字
 - **ascii([tip],[devaultValue])** 是否是ascii 码
 - **objectId([tip],[devaultValue])** 是否为Mongodb ObjectID
 - **base64([tip],[devaultValue])** 是否为base64格式字符串编码
 - **creditCard([tip],[devaultValue])** 是否为信用卡
 - **compose** 检查子对象 vc.compose('fieldName',fn)，可以将另一个 checkFunction作为参数
 - **flatedArray** 检查被转换成对象的数组


### sanitizers 消毒器
想要被保存到vc.sanitized对象中的字段，必须使用vc.check("name"),如果该字段为可选的，则应该使用vc.check("name").optional(); 目前版本只支持第一层数组的元素的消毒
```javascript
var data = {
	name:"  小明 ",
	nested:{
		name:" 小明 "
	},
	array:[" 小明 "],
	objOfArray:[
		{name:" 小明 "},
	]
}
vc.check("name").required().trim();
vc.check("nested.name").required().trim();
vc.check("array").required().array(function(item,index){
	item.trim()
})
vc.check("objOfArray").required().array(function(item,index){
	item.check("name").required().trim();
})

console.log( vc.sanitized ) // {name:"小明",....}
```

 - **trim()** 去掉首尾空格
 - **sanitize(function)** 自定义消毒类型 function(value){ return value+1 }
 - **escape()** 将<, >, &, ', " /替换为HTML编码
 - **whitelist(chars)** 白名单 eg. whitelist("a-zA-Z") 将会变成：replace(/[^a-zA-Z]/g,"")
 - **blacklist(chars, [replacement])** 黑名单 eg. whitelist("被和谐|不和谐|查水表") 将会变成：replace(/[被和谐|不和谐|查水表]/g,"")
 - **noSpecialChar([replacement])** 替换特殊字符为下划线_ 正则为：/[#'$%^&*\/\\\|<>\[\]{}]/g
 - **toBoolean([strict])**
 - **toDate()** 转换为日期对象
 - **toFloat()** 浮点数
 - **toInt([radix])** 整数，radix为进制
 - **toString()** 转换为字符串

### 开发
```
// 测试
gulp test

// build
gulp build

```
