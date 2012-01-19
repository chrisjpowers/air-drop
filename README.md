# AirDrop

`AirDrop` is a Node.js Connect middleware for compiling, concatenating and minimizing
 your JS/Coffee source files and delivering them to the browser on-the-fly. 
Personally I think this approach is preferable to using build scripts, file watchers, etc.

## Install

Install with `npm`:

```
npm install air-drop
```

## Including JS Files

All the following examples assume you have some kind of a Connect-compatible server:

```javascript
var server = require("connect").createServer();
```

`AirDrop` objects are instantiated with a package name that will be used in the package's
URL. To include JS files, use the `include` method. Files will be added to the package
in the order you include them.

```javascript
var package = AirDrop("my-package").include("public/js/jquery.js")
                                   .include("public/js/file1.js")
                                   .include("public/js/file2.js");
server.use(package);
```

In your client-side code, you can load your JS package with a script tag:

```html
<script type="text/javascript" src="/air-drop/my-package.js"></script>
```

## Globbing Paths

Rather than including paths one by one, you can use glob wildcards:

```javascript
var package = AirDrop("my-package").include("public/js/jquery.js")
                                   .include("public/js/**/*.js")
```

This will first add `jquery.js`, then any other JS files nested inside `public/js`.
NOTE: Because `jquery.js` has already been included, it will not be included a
second time by the glob include.

## Requiring JS Modules

Sharing JS source files between Node and the browser is difficult because the browser
does not natively implement Node's file loading system using `require` and `exports`.
This is easy with `AirDrop`, though -- just use the `require` method instead of `include`
and `AirDrop` will wrap your modules in an AMD `define` block for use in the browser:

```javascript
// in lib/my-module.js
exports.helloWorld = function() { return "Hello World!"; };

// in public/js/demo.js
var MyModule = require("lib/my-module");
MyModule.helloWorld(); // "Hello World!"

// in your Node script
var package = AirDrop("my-package").require("lib/my-module.js")
                                   .include("public/js/demo.js");
server.use(package);
```

## Packaging Your Code

By default, `AirDrop` does not package your code, as this makes debugging difficult
in development. Rather, `/air-drop/my-package.js` will dynamically add a script tag
for each of your included scripts so that they will be loaded individually.

When you are ready for your code to be packaged, use the `package` method:

```javascript
var package = AirDrop("my-package").require("lib/my-module.js")
                                   .include("public/js/demo.js")
                                   .package();
```

The `package` method accepts an optional boolean so that you can package conditionally.
For example, you may only want to package your code if the NODE_ENV environment
variable is set to `production`:

```javascript
var package = AirDrop("my-package").require("lib/my-module.js")
                                   .include("public/js/demo.js")
                                   .package(process.env.NODE_ENV === "production");
```

### Minimizing Your Code

Minimizing your client code is a good way to reducing file size as well as obfuscating
it from prying eyes. Like the `package` method, the `minimize` method can be called
without an argument, or with a boolean:

```javascript
var package = AirDrop("my-package").require("lib/my-module.js")
                                   .include("public/js/demo.js")
                                   .package(process.env.NODE_ENV === "production")
                                   .minimize(process.env.NODE_ENV === "production");
                                   // or just .minimize()
```

### CoffeeScript

Using CoffeeScript? No problem, any CoffeeScripts will be automatically compiled for you!

### TODO

- Specs!
- Build in caching of packages
- More flexibility in naming AMD modules other than by path
- Ability to slice out "server-only" code from shared files
