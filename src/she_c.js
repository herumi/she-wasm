
var Module = (function() {
  var _scriptDir = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : undefined;
  if (typeof __filename !== 'undefined') _scriptDir = _scriptDir || __filename;
  return (
function(Module) {
  Module = Module || {};

null;

var Module = typeof Module !== "undefined" ? Module : {};

var readyPromiseResolve, readyPromiseReject;

Module["ready"] = new Promise(function(resolve, reject) {
 readyPromiseResolve = resolve;
 readyPromiseReject = reject;
});

var moduleOverrides = {};

var key;

for (key in Module) {
 if (Module.hasOwnProperty(key)) {
  moduleOverrides[key] = Module[key];
 }
}

var arguments_ = [];

var thisProgram = "./this.program";

var quit_ = function(status, toThrow) {
 throw toThrow;
};

var ENVIRONMENT_IS_WEB = false;

var ENVIRONMENT_IS_WORKER = false;

var ENVIRONMENT_IS_NODE = false;

var ENVIRONMENT_IS_SHELL = false;

ENVIRONMENT_IS_WEB = typeof window === "object";

ENVIRONMENT_IS_WORKER = typeof importScripts === "function";

ENVIRONMENT_IS_NODE = typeof process === "object" && typeof process.versions === "object" && typeof process.versions.node === "string";

ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

var scriptDirectory = "";

function locateFile(path) {
 if (Module["locateFile"]) {
  return Module["locateFile"](path, scriptDirectory);
 }
 return scriptDirectory + path;
}

var read_, readAsync, readBinary, setWindowTitle;

var nodeFS;

var nodePath;

if (ENVIRONMENT_IS_NODE) {
 if (ENVIRONMENT_IS_WORKER) {
//  scriptDirectory = require("path").dirname(scriptDirectory) + "/";
 } else {
  scriptDirectory = __dirname + "/";
 }
 read_ = function shell_read(filename, binary) {
//  if (!nodeFS) nodeFS = require("fs");
//  if (!nodePath) nodePath = require("path");
  filename = nodePath["normalize"](filename);
  return nodeFS["readFileSync"](filename, binary ? null : "utf8");
 };
 readBinary = function readBinary(filename) {
  var ret = read_(filename, true);
  if (!ret.buffer) {
   ret = new Uint8Array(ret);
  }
  assert(ret.buffer);
  return ret;
 };
 if (process["argv"].length > 1) {
  thisProgram = process["argv"][1].replace(/\\/g, "/");
 }
 arguments_ = process["argv"].slice(2);
 quit_ = function(status) {
  process["exit"](status);
 };
 Module["inspect"] = function() {
  return "[Emscripten Module object]";
 };
} else if (ENVIRONMENT_IS_SHELL) {
 if (typeof read != "undefined") {
  read_ = function shell_read(f) {
   return read(f);
  };
 }
 readBinary = function readBinary(f) {
  var data;
  if (typeof readbuffer === "function") {
   return new Uint8Array(readbuffer(f));
  }
  data = read(f, "binary");
  assert(typeof data === "object");
  return data;
 };
 if (typeof scriptArgs != "undefined") {
  arguments_ = scriptArgs;
 } else if (typeof arguments != "undefined") {
  arguments_ = arguments;
 }
 if (typeof quit === "function") {
  quit_ = function(status) {
   quit(status);
  };
 }
 if (typeof print !== "undefined") {
  if (typeof console === "undefined") console = {};
  console.log = print;
  console.warn = console.error = typeof printErr !== "undefined" ? printErr : print;
 }
} else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
 if (ENVIRONMENT_IS_WORKER) {
  scriptDirectory = self.location.href;
 } else if (document.currentScript) {
  scriptDirectory = document.currentScript.src;
 }
 if (_scriptDir) {
  scriptDirectory = _scriptDir;
 }
 if (scriptDirectory.indexOf("blob:") !== 0) {
  scriptDirectory = scriptDirectory.substr(0, scriptDirectory.lastIndexOf("/") + 1);
 } else {
  scriptDirectory = "";
 }
 {
  read_ = function shell_read(url) {
   var xhr = new XMLHttpRequest();
   xhr.open("GET", url, false);
   xhr.send(null);
   return xhr.responseText;
  };
  if (ENVIRONMENT_IS_WORKER) {
   readBinary = function readBinary(url) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, false);
    xhr.responseType = "arraybuffer";
    xhr.send(null);
    return new Uint8Array(xhr.response);
   };
  }
  readAsync = function readAsync(url, onload, onerror) {
   var xhr = new XMLHttpRequest();
   xhr.open("GET", url, true);
   xhr.responseType = "arraybuffer";
   xhr.onload = function xhr_onload() {
    if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
     onload(xhr.response);
     return;
    }
    onerror();
   };
   xhr.onerror = onerror;
   xhr.send(null);
  };
 }
 setWindowTitle = function(title) {
  document.title = title;
 };
} else {}

var out = Module["print"] || console.log.bind(console);

var err = Module["printErr"] || console.warn.bind(console);

for (key in moduleOverrides) {
 if (moduleOverrides.hasOwnProperty(key)) {
  Module[key] = moduleOverrides[key];
 }
}

moduleOverrides = null;

if (Module["arguments"]) arguments_ = Module["arguments"];

if (Module["thisProgram"]) thisProgram = Module["thisProgram"];

if (Module["quit"]) quit_ = Module["quit"];

var asm2wasmImports = {
 "f64-rem": function(x, y) {
  return x % y;
 },
 "debugger": function() {}
};

var functionPointers = new Array(0);

var wasmBinary;

if (Module["wasmBinary"]) wasmBinary = Module["wasmBinary"];

var noExitRuntime;

if (Module["noExitRuntime"]) noExitRuntime = Module["noExitRuntime"];

if (typeof WebAssembly !== "object") {
 err("no native wasm support detected");
}

var wasmMemory;

var wasmTable = new WebAssembly.Table({
 "initial": 217,
 "maximum": 217,
 "element": "anyfunc"
});

var ABORT = false;

var EXITSTATUS = 0;

function assert(condition, text) {
 if (!condition) {
  abort("Assertion failed: " + text);
 }
}

var WASM_PAGE_SIZE = 65536;

var buffer, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

function updateGlobalBufferAndViews(buf) {
 buffer = buf;
 Module["HEAP8"] = HEAP8 = new Int8Array(buf);
 Module["HEAP16"] = HEAP16 = new Int16Array(buf);
 Module["HEAP32"] = HEAP32 = new Int32Array(buf);
 Module["HEAPU8"] = HEAPU8 = new Uint8Array(buf);
 Module["HEAPU16"] = HEAPU16 = new Uint16Array(buf);
 Module["HEAPU32"] = HEAPU32 = new Uint32Array(buf);
 Module["HEAPF32"] = HEAPF32 = new Float32Array(buf);
 Module["HEAPF64"] = HEAPF64 = new Float64Array(buf);
}

var DYNAMIC_BASE = 5282112, DYNAMICTOP_PTR = 39040;

var INITIAL_INITIAL_MEMORY = Module["INITIAL_MEMORY"] || 134217728;

if (Module["wasmMemory"]) {
 wasmMemory = Module["wasmMemory"];
} else {
 wasmMemory = new WebAssembly.Memory({
  "initial": INITIAL_INITIAL_MEMORY / WASM_PAGE_SIZE,
  "maximum": INITIAL_INITIAL_MEMORY / WASM_PAGE_SIZE
 });
}

if (wasmMemory) {
 buffer = wasmMemory.buffer;
}

INITIAL_INITIAL_MEMORY = buffer.byteLength;

updateGlobalBufferAndViews(buffer);

HEAP32[DYNAMICTOP_PTR >> 2] = DYNAMIC_BASE;

function callRuntimeCallbacks(callbacks) {
 while (callbacks.length > 0) {
  var callback = callbacks.shift();
  if (typeof callback == "function") {
   callback(Module);
   continue;
  }
  var func = callback.func;
  if (typeof func === "number") {
   if (callback.arg === undefined) {
    Module["dynCall_v"](func);
   } else {
    Module["dynCall_vi"](func, callback.arg);
   }
  } else {
   func(callback.arg === undefined ? null : callback.arg);
  }
 }
}

var __ATPRERUN__ = [];

var __ATINIT__ = [];

var __ATMAIN__ = [];

var __ATPOSTRUN__ = [];

var runtimeInitialized = false;

function preRun() {
 if (Module["preRun"]) {
  if (typeof Module["preRun"] == "function") Module["preRun"] = [ Module["preRun"] ];
  while (Module["preRun"].length) {
   addOnPreRun(Module["preRun"].shift());
  }
 }
 callRuntimeCallbacks(__ATPRERUN__);
}

function initRuntime() {
 runtimeInitialized = true;
 callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
 callRuntimeCallbacks(__ATMAIN__);
}

function postRun() {
 if (Module["postRun"]) {
  if (typeof Module["postRun"] == "function") Module["postRun"] = [ Module["postRun"] ];
  while (Module["postRun"].length) {
   addOnPostRun(Module["postRun"].shift());
  }
 }
 callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
 __ATPRERUN__.unshift(cb);
}

function addOnPostRun(cb) {
 __ATPOSTRUN__.unshift(cb);
}

var runDependencies = 0;

var runDependencyWatcher = null;

var dependenciesFulfilled = null;

function addRunDependency(id) {
 runDependencies++;
 if (Module["monitorRunDependencies"]) {
  Module["monitorRunDependencies"](runDependencies);
 }
}

function removeRunDependency(id) {
 runDependencies--;
 if (Module["monitorRunDependencies"]) {
  Module["monitorRunDependencies"](runDependencies);
 }
 if (runDependencies == 0) {
  if (runDependencyWatcher !== null) {
   clearInterval(runDependencyWatcher);
   runDependencyWatcher = null;
  }
  if (dependenciesFulfilled) {
   var callback = dependenciesFulfilled;
   dependenciesFulfilled = null;
   callback();
  }
 }
}

Module["preloadedImages"] = {};

Module["preloadedAudios"] = {};

function abort(what) {
 if (Module["onAbort"]) {
  Module["onAbort"](what);
 }
 what += "";
 out(what);
 err(what);
 ABORT = true;
 EXITSTATUS = 1;
 what = "abort(" + what + "). Build with -s ASSERTIONS=1 for more info.";
 throw new WebAssembly.RuntimeError(what);
}

function hasPrefix(str, prefix) {
 return String.prototype.startsWith ? str.startsWith(prefix) : str.indexOf(prefix) === 0;
}

var dataURIPrefix = "data:application/octet-stream;base64,";

function isDataURI(filename) {
 return hasPrefix(filename, dataURIPrefix);
}

var fileURIPrefix = "file://";

function isFileURI(filename) {
 return hasPrefix(filename, fileURIPrefix);
}

var wasmBinaryFile = "she_c.wasm";

if (!isDataURI(wasmBinaryFile)) {
 wasmBinaryFile = locateFile(wasmBinaryFile);
}

function getBinary() {
 try {
  if (wasmBinary) {
   return new Uint8Array(wasmBinary);
  }
  if (readBinary) {
   return readBinary(wasmBinaryFile);
  } else {
   throw "both async and sync fetching of the wasm failed";
  }
 } catch (err) {
  abort(err);
 }
}

function getBinaryPromise() {
 if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) && typeof fetch === "function" && !isFileURI(wasmBinaryFile)) {
  return fetch(wasmBinaryFile, {
   credentials: "same-origin"
  }).then(function(response) {
   if (!response["ok"]) {
    throw "failed to load wasm binary file at '" + wasmBinaryFile + "'";
   }
   return response["arrayBuffer"]();
  }).catch(function() {
   return getBinary();
  });
 }
 return new Promise(function(resolve, reject) {
  resolve(getBinary());
 });
}

function createWasm() {
 var info = {
  "env": asmLibraryArg,
  "wasi_snapshot_preview1": asmLibraryArg,
  "global": {
   "NaN": NaN,
   Infinity: Infinity
  },
  "global.Math": Math,
  "asm2wasm": asm2wasmImports
 };
 function receiveInstance(instance, module) {
  var exports = instance.exports;
  Module["asm"] = exports;
  removeRunDependency("wasm-instantiate");
 }
 addRunDependency("wasm-instantiate");
 function receiveInstantiatedSource(output) {
  receiveInstance(output["instance"]);
 }
 function instantiateArrayBuffer(receiver) {
  return getBinaryPromise().then(function(binary) {
   return WebAssembly.instantiate(binary, info);
  }).then(receiver, function(reason) {
   err("failed to asynchronously prepare wasm: " + reason);
   abort(reason);
  });
 }
 function instantiateAsync() {
  if (!wasmBinary && typeof WebAssembly.instantiateStreaming === "function" && !isDataURI(wasmBinaryFile) && !isFileURI(wasmBinaryFile) && typeof fetch === "function") {
   fetch(wasmBinaryFile, {
    credentials: "same-origin"
   }).then(function(response) {
    var result = WebAssembly.instantiateStreaming(response, info);
    return result.then(receiveInstantiatedSource, function(reason) {
     err("wasm streaming compile failed: " + reason);
     err("falling back to ArrayBuffer instantiation");
     return instantiateArrayBuffer(receiveInstantiatedSource);
    });
   });
  } else {
   return instantiateArrayBuffer(receiveInstantiatedSource);
  }
 }
 if (Module["instantiateWasm"]) {
  try {
   var exports = Module["instantiateWasm"](info, receiveInstance);
   return exports;
  } catch (e) {
   err("Module.instantiateWasm callback failed with error: " + e);
   return false;
  }
 }
 instantiateAsync();
 return {};
}

Module["asm"] = createWasm;

var ASM_CONSTS = [ function($0, $1) {
 Module.cryptoGetRandomValues($0, $1);
} ];

function _emscripten_asm_const_iii(code, a0, a1) {
 return ASM_CONSTS[code](a0, a1);
}

__ATINIT__.push({
 func: function() {
  globalCtors();
 }
});

function ___cxa_allocate_exception(size) {
 return _malloc(size);
}

var ___exception_infos = {};

var ___exception_last = 0;

function ___cxa_throw(ptr, type, destructor) {
 ___exception_infos[ptr] = {
  ptr: ptr,
  adjusted: [ ptr ],
  type: type,
  destructor: destructor,
  refcount: 0,
  caught: false,
  rethrown: false
 };
 ___exception_last = ptr;
 if (!("uncaught_exception" in __ZSt18uncaught_exceptionv)) {
  __ZSt18uncaught_exceptionv.uncaught_exceptions = 1;
 } else {
  __ZSt18uncaught_exceptionv.uncaught_exceptions++;
 }
 throw ptr;
}

function _abort() {
 abort();
}

function _emscripten_get_heap_size() {
 return HEAPU8.length;
}

function _emscripten_resize_heap(requestedSize) {
 requestedSize = requestedSize >>> 0;
 return false;
}

function _llvm_trap() {
 abort("trap!");
}

function _emscripten_memcpy_big(dest, src, num) {
 HEAPU8.copyWithin(dest, src, src + num);
}

var asmGlobalArg = {};

var asmLibraryArg = {
 "b": ___cxa_allocate_exception,
 "a": ___cxa_throw,
 "__memory_base": 1024,
 "__table_base": 0,
 "d": _abort,
 "i": _emscripten_asm_const_iii,
 "h": _emscripten_get_heap_size,
 "g": _emscripten_memcpy_big,
 "f": _emscripten_resize_heap,
 "e": _llvm_trap,
 "c": abort,
 "memory": wasmMemory,
 "table": wasmTable
};

var asm = Module["asm"](asmGlobalArg, asmLibraryArg, buffer);

var __ZSt18uncaught_exceptionv = Module["__ZSt18uncaught_exceptionv"] = function() {
 return (__ZSt18uncaught_exceptionv = Module["__ZSt18uncaught_exceptionv"] = Module["asm"]["j"]).apply(null, arguments);
};

var _malloc = Module["_malloc"] = function() {
 return (_malloc = Module["_malloc"] = Module["asm"]["k"]).apply(null, arguments);
};

var _mclBnFp2_add = Module["_mclBnFp2_add"] = function() {
 return (_mclBnFp2_add = Module["_mclBnFp2_add"] = Module["asm"]["l"]).apply(null, arguments);
};

var _mclBnFp2_clear = Module["_mclBnFp2_clear"] = function() {
 return (_mclBnFp2_clear = Module["_mclBnFp2_clear"] = Module["asm"]["m"]).apply(null, arguments);
};

var _mclBnFp2_deserialize = Module["_mclBnFp2_deserialize"] = function() {
 return (_mclBnFp2_deserialize = Module["_mclBnFp2_deserialize"] = Module["asm"]["n"]).apply(null, arguments);
};

var _mclBnFp2_div = Module["_mclBnFp2_div"] = function() {
 return (_mclBnFp2_div = Module["_mclBnFp2_div"] = Module["asm"]["o"]).apply(null, arguments);
};

var _mclBnFp2_inv = Module["_mclBnFp2_inv"] = function() {
 return (_mclBnFp2_inv = Module["_mclBnFp2_inv"] = Module["asm"]["p"]).apply(null, arguments);
};

var _mclBnFp2_isEqual = Module["_mclBnFp2_isEqual"] = function() {
 return (_mclBnFp2_isEqual = Module["_mclBnFp2_isEqual"] = Module["asm"]["q"]).apply(null, arguments);
};

var _mclBnFp2_isOne = Module["_mclBnFp2_isOne"] = function() {
 return (_mclBnFp2_isOne = Module["_mclBnFp2_isOne"] = Module["asm"]["r"]).apply(null, arguments);
};

var _mclBnFp2_isZero = Module["_mclBnFp2_isZero"] = function() {
 return (_mclBnFp2_isZero = Module["_mclBnFp2_isZero"] = Module["asm"]["s"]).apply(null, arguments);
};

var _mclBnFp2_mapToG2 = Module["_mclBnFp2_mapToG2"] = function() {
 return (_mclBnFp2_mapToG2 = Module["_mclBnFp2_mapToG2"] = Module["asm"]["t"]).apply(null, arguments);
};

var _mclBnFp2_mul = Module["_mclBnFp2_mul"] = function() {
 return (_mclBnFp2_mul = Module["_mclBnFp2_mul"] = Module["asm"]["u"]).apply(null, arguments);
};

var _mclBnFp2_neg = Module["_mclBnFp2_neg"] = function() {
 return (_mclBnFp2_neg = Module["_mclBnFp2_neg"] = Module["asm"]["v"]).apply(null, arguments);
};

var _mclBnFp2_serialize = Module["_mclBnFp2_serialize"] = function() {
 return (_mclBnFp2_serialize = Module["_mclBnFp2_serialize"] = Module["asm"]["w"]).apply(null, arguments);
};

var _mclBnFp2_sqr = Module["_mclBnFp2_sqr"] = function() {
 return (_mclBnFp2_sqr = Module["_mclBnFp2_sqr"] = Module["asm"]["x"]).apply(null, arguments);
};

var _mclBnFp2_squareRoot = Module["_mclBnFp2_squareRoot"] = function() {
 return (_mclBnFp2_squareRoot = Module["_mclBnFp2_squareRoot"] = Module["asm"]["y"]).apply(null, arguments);
};

var _mclBnFp2_sub = Module["_mclBnFp2_sub"] = function() {
 return (_mclBnFp2_sub = Module["_mclBnFp2_sub"] = Module["asm"]["z"]).apply(null, arguments);
};

var _mclBnFp_add = Module["_mclBnFp_add"] = function() {
 return (_mclBnFp_add = Module["_mclBnFp_add"] = Module["asm"]["A"]).apply(null, arguments);
};

var _mclBnFp_clear = Module["_mclBnFp_clear"] = function() {
 return (_mclBnFp_clear = Module["_mclBnFp_clear"] = Module["asm"]["B"]).apply(null, arguments);
};

var _mclBnFp_deserialize = Module["_mclBnFp_deserialize"] = function() {
 return (_mclBnFp_deserialize = Module["_mclBnFp_deserialize"] = Module["asm"]["C"]).apply(null, arguments);
};

var _mclBnFp_div = Module["_mclBnFp_div"] = function() {
 return (_mclBnFp_div = Module["_mclBnFp_div"] = Module["asm"]["D"]).apply(null, arguments);
};

var _mclBnFp_getLittleEndian = Module["_mclBnFp_getLittleEndian"] = function() {
 return (_mclBnFp_getLittleEndian = Module["_mclBnFp_getLittleEndian"] = Module["asm"]["E"]).apply(null, arguments);
};

var _mclBnFp_getStr = Module["_mclBnFp_getStr"] = function() {
 return (_mclBnFp_getStr = Module["_mclBnFp_getStr"] = Module["asm"]["F"]).apply(null, arguments);
};

var _mclBnFp_inv = Module["_mclBnFp_inv"] = function() {
 return (_mclBnFp_inv = Module["_mclBnFp_inv"] = Module["asm"]["G"]).apply(null, arguments);
};

var _mclBnFp_isEqual = Module["_mclBnFp_isEqual"] = function() {
 return (_mclBnFp_isEqual = Module["_mclBnFp_isEqual"] = Module["asm"]["H"]).apply(null, arguments);
};

var _mclBnFp_isNegative = Module["_mclBnFp_isNegative"] = function() {
 return (_mclBnFp_isNegative = Module["_mclBnFp_isNegative"] = Module["asm"]["I"]).apply(null, arguments);
};

var _mclBnFp_isOdd = Module["_mclBnFp_isOdd"] = function() {
 return (_mclBnFp_isOdd = Module["_mclBnFp_isOdd"] = Module["asm"]["J"]).apply(null, arguments);
};

var _mclBnFp_isOne = Module["_mclBnFp_isOne"] = function() {
 return (_mclBnFp_isOne = Module["_mclBnFp_isOne"] = Module["asm"]["K"]).apply(null, arguments);
};

var _mclBnFp_isValid = Module["_mclBnFp_isValid"] = function() {
 return (_mclBnFp_isValid = Module["_mclBnFp_isValid"] = Module["asm"]["L"]).apply(null, arguments);
};

var _mclBnFp_isZero = Module["_mclBnFp_isZero"] = function() {
 return (_mclBnFp_isZero = Module["_mclBnFp_isZero"] = Module["asm"]["M"]).apply(null, arguments);
};

var _mclBnFp_mapToG1 = Module["_mclBnFp_mapToG1"] = function() {
 return (_mclBnFp_mapToG1 = Module["_mclBnFp_mapToG1"] = Module["asm"]["N"]).apply(null, arguments);
};

var _mclBnFp_mul = Module["_mclBnFp_mul"] = function() {
 return (_mclBnFp_mul = Module["_mclBnFp_mul"] = Module["asm"]["O"]).apply(null, arguments);
};

var _mclBnFp_neg = Module["_mclBnFp_neg"] = function() {
 return (_mclBnFp_neg = Module["_mclBnFp_neg"] = Module["asm"]["P"]).apply(null, arguments);
};

var _mclBnFp_serialize = Module["_mclBnFp_serialize"] = function() {
 return (_mclBnFp_serialize = Module["_mclBnFp_serialize"] = Module["asm"]["Q"]).apply(null, arguments);
};

var _mclBnFp_setBigEndianMod = Module["_mclBnFp_setBigEndianMod"] = function() {
 return (_mclBnFp_setBigEndianMod = Module["_mclBnFp_setBigEndianMod"] = Module["asm"]["R"]).apply(null, arguments);
};

var _mclBnFp_setByCSPRNG = Module["_mclBnFp_setByCSPRNG"] = function() {
 return (_mclBnFp_setByCSPRNG = Module["_mclBnFp_setByCSPRNG"] = Module["asm"]["S"]).apply(null, arguments);
};

var _mclBnFp_setHashOf = Module["_mclBnFp_setHashOf"] = function() {
 return (_mclBnFp_setHashOf = Module["_mclBnFp_setHashOf"] = Module["asm"]["T"]).apply(null, arguments);
};

var _mclBnFp_setInt = Module["_mclBnFp_setInt"] = function() {
 return (_mclBnFp_setInt = Module["_mclBnFp_setInt"] = Module["asm"]["U"]).apply(null, arguments);
};

var _mclBnFp_setInt32 = Module["_mclBnFp_setInt32"] = function() {
 return (_mclBnFp_setInt32 = Module["_mclBnFp_setInt32"] = Module["asm"]["V"]).apply(null, arguments);
};

var _mclBnFp_setLittleEndian = Module["_mclBnFp_setLittleEndian"] = function() {
 return (_mclBnFp_setLittleEndian = Module["_mclBnFp_setLittleEndian"] = Module["asm"]["W"]).apply(null, arguments);
};

var _mclBnFp_setLittleEndianMod = Module["_mclBnFp_setLittleEndianMod"] = function() {
 return (_mclBnFp_setLittleEndianMod = Module["_mclBnFp_setLittleEndianMod"] = Module["asm"]["X"]).apply(null, arguments);
};

var _mclBnFp_setStr = Module["_mclBnFp_setStr"] = function() {
 return (_mclBnFp_setStr = Module["_mclBnFp_setStr"] = Module["asm"]["Y"]).apply(null, arguments);
};

var _mclBnFp_sqr = Module["_mclBnFp_sqr"] = function() {
 return (_mclBnFp_sqr = Module["_mclBnFp_sqr"] = Module["asm"]["Z"]).apply(null, arguments);
};

var _mclBnFp_squareRoot = Module["_mclBnFp_squareRoot"] = function() {
 return (_mclBnFp_squareRoot = Module["_mclBnFp_squareRoot"] = Module["asm"]["_"]).apply(null, arguments);
};

var _mclBnFp_sub = Module["_mclBnFp_sub"] = function() {
 return (_mclBnFp_sub = Module["_mclBnFp_sub"] = Module["asm"]["$"]).apply(null, arguments);
};

var _mclBnFr_add = Module["_mclBnFr_add"] = function() {
 return (_mclBnFr_add = Module["_mclBnFr_add"] = Module["asm"]["aa"]).apply(null, arguments);
};

var _mclBnFr_clear = Module["_mclBnFr_clear"] = function() {
 return (_mclBnFr_clear = Module["_mclBnFr_clear"] = Module["asm"]["ba"]).apply(null, arguments);
};

var _mclBnFr_deserialize = Module["_mclBnFr_deserialize"] = function() {
 return (_mclBnFr_deserialize = Module["_mclBnFr_deserialize"] = Module["asm"]["ca"]).apply(null, arguments);
};

var _mclBnFr_div = Module["_mclBnFr_div"] = function() {
 return (_mclBnFr_div = Module["_mclBnFr_div"] = Module["asm"]["da"]).apply(null, arguments);
};

var _mclBnFr_getLittleEndian = Module["_mclBnFr_getLittleEndian"] = function() {
 return (_mclBnFr_getLittleEndian = Module["_mclBnFr_getLittleEndian"] = Module["asm"]["ea"]).apply(null, arguments);
};

var _mclBnFr_getStr = Module["_mclBnFr_getStr"] = function() {
 return (_mclBnFr_getStr = Module["_mclBnFr_getStr"] = Module["asm"]["fa"]).apply(null, arguments);
};

var _mclBnFr_inv = Module["_mclBnFr_inv"] = function() {
 return (_mclBnFr_inv = Module["_mclBnFr_inv"] = Module["asm"]["ga"]).apply(null, arguments);
};

var _mclBnFr_isEqual = Module["_mclBnFr_isEqual"] = function() {
 return (_mclBnFr_isEqual = Module["_mclBnFr_isEqual"] = Module["asm"]["ha"]).apply(null, arguments);
};

var _mclBnFr_isNegative = Module["_mclBnFr_isNegative"] = function() {
 return (_mclBnFr_isNegative = Module["_mclBnFr_isNegative"] = Module["asm"]["ia"]).apply(null, arguments);
};

var _mclBnFr_isOdd = Module["_mclBnFr_isOdd"] = function() {
 return (_mclBnFr_isOdd = Module["_mclBnFr_isOdd"] = Module["asm"]["ja"]).apply(null, arguments);
};

var _mclBnFr_isOne = Module["_mclBnFr_isOne"] = function() {
 return (_mclBnFr_isOne = Module["_mclBnFr_isOne"] = Module["asm"]["ka"]).apply(null, arguments);
};

var _mclBnFr_isValid = Module["_mclBnFr_isValid"] = function() {
 return (_mclBnFr_isValid = Module["_mclBnFr_isValid"] = Module["asm"]["la"]).apply(null, arguments);
};

var _mclBnFr_isZero = Module["_mclBnFr_isZero"] = function() {
 return (_mclBnFr_isZero = Module["_mclBnFr_isZero"] = Module["asm"]["ma"]).apply(null, arguments);
};

var _mclBnFr_mul = Module["_mclBnFr_mul"] = function() {
 return (_mclBnFr_mul = Module["_mclBnFr_mul"] = Module["asm"]["na"]).apply(null, arguments);
};

var _mclBnFr_neg = Module["_mclBnFr_neg"] = function() {
 return (_mclBnFr_neg = Module["_mclBnFr_neg"] = Module["asm"]["oa"]).apply(null, arguments);
};

var _mclBnFr_serialize = Module["_mclBnFr_serialize"] = function() {
 return (_mclBnFr_serialize = Module["_mclBnFr_serialize"] = Module["asm"]["pa"]).apply(null, arguments);
};

var _mclBnFr_setBigEndianMod = Module["_mclBnFr_setBigEndianMod"] = function() {
 return (_mclBnFr_setBigEndianMod = Module["_mclBnFr_setBigEndianMod"] = Module["asm"]["qa"]).apply(null, arguments);
};

var _mclBnFr_setByCSPRNG = Module["_mclBnFr_setByCSPRNG"] = function() {
 return (_mclBnFr_setByCSPRNG = Module["_mclBnFr_setByCSPRNG"] = Module["asm"]["ra"]).apply(null, arguments);
};

var _mclBnFr_setHashOf = Module["_mclBnFr_setHashOf"] = function() {
 return (_mclBnFr_setHashOf = Module["_mclBnFr_setHashOf"] = Module["asm"]["sa"]).apply(null, arguments);
};

var _mclBnFr_setInt = Module["_mclBnFr_setInt"] = function() {
 return (_mclBnFr_setInt = Module["_mclBnFr_setInt"] = Module["asm"]["ta"]).apply(null, arguments);
};

var _mclBnFr_setInt32 = Module["_mclBnFr_setInt32"] = function() {
 return (_mclBnFr_setInt32 = Module["_mclBnFr_setInt32"] = Module["asm"]["ua"]).apply(null, arguments);
};

var _mclBnFr_setLittleEndian = Module["_mclBnFr_setLittleEndian"] = function() {
 return (_mclBnFr_setLittleEndian = Module["_mclBnFr_setLittleEndian"] = Module["asm"]["va"]).apply(null, arguments);
};

var _mclBnFr_setLittleEndianMod = Module["_mclBnFr_setLittleEndianMod"] = function() {
 return (_mclBnFr_setLittleEndianMod = Module["_mclBnFr_setLittleEndianMod"] = Module["asm"]["wa"]).apply(null, arguments);
};

var _mclBnFr_setStr = Module["_mclBnFr_setStr"] = function() {
 return (_mclBnFr_setStr = Module["_mclBnFr_setStr"] = Module["asm"]["xa"]).apply(null, arguments);
};

var _mclBnFr_sqr = Module["_mclBnFr_sqr"] = function() {
 return (_mclBnFr_sqr = Module["_mclBnFr_sqr"] = Module["asm"]["ya"]).apply(null, arguments);
};

var _mclBnFr_squareRoot = Module["_mclBnFr_squareRoot"] = function() {
 return (_mclBnFr_squareRoot = Module["_mclBnFr_squareRoot"] = Module["asm"]["za"]).apply(null, arguments);
};

var _mclBnFr_sub = Module["_mclBnFr_sub"] = function() {
 return (_mclBnFr_sub = Module["_mclBnFr_sub"] = Module["asm"]["Aa"]).apply(null, arguments);
};

var _mclBnFree = Module["_mclBnFree"] = function() {
 return (_mclBnFree = Module["_mclBnFree"] = Module["asm"]["Ba"]).apply(null, arguments);
};

var _mclBnG1_add = Module["_mclBnG1_add"] = function() {
 return (_mclBnG1_add = Module["_mclBnG1_add"] = Module["asm"]["Ca"]).apply(null, arguments);
};

var _mclBnG1_clear = Module["_mclBnG1_clear"] = function() {
 return (_mclBnG1_clear = Module["_mclBnG1_clear"] = Module["asm"]["Da"]).apply(null, arguments);
};

var _mclBnG1_dbl = Module["_mclBnG1_dbl"] = function() {
 return (_mclBnG1_dbl = Module["_mclBnG1_dbl"] = Module["asm"]["Ea"]).apply(null, arguments);
};

var _mclBnG1_deserialize = Module["_mclBnG1_deserialize"] = function() {
 return (_mclBnG1_deserialize = Module["_mclBnG1_deserialize"] = Module["asm"]["Fa"]).apply(null, arguments);
};

var _mclBnG1_getBasePoint = Module["_mclBnG1_getBasePoint"] = function() {
 return (_mclBnG1_getBasePoint = Module["_mclBnG1_getBasePoint"] = Module["asm"]["Ga"]).apply(null, arguments);
};

var _mclBnG1_getStr = Module["_mclBnG1_getStr"] = function() {
 return (_mclBnG1_getStr = Module["_mclBnG1_getStr"] = Module["asm"]["Ha"]).apply(null, arguments);
};

var _mclBnG1_hashAndMapTo = Module["_mclBnG1_hashAndMapTo"] = function() {
 return (_mclBnG1_hashAndMapTo = Module["_mclBnG1_hashAndMapTo"] = Module["asm"]["Ia"]).apply(null, arguments);
};

var _mclBnG1_isEqual = Module["_mclBnG1_isEqual"] = function() {
 return (_mclBnG1_isEqual = Module["_mclBnG1_isEqual"] = Module["asm"]["Ja"]).apply(null, arguments);
};

var _mclBnG1_isValid = Module["_mclBnG1_isValid"] = function() {
 return (_mclBnG1_isValid = Module["_mclBnG1_isValid"] = Module["asm"]["Ka"]).apply(null, arguments);
};

var _mclBnG1_isValidOrder = Module["_mclBnG1_isValidOrder"] = function() {
 return (_mclBnG1_isValidOrder = Module["_mclBnG1_isValidOrder"] = Module["asm"]["La"]).apply(null, arguments);
};

var _mclBnG1_isZero = Module["_mclBnG1_isZero"] = function() {
 return (_mclBnG1_isZero = Module["_mclBnG1_isZero"] = Module["asm"]["Ma"]).apply(null, arguments);
};

var _mclBnG1_mul = Module["_mclBnG1_mul"] = function() {
 return (_mclBnG1_mul = Module["_mclBnG1_mul"] = Module["asm"]["Na"]).apply(null, arguments);
};

var _mclBnG1_mulCT = Module["_mclBnG1_mulCT"] = function() {
 return (_mclBnG1_mulCT = Module["_mclBnG1_mulCT"] = Module["asm"]["Oa"]).apply(null, arguments);
};

var _mclBnG1_mulVec = Module["_mclBnG1_mulVec"] = function() {
 return (_mclBnG1_mulVec = Module["_mclBnG1_mulVec"] = Module["asm"]["Pa"]).apply(null, arguments);
};

var _mclBnG1_neg = Module["_mclBnG1_neg"] = function() {
 return (_mclBnG1_neg = Module["_mclBnG1_neg"] = Module["asm"]["Qa"]).apply(null, arguments);
};

var _mclBnG1_normalize = Module["_mclBnG1_normalize"] = function() {
 return (_mclBnG1_normalize = Module["_mclBnG1_normalize"] = Module["asm"]["Ra"]).apply(null, arguments);
};

var _mclBnG1_serialize = Module["_mclBnG1_serialize"] = function() {
 return (_mclBnG1_serialize = Module["_mclBnG1_serialize"] = Module["asm"]["Sa"]).apply(null, arguments);
};

var _mclBnG1_setStr = Module["_mclBnG1_setStr"] = function() {
 return (_mclBnG1_setStr = Module["_mclBnG1_setStr"] = Module["asm"]["Ta"]).apply(null, arguments);
};

var _mclBnG1_sub = Module["_mclBnG1_sub"] = function() {
 return (_mclBnG1_sub = Module["_mclBnG1_sub"] = Module["asm"]["Ua"]).apply(null, arguments);
};

var _mclBnG2_add = Module["_mclBnG2_add"] = function() {
 return (_mclBnG2_add = Module["_mclBnG2_add"] = Module["asm"]["Va"]).apply(null, arguments);
};

var _mclBnG2_clear = Module["_mclBnG2_clear"] = function() {
 return (_mclBnG2_clear = Module["_mclBnG2_clear"] = Module["asm"]["Wa"]).apply(null, arguments);
};

var _mclBnG2_dbl = Module["_mclBnG2_dbl"] = function() {
 return (_mclBnG2_dbl = Module["_mclBnG2_dbl"] = Module["asm"]["Xa"]).apply(null, arguments);
};

var _mclBnG2_deserialize = Module["_mclBnG2_deserialize"] = function() {
 return (_mclBnG2_deserialize = Module["_mclBnG2_deserialize"] = Module["asm"]["Ya"]).apply(null, arguments);
};

var _mclBnG2_getStr = Module["_mclBnG2_getStr"] = function() {
 return (_mclBnG2_getStr = Module["_mclBnG2_getStr"] = Module["asm"]["Za"]).apply(null, arguments);
};

var _mclBnG2_hashAndMapTo = Module["_mclBnG2_hashAndMapTo"] = function() {
 return (_mclBnG2_hashAndMapTo = Module["_mclBnG2_hashAndMapTo"] = Module["asm"]["_a"]).apply(null, arguments);
};

var _mclBnG2_isEqual = Module["_mclBnG2_isEqual"] = function() {
 return (_mclBnG2_isEqual = Module["_mclBnG2_isEqual"] = Module["asm"]["$a"]).apply(null, arguments);
};

var _mclBnG2_isValid = Module["_mclBnG2_isValid"] = function() {
 return (_mclBnG2_isValid = Module["_mclBnG2_isValid"] = Module["asm"]["ab"]).apply(null, arguments);
};

var _mclBnG2_isValidOrder = Module["_mclBnG2_isValidOrder"] = function() {
 return (_mclBnG2_isValidOrder = Module["_mclBnG2_isValidOrder"] = Module["asm"]["bb"]).apply(null, arguments);
};

var _mclBnG2_isZero = Module["_mclBnG2_isZero"] = function() {
 return (_mclBnG2_isZero = Module["_mclBnG2_isZero"] = Module["asm"]["cb"]).apply(null, arguments);
};

var _mclBnG2_mul = Module["_mclBnG2_mul"] = function() {
 return (_mclBnG2_mul = Module["_mclBnG2_mul"] = Module["asm"]["db"]).apply(null, arguments);
};

var _mclBnG2_mulCT = Module["_mclBnG2_mulCT"] = function() {
 return (_mclBnG2_mulCT = Module["_mclBnG2_mulCT"] = Module["asm"]["eb"]).apply(null, arguments);
};

var _mclBnG2_mulVec = Module["_mclBnG2_mulVec"] = function() {
 return (_mclBnG2_mulVec = Module["_mclBnG2_mulVec"] = Module["asm"]["fb"]).apply(null, arguments);
};

var _mclBnG2_neg = Module["_mclBnG2_neg"] = function() {
 return (_mclBnG2_neg = Module["_mclBnG2_neg"] = Module["asm"]["gb"]).apply(null, arguments);
};

var _mclBnG2_normalize = Module["_mclBnG2_normalize"] = function() {
 return (_mclBnG2_normalize = Module["_mclBnG2_normalize"] = Module["asm"]["hb"]).apply(null, arguments);
};

var _mclBnG2_serialize = Module["_mclBnG2_serialize"] = function() {
 return (_mclBnG2_serialize = Module["_mclBnG2_serialize"] = Module["asm"]["ib"]).apply(null, arguments);
};

var _mclBnG2_setStr = Module["_mclBnG2_setStr"] = function() {
 return (_mclBnG2_setStr = Module["_mclBnG2_setStr"] = Module["asm"]["jb"]).apply(null, arguments);
};

var _mclBnG2_sub = Module["_mclBnG2_sub"] = function() {
 return (_mclBnG2_sub = Module["_mclBnG2_sub"] = Module["asm"]["kb"]).apply(null, arguments);
};

var _mclBnGT_add = Module["_mclBnGT_add"] = function() {
 return (_mclBnGT_add = Module["_mclBnGT_add"] = Module["asm"]["lb"]).apply(null, arguments);
};

var _mclBnGT_clear = Module["_mclBnGT_clear"] = function() {
 return (_mclBnGT_clear = Module["_mclBnGT_clear"] = Module["asm"]["mb"]).apply(null, arguments);
};

var _mclBnGT_deserialize = Module["_mclBnGT_deserialize"] = function() {
 return (_mclBnGT_deserialize = Module["_mclBnGT_deserialize"] = Module["asm"]["nb"]).apply(null, arguments);
};

var _mclBnGT_div = Module["_mclBnGT_div"] = function() {
 return (_mclBnGT_div = Module["_mclBnGT_div"] = Module["asm"]["ob"]).apply(null, arguments);
};

var _mclBnGT_getStr = Module["_mclBnGT_getStr"] = function() {
 return (_mclBnGT_getStr = Module["_mclBnGT_getStr"] = Module["asm"]["pb"]).apply(null, arguments);
};

var _mclBnGT_inv = Module["_mclBnGT_inv"] = function() {
 return (_mclBnGT_inv = Module["_mclBnGT_inv"] = Module["asm"]["qb"]).apply(null, arguments);
};

var _mclBnGT_invGeneric = Module["_mclBnGT_invGeneric"] = function() {
 return (_mclBnGT_invGeneric = Module["_mclBnGT_invGeneric"] = Module["asm"]["rb"]).apply(null, arguments);
};

var _mclBnGT_isEqual = Module["_mclBnGT_isEqual"] = function() {
 return (_mclBnGT_isEqual = Module["_mclBnGT_isEqual"] = Module["asm"]["sb"]).apply(null, arguments);
};

var _mclBnGT_isOne = Module["_mclBnGT_isOne"] = function() {
 return (_mclBnGT_isOne = Module["_mclBnGT_isOne"] = Module["asm"]["tb"]).apply(null, arguments);
};

var _mclBnGT_isZero = Module["_mclBnGT_isZero"] = function() {
 return (_mclBnGT_isZero = Module["_mclBnGT_isZero"] = Module["asm"]["ub"]).apply(null, arguments);
};

var _mclBnGT_mul = Module["_mclBnGT_mul"] = function() {
 return (_mclBnGT_mul = Module["_mclBnGT_mul"] = Module["asm"]["vb"]).apply(null, arguments);
};

var _mclBnGT_neg = Module["_mclBnGT_neg"] = function() {
 return (_mclBnGT_neg = Module["_mclBnGT_neg"] = Module["asm"]["wb"]).apply(null, arguments);
};

var _mclBnGT_pow = Module["_mclBnGT_pow"] = function() {
 return (_mclBnGT_pow = Module["_mclBnGT_pow"] = Module["asm"]["xb"]).apply(null, arguments);
};

var _mclBnGT_powGeneric = Module["_mclBnGT_powGeneric"] = function() {
 return (_mclBnGT_powGeneric = Module["_mclBnGT_powGeneric"] = Module["asm"]["yb"]).apply(null, arguments);
};

var _mclBnGT_powVec = Module["_mclBnGT_powVec"] = function() {
 return (_mclBnGT_powVec = Module["_mclBnGT_powVec"] = Module["asm"]["zb"]).apply(null, arguments);
};

var _mclBnGT_serialize = Module["_mclBnGT_serialize"] = function() {
 return (_mclBnGT_serialize = Module["_mclBnGT_serialize"] = Module["asm"]["Ab"]).apply(null, arguments);
};

var _mclBnGT_setInt = Module["_mclBnGT_setInt"] = function() {
 return (_mclBnGT_setInt = Module["_mclBnGT_setInt"] = Module["asm"]["Bb"]).apply(null, arguments);
};

var _mclBnGT_setInt32 = Module["_mclBnGT_setInt32"] = function() {
 return (_mclBnGT_setInt32 = Module["_mclBnGT_setInt32"] = Module["asm"]["Cb"]).apply(null, arguments);
};

var _mclBnGT_setStr = Module["_mclBnGT_setStr"] = function() {
 return (_mclBnGT_setStr = Module["_mclBnGT_setStr"] = Module["asm"]["Db"]).apply(null, arguments);
};

var _mclBnGT_sqr = Module["_mclBnGT_sqr"] = function() {
 return (_mclBnGT_sqr = Module["_mclBnGT_sqr"] = Module["asm"]["Eb"]).apply(null, arguments);
};

var _mclBnGT_sub = Module["_mclBnGT_sub"] = function() {
 return (_mclBnGT_sub = Module["_mclBnGT_sub"] = Module["asm"]["Fb"]).apply(null, arguments);
};

var _mclBnMalloc = Module["_mclBnMalloc"] = function() {
 return (_mclBnMalloc = Module["_mclBnMalloc"] = Module["asm"]["Gb"]).apply(null, arguments);
};

var _mclBn_FrEvaluatePolynomial = Module["_mclBn_FrEvaluatePolynomial"] = function() {
 return (_mclBn_FrEvaluatePolynomial = Module["_mclBn_FrEvaluatePolynomial"] = Module["asm"]["Hb"]).apply(null, arguments);
};

var _mclBn_FrLagrangeInterpolation = Module["_mclBn_FrLagrangeInterpolation"] = function() {
 return (_mclBn_FrLagrangeInterpolation = Module["_mclBn_FrLagrangeInterpolation"] = Module["asm"]["Ib"]).apply(null, arguments);
};

var _mclBn_G1EvaluatePolynomial = Module["_mclBn_G1EvaluatePolynomial"] = function() {
 return (_mclBn_G1EvaluatePolynomial = Module["_mclBn_G1EvaluatePolynomial"] = Module["asm"]["Jb"]).apply(null, arguments);
};

var _mclBn_G1LagrangeInterpolation = Module["_mclBn_G1LagrangeInterpolation"] = function() {
 return (_mclBn_G1LagrangeInterpolation = Module["_mclBn_G1LagrangeInterpolation"] = Module["asm"]["Kb"]).apply(null, arguments);
};

var _mclBn_G2EvaluatePolynomial = Module["_mclBn_G2EvaluatePolynomial"] = function() {
 return (_mclBn_G2EvaluatePolynomial = Module["_mclBn_G2EvaluatePolynomial"] = Module["asm"]["Lb"]).apply(null, arguments);
};

var _mclBn_G2LagrangeInterpolation = Module["_mclBn_G2LagrangeInterpolation"] = function() {
 return (_mclBn_G2LagrangeInterpolation = Module["_mclBn_G2LagrangeInterpolation"] = Module["asm"]["Mb"]).apply(null, arguments);
};

var _mclBn_finalExp = Module["_mclBn_finalExp"] = function() {
 return (_mclBn_finalExp = Module["_mclBn_finalExp"] = Module["asm"]["Nb"]).apply(null, arguments);
};

var _mclBn_getCurveOrder = Module["_mclBn_getCurveOrder"] = function() {
 return (_mclBn_getCurveOrder = Module["_mclBn_getCurveOrder"] = Module["asm"]["Ob"]).apply(null, arguments);
};

var _mclBn_getCurveType = Module["_mclBn_getCurveType"] = function() {
 return (_mclBn_getCurveType = Module["_mclBn_getCurveType"] = Module["asm"]["Pb"]).apply(null, arguments);
};

var _mclBn_getETHserialization = Module["_mclBn_getETHserialization"] = function() {
 return (_mclBn_getETHserialization = Module["_mclBn_getETHserialization"] = Module["asm"]["Qb"]).apply(null, arguments);
};

var _mclBn_getFieldOrder = Module["_mclBn_getFieldOrder"] = function() {
 return (_mclBn_getFieldOrder = Module["_mclBn_getFieldOrder"] = Module["asm"]["Rb"]).apply(null, arguments);
};

var _mclBn_getFpByteSize = Module["_mclBn_getFpByteSize"] = function() {
 return (_mclBn_getFpByteSize = Module["_mclBn_getFpByteSize"] = Module["asm"]["Sb"]).apply(null, arguments);
};

var _mclBn_getFrByteSize = Module["_mclBn_getFrByteSize"] = function() {
 return (_mclBn_getFrByteSize = Module["_mclBn_getFrByteSize"] = Module["asm"]["Tb"]).apply(null, arguments);
};

var _mclBn_getG1ByteSize = Module["_mclBn_getG1ByteSize"] = function() {
 return (_mclBn_getG1ByteSize = Module["_mclBn_getG1ByteSize"] = Module["asm"]["Ub"]).apply(null, arguments);
};

var _mclBn_getOpUnitSize = Module["_mclBn_getOpUnitSize"] = function() {
 return (_mclBn_getOpUnitSize = Module["_mclBn_getOpUnitSize"] = Module["asm"]["Vb"]).apply(null, arguments);
};

var _mclBn_getUint64NumToPrecompute = Module["_mclBn_getUint64NumToPrecompute"] = function() {
 return (_mclBn_getUint64NumToPrecompute = Module["_mclBn_getUint64NumToPrecompute"] = Module["asm"]["Wb"]).apply(null, arguments);
};

var _mclBn_getVersion = Module["_mclBn_getVersion"] = function() {
 return (_mclBn_getVersion = Module["_mclBn_getVersion"] = Module["asm"]["Xb"]).apply(null, arguments);
};

var _mclBn_init = Module["_mclBn_init"] = function() {
 return (_mclBn_init = Module["_mclBn_init"] = Module["asm"]["Yb"]).apply(null, arguments);
};

var _mclBn_millerLoop = Module["_mclBn_millerLoop"] = function() {
 return (_mclBn_millerLoop = Module["_mclBn_millerLoop"] = Module["asm"]["Zb"]).apply(null, arguments);
};

var _mclBn_millerLoopVec = Module["_mclBn_millerLoopVec"] = function() {
 return (_mclBn_millerLoopVec = Module["_mclBn_millerLoopVec"] = Module["asm"]["_b"]).apply(null, arguments);
};

var _mclBn_pairing = Module["_mclBn_pairing"] = function() {
 return (_mclBn_pairing = Module["_mclBn_pairing"] = Module["asm"]["$b"]).apply(null, arguments);
};

var _mclBn_precomputeG2 = Module["_mclBn_precomputeG2"] = function() {
 return (_mclBn_precomputeG2 = Module["_mclBn_precomputeG2"] = Module["asm"]["ac"]).apply(null, arguments);
};

var _mclBn_precomputedMillerLoop = Module["_mclBn_precomputedMillerLoop"] = function() {
 return (_mclBn_precomputedMillerLoop = Module["_mclBn_precomputedMillerLoop"] = Module["asm"]["bc"]).apply(null, arguments);
};

var _mclBn_precomputedMillerLoop2 = Module["_mclBn_precomputedMillerLoop2"] = function() {
 return (_mclBn_precomputedMillerLoop2 = Module["_mclBn_precomputedMillerLoop2"] = Module["asm"]["cc"]).apply(null, arguments);
};

var _mclBn_precomputedMillerLoop2mixed = Module["_mclBn_precomputedMillerLoop2mixed"] = function() {
 return (_mclBn_precomputedMillerLoop2mixed = Module["_mclBn_precomputedMillerLoop2mixed"] = Module["asm"]["dc"]).apply(null, arguments);
};

var _mclBn_setETHserialization = Module["_mclBn_setETHserialization"] = function() {
 return (_mclBn_setETHserialization = Module["_mclBn_setETHserialization"] = Module["asm"]["ec"]).apply(null, arguments);
};

var _mclBn_setMapToMode = Module["_mclBn_setMapToMode"] = function() {
 return (_mclBn_setMapToMode = Module["_mclBn_setMapToMode"] = Module["asm"]["fc"]).apply(null, arguments);
};

var _mclBn_setRandFunc = Module["_mclBn_setRandFunc"] = function() {
 return (_mclBn_setRandFunc = Module["_mclBn_setRandFunc"] = Module["asm"]["gc"]).apply(null, arguments);
};

var _mclBn_verifyOrderG1 = Module["_mclBn_verifyOrderG1"] = function() {
 return (_mclBn_verifyOrderG1 = Module["_mclBn_verifyOrderG1"] = Module["asm"]["hc"]).apply(null, arguments);
};

var _mclBn_verifyOrderG2 = Module["_mclBn_verifyOrderG2"] = function() {
 return (_mclBn_verifyOrderG2 = Module["_mclBn_verifyOrderG2"] = Module["asm"]["ic"]).apply(null, arguments);
};

var _sheAddG1 = Module["_sheAddG1"] = function() {
 return (_sheAddG1 = Module["_sheAddG1"] = Module["asm"]["jc"]).apply(null, arguments);
};

var _sheAddG2 = Module["_sheAddG2"] = function() {
 return (_sheAddG2 = Module["_sheAddG2"] = Module["asm"]["kc"]).apply(null, arguments);
};

var _sheAddGT = Module["_sheAddGT"] = function() {
 return (_sheAddGT = Module["_sheAddGT"] = Module["asm"]["lc"]).apply(null, arguments);
};

var _sheCipherTextG1Deserialize = Module["_sheCipherTextG1Deserialize"] = function() {
 return (_sheCipherTextG1Deserialize = Module["_sheCipherTextG1Deserialize"] = Module["asm"]["mc"]).apply(null, arguments);
};

var _sheCipherTextG1Serialize = Module["_sheCipherTextG1Serialize"] = function() {
 return (_sheCipherTextG1Serialize = Module["_sheCipherTextG1Serialize"] = Module["asm"]["nc"]).apply(null, arguments);
};

var _sheCipherTextG2Deserialize = Module["_sheCipherTextG2Deserialize"] = function() {
 return (_sheCipherTextG2Deserialize = Module["_sheCipherTextG2Deserialize"] = Module["asm"]["oc"]).apply(null, arguments);
};

var _sheCipherTextG2Serialize = Module["_sheCipherTextG2Serialize"] = function() {
 return (_sheCipherTextG2Serialize = Module["_sheCipherTextG2Serialize"] = Module["asm"]["pc"]).apply(null, arguments);
};

var _sheCipherTextGTDeserialize = Module["_sheCipherTextGTDeserialize"] = function() {
 return (_sheCipherTextGTDeserialize = Module["_sheCipherTextGTDeserialize"] = Module["asm"]["qc"]).apply(null, arguments);
};

var _sheCipherTextGTSerialize = Module["_sheCipherTextGTSerialize"] = function() {
 return (_sheCipherTextGTSerialize = Module["_sheCipherTextGTSerialize"] = Module["asm"]["rc"]).apply(null, arguments);
};

var _sheConvertG1 = Module["_sheConvertG1"] = function() {
 return (_sheConvertG1 = Module["_sheConvertG1"] = Module["asm"]["sc"]).apply(null, arguments);
};

var _sheConvertG2 = Module["_sheConvertG2"] = function() {
 return (_sheConvertG2 = Module["_sheConvertG2"] = Module["asm"]["tc"]).apply(null, arguments);
};

var _sheDecG1 = Module["_sheDecG1"] = function() {
 return (_sheDecG1 = Module["_sheDecG1"] = Module["asm"]["uc"]).apply(null, arguments);
};

var _sheDecG1ViaGT = Module["_sheDecG1ViaGT"] = function() {
 return (_sheDecG1ViaGT = Module["_sheDecG1ViaGT"] = Module["asm"]["vc"]).apply(null, arguments);
};

var _sheDecG2 = Module["_sheDecG2"] = function() {
 return (_sheDecG2 = Module["_sheDecG2"] = Module["asm"]["wc"]).apply(null, arguments);
};

var _sheDecG2ViaGT = Module["_sheDecG2ViaGT"] = function() {
 return (_sheDecG2ViaGT = Module["_sheDecG2ViaGT"] = Module["asm"]["xc"]).apply(null, arguments);
};

var _sheDecGT = Module["_sheDecGT"] = function() {
 return (_sheDecGT = Module["_sheDecGT"] = Module["asm"]["yc"]).apply(null, arguments);
};

var _sheDecWithZkpDecG1 = Module["_sheDecWithZkpDecG1"] = function() {
 return (_sheDecWithZkpDecG1 = Module["_sheDecWithZkpDecG1"] = Module["asm"]["zc"]).apply(null, arguments);
};

var _sheDecWithZkpDecGT = Module["_sheDecWithZkpDecGT"] = function() {
 return (_sheDecWithZkpDecGT = Module["_sheDecWithZkpDecGT"] = Module["asm"]["Ac"]).apply(null, arguments);
};

var _sheEncG1 = Module["_sheEncG1"] = function() {
 return (_sheEncG1 = Module["_sheEncG1"] = Module["asm"]["Bc"]).apply(null, arguments);
};

var _sheEncG2 = Module["_sheEncG2"] = function() {
 return (_sheEncG2 = Module["_sheEncG2"] = Module["asm"]["Cc"]).apply(null, arguments);
};

var _sheEncGT = Module["_sheEncGT"] = function() {
 return (_sheEncGT = Module["_sheEncGT"] = Module["asm"]["Dc"]).apply(null, arguments);
};

var _sheEncIntVecG1 = Module["_sheEncIntVecG1"] = function() {
 return (_sheEncIntVecG1 = Module["_sheEncIntVecG1"] = Module["asm"]["Ec"]).apply(null, arguments);
};

var _sheEncIntVecG2 = Module["_sheEncIntVecG2"] = function() {
 return (_sheEncIntVecG2 = Module["_sheEncIntVecG2"] = Module["asm"]["Fc"]).apply(null, arguments);
};

var _sheEncIntVecGT = Module["_sheEncIntVecGT"] = function() {
 return (_sheEncIntVecGT = Module["_sheEncIntVecGT"] = Module["asm"]["Gc"]).apply(null, arguments);
};

var _sheEncWithZkpBinEq = Module["_sheEncWithZkpBinEq"] = function() {
 return (_sheEncWithZkpBinEq = Module["_sheEncWithZkpBinEq"] = Module["asm"]["Hc"]).apply(null, arguments);
};

var _sheEncWithZkpBinG1 = Module["_sheEncWithZkpBinG1"] = function() {
 return (_sheEncWithZkpBinG1 = Module["_sheEncWithZkpBinG1"] = Module["asm"]["Ic"]).apply(null, arguments);
};

var _sheEncWithZkpBinG2 = Module["_sheEncWithZkpBinG2"] = function() {
 return (_sheEncWithZkpBinG2 = Module["_sheEncWithZkpBinG2"] = Module["asm"]["Jc"]).apply(null, arguments);
};

var _sheEncWithZkpEq = Module["_sheEncWithZkpEq"] = function() {
 return (_sheEncWithZkpEq = Module["_sheEncWithZkpEq"] = Module["asm"]["Kc"]).apply(null, arguments);
};

var _sheFinalExpGT = Module["_sheFinalExpGT"] = function() {
 return (_sheFinalExpGT = Module["_sheFinalExpGT"] = Module["asm"]["Lc"]).apply(null, arguments);
};

var _sheGetAuxiliaryForZkpDecGT = Module["_sheGetAuxiliaryForZkpDecGT"] = function() {
 return (_sheGetAuxiliaryForZkpDecGT = Module["_sheGetAuxiliaryForZkpDecGT"] = Module["asm"]["Mc"]).apply(null, arguments);
};

var _sheGetPublicKey = Module["_sheGetPublicKey"] = function() {
 return (_sheGetPublicKey = Module["_sheGetPublicKey"] = Module["asm"]["Nc"]).apply(null, arguments);
};

var _sheInit = Module["_sheInit"] = function() {
 return (_sheInit = Module["_sheInit"] = Module["asm"]["Oc"]).apply(null, arguments);
};

var _sheIsZeroG1 = Module["_sheIsZeroG1"] = function() {
 return (_sheIsZeroG1 = Module["_sheIsZeroG1"] = Module["asm"]["Pc"]).apply(null, arguments);
};

var _sheIsZeroG2 = Module["_sheIsZeroG2"] = function() {
 return (_sheIsZeroG2 = Module["_sheIsZeroG2"] = Module["asm"]["Qc"]).apply(null, arguments);
};

var _sheIsZeroGT = Module["_sheIsZeroGT"] = function() {
 return (_sheIsZeroGT = Module["_sheIsZeroGT"] = Module["asm"]["Rc"]).apply(null, arguments);
};

var _sheLoadTableForG1DLP = Module["_sheLoadTableForG1DLP"] = function() {
 return (_sheLoadTableForG1DLP = Module["_sheLoadTableForG1DLP"] = Module["asm"]["Sc"]).apply(null, arguments);
};

var _sheLoadTableForG2DLP = Module["_sheLoadTableForG2DLP"] = function() {
 return (_sheLoadTableForG2DLP = Module["_sheLoadTableForG2DLP"] = Module["asm"]["Tc"]).apply(null, arguments);
};

var _sheLoadTableForGTDLP = Module["_sheLoadTableForGTDLP"] = function() {
 return (_sheLoadTableForGTDLP = Module["_sheLoadTableForGTDLP"] = Module["asm"]["Uc"]).apply(null, arguments);
};

var _sheMul = Module["_sheMul"] = function() {
 return (_sheMul = Module["_sheMul"] = Module["asm"]["Vc"]).apply(null, arguments);
};

var _sheMulG1 = Module["_sheMulG1"] = function() {
 return (_sheMulG1 = Module["_sheMulG1"] = Module["asm"]["Wc"]).apply(null, arguments);
};

var _sheMulG2 = Module["_sheMulG2"] = function() {
 return (_sheMulG2 = Module["_sheMulG2"] = Module["asm"]["Xc"]).apply(null, arguments);
};

var _sheMulGT = Module["_sheMulGT"] = function() {
 return (_sheMulGT = Module["_sheMulGT"] = Module["asm"]["Yc"]).apply(null, arguments);
};

var _sheMulIntVecG1 = Module["_sheMulIntVecG1"] = function() {
 return (_sheMulIntVecG1 = Module["_sheMulIntVecG1"] = Module["asm"]["Zc"]).apply(null, arguments);
};

var _sheMulIntVecG2 = Module["_sheMulIntVecG2"] = function() {
 return (_sheMulIntVecG2 = Module["_sheMulIntVecG2"] = Module["asm"]["_c"]).apply(null, arguments);
};

var _sheMulIntVecGT = Module["_sheMulIntVecGT"] = function() {
 return (_sheMulIntVecGT = Module["_sheMulIntVecGT"] = Module["asm"]["$c"]).apply(null, arguments);
};

var _sheMulML = Module["_sheMulML"] = function() {
 return (_sheMulML = Module["_sheMulML"] = Module["asm"]["ad"]).apply(null, arguments);
};

var _sheNegG1 = Module["_sheNegG1"] = function() {
 return (_sheNegG1 = Module["_sheNegG1"] = Module["asm"]["bd"]).apply(null, arguments);
};

var _sheNegG2 = Module["_sheNegG2"] = function() {
 return (_sheNegG2 = Module["_sheNegG2"] = Module["asm"]["cd"]).apply(null, arguments);
};

var _sheNegGT = Module["_sheNegGT"] = function() {
 return (_sheNegGT = Module["_sheNegGT"] = Module["asm"]["dd"]).apply(null, arguments);
};

var _shePrecomputedPublicKeyCreate = Module["_shePrecomputedPublicKeyCreate"] = function() {
 return (_shePrecomputedPublicKeyCreate = Module["_shePrecomputedPublicKeyCreate"] = Module["asm"]["ed"]).apply(null, arguments);
};

var _shePrecomputedPublicKeyDestroy = Module["_shePrecomputedPublicKeyDestroy"] = function() {
 return (_shePrecomputedPublicKeyDestroy = Module["_shePrecomputedPublicKeyDestroy"] = Module["asm"]["fd"]).apply(null, arguments);
};

var _shePrecomputedPublicKeyEncG1 = Module["_shePrecomputedPublicKeyEncG1"] = function() {
 return (_shePrecomputedPublicKeyEncG1 = Module["_shePrecomputedPublicKeyEncG1"] = Module["asm"]["gd"]).apply(null, arguments);
};

var _shePrecomputedPublicKeyEncG2 = Module["_shePrecomputedPublicKeyEncG2"] = function() {
 return (_shePrecomputedPublicKeyEncG2 = Module["_shePrecomputedPublicKeyEncG2"] = Module["asm"]["hd"]).apply(null, arguments);
};

var _shePrecomputedPublicKeyEncGT = Module["_shePrecomputedPublicKeyEncGT"] = function() {
 return (_shePrecomputedPublicKeyEncGT = Module["_shePrecomputedPublicKeyEncGT"] = Module["asm"]["id"]).apply(null, arguments);
};

var _shePrecomputedPublicKeyEncIntVecG1 = Module["_shePrecomputedPublicKeyEncIntVecG1"] = function() {
 return (_shePrecomputedPublicKeyEncIntVecG1 = Module["_shePrecomputedPublicKeyEncIntVecG1"] = Module["asm"]["jd"]).apply(null, arguments);
};

var _shePrecomputedPublicKeyEncIntVecG2 = Module["_shePrecomputedPublicKeyEncIntVecG2"] = function() {
 return (_shePrecomputedPublicKeyEncIntVecG2 = Module["_shePrecomputedPublicKeyEncIntVecG2"] = Module["asm"]["kd"]).apply(null, arguments);
};

var _shePrecomputedPublicKeyEncIntVecGT = Module["_shePrecomputedPublicKeyEncIntVecGT"] = function() {
 return (_shePrecomputedPublicKeyEncIntVecGT = Module["_shePrecomputedPublicKeyEncIntVecGT"] = Module["asm"]["ld"]).apply(null, arguments);
};

var _shePrecomputedPublicKeyEncWithZkpBinEq = Module["_shePrecomputedPublicKeyEncWithZkpBinEq"] = function() {
 return (_shePrecomputedPublicKeyEncWithZkpBinEq = Module["_shePrecomputedPublicKeyEncWithZkpBinEq"] = Module["asm"]["md"]).apply(null, arguments);
};

var _shePrecomputedPublicKeyEncWithZkpBinG1 = Module["_shePrecomputedPublicKeyEncWithZkpBinG1"] = function() {
 return (_shePrecomputedPublicKeyEncWithZkpBinG1 = Module["_shePrecomputedPublicKeyEncWithZkpBinG1"] = Module["asm"]["nd"]).apply(null, arguments);
};

var _shePrecomputedPublicKeyEncWithZkpBinG2 = Module["_shePrecomputedPublicKeyEncWithZkpBinG2"] = function() {
 return (_shePrecomputedPublicKeyEncWithZkpBinG2 = Module["_shePrecomputedPublicKeyEncWithZkpBinG2"] = Module["asm"]["od"]).apply(null, arguments);
};

var _shePrecomputedPublicKeyEncWithZkpEq = Module["_shePrecomputedPublicKeyEncWithZkpEq"] = function() {
 return (_shePrecomputedPublicKeyEncWithZkpEq = Module["_shePrecomputedPublicKeyEncWithZkpEq"] = Module["asm"]["pd"]).apply(null, arguments);
};

var _shePrecomputedPublicKeyInit = Module["_shePrecomputedPublicKeyInit"] = function() {
 return (_shePrecomputedPublicKeyInit = Module["_shePrecomputedPublicKeyInit"] = Module["asm"]["qd"]).apply(null, arguments);
};

var _shePrecomputedPublicKeyVerifyZkpBinEq = Module["_shePrecomputedPublicKeyVerifyZkpBinEq"] = function() {
 return (_shePrecomputedPublicKeyVerifyZkpBinEq = Module["_shePrecomputedPublicKeyVerifyZkpBinEq"] = Module["asm"]["rd"]).apply(null, arguments);
};

var _shePrecomputedPublicKeyVerifyZkpBinG1 = Module["_shePrecomputedPublicKeyVerifyZkpBinG1"] = function() {
 return (_shePrecomputedPublicKeyVerifyZkpBinG1 = Module["_shePrecomputedPublicKeyVerifyZkpBinG1"] = Module["asm"]["sd"]).apply(null, arguments);
};

var _shePrecomputedPublicKeyVerifyZkpBinG2 = Module["_shePrecomputedPublicKeyVerifyZkpBinG2"] = function() {
 return (_shePrecomputedPublicKeyVerifyZkpBinG2 = Module["_shePrecomputedPublicKeyVerifyZkpBinG2"] = Module["asm"]["td"]).apply(null, arguments);
};

var _shePrecomputedPublicKeyVerifyZkpEq = Module["_shePrecomputedPublicKeyVerifyZkpEq"] = function() {
 return (_shePrecomputedPublicKeyVerifyZkpEq = Module["_shePrecomputedPublicKeyVerifyZkpEq"] = Module["asm"]["ud"]).apply(null, arguments);
};

var _shePublicKeyDeserialize = Module["_shePublicKeyDeserialize"] = function() {
 return (_shePublicKeyDeserialize = Module["_shePublicKeyDeserialize"] = Module["asm"]["vd"]).apply(null, arguments);
};

var _shePublicKeySerialize = Module["_shePublicKeySerialize"] = function() {
 return (_shePublicKeySerialize = Module["_shePublicKeySerialize"] = Module["asm"]["wd"]).apply(null, arguments);
};

var _sheReRandG1 = Module["_sheReRandG1"] = function() {
 return (_sheReRandG1 = Module["_sheReRandG1"] = Module["asm"]["xd"]).apply(null, arguments);
};

var _sheReRandG2 = Module["_sheReRandG2"] = function() {
 return (_sheReRandG2 = Module["_sheReRandG2"] = Module["asm"]["yd"]).apply(null, arguments);
};

var _sheReRandGT = Module["_sheReRandGT"] = function() {
 return (_sheReRandGT = Module["_sheReRandGT"] = Module["asm"]["zd"]).apply(null, arguments);
};

var _sheSaveTableForG1DLP = Module["_sheSaveTableForG1DLP"] = function() {
 return (_sheSaveTableForG1DLP = Module["_sheSaveTableForG1DLP"] = Module["asm"]["Ad"]).apply(null, arguments);
};

var _sheSaveTableForG2DLP = Module["_sheSaveTableForG2DLP"] = function() {
 return (_sheSaveTableForG2DLP = Module["_sheSaveTableForG2DLP"] = Module["asm"]["Bd"]).apply(null, arguments);
};

var _sheSaveTableForGTDLP = Module["_sheSaveTableForGTDLP"] = function() {
 return (_sheSaveTableForGTDLP = Module["_sheSaveTableForGTDLP"] = Module["asm"]["Cd"]).apply(null, arguments);
};

var _sheSecretKeyDeserialize = Module["_sheSecretKeyDeserialize"] = function() {
 return (_sheSecretKeyDeserialize = Module["_sheSecretKeyDeserialize"] = Module["asm"]["Dd"]).apply(null, arguments);
};

var _sheSecretKeySerialize = Module["_sheSecretKeySerialize"] = function() {
 return (_sheSecretKeySerialize = Module["_sheSecretKeySerialize"] = Module["asm"]["Ed"]).apply(null, arguments);
};

var _sheSecretKeySetByCSPRNG = Module["_sheSecretKeySetByCSPRNG"] = function() {
 return (_sheSecretKeySetByCSPRNG = Module["_sheSecretKeySetByCSPRNG"] = Module["asm"]["Fd"]).apply(null, arguments);
};

var _sheSetRangeForDLP = Module["_sheSetRangeForDLP"] = function() {
 return (_sheSetRangeForDLP = Module["_sheSetRangeForDLP"] = Module["asm"]["Gd"]).apply(null, arguments);
};

var _sheSetRangeForG2DLP = Module["_sheSetRangeForG2DLP"] = function() {
 return (_sheSetRangeForG2DLP = Module["_sheSetRangeForG2DLP"] = Module["asm"]["Hd"]).apply(null, arguments);
};

var _sheSetRangeForGTDLP = Module["_sheSetRangeForGTDLP"] = function() {
 return (_sheSetRangeForGTDLP = Module["_sheSetRangeForGTDLP"] = Module["asm"]["Id"]).apply(null, arguments);
};

var _sheSetTryNum = Module["_sheSetTryNum"] = function() {
 return (_sheSetTryNum = Module["_sheSetTryNum"] = Module["asm"]["Jd"]).apply(null, arguments);
};

var _sheSubG1 = Module["_sheSubG1"] = function() {
 return (_sheSubG1 = Module["_sheSubG1"] = Module["asm"]["Kd"]).apply(null, arguments);
};

var _sheSubG2 = Module["_sheSubG2"] = function() {
 return (_sheSubG2 = Module["_sheSubG2"] = Module["asm"]["Ld"]).apply(null, arguments);
};

var _sheSubGT = Module["_sheSubGT"] = function() {
 return (_sheSubGT = Module["_sheSubGT"] = Module["asm"]["Md"]).apply(null, arguments);
};

var _sheUseDecG1ViaGT = Module["_sheUseDecG1ViaGT"] = function() {
 return (_sheUseDecG1ViaGT = Module["_sheUseDecG1ViaGT"] = Module["asm"]["Nd"]).apply(null, arguments);
};

var _sheUseDecG2ViaGT = Module["_sheUseDecG2ViaGT"] = function() {
 return (_sheUseDecG2ViaGT = Module["_sheUseDecG2ViaGT"] = Module["asm"]["Od"]).apply(null, arguments);
};

var _sheVerifyZkpBinEq = Module["_sheVerifyZkpBinEq"] = function() {
 return (_sheVerifyZkpBinEq = Module["_sheVerifyZkpBinEq"] = Module["asm"]["Pd"]).apply(null, arguments);
};

var _sheVerifyZkpBinG1 = Module["_sheVerifyZkpBinG1"] = function() {
 return (_sheVerifyZkpBinG1 = Module["_sheVerifyZkpBinG1"] = Module["asm"]["Qd"]).apply(null, arguments);
};

var _sheVerifyZkpBinG2 = Module["_sheVerifyZkpBinG2"] = function() {
 return (_sheVerifyZkpBinG2 = Module["_sheVerifyZkpBinG2"] = Module["asm"]["Rd"]).apply(null, arguments);
};

var _sheVerifyZkpDecG1 = Module["_sheVerifyZkpDecG1"] = function() {
 return (_sheVerifyZkpDecG1 = Module["_sheVerifyZkpDecG1"] = Module["asm"]["Sd"]).apply(null, arguments);
};

var _sheVerifyZkpDecGT = Module["_sheVerifyZkpDecGT"] = function() {
 return (_sheVerifyZkpDecGT = Module["_sheVerifyZkpDecGT"] = Module["asm"]["Td"]).apply(null, arguments);
};

var _sheVerifyZkpEq = Module["_sheVerifyZkpEq"] = function() {
 return (_sheVerifyZkpEq = Module["_sheVerifyZkpEq"] = Module["asm"]["Ud"]).apply(null, arguments);
};

var _sheZkpBinDeserialize = Module["_sheZkpBinDeserialize"] = function() {
 return (_sheZkpBinDeserialize = Module["_sheZkpBinDeserialize"] = Module["asm"]["Vd"]).apply(null, arguments);
};

var _sheZkpBinEqDeserialize = Module["_sheZkpBinEqDeserialize"] = function() {
 return (_sheZkpBinEqDeserialize = Module["_sheZkpBinEqDeserialize"] = Module["asm"]["Wd"]).apply(null, arguments);
};

var _sheZkpBinEqSerialize = Module["_sheZkpBinEqSerialize"] = function() {
 return (_sheZkpBinEqSerialize = Module["_sheZkpBinEqSerialize"] = Module["asm"]["Xd"]).apply(null, arguments);
};

var _sheZkpBinSerialize = Module["_sheZkpBinSerialize"] = function() {
 return (_sheZkpBinSerialize = Module["_sheZkpBinSerialize"] = Module["asm"]["Yd"]).apply(null, arguments);
};

var _sheZkpDecDeserialize = Module["_sheZkpDecDeserialize"] = function() {
 return (_sheZkpDecDeserialize = Module["_sheZkpDecDeserialize"] = Module["asm"]["Zd"]).apply(null, arguments);
};

var _sheZkpDecGTDeserialize = Module["_sheZkpDecGTDeserialize"] = function() {
 return (_sheZkpDecGTDeserialize = Module["_sheZkpDecGTDeserialize"] = Module["asm"]["_d"]).apply(null, arguments);
};

var _sheZkpDecSerialize = Module["_sheZkpDecSerialize"] = function() {
 return (_sheZkpDecSerialize = Module["_sheZkpDecSerialize"] = Module["asm"]["$d"]).apply(null, arguments);
};

var _sheZkpEqDeserialize = Module["_sheZkpEqDeserialize"] = function() {
 return (_sheZkpEqDeserialize = Module["_sheZkpEqDeserialize"] = Module["asm"]["ae"]).apply(null, arguments);
};

var _sheZkpEqSerialize = Module["_sheZkpEqSerialize"] = function() {
 return (_sheZkpEqSerialize = Module["_sheZkpEqSerialize"] = Module["asm"]["be"]).apply(null, arguments);
};

var globalCtors = Module["globalCtors"] = function() {
 return (globalCtors = Module["globalCtors"] = Module["asm"]["ee"]).apply(null, arguments);
};

var dynCall_v = Module["dynCall_v"] = function() {
 return (dynCall_v = Module["dynCall_v"] = Module["asm"]["ce"]).apply(null, arguments);
};

var dynCall_vi = Module["dynCall_vi"] = function() {
 return (dynCall_vi = Module["dynCall_vi"] = Module["asm"]["de"]).apply(null, arguments);
};

var calledRun;

dependenciesFulfilled = function runCaller() {
 if (!calledRun) run();
 if (!calledRun) dependenciesFulfilled = runCaller;
};

function run(args) {
 args = args || arguments_;
 if (runDependencies > 0) {
  return;
 }
 preRun();
 if (runDependencies > 0) return;
 function doRun() {
  if (calledRun) return;
  calledRun = true;
  Module["calledRun"] = true;
  if (ABORT) return;
  initRuntime();
  preMain();
  readyPromiseResolve(Module);
  if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"]();
  postRun();
 }
 if (Module["setStatus"]) {
  Module["setStatus"]("Running...");
  setTimeout(function() {
   setTimeout(function() {
    Module["setStatus"]("");
   }, 1);
   doRun();
  }, 1);
 } else {
  doRun();
 }
}

Module["run"] = run;

if (Module["preInit"]) {
 if (typeof Module["preInit"] == "function") Module["preInit"] = [ Module["preInit"] ];
 while (Module["preInit"].length > 0) {
  Module["preInit"].pop()();
 }
}

noExitRuntime = true;

run();


  return Module.ready
}
);
})();
if (typeof exports === 'object' && typeof module === 'object')
      module.exports = Module;
    else if (typeof define === 'function' && define['amd'])
      define([], function() { return Module; });
    else if (typeof exports === 'object')
      exports["Module"] = Module;
    