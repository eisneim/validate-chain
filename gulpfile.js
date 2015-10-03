var gulp = require('gulp'),fs = require("fs");

var rename = require("gulp-rename");
var gulpif = require('gulp-if');
var uglify = require('gulp-uglify');
// es6 related things
var babel = require('gulp-babel');
var babelify = require("babelify");
var gbrowserify = require("gulp-browserify")

gulp.task('default',['es6']);
gulp.task("build",["test","es6","build-browser","browser"]);

gulp.task("watch",function(){
	gulp.watch( 'src/**/*.js' ,['es6']);

})

gulp.task("es6",function(){
	gulp.src("src/**/*.js")
	.pipe( babel({
		blacklist: ['regenerator','bluebirdCoroutines'],
		// optional: ["es7.asyncFunctions"],
		// only: './src/**/*.js',
	}) )
	.on( "error", handleError)
	.pipe(gulp.dest("./"))
})

gulp.task("build-browser",function(){
	gulp.src("src/validate-chain.js")
	.pipe(gbrowserify({
		// debug: argv.env !== 'production',
		// insertGlobals : true,
		transform: [
			babelify.configure({
			  // optional: ["es7.asyncFunctions","runtime"]
			})
		],
	}))
	.pipe( uglify({ compress:true, mangle:true}) )
	.on( "error", handleError)
	.pipe(rename({
    suffix: "-browser.min",
  }))
	.pipe(gulp.dest("./"))
})

gulp.task("browser",function(){
	gulp.src("src/validate-chain.js")
		.pipe(gbrowserify({
			// debug: argv.env !== 'production',
			// insertGlobals : true,
			transform: [
				babelify.configure({
				  // optional: ["es7.asyncFunctions","runtime"]
				})
			],
		}))
		.on( "error", handleError)
		.pipe(rename({
	    suffix: "-browser",
	  }))
		.pipe(gulp.dest("./"))
})

// gulp.task("watch-src",function(){
// 	gulp.watch([paths.jsServer,paths.jsShared], function ( event ) {
// 		console.log("src file changed >> "+ event.path.replace(__dirname,""))
// 		var destPath ="./dist/" + event.path.replace(__dirname+"/src/","").replace(/[^\/]+$/,"");
// 		console.log(destPath)
		
// 		return gulp.src( event.path )
//       .pipe( babel({
//       	blacklist: ['regenerator','bluebirdCoroutines'],
//       	optional: ["es7.asyncFunctions"], // ,"runtime"
//       	only: __dirname+'/src/**/*.js',
//       }) )
//       .on( "error", handleError)
//       .pipe(gulp.dest( destPath))
//     	.on('end', function() {
//          fs.createWriteStream("./dist/.trigger");
//       });
// 	});

// })


// ---------------------- test ----------------

var mocha = require('gulp-mocha');

gulp.task('test',function(){
    gulp.src('./tests/**/*.spec.js', {read: false})
      .pipe(mocha({
      	reporter: 'spec',
    }))
})

gulp.task('test_handle_err',["es6"],function(){
   setTimeout(function(){
   		gulp.src('./tests/**/*.spec.js', {read: false})
   		  .pipe(mocha({
   		  	reporter: 'spec',
   		  	// compilers: 'js:babel/register'
   		}))
   		.on( "error", handleError); // spec,dot, nyan,list,doc,min,Progress, 
   
   },200);
})


gulp.task('watch-test',function(){
	gulp.watch( './src/**/*.js' ,['test_handle_err']);
  gulp.watch('./tests/**/*.spec.js', ['test_handle_err']);
})

// --------- utils ------------
function handleError(err) {
  console.log(err.toString());
  this.emit('end');
}