all: she_c.js
MCL_DIR=../../mcl

EMCC_OPT=-I $(MCL_DIR)/include -I $(MCL_DIR)/src -Wall -Wextra
EMCC_OPT+=-O3 -DNDEBUG
EMCC_OPT+=-s WASM=1 -s NO_EXIT_RUNTIME=1 -s NODEJS_CATCH_EXIT=0 -s NODEJS_CATCH_REJECTION=0
EMCC_OPT+=-s MODULARIZE=1
EMCC_OPT+=-s STRICT_JS=1
EMCC_OPT+=-s SINGLE_FILE=1
EMCC_OPT+=--minify 0
EMCC_OPT+=-DCYBOZU_MINIMUM_EXCEPTION
EMCC_OPT+=-s ABORTING_MALLOC=0
EMCC_OPT+=-s TOTAL_MEMORY=134217728

she_c.js:
	emcc -o $@ $(MCL_DIR)/src/fp.cpp $(MCL_DIR)/src/she_c384_256.cpp $(EMCC_OPT) -DMCL_MAX_BIT_SIZE=384 -DMCL_USE_WEB_CRYPTO_API -s DISABLE_EXCEPTION_CATCHING=1
	# disable require fs, path
	perl -i -pe 's@(.* = require\(.*)@//\1@' she_c.js

clean:
	rm -rf she_c.js

.PHONY: clean she_c.js

