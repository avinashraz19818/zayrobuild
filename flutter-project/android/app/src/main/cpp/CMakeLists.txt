cmake_minimum_required(VERSION 3.10.2)
project("zayro_native")

add_library(
    zayro_native
    SHARED
    native_core.cpp
)

find_library(
    log-lib
    log
)

target_link_libraries(
    zayro_native
    ${log-lib}
)
