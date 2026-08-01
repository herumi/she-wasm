MCL_DIR?=./mcl
OBJ_DIR?=./obj
WASM_DIR=$(MCL_DIR)/src/wasm
LLVM_VER?=-18

CC=clang$(LLVM_VER)
CXX=clang++$(LLVM_VER)
LD=wasm-ld$(LLVM_VER)
WASM_OPT?=wasm-opt

TARGET=--target=wasm32-unknown-unknown
CFLAGS=$(TARGET) -O3 -DNDEBUG -flto -fvisibility=hidden
CFLAGS+=-fno-threadsafe-statics -fno-rtti -fno-stack-protector -fwasm-exceptions
CFLAGS+=-DMCL_SIZEOF_UNIT=4 -DMCL_STANDALONE -DMCL_STANDALONE_WITH_EXCEPTION
CFLAGS+=-DMCL_USE_WEB_CRYPTO_API
CFLAGS+=-DCYBOZU_MINIMUM_EXCEPTION
CFLAGS+=-DMCLSHE_WIN_SIZE=8
CFLAGS+=-I $(WASM_DIR) -I $(MCL_DIR)/include -I $(MCL_DIR)/src
CFLAGS+=-Wall -Wextra -MMD -MP
CXXFLAGS=$(CFLAGS) -std=c++03

LDFLAGS=--no-entry --export-dynamic -z stack-size=1048576
LDFLAGS+=--export=__stack_pointer --export=__wasm_call_ctors
LDFLAGS+=--export=malloc --export=free
LDFLAGS+=--export=stackSave --export=stackAlloc --export=stackRestore
LDFLAGS+=--import-memory --allow-undefined
LDFLAGS+=--lto-O3

DLMALLOC_FLAGS=-DLACKS_SYS_TYPES_H -DLACKS_FCNTL_H -DLACKS_UNISTD_H
DLMALLOC_FLAGS+=-DLACKS_SYS_MMAN_H -DLACKS_STRINGS_H -DLACKS_SYS_PARAM_H
DLMALLOC_FLAGS+=-DLACKS_SCHED_H -DLACKS_TIME_H
DLMALLOC_FLAGS+=-DHAVE_MORECORE=1 -DHAVE_MMAP=0 -DNO_MALLOC_STATS=1
DLMALLOC_FLAGS+=-DMORECORE_CONTIGUOUS=0
DLMALLOC_FLAGS+=-Dsize_t=unsigned\ long -Dptrdiff_t=long
DLMALLOC_FLAGS+=-DMALLOC_ALIGNMENT=16

OBJS=$(OBJ_DIR)/fp.o
OBJS+=$(OBJ_DIR)/she_c384_256.o
OBJS+=$(OBJ_DIR)/dlmalloc.o $(OBJ_DIR)/libc.o $(OBJ_DIR)/stack.o $(OBJ_DIR)/eh.o

WASM=she.wasm
SHE_JS=she_c.js

all: $(SHE_JS)

$(SHE_JS): $(WASM) $(WASM_DIR)/glue.js
	python3 -c "import base64;w=base64.b64encode(open('$(WASM)','rb').read()).decode();print(open('$(WASM_DIR)/glue.js').read().replace('@@WASM_BASE64@@',w),end='')" > $@

$(WASM): $(OBJS)
	$(LD) -o $@.pre $(OBJS) $(LDFLAGS)
	$(WASM_OPT) --enable-exception-handling -O3 --strip-debug $@.pre -o $@
	rm $@.pre

$(OBJ_DIR)/fp.o: $(MCL_DIR)/src/fp.cpp | $(OBJ_DIR)
	$(CXX) $(CXXFLAGS) -c -o $@ $<

$(OBJ_DIR)/she_c384_256.o: $(MCL_DIR)/src/she_c384_256.cpp | $(OBJ_DIR)
	$(CXX) $(CXXFLAGS) -c -o $@ $<

$(OBJ_DIR)/dlmalloc.o: $(WASM_DIR)/dlmalloc.c | $(OBJ_DIR)
	$(CC) $(TARGET) -O3 -DNDEBUG -flto -I $(WASM_DIR) $(DLMALLOC_FLAGS) -c -o $@ $< -DUSE_LOCKS=0

$(OBJ_DIR)/libc.o: $(WASM_DIR)/libc.c | $(OBJ_DIR)
	$(CC) $(TARGET) -O3 -DNDEBUG -flto -I $(WASM_DIR) -c -o $@ $<

$(OBJ_DIR)/stack.o: $(WASM_DIR)/stack.s | $(OBJ_DIR)
	$(CC) $(TARGET) -c -o $@ $<

# no -flto ; inlining __cxa_throw into an invoke context breaks LTO
$(OBJ_DIR)/eh.o: $(WASM_DIR)/eh.cpp | $(OBJ_DIR)
	$(CXX) $(TARGET) -O2 -DNDEBUG -fno-rtti -fno-threadsafe-statics -fwasm-exceptions -fvisibility=hidden -std=c++11 -Wall -Wextra -MMD -MP -c -o $@ $<

$(OBJ_DIR):
	mkdir -p $@

DEPS=$(OBJS:.o=.d)
-include $(DEPS)

clean:
	rm -f $(SHE_JS) $(OBJS) $(DEPS) $(WASM) $(WASM).pre

.PHONY: clean all
