var expect = require('chai').expect;
var VC = require("../src/validate-chain.js");

var mock = {
	name: " eisneim  ",
	age: 24.2,
	email: "eisneim1@gmail.com",
	description:"_不和谐",
	badInput:"<script src='virus.js'></script>",
	site: "http://glexe.com",
	float:"3.141568",
	"单身狗": "是",

	future:"2048-10-2 12:22",
	now: new Date(),

	nested:{
		name:" eisneim  ",
		array:[ " eisneim "],
		arrayNestedObj:[{user:{name:" eisneim "}}]
	},
	array:[11,22,33],
	arrayObj:[
		{name:"  eisneim ", array:[11,22] },
	],
	arrayNestedObj:[{user:{name:" eisneim "}}]
}

describe('sanitizers',function(){
// before(), after(), beforeEach()

	it("should sanitize strings",function(){
		var vc = new VC( mock );
		vc.check("name").trim();
		vc.check("description").blacklist("不和谐");
		vc.check("site").URL().whitelist("glexe1234567890");
		vc.check("badInput").escape()
		expect( vc.errors ).to.be.empty;
		expect( vc.sanitized["name"] ).to.equal("eisneim")
		expect( vc.sanitized["description"] ).to.equal("_")
		expect( vc.sanitized["site"]).to.equal("glexe")
		expect( vc.sanitized["badInput"][0] ).to.not.equal("<")

	});

	it("should be able to sanitize boolean and date",function(){
		var vc = new VC( mock );
		vc.check("future").toDate()
		vc.check("单身狗").toBoolean()
		vc.check("now").toString()

		expect( vc.sanitized.future.toDateString ).to.exist;
		expect( vc.sanitized["单身狗"]).to.be.true;
		expect( vc.sanitized.now ).to.be.a("string")
	})

	it("should be able to sanitize numbers",function(){
		var vc = new VC( mock );
		vc.check("float").toFloat();
		vc.check("age").toInt()
		expect( vc.sanitized.float ).to.be.a("number");
		expect( vc.sanitized.age ).to.equal(24)

	})
	
	it("should only take what is privided, skip require",function(){
		var vc = new VC( mock, true );
		vc.check("null").required().max(3)
		vc.check("name").required().trim();
		vc.check("email").optional().email();
		vc.check("xxyz").optional();
		
		expect( vc.sanitized["name"] ).to.equal("eisneim")
		expect(vc.sanitized).to.have.keys("name","email")
		expect( vc.sanitized.xxyz ).to.be.undefined
	})

	it("should support custom sanitizer",function(){
		var vc = new VC( mock );
		vc.check("name").required().sanitize(function(value){
			return value.trim();
		})

		vc.check("age").required().sanitize(function(value){
			return parseInt(value.toFixed());
		})

		expect(vc.sanitized["name"]).to.equal("eisneim")
		expect(vc.sanitized["age"]).to.equal(24)

	})

	it("should sanitize nested object, and array inside nested",function(){
		var vc = new VC( mock );
		vc.check('nested')
		vc.check("nested.name").required().trim()
		vc.check("nested.array").required().array(function(item,index){
			item.trim();
		})
		vc.check("nested.arrayNestedObj").required().array(function(item,index){
			item.check("user.name").required().trim();
		})

		// console.log( JSON.stringify(vc.sanitized,null," ") )
		expect( vc.sanitized.nested.array[0] ).to.equal("eisneim")
		expect( vc.sanitized.nested.arrayNestedObj[0].user.name ).to.equal("eisneim")
		expect( vc.sanitized.nested.name ).to.equal("eisneim")

	})


	it("should sanitize array item,and nested inside array",function(){
		var vc = new VC( mock );
		vc.check("array").required().array(function(item,index){
			item.sanitize(function(value){
				return value + 1;
			})
		})
		vc.check("arrayObj").required().array(function(item,index){
			item.check("name").required().trim()
			item.check("array").required().array();
		})
		vc.check("arrayNestedObj").required().array(function(item,index){
			item.check("user.name").required().trim()
		})

		expect( vc.sanitized.array[0] ).to.equal(12)
		expect( vc.sanitized.arrayObj[0].name ).to.equal("eisneim")
		expect( vc.sanitized.arrayNestedObj[0].user.name ).to.equal("eisneim")
	})

});
	