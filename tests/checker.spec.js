var expect = require('chai').expect;
var VC = require("../validate-chain.js");
var tmp = new Buffer("some value");

var mock = {
	name: "eisneim",
	age: 24,
	email: "eisneim1@gmail.com",
	email2: "eisneim <sdfjk@gmail.com>",
	site: "http://glexe.com",
	siteInvalid: "glexe.com",
	phone: "13482783201",
	phoneInvalid: "1348278320",
	base64: tmp.toString("base64"),
	hex: tmp.toString("hex"),
	ascii: tmp.toString("ascii"),
}

describe('Validator-Chain checkers',function(){
// before(), after(), beforeEach()

	it("should check require() and optional()",function(){
		var vc = new VC( mock );
		vc.check("name").required();
		vc.check("null").optional().max(3);

		expect( vc.errors ).to.be.empty;

		vc.check("null").required();
		expect( vc.errors ).to.have.length(1);
	});

	it("should change Error message if .aliase() presents",function(){
		var vc = new VC( mock );
		vc.check("name").alias("姓名").in(["terry","mike"])
		vc.check("age").alias("年龄").between(10,18,"应该在十到十八之间")

		expect( vc.errors[0] ).to.have.string("姓名")
		expect( vc.errors[1] ).to.match(/年龄.+之间/)
	})

	it("should be chainable,key with optional() should be skiped",function(){
		var vc = new VC( mock );
		vc.check("age").between(10,18).max(18).in([21,22,23]);
		vc.check("null").optional().between(10,18).max(18).in([21,22,23]);
		expect( vc.errors).to.have.length(3);
	})

	it("can use regx",function(){
		var vc = new VC( mock );
		vc.check("name").regx(/^eis./i).regx("eim$",null,"i")

		expect(vc.errors).to.be.empty;
	})

	it("can deal with common string format",function(){
		var vc = new VC( mock );
		vc.check("phone").phone()
		vc.check("phoneInvalid").phone()
		expect( vc.errors ).to.have.length(1);

		vc.check("email").email()
		vc.check("email2").email(null,{ allow_display_name: true })
		vc.check("phone").email()
		expect( vc.errors ).to.have.length(2);


	})

	it("can deal with Date",function(){

	})

	it("can deal with number and Alphabetic",function(){
		
	})

	
/**
	
	.match 	.ok
	.true  .undefined   .exits .empty 
 expect().to.be.a('array');
 expect().to.be.a('number');
 expect().above(0);
 expect().to.be.a('object');
 expect().to.be.a('string');
 expect().to.be.a('array');
 expect().to.equal('eisneim');
 expect().to.throw(Error);
*/

});
