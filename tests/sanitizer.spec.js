var expect = require('chai').expect;
var VC = require("../validate-chain.js");

var mock = {
	name: " eisneim  ",
	age: 24.5,
	email: "eisneim1@gmail.com",
	description:"_不和谐",
	badInput:"<script src='virus.js'></script>",
	site: "http://glexe.com",
	float:"3.141568",
	"单身狗": "是",

	future:"2048-10-2 12:22",
	now: new Date(),

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
	

});
