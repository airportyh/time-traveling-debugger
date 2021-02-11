#include <node_api.h>
#include <string>
#include <iostream>
#include <time.h>
#define STRING_BUFFER_SIZE 1000000
char string_buffer[STRING_BUFFER_SIZE];
napi_value get_fun;

int stringify_value(napi_env env, napi_value value, napi_value id_map, int idx, bool firstLevel);
int stringify_object(napi_env env, napi_value object, napi_value id_map, int idx, bool firstLevel);
int stringify_array(napi_env env, napi_value array, napi_value id_map, int idx, bool firstLevel);
int64_t get_object_id(napi_env env, napi_value value, napi_value id_map);

clock_t start;
clock_t end;
unsigned int get_element_total_time;
unsigned int get_element_total_count;
#define timed_napi_get_element(env, keys, i, result) \
    start = clock();\
    napi_get_element(env, keys, i, result);\
    end = clock();\
    get_element_total_time += end - start;\
    get_element_total_count++;
    

napi_value stringify(napi_env env, napi_callback_info info) {
    unsigned int idx = 0;
    napi_value retval;
    size_t argc = 2;
    napi_value args[2];
    
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    
    if (argc != 2) {
        std::string message = "stringify expected 2 arguments but got " + std::to_string(argc);
        napi_throw_error(env, nullptr, message.c_str());
        return nullptr;
    }
    
    napi_get_named_property(env, args[1], "get", &get_fun);
    idx = stringify_value(env, args[0], args[1], 0, true);
    
    napi_create_string_utf8(env, string_buffer, idx, &retval);
    return retval;
}

inline int stringify_value(napi_env env, napi_value value, napi_value id_map, int idx, bool firstLevel) {
    size_t size;
    double number;
    bool boolean;
    napi_valuetype value_type;
    napi_typeof(env, value, &value_type);
    switch (value_type) {
        case napi_string:
            string_buffer[idx++] = '"';
            napi_get_value_string_utf8(env, value, string_buffer + idx, STRING_BUFFER_SIZE - idx, &size);
            idx += size;
            string_buffer[idx++] = '"';
            break;
        case napi_number:
            napi_get_value_double(env, value, &number);
            idx += snprintf(string_buffer + idx, STRING_BUFFER_SIZE - idx, "%f", number);
            break;
        case napi_boolean:
            napi_get_value_bool(env, value, &boolean);
            if (boolean) {
                strcpy(string_buffer + idx, "true");
                idx += 4;
            } else {
                strcpy(string_buffer + idx, "false");
                idx += 5;
            }
            break;
        case napi_null:
        case napi_undefined:
            strcpy(string_buffer + idx, "null");
            idx += 4;
            break;
        case napi_object:
            bool is_array;
            napi_is_array(env, value, &is_array);
            if (is_array) {
                idx = stringify_array(env, value, id_map, idx, firstLevel);
            } else {
                idx = stringify_object(env, value, id_map, idx, firstLevel);
            }
            break;
        default:
            std::string message = "Unhandled type";
            napi_throw_error(env, nullptr, message.c_str());
    }
    return idx;
}



int stringify_object(napi_env env, napi_value object, napi_value id_map, int idx, bool firstLevel) {
    napi_value keys;
    napi_value key;
    napi_value prop_value;
    size_t size;
    uint32_t length;
    
    if (!firstLevel) {
        uint64_t id = get_object_id(env, object, id_map);
        
        if (id > 0) {
            string_buffer[idx++] = '*';
            idx += snprintf(string_buffer + idx, STRING_BUFFER_SIZE - idx, "%llu", id);
            return idx;
        }
    }
    
    napi_get_property_names(env, object, &keys);
    
    string_buffer[idx++] = '{';
    
    napi_get_array_length(env, keys, &length);
    for (uint32_t i = 0; i < length; i++) {
        if (i > 0) {
            string_buffer[idx++] = ',';
        }
        napi_get_element(env, keys, i, &key);
        string_buffer[idx++] = '"';
        napi_get_value_string_utf8(env, key, string_buffer + idx, STRING_BUFFER_SIZE - idx, &size);
        idx += size;
        string_buffer[idx++] = '"';
        napi_get_property(env, object, key, &prop_value);
        string_buffer[idx++] = ':';
        idx = stringify_value(env, prop_value, id_map, idx, false);
    }
    
    string_buffer[idx++] = '}';
    return idx;
}

int stringify_array(napi_env env, napi_value array, napi_value id_map, int idx, bool firstLevel) {
    napi_value element;
    uint32_t length;
    
    if (!firstLevel) {
        uint64_t id = get_object_id(env, array, id_map);
        
        if (id > 0) {
            string_buffer[idx++] = '*';
            idx += snprintf(string_buffer + idx, STRING_BUFFER_SIZE - idx, "%llu", id);
            return idx;
        }
    }
    
    napi_get_array_length(env, array, &length);
    string_buffer[idx++] = '[';
    for (uint32_t i = 0; i < length; i++) {
        if (i > 0) {
            string_buffer[idx++] = ',';
        }
        napi_get_element(env, array, i, &element);
        idx = stringify_value(env, element, id_map, idx, false);
    }
    string_buffer[idx++] = ']';
    return idx;
}

inline int64_t get_object_id(napi_env env, napi_value value, napi_value id_map) {
    napi_value result;
    napi_call_function(env, id_map, get_fun, 1, &value, &result);
    napi_valuetype result_type;
    napi_typeof(env, result, &result_type);
    int64_t retval;
    if (result_type == napi_number) {
        napi_get_value_int64(env, result, &retval);
        return retval;
    } else {
        return 0;
    }
}

napi_value Init(napi_env env, napi_value exports) {
    napi_value new_exports;
    
    napi_create_function(env, "stringify", 0, stringify, nullptr, &new_exports);
    return new_exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init);

